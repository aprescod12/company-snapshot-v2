import assert from "node:assert/strict";
import test from "node:test";

import {
  B5LiveSmokeExecutionError,
  B5_LIVE_SMOKE_MODE,
  buildFailureDiagnostic,
  checkProviderBudget,
  formatSmokeOutput,
  parseArgs,
  runB5LiveSmoke,
  summarizeB5LiveSmoke,
  validateOptions,
} from "../scripts/phase-b5-live-smoke.mjs";
import { EXA_SEARCH_ENDPOINT } from "../src/discovery/exaBroadDiscovery.mjs";

const EXA_CONTENTS_ENDPOINT = "https://api.exa.ai/contents";
const NOW = new Date("2026-09-10T12:00:00.000Z");

function searchPayload({
  identity = { resolvedCompanyName: "NVIDIA Corporation", officialDomain: "nvidia.com", ambiguous: false },
  results,
} = {}) {
  return {
    results: results ?? [
      { title: "NVIDIA launches Atlas platform", url: "https://nvidia.com/news/atlas", publishedDate: "2026-09-01", highlights: ["NVIDIA launches Atlas platform."] },
      { title: "NVIDIA signs Beacon partnership", url: "https://nvidia.com/news/beacon", publishedDate: "2026-08-20", highlights: ["NVIDIA signs Beacon partnership."] },
      { title: "NVIDIA opens Cedar expansion", url: "https://nvidia.com/news/cedar", publishedDate: "2026-08-10", highlights: ["NVIDIA opens Cedar expansion."] },
    ],
    output: {
      content: identity,
      grounding: [
        { field: "resolvedCompanyName", citations: [{ url: "https://nvidia.com/about", title: "About" }], confidence: "high" },
        { field: "officialDomain", citations: [{ url: "https://nvidia.com/about", title: "About" }], confidence: "high" },
      ],
    },
    costDollars: { total: 0.007 },
  };
}

function article(title, body) {
  const metadata = `<script type="application/ld+json">${JSON.stringify({ "@type": "NewsArticle", headline: title, datePublished: "2026-09-01" })}</script>`;
  return `<!doctype html><html><head>${metadata}<title>${title}</title></head><body><article><h1>${title}</h1><p>${body}</p><p>NVIDIA says this material development changes its platform capabilities for enterprise customers.</p></article></body></html>`;
}

function contentsPayload(
  url = "https://nvidia.com/",
  summary = "NVIDIA designs GPUs and accelerated computing platforms. Enterprises and researchers use them for graphics, AI, and data-center workloads.",
) {
  return {
    results: [{ id: "https://nvidia.com/", url, title: "NVIDIA", summary }],
    statuses: [{ id: "https://nvidia.com/", status: "success", source: "cached" }],
    costDollars: { total: 0.001 },
  };
}

function jsonResponse(value) {
  return { ok: true, status: 200, json: async () => value };
}

function htmlResponse(html) {
  return new Response(html, { status: 200, headers: { "content-type": "text/html" } });
}

function fullSuccessFetch(calls) {
  const pages = {
    "https://nvidia.com/news/atlas": article("NVIDIA launches Atlas platform", "NVIDIA launches Atlas platform for enterprise customers with a substantial new product capability."),
    "https://nvidia.com/news/beacon": article("NVIDIA signs Beacon partnership", "NVIDIA signs Beacon partnership to deliver a substantial strategic platform agreement for enterprise customers."),
    "https://nvidia.com/news/cedar": article("NVIDIA opens Cedar expansion", "NVIDIA opens Cedar expansion to add substantial regional capacity for enterprise customers."),
  };
  return async (url) => {
    calls.push(url);
    if (url === EXA_SEARCH_ENDPOINT) return jsonResponse(searchPayload());
    if (url === EXA_CONTENTS_ENDPOINT) return jsonResponse(contentsPayload());
    if (pages[url]) return htmlResponse(pages[url]);
    throw new Error(`unexpected fetch ${url}`);
  };
}

