import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { ENDPOINT, buildRequestBody } from "../scripts/exa-phase-a-discovery.mjs";
import {
  ALLOWED_COMPANIES,
  IDENTITY_GATE_MODE,
  IDENTITY_OUTPUT_SCHEMA,
  buildIdentityRequestBody,
  evaluateIdentityGate,
  extractIdentityEvidenceUrls,
  formatReviewOutput,
  parseArgs,
  requestIdentityGate,
  runIdentityGate,
  validateOptions,
} from "../scripts/exa-phase-b1-identity-gate.mjs";

const NOW = new Date("2026-09-09T12:00:00.000Z");

function providerPayload({ identity = { resolvedCompanyName: "Stripe", officialDomain: "stripe.com", ambiguous: false } } = {}) {
  return {
    results: [
      {
        title: "Stripe announces a new platform capability",
        url: "https://stripe.com/news/platform",
        publishedDate: "2026-09-01T00:00:00.000Z",
        highlights: ["A raw transient highlight."],
      },
      {
        title: "Independent coverage of Stripe development",
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
          citations: [
            { url: "https://stripe.com/about", title: "About Stripe" },
            { url: "https://stripe.com/about", title: "About Stripe" },
            { url: "ftp://stripe.com/not-allowed", title: "Unsupported" },
          ],
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

test("preflight allowlists only the authorized B1 companies and explicit free attestation", () => {
  const valid = parseArgs([IDENTITY_GATE_MODE, "--company", "Mercury", "--confirmed-free-starter"]);
  assert.doesNotThrow(() => validateOptions(valid, "test-key"));
  assert.deepEqual(ALLOWED_COMPANIES, ["Mercury", "Stripe"]);
  assert.throws(() => validateOptions({ ...valid, mode: "smoke" }, "test-key"), /only/i);
  assert.throws(() => validateOptions({ ...valid, company: "NVIDIA" }, "test-key"), /Mercury or Stripe/);
  assert.throws(() => validateOptions({ ...valid, confirmedFreeStarter: false }, "test-key"), /confirmed-free-starter/);
  assert.throws(() => validateOptions(valid, ""), /EXA_API_KEY/);
  const stripe = parseArgs([IDENTITY_GATE_MODE, "--company", "Stripe", "--confirmed-free-starter"]);
  assert.throws(() => validateOptions(stripe, "test-key"), /confirmed-mercury-safe/);
  assert.doesNotThrow(() => validateOptions({ ...stripe, confirmedMercurySafe: true }, "test-key"));
});

test("request exactly preserves A4.1 discovery semantics plus only the identity schema", async () => {
  const calls = [];
  await requestIdentityGate(
    "Stripe",
    "test-key",
    async (...args) => {
      calls.push(args);
      return { ok: true, status: 200, json: async () => providerPayload() };
    },
    NOW,
  );
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], ENDPOINT);
  const body = JSON.parse(calls[0][1].body);
  assert.deepEqual(body, buildIdentityRequestBody("Stripe", NOW));
  assert.deepEqual(
    Object.fromEntries(Object.entries(body).filter(([key]) => key !== "outputSchema")),
    buildRequestBody("Stripe", NOW),
  );
  assert.deepEqual(body.outputSchema, IDENTITY_OUTPUT_SCHEMA);
  for (const forbidden of ["systemPrompt", "category", "includeDomains", "excludeDomains", "startPublishedDate", "endPublishedDate", "additionalQueries", "context", "livecrawl"]) {
    assert.equal(forbidden in body, false);
  }
});

test("the gate sends false identity through exact relevant grounding into B1", async () => {
  const result = await runIdentityGate({
    company: "Stripe",
    apiKey: "test-key",
    now: NOW,
    fetchImpl: async () => ({ ok: true, status: 200, json: async () => providerPayload() }),
  });
  assert.deepEqual(result.providerResult.evidenceUrls, ["https://stripe.com/about", "https://stripe.com/legal"]);
  assert.equal(result.evaluation.identityResult.status, "resolved");
  assert.equal(result.evaluation.identityResult.officialDomain, "stripe.com");
  assert.deepEqual(result.evaluation.rawResultStats, {
    resultCount: 2,
    datedCount: 1,
    highlightedCount: 1,
    uniqueDomainCount: 2,
  });
});

test("unambiguous output without both field-specific valid grounding fails closed", async () => {
  const payload = providerPayload();
  payload.output.grounding = [{ field: "officialDomain", citations: [{ url: "https://stripe.com", title: "Stripe" }], confidence: "high" }];
  await assert.rejects(
    () => requestIdentityGate("Stripe", "test-key", async () => ({ ok: true, status: 200, json: async () => payload }), NOW),
    /citation_missing/,
  );
});

test("ambiguous Mercury may safely clarify without provider grounding", async () => {
  const payload = providerPayload({
    identity: { resolvedCompanyName: "", officialDomain: "", ambiguous: true },
  });
  payload.output.grounding = [];
  const result = await runIdentityGate({
    company: "Mercury",
    apiKey: "test-key",
    now: NOW,
    fetchImpl: async () => ({ ok: true, status: 200, json: async () => payload }),
  });
  assert.equal(result.evaluation.identityResult.status, "clarification_needed");
});

test("grounding extraction keeps only exact valid HTTP(S) URLs and dedupes without rewriting", () => {
  const grounding = [
    { field: "resolvedCompanyName", citations: [{ url: "https://one.test/a", title: "One" }, { url: "https://one.test/a", title: "One" }, { url: " https://two.test", title: "Whitespace" }, { url: "mailto:test@example.test", title: "Mail" }], confidence: "high" },
    { field: "officialDomain", citations: [{ url: "https://two.test/b", title: "Two" }], confidence: "high" },
  ];
  assert.deepEqual(extractIdentityEvidenceUrls(grounding, "resolvedCompanyName"), ["https://one.test/a"]);
  assert.deepEqual(extractIdentityEvidenceUrls(grounding, "officialDomain"), ["https://two.test/b"]);
});

test("malformed provider grounding fails closed", async () => {
  const payload = providerPayload();
  payload.output.grounding[0].citations[0] = { url: "https://stripe.com/about" };
  await assert.rejects(
    () => requestIdentityGate("Stripe", "test-key", async () => ({ ok: true, status: 200, json: async () => payload }), NOW),
    /formatting/,
  );
});

test("wrong false identity does not silently resolve Mercury", () => {
  const evaluation = evaluateIdentityGate("Mercury", {
    identity: { resolvedCompanyName: "Ship Mercury", officialDomain: "shipmercury.com", ambiguous: false },
    evidenceUrls: ["https://shipmercury.com/about"],
    discovery: { candidates: [] },
  });
  assert.equal(evaluation.identityResult.status, "clarification_needed");
});

test("failed provider response is not retried", async () => {
  let calls = 0;
  await assert.rejects(
    () => requestIdentityGate("Mercury", "test-key", async () => {
      calls += 1;
      return { ok: false, status: 500, json: async () => ({ tag: "UNKNOWN" }) };
    }, NOW),
    /provider_unavailable/,
  );
  assert.equal(calls, 1);
});

test("review output exposes manual-review data transiently without request id or key", async () => {
  const result = await runIdentityGate({
    company: "Stripe",
    apiKey: "test-key",
    now: NOW,
    fetchImpl: async () => ({ ok: true, status: 200, json: async () => providerPayload() }),
  });
  const output = formatReviewOutput(result);
  assert.match(output, /resolved_company_name="Stripe"/);
  assert.match(output, /b1_status=resolved/);
  assert.match(output, /provider_result_count=2/);
  assert.match(output, /A raw transient highlight/);
  assert.doesNotMatch(output, /test-key|requestId/);
});

test("harness has no persistence, retry loop, polling, or source-page retrieval", () => {
  const source = readFileSync(new URL("../scripts/exa-phase-b1-identity-gate.mjs", import.meta.url), "utf8");
  assert.doesNotMatch(source, /node:(?:fs|http|https)/);
  assert.doesNotMatch(source, /writeFile|appendFile|createWriteStream|readFile/);
  assert.doesNotMatch(source, /setInterval|while\s*\(/);
  assert.equal((source.match(/fetchImpl\(/g) ?? []).length, 1);
  assert.doesNotMatch(source, /systemPrompt|includeDomains|excludeDomains|additionalQueries|livecrawl/);
});
