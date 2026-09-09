import assert from "node:assert/strict";
import test from "node:test";

import { buildIdentityRequestBody, parseIdentityOutput } from "../scripts/exa-phase-b1-identity-gate.mjs";
import {
  BroadDiscoveryError,
  EXA_SEARCH_ENDPOINT,
  IDENTITY_OUTPUT_SCHEMA,
  buildBroadRequestBody,
  parseBroadDiscoveryPayload,
  requestExaBroadDiscovery,
} from "../src/discovery/exaBroadDiscovery.mjs";

const NOW = new Date("2026-09-09T12:00:00.000Z");

function payload({ identity = { resolvedCompanyName: "Stripe", officialDomain: "stripe.com", ambiguous: false } } = {}) {
  return {
    results: [
      {
        title: "Stripe announces a new platform capability",
        url: "https://stripe.com/news/platform",
        publishedDate: "2026-09-01T00:00:00.000Z",
        author: "Stripe",
        highlights: ["A current platform development."],
      },
      {
        url: "https://example.test/stripe",
        publishedDate: null,
        highlights: [],
      },
    ],
    output: {
      content: identity,
      grounding: [
        {
          field: "resolvedCompanyName",
          citations: [{ url: "https://stripe.com/about", title: "About Stripe" }],
          confidence: "high",
        },
        {
          field: "officialDomain",
          citations: [
            { url: "https://stripe.com/about", title: "About Stripe" },
            { url: "https://stripe.com/legal", title: "Legal" },
          ],
          confidence: "high",
        },
      ],
    },
    costDollars: { total: 0.007 },
  };
}

function ok(value) {
  return { ok: true, status: 200, json: async () => value };
}

test("production request is parity-locked to the B1 body and identity schema", async () => {
  const calls = [];
  await requestExaBroadDiscovery("Stripe", "test-key", {
    now: NOW,
    fetchImpl: async (...args) => {
      calls.push(args);
      return ok(payload());
    },
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], EXA_SEARCH_ENDPOINT);
  const body = JSON.parse(calls[0][1].body);
  assert.deepEqual(body, buildBroadRequestBody("Stripe", NOW));
  assert.deepEqual(body, buildIdentityRequestBody("Stripe", NOW));
  assert.deepEqual(body.outputSchema, IDENTITY_OUTPUT_SCHEMA);
  for (const forbidden of ["systemPrompt", "category", "includeDomains", "excludeDomains", "startPublishedDate", "endPublishedDate", "additionalQueries", "context", "summary", "text", "description", "signals", "livecrawl"]) {
    assert.equal(forbidden in body, false);
  }
});

test("raw parsing preserves nullable titles while URLs and optional fields remain strict", () => {
  const result = parseBroadDiscoveryPayload(payload(), 42);
  assert.equal(result.candidates[1].title, null);
  assert.equal(result.candidates[1].author, null);
  assert.deepEqual(result.candidates[1].highlights, []);
  assert.deepEqual(result.evidenceUrls, ["https://stripe.com/about", "https://stripe.com/legal"]);
  assert.equal(result.latencyMs, 42);
  assert.equal(result.estimatedCostUsd, 0.007);

  const missingTitle = payload();
  delete missingTitle.results[1].title;
  assert.equal(parseBroadDiscoveryPayload(missingTitle).candidates[1].title, null);
  const nonStringTitle = payload();
  nonStringTitle.results[1].title = 42;
  assert.throws(() => parseBroadDiscoveryPayload(nonStringTitle), (error) => error.code === "provider_format");

  for (const badUrl of [undefined, null, "", " javascript:alert(1)", "ftp://stripe.com/page"]) {
    const malformed = payload();
    malformed.results[0].url = badUrl;
    assert.throws(() => parseBroadDiscoveryPayload(malformed), (error) => error.code === "provider_format");
  }
  const malformedHighlight = payload();
  malformedHighlight.results[0].highlights = ["valid", 42];
  assert.throws(() => parseBroadDiscoveryPayload(malformedHighlight), (error) => error.code === "provider_format");
});