function fallbackFetch(calls) {
  let searchCallCount = 0;
  const pages = {
    "https://nvidia.com/news/atlas": article("NVIDIA launches Atlas platform", "NVIDIA launches Atlas platform for enterprise customers with a substantial new product capability."),
    "https://nvidia.com/news/beacon": article("NVIDIA signs Beacon partnership", "NVIDIA signs Beacon partnership to deliver a substantial strategic platform agreement for enterprise customers."),
    "https://nvidia.com/news/fallback-cedar": article("NVIDIA opens Cedar expansion", "NVIDIA opens Cedar expansion to add substantial regional capacity for enterprise customers."),
  };
  return async (url) => {
    calls.push(url);
    if (url === EXA_SEARCH_ENDPOINT) {
      searchCallCount += 1;
      if (searchCallCount === 1) {
        return jsonResponse(
          searchPayload({
            results: [
              { title: "NVIDIA launches Atlas platform", url: "https://nvidia.com/news/atlas", publishedDate: "2026-09-01", highlights: ["NVIDIA launches Atlas platform."] },
              { title: "NVIDIA signs Beacon partnership", url: "https://nvidia.com/news/beacon", publishedDate: "2026-08-20", highlights: ["NVIDIA signs Beacon partnership."] },
            ],
          }),
        );
      }
      return jsonResponse({
        results: [
          { title: "NVIDIA opens Cedar expansion", url: "https://nvidia.com/news/fallback-cedar", publishedDate: "2026-08-10", highlights: ["NVIDIA opens Cedar expansion."] },
        ],
      });
    }
    if (url === EXA_CONTENTS_ENDPOINT) return jsonResponse(contentsPayload());
    if (pages[url]) return htmlResponse(pages[url]);
    throw new Error(`unexpected fetch ${url}`);
  };
}

test("1: validateOptions restricts live use to NVIDIA", () => {
  assert.throws(() => validateOptions({ mode: B5_LIVE_SMOKE_MODE, company: "Stripe", confirmedFreeStarter: true }, "key"), /restricted to NVIDIA/);
  assert.throws(() => validateOptions({ mode: B5_LIVE_SMOKE_MODE, company: "stripe.com", confirmedFreeStarter: true }, "key"), /restricted to NVIDIA/);
  assert.throws(() => validateOptions({ mode: B5_LIVE_SMOKE_MODE, company: "nvidia.com", confirmedFreeStarter: true }, "key"), /restricted to NVIDIA/);
  assert.doesNotThrow(() => validateOptions({ mode: B5_LIVE_SMOKE_MODE, company: "NVIDIA", confirmedFreeStarter: true }, "key"));
});

test("2: validateOptions requires the confirmation flag", () => {
  assert.throws(() => validateOptions({ mode: B5_LIVE_SMOKE_MODE, company: "NVIDIA", confirmedFreeStarter: false }, "key"), /confirmed-free-starter/);
});

test("3: validateOptions requires an API key, and rejects a missing/unknown mode", () => {
  assert.throws(() => validateOptions({ mode: B5_LIVE_SMOKE_MODE, company: "NVIDIA", confirmedFreeStarter: true }, ""), /EXA_API_KEY/);
  assert.throws(() => validateOptions({ mode: undefined, company: "NVIDIA", confirmedFreeStarter: true }, "key"), /Phase B5/);
  assert.throws(() => validateOptions({ mode: "other", company: "NVIDIA", confirmedFreeStarter: true }, "key"), /Phase B5/);
});

test("4: parseArgs reads recognized flags and rejects unknown/extra arguments", () => {
  assert.deepEqual(parseArgs([B5_LIVE_SMOKE_MODE, "--company", "NVIDIA", "--confirmed-free-starter"]), {
    mode: B5_LIVE_SMOKE_MODE,
    company: "NVIDIA",
    confirmedFreeStarter: true,
  });
  assert.throws(() => parseArgs([B5_LIVE_SMOKE_MODE, "--bogus"]), /Unknown argument/);
  assert.throws(() => parseArgs([B5_LIVE_SMOKE_MODE, "--company", "NVIDIA", "extra"]), /Unknown argument/);
});

