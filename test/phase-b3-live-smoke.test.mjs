import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  ALLOWED_COMPANIES,
  B3_LIVE_SMOKE_MODE,
  formatSmokeOutput,
  parseArgs,
  runB3LiveSmoke,
  validateOptions,
} from "../scripts/phase-b3-live-smoke.mjs";

const NOW = new Date("2026-09-09T12:00:00.000Z");

function candidate(rank, title, url) {
  return { rank, title, url, publishedDate: "2026-09-01", author: null, highlights: [title] };
}

function broadPayload(
  candidates,
  { identity = { resolvedCompanyName: "NVIDIA", officialDomain: "nvidia.test", ambiguous: false } } = {},
) {
  return {
    results: candidates,
    output: {
      content: identity,
      grounding: [
        { field: "resolvedCompanyName", citations: [{ url: "https://nvidia.test/about", title: "About" }], confidence: "high" },
        { field: "officialDomain", citations: [{ url: "https://nvidia.test/about", title: "About" }], confidence: "high" },
      ],
    },
    costDollars: { total: 0.007 },
  };
}

function article(title) {
  return `<!doctype html><script type="application/ld+json">${JSON.stringify({ "@type": "NewsArticle", headline: title, datePublished: "2026-09-01" })}</script><article><h1>${title}</h1><p>NVIDIA announces ${title} as a substantial strategic company development for enterprise customers and ecosystem partners.</p><p>NVIDIA says this material development changes its platform capabilities for customers and operations.</p></article>`;
}

function options(company = "NVIDIA") {
  return { mode: B3_LIVE_SMOKE_MODE, company, confirmedFreeStarter: true };
}

test("B3 live smoke restricts live use to NVIDIA or Stripe with confirmation and a key", () => {
  assert.deepEqual(ALLOWED_COMPANIES, ["NVIDIA", "Stripe"]);
  assert.doesNotThrow(() => validateOptions(parseArgs([B3_LIVE_SMOKE_MODE, "--company", "NVIDIA", "--confirmed-free-starter"]), "test-key"));
  assert.throws(() => validateOptions(options("Mercury"), "test-key"), /restricted/i);
  assert.throws(() => validateOptions({ ...options(), confirmedFreeStarter: false }, "test-key"), /confirmed-free-starter/);
  assert.throws(() => validateOptions(options(), ""), /EXA_API_KEY/);
});

test("B3 live smoke invokes the real B2 then B3 path once and skips fallback after three evidence records", async () => {
  const candidates = [
    candidate(1, "NVIDIA launches Atlas platform", "https://nvidia.test/atlas"),
    candidate(2, "NVIDIA signs Beacon partnership", "https://nvidia.test/beacon"),
    candidate(3, "NVIDIA opens Cedar expansion", "https://nvidia.test/cedar"),
  ];
  let broadCalls = 0;
  let sourceCalls = 0;
  const result = await runB3LiveSmoke(options(), "test-key", {
    discoverOptions: {
      now: NOW,
      fetchImpl: async () => {
        broadCalls += 1;
        return { ok: true, status: 200, json: async () => broadPayload(candidates) };
      },
    },
    verificationOptions: {
      now: NOW,
      sourceFetchImpl: async (url) => {
        sourceCalls += 1;
        return new Response(article(candidates.find((item) => item.url === url).title), { headers: { "content-type": "text/html" } });
      },
      exaFetchImpl: async () => { throw new Error("fallback must not run"); },
    },
  });
  assert.equal(broadCalls, 1);
  assert.equal(sourceCalls, 3);
  assert.equal(result.b2.state, "ready_for_verification");
  assert.equal(result.b3.state, "verified");
  assert.equal(result.b3.evidenceCount, 3);
  assert.deepEqual(result.providerUse, {
    broadExaRequestCount: 1,
    fallbackExaRequestCount: 0,
    totalExaRequestCount: 1,
    fallbackUsed: false,
    fallbackProviderLatencyMs: null,
    fallbackProviderEstimatedCostUsd: null,
  });
});