test("identity output and grounding fail closed without rewriting citations", () => {
  const missingResults = payload();
  delete missingResults.results;
  assert.throws(() => parseBroadDiscoveryPayload(missingResults), (error) => error.code === "provider_format");

  const missingAmbiguity = payload();
  delete missingAmbiguity.output.content.ambiguous;
  assert.equal(parseBroadDiscoveryPayload(missingAmbiguity).identity.ambiguous, undefined);
  const malformedIdentity = payload();
  delete malformedIdentity.output.content.resolvedCompanyName;
  assert.throws(() => parseBroadDiscoveryPayload(malformedIdentity), (error) => error.code === "provider_format");

  const malformedGrounding = payload();
  malformedGrounding.output.grounding[0].citations[0] = { url: "https://stripe.com/about" };
  assert.throws(() => parseBroadDiscoveryPayload(malformedGrounding), (error) => error.code === "provider_format");

  const unsupportedGrounding = payload();
  unsupportedGrounding.output.grounding = undefined;
  assert.throws(() => parseBroadDiscoveryPayload(unsupportedGrounding), (error) => error.code === "provider_format");

  for (const field of ["resolvedCompanyName", "officialDomain"]) {
    const incomplete = payload();
    incomplete.output.grounding = incomplete.output.grounding.filter((entry) => entry.field === field);
    assert.throws(() => parseBroadDiscoveryPayload(incomplete), (error) => error.code === "provider_format");
  }
});

test("identity parsing matches B1 for the shared schema and grounding contract", () => {
  const cases = [
    (value) => value,
    (value) => {
      delete value.output.content.resolvedCompanyName;
      return value;
    },
    (value) => {
      value.output.content.ambiguous = "false";
      return value;
    },
    (value) => {
      value.output.content.extra = true;
      return value;
    },
    (value) => {
      value.output.grounding = value.output.grounding.filter((entry) => entry.field !== "officialDomain");
      return value;
    },
  ];

  for (const mutate of cases) {
    const value = mutate(payload());
    const b1 = (() => {
      try {
        return { value: parseIdentityOutput(value) };
      } catch {
        return { error: true };
      }
    })();
    const b2 = (() => {
      try {
        return { value: parseBroadDiscoveryPayload(value) };
      } catch {
        return { error: true };
      }
    })();
    assert.equal(Boolean(b2.error), Boolean(b1.error));
    if (!b1.error) {
      assert.deepEqual(b2.value.identity, b1.value.identity);
      assert.deepEqual(b2.value.evidenceUrls, b1.value.evidenceUrls);
      assert.deepEqual(b2.value.groundingByField, b1.value.groundingByField);
    }
  }
});

test("the B2 missing-ambiguity clarification is an explicit, tested B1-parser divergence", () => {
  const value = payload();
  delete value.output.content.ambiguous;
  assert.throws(() => parseIdentityOutput(value), /did not contain exactly/);
  assert.equal(parseBroadDiscoveryPayload(value).identity.ambiguous, undefined);
});

test("provider failures have stable codes and are never retried", async () => {
  const cases = [
    [401, "UNKNOWN", "provider_auth"],
    [403, "INVALID_API_KEY", "provider_auth"],
    [402, "NO_MORE_CREDITS", "provider_paid_required"],
    [429, "RATE_LIMIT_EXCEEDED", "provider_quota"],
    [500, "UNKNOWN", "provider_unavailable"],
    [400, "UNKNOWN", "provider_format"],
  ];
  for (const [status, tag, code] of cases) {
    let calls = 0;
    await assert.rejects(
      () => requestExaBroadDiscovery("Stripe", "test-key", {
        now: NOW,
        fetchImpl: async () => {
          calls += 1;
          return { ok: false, status, json: async () => ({ tag }) };
        },
      }),
      (error) => error instanceof BroadDiscoveryError && error.code === code,
    );
    assert.equal(calls, 1);
  }
});

test("network, timeout, and malformed JSON fail once without exposing provider payloads", async () => {
  let calls = 0;
  await assert.rejects(
    () => requestExaBroadDiscovery("Stripe", "test-key", {
      now: NOW,
      fetchImpl: async () => {
        calls += 1;
        throw new Error("offline");
      },
    }),
    (error) => error.code === "provider_unavailable",
  );
  assert.equal(calls, 1);

  await assert.rejects(
    () => requestExaBroadDiscovery("Stripe", "test-key", {
      now: NOW,
      fetchImpl: async () => ({ ok: true, status: 200, json: async () => { throw new SyntaxError("bad json"); } }),
    }),
    (error) => error.code === "provider_format",
  );

  await assert.rejects(
    () => requestExaBroadDiscovery("Stripe", "test-key", {
      now: NOW,
      timeoutMs: 1,
      fetchImpl: async (_url, options) => new Promise((_, reject) => options.signal.addEventListener("abort", () => reject(Object.assign(new Error("aborted"), { name: "AbortError" })))),
    }),
    (error) => error.code === "provider_unavailable",
  );
});