test("5: --help is recognized without requiring any other argument (zero-network path)", () => {
  assert.deepEqual(parseArgs(["--help"]), { help: true });
  assert.deepEqual(parseArgs([B5_LIVE_SMOKE_MODE, "-h"]), { help: true });
});

test("6: formatSmokeOutput redacts an embedded API key", () => {
  const output = formatSmokeOutput({ note: "safe" }, "exa-super-secret-key-0123456789");
  assert.equal(output.includes("exa-super-secret-key-0123456789"), false);

  const output2 = formatSmokeOutput({ note: "exa_abcdefghijklmnopqrstuvwx leaked" });
  assert.equal(output2.includes("exa_abcdefghijklmnopqrstuvwx"), false);
});

test("7a: runB5LiveSmoke drives the real production pipeline end-to-end with correct wrapper call counts (no fallback)", async () => {
  const calls = [];
  const summary = await runB5LiveSmoke(
    { mode: B5_LIVE_SMOKE_MODE, company: "NVIDIA", confirmedFreeStarter: true },
    "test-key",
    { fetchImpl: fullSuccessFetch(calls), now: NOW },
  );

  assert.equal(summary.final.state, "snapshot");
  assert.equal(summary.final.signals.length, 3);
  assert.deepEqual(summary.identity, { companyName: "NVIDIA Corporation", officialDomain: "nvidia.com" });
  assert.equal(summary.verification.state, "verified");
  assert.equal(summary.verification.evidenceCount, 3);
  assert.equal(summary.verification.fallbackUsed, false);
  assert.equal(summary.description.state, "described");
  assert.deepEqual(summary.providerUse, {
    broadExaSearchRequests: 1,
    fallbackExaSearchRequests: 0,
    totalExaSearchRequests: 1,
    exaContentsRequests: 1,
    publisherRequests: 3,
  });
  assert.equal(typeof summary.totalLatencyMs, "number");
});

test("7b: runB5LiveSmoke correctly counts the B3 fallback Search when broad evidence is insufficient", async () => {
  const calls = [];
  const summary = await runB5LiveSmoke(
    { mode: B5_LIVE_SMOKE_MODE, company: "NVIDIA", confirmedFreeStarter: true },
    "test-key",
    { fetchImpl: fallbackFetch(calls), now: NOW },
  );

  assert.equal(summary.final.state, "snapshot");
  assert.equal(summary.verification.fallbackUsed, true);
  assert.deepEqual(summary.providerUse, {
    broadExaSearchRequests: 1,
    fallbackExaSearchRequests: 1,
    totalExaSearchRequests: 2,
    exaContentsRequests: 1,
    publisherRequests: 3,
  });
});

test("8: checkProviderBudget rejects a missing/duplicated broad Search and a total Search count above 2", () => {
  assert.throws(() => checkProviderBudget({ broadExaSearchRequests: 0, fallbackExaSearchRequests: 0, exaContentsRequests: 0 }), /exactly 1 broad/);
  assert.throws(() => checkProviderBudget({ broadExaSearchRequests: 2, fallbackExaSearchRequests: 0, exaContentsRequests: 0 }), /exactly 1 broad/);
  assert.throws(() => checkProviderBudget({ broadExaSearchRequests: 1, fallbackExaSearchRequests: 2, exaContentsRequests: 0 }), /fallback/);
});

test("9: checkProviderBudget rejects more than one Exa Contents request", () => {
  assert.throws(() => checkProviderBudget({ broadExaSearchRequests: 1, fallbackExaSearchRequests: 0, exaContentsRequests: 2 }), /at most 1 Exa Contents/);
});