test("B3 live smoke permits one fallback but cannot exceed two Exa requests", async () => {
  const broad = [candidate(1, "NVIDIA launches Atlas platform", "https://nvidia.test/atlas")];
  const fallback = [
    candidate(1, "NVIDIA signs Beacon partnership", "https://nvidia.test/beacon"),
    candidate(2, "NVIDIA opens Cedar expansion", "https://nvidia.test/cedar"),
  ];
  let fallbackCalls = 0;
  const result = await runB3LiveSmoke(options(), "test-key", {
    discoverOptions: { now: NOW, fetchImpl: async () => ({ ok: true, status: 200, json: async () => broadPayload(broad) }) },
    verificationOptions: {
      now: NOW,
      sourceFetchImpl: async (url) => {
        const item = [...broad, ...fallback].find((entry) => entry.url === url);
        return new Response(article(item.title), { headers: { "content-type": "text/html" } });
      },
      exaFetchImpl: async () => {
        fallbackCalls += 1;
        return { ok: true, status: 200, json: async () => ({ results: fallback }) };
      },
    },
  });
  assert.equal(fallbackCalls, 1);
  assert.equal(result.providerUse.totalExaRequestCount, 2);
  assert.equal(result.providerUse.fallbackUsed, true);
  assert.equal(result.b3.state, "verified");
});

test("B3 live smoke blocks before orchestration without confirmation or a key", async () => {
  let calls = 0;
  await assert.rejects(
    () => runB3LiveSmoke({ ...options(), confirmedFreeStarter: false }, "test-key", {
      discoverOptions: { fetchImpl: async () => { calls += 1; } },
    }),
    /confirmed-free-starter/,
  );
  await assert.rejects(
    () => runB3LiveSmoke(options(), "", { discoverOptions: { fetchImpl: async () => { calls += 1; } } }),
    /EXA_API_KEY/,
  );
  assert.equal(calls, 0);
});

test("B3 live smoke does not retry a failed broad request", async () => {
  let calls = 0;
  await assert.rejects(
    () => runB3LiveSmoke(options(), "test-key", {
      discoverOptions: {
        fetchImpl: async () => {
          calls += 1;
          throw new Error("network unavailable");
        },
      },
    }),
    (error) => error?.code === "provider_unavailable",
  );
  assert.equal(calls, 1);
});

test("B3 live smoke stops after a safe B2 clarification without source or fallback activity", async () => {
  let broadCalls = 0;
  let sourceCalls = 0;
  let fallbackCalls = 0;
  const result = await runB3LiveSmoke(options(), "test-key", {
    discoverOptions: {
      now: NOW,
      fetchImpl: async () => {
        broadCalls += 1;
        return {
          ok: true,
          status: 200,
          json: async () => broadPayload([], {
            identity: { resolvedCompanyName: "NVIDIA and NVIDIA Health", officialDomain: "nvidia.test", ambiguous: true },
          }),
        };
      },
    },
    verificationOptions: {
      sourceFetchImpl: async () => { sourceCalls += 1; throw new Error("must not run"); },
      exaFetchImpl: async () => { fallbackCalls += 1; throw new Error("must not run"); },
    },
  });
  assert.equal(broadCalls, 1);
  assert.equal(sourceCalls, 0);
  assert.equal(fallbackCalls, 0);
  assert.equal(result.b2.state, "clarification_needed");
  assert.equal(result.b3, null);
  assert.deepEqual(result.providerUse, {
    broadExaRequestCount: 1,
    fallbackExaRequestCount: 0,
    totalExaRequestCount: 1,
    fallbackUsed: false,
    fallbackProviderLatencyMs: null,
    fallbackProviderEstimatedCostUsd: null,
  });
});

test("B3 live smoke output is sanitized and the harness has no persistence or retry path", () => {
  const sentinelKey = "exa-live-smoke-secret-key";
  const output = formatSmokeOutput({
    submittedCompany: "NVIDIA",
    b2: { state: "ready_for_verification", company: { companyName: "NVIDIA", officialDomain: "nvidia.com" } },
    providerUse: { broadExaRequestCount: 1, fallbackExaRequestCount: 0, totalExaRequestCount: 1, fallbackUsed: false },
    b3: { state: "verified", evidenceCount: 1, evidence: [{ evidenceSnippet: sentinelKey }] },
  }, sentinelKey);
  assert.match(output, /"submittedCompany": "NVIDIA"/);
  assert.doesNotMatch(output, /EXA_API_KEY|x-api-key|raw response|requestId|exa-live-smoke-secret-key/i);
  const source = readFileSync(new URL("../scripts/phase-b3-live-smoke.mjs", import.meta.url), "utf8");
  assert.match(source, /discoverCompany/);
  assert.match(source, /verifyCompanyDiscovery/);
  assert.doesNotMatch(source, /node:(?:fs|http|https)/);
  assert.doesNotMatch(source, /writeFile|appendFile|createWriteStream|setInterval|while\s*\(/);
  assert.equal((source.match(/discoverCompany\(/g) ?? []).length, 1);
  assert.equal((source.match(/verifyCompanyDiscovery\(/g) ?? []).length, 1);
});