test("9b: checkProviderBudget rejects a completed B3 result (verified or insufficient_evidence) with zero Contents requests", () => {
  const counters = { broadExaSearchRequests: 1, fallbackExaSearchRequests: 0, exaContentsRequests: 0 };
  assert.throws(() => checkProviderBudget(counters, "verified"), /exactly 1 Exa Contents request after a completed B3 result \(verified\)/);
  assert.throws(() => checkProviderBudget(counters, "insufficient_evidence"), /exactly 1 Exa Contents request after a completed B3 result \(insufficient_evidence\)/);
  assert.doesNotThrow(() => checkProviderBudget({ ...counters, exaContentsRequests: 1 }, "verified"));
  assert.doesNotThrow(() => checkProviderBudget(counters, undefined));
  assert.doesNotThrow(() => checkProviderBudget(counters, "clarification_needed"));
});

test("10: the formatted live-smoke summary never contains the API key", async () => {
  const summary = await runB5LiveSmoke(
    { mode: B5_LIVE_SMOKE_MODE, company: "NVIDIA", confirmedFreeStarter: true },
    "super-secret-test-key",
    { fetchImpl: fullSuccessFetch([]), now: NOW },
  );
  const output = formatSmokeOutput(summary, "super-secret-test-key");
  assert.equal(output.includes("super-secret-test-key"), false);
});

test("11: summarizeB5LiveSmoke does not mutate the captured production results", () => {
  const final = Object.freeze({
    state: "snapshot",
    company: Object.freeze({ name: "NVIDIA", domain: "nvidia.com", description: "x" }),
    signals: Object.freeze([]),
  });
  const verification = Object.freeze({
    state: "verified",
    company: Object.freeze({ companyName: "NVIDIA", officialDomain: "nvidia.com" }),
    evidence: Object.freeze([
      Object.freeze({
        sourceTitle: "t",
        resolvedUrl: "https://nvidia.com/x",
        publishedDate: "2026-09-01",
        recencyBucket: "RECENT",
        sourceClass: "FIRST_PARTY",
        evidenceSnippet: "s",
      }),
    ]),
    retrieval: Object.freeze({ fallbackUsed: false, exaRequestCount: 1 }),
  });
  const description = Object.freeze({
    state: "described",
    sourceUrl: "https://nvidia.com/",
    provider: Object.freeze({ latencyMs: 10, estimatedCostUsd: 0.001 }),
  });
  const captured = Object.freeze({ discovery: null, verification, description });
  const counters = Object.freeze({ broadExaSearchRequests: 1, fallbackExaSearchRequests: 0, publisherRequests: 1, exaContentsRequests: 1 });

  const summary = summarizeB5LiveSmoke("NVIDIA", captured, counters, final, 123);

  assert.equal(summary.final, final);
  assert.deepEqual(final.signals, []);
  assert.equal(captured.verification, verification);
});

test("12: a throw after real counted network activity exposes stage and provider counts, not just an error string", async () => {
  const boom = new Error("assembly contract violation");
  await assert.rejects(
    () =>
      runB5LiveSmoke(
        { mode: B5_LIVE_SMOKE_MODE, company: "NVIDIA", confirmedFreeStarter: true },
        "super-secret-test-key",
        {
          fetchImpl: fullSuccessFetch([]),
          now: NOW,
          assembleSnapshotImpl: () => {
            throw boom;
          },
        },
      ),
    (error) => {
      assert.ok(error instanceof B5LiveSmokeExecutionError);
      assert.equal(error.cause, boom);
      assert.equal(error.diagnostic.stageReached, "assembly");
      assert.equal(error.diagnostic.error.message, "assembly contract violation");
      assert.deepEqual(error.diagnostic.providerUse, {
        broadExaSearchRequests: 1,
        fallbackExaSearchRequests: 0,
        totalExaSearchRequests: 1,
        exaContentsRequests: 1,
        publisherRequests: 3,
      });
      assert.equal(error.diagnostic.verification.state, "verified");
      assert.equal(error.diagnostic.description.state, "described");
      assert.deepEqual(error.diagnostic.identity, { companyName: "NVIDIA Corporation", officialDomain: "nvidia.com" });
      const formatted = formatSmokeOutput(error.diagnostic, "super-secret-test-key");
      assert.equal(formatted.includes("super-secret-test-key"), false);
      return true;
    },
  );
});

test("13: buildFailureDiagnostic reports an unreached stage honestly with zero counts", () => {
  const diagnostic = buildFailureDiagnostic(
    "NVIDIA",
    "discovery",
    { discovery: null, verification: null, description: null },
    { broadExaSearchRequests: 1, fallbackExaSearchRequests: 0, publisherRequests: 0, exaContentsRequests: 0 },
    42,
    new TypeError("boom"),
  );
  assert.equal(diagnostic.stageReached, "discovery");
  assert.deepEqual(diagnostic.error, { name: "TypeError", message: "boom" });
  assert.deepEqual(diagnostic.identity, {});
  assert.deepEqual(diagnostic.verification, {});
  assert.deepEqual(diagnostic.description, {});
  assert.equal(diagnostic.providerUse.broadExaSearchRequests, 1);
  assert.equal(diagnostic.providerUse.exaContentsRequests, 0);
  assert.equal(diagnostic.totalLatencyMs, 42);
});

test("14: summarizeB5LiveSmoke retains the exact B4B rejection reason for description_unavailable", () => {
  const captured = {
    discovery: null,
    verification: null,
    description: { state: "description_unavailable", reason: "invalid_sentence_count" },
  };
  const counters = { broadExaSearchRequests: 1, fallbackExaSearchRequests: 0, publisherRequests: 3, exaContentsRequests: 1 };
  const final = { state: "unavailable", reason: "description_unavailable" };

  const summary = summarizeB5LiveSmoke("NVIDIA", captured, counters, final, 500);

  assert.equal(summary.description.state, "description_unavailable");
  assert.equal(summary.description.reason, "invalid_sentence_count");
});

test("15: buildFailureDiagnostic retains the exact captured description reason after a B4B rejection", () => {
  const captured = {
    discovery: null,
    verification: null,
    description: { state: "description_unavailable", reason: "untrusted_source_domain" },
  };
  const counters = { broadExaSearchRequests: 1, fallbackExaSearchRequests: 0, publisherRequests: 3, exaContentsRequests: 1 };

  const diagnostic = buildFailureDiagnostic("NVIDIA", "budget-check", captured, counters, 500, new Error("boom"));

  assert.equal(diagnostic.description.state, "description_unavailable");
  assert.equal(diagnostic.description.reason, "untrusted_source_domain");
});

test("16: a successful described summary exposes no reason key, only an absent/undefined representation", () => {
  const captured = {
    discovery: null,
    verification: null,
    description: {
      state: "described",
      description: "Acme builds enterprise software for supply-chain teams. Retailers use its platform to coordinate suppliers.",
      sourceUrl: "https://acme.test/",
      provider: { latencyMs: 100, estimatedCostUsd: 0.001 },
    },
  };
  const counters = { broadExaSearchRequests: 1, fallbackExaSearchRequests: 0, publisherRequests: 3, exaContentsRequests: 1 };
  const final = { state: "snapshot", company: {}, signals: [] };

  const summary = summarizeB5LiveSmoke("NVIDIA", captured, counters, final, 500);
  assert.equal(summary.description.reason, undefined);

  const parsed = JSON.parse(formatSmokeOutput(summary));
  assert.equal(Object.hasOwn(parsed.description, "reason"), false);
});

test("17: redaction still strips the API key when a description rejection reason is present", () => {
  const summary = {
    submittedInput: "NVIDIA",
    description: { state: "description_unavailable", reason: "empty_summary" },
  };
  const output = formatSmokeOutput(summary, "super-secret-test-key");
  assert.equal(output.includes("super-secret-test-key"), false);
  assert.equal(output.includes("empty_summary"), true);
});
