import assert from "node:assert/strict";
import test from "node:test";

import { createCompanySnapshot } from "../src/orchestration/createCompanySnapshot.mjs";
import { BroadDiscoveryError } from "../src/discovery/exaBroadDiscovery.mjs";
import { CompanyDescriptionError } from "../src/description/exaCompanyDescription.mjs";

const NOW = new Date("2026-09-10T12:00:00.000Z");
const COMPANY = Object.freeze({ inputKind: "name", companyName: "Acme", officialDomain: "acme.test" });

function evidence(count) {
  return Array.from({ length: count }, (_, index) =>
    Object.freeze({
      candidateTitle: `raw ${index}`,
      sourceTitle: `Acme event ${index + 1}`,
      sourceUrl: `https://exa.example/${index}`,
      resolvedUrl: `https://acme.test/news/${index + 1}`,
      publishedDate: "2026-09-01T00:00:00.000Z",
      recencyBucket: "RECENT",
      sourceClass: "FIRST_PARTY",
      evidenceSnippet: "snippet",
    }),
  );
}

function readyDiscovery(overrides = {}) {
  return Object.freeze({
    state: "ready_for_verification",
    company: COMPANY,
    prioritized: Object.freeze([]),
    ...overrides,
  });
}

function verifiedResult(count = 3) {
  return Object.freeze({
    state: count === 3 ? "verified" : "insufficient_evidence",
    company: COMPANY,
    evidence: Object.freeze(evidence(count)),
    retrieval: Object.freeze({ fallbackUsed: false, exaRequestCount: 1 }),
  });
}

function describedResult(overrides = {}) {
  return Object.freeze({
    state: "described",
    company: { companyName: COMPANY.companyName, officialDomain: COMPANY.officialDomain },
    description: "Acme builds enterprise software for supply-chain teams. Retailers use its platform to coordinate suppliers.",
    sourceUrl: "https://acme.test/",
    provider: { latencyMs: 100, estimatedCostUsd: 0.001 },
    ...overrides,
  });
}

test("A: invalid input stops at discovery and maps to invalid_input", async () => {
  const calls = [];
  const services = {
    discoverCompany: async (...args) => {
      calls.push(["discover", ...args]);
      return { state: "clarification_needed", reason: "invalid_input" };
    },
    verifyCompanyDiscovery: async (...args) => { calls.push(["verify", ...args]); throw new Error("must not run"); },
    requestCompanyDescription: async (...args) => { calls.push(["describe", ...args]); throw new Error("must not run"); },
    assembleSnapshot: (...args) => { calls.push(["assemble", ...args]); throw new Error("must not run"); },
  };

  const result = await createCompanySnapshot("", "test-key", { now: NOW, services });

  assert.deepEqual(result, { state: "clarification_needed", reason: "invalid_input" });
  assert.deepEqual(calls.map((c) => c[0]), ["discover"]);
});

test("B: an ambiguous/unresolved company maps to company_ambiguous and stops", async () => {
  const calls = [];
  const services = {
    discoverCompany: async (...args) => {
      calls.push(["discover", ...args]);
      return { state: "clarification_needed", reason: "insufficient_identity_evidence" };
    },
    verifyCompanyDiscovery: async () => { calls.push(["verify"]); throw new Error("must not run"); },
    requestCompanyDescription: async () => { calls.push(["describe"]); throw new Error("must not run"); },
    assembleSnapshot: () => { calls.push(["assemble"]); throw new Error("must not run"); },
  };

  const result = await createCompanySnapshot("Mercury", "test-key", { now: NOW, services });

  assert.deepEqual(result, { state: "clarification_needed", reason: "company_ambiguous" });
  assert.deepEqual(calls.map((c) => c[0]), ["discover"]);
});

test("C: verified success runs discover -> verify -> describe -> assemble exactly once each, in order, with confirmed identity passed through", async () => {
  const calls = [];
  const discovery = readyDiscovery();
  const verification = verifiedResult(3);
  const described = describedResult();
  const snapshot = Object.freeze({ state: "snapshot", company: { name: "Acme", domain: "acme.test", description: described.description }, signals: [] });

  const services = {
    discoverCompany: async (rawInput, apiKey, options) => {
      calls.push({ stage: "discover", rawInput, apiKey, options });
      return discovery;
    },
    verifyCompanyDiscovery: async (disc, apiKey, options) => {
      calls.push({ stage: "verify", disc, apiKey, options });
      return verification;
    },
    requestCompanyDescription: async (company, apiKey, options) => {
      calls.push({ stage: "describe", company, apiKey, options });
      return described;
    },
    assembleSnapshot: (args) => {
      calls.push({ stage: "assemble", args });
      return snapshot;
    },
  };

  const rawInput = "acme incorporated";
  const result = await createCompanySnapshot(rawInput, "test-key", { now: NOW, services });

  assert.deepEqual(calls.map((c) => c.stage), ["discover", "verify", "describe", "assemble"]);
  assert.equal(calls[0].rawInput, rawInput);
  assert.equal(calls[0].apiKey, "test-key");
  assert.equal(calls[0].options.now, NOW);
  assert.equal(calls[1].disc, discovery);
  assert.equal(calls[1].options.now, NOW);
  assert.deepEqual(calls[2].company, { companyName: "Acme", officialDomain: "acme.test" });
  assert.notEqual(calls[2].company.companyName, rawInput);
  assert.notEqual(calls[2].company.officialDomain, rawInput);
  assert.equal(calls[2].apiKey, "test-key");
  assert.equal(calls[3].args.verification, verification);
  assert.equal(calls[3].args.description, described.description);
  assert.equal(result, snapshot);
});

test("D: insufficient evidence still runs describe and assemble, and never pads signals", async () => {
  for (const count of [0, 2]) {
    const calls = [];
    const discovery = readyDiscovery();
    const verification = verifiedResult(count);
    const described = describedResult();
    const insufficient = Object.freeze({
      state: "insufficient_evidence",
      company: { name: "Acme", domain: "acme.test", description: described.description },
      signals: Array.from({ length: count }, (_, i) => ({ title: `s${i}` })),
    });

    const services = {
      discoverCompany: async () => { calls.push("discover"); return discovery; },
      verifyCompanyDiscovery: async () => { calls.push("verify"); return verification; },
      requestCompanyDescription: async () => { calls.push("describe"); return described; },
      assembleSnapshot: () => { calls.push("assemble"); return insufficient; },
    };

    const result = await createCompanySnapshot("Acme", "test-key", { now: NOW, services });

    assert.deepEqual(calls, ["discover", "verify", "describe", "assemble"]);
    assert.equal(result, insufficient);
    assert.equal(result.signals.length, count);
  }
});

test("E: a normal description_unavailable result maps to unavailable/description_unavailable and does not assemble", async () => {
  const calls = [];
  const services = {
    discoverCompany: async () => readyDiscovery(),
    verifyCompanyDiscovery: async () => verifiedResult(3),
    requestCompanyDescription: async () => {
      calls.push("describe");
      return { state: "description_unavailable", reason: "empty_summary" };
    },
    assembleSnapshot: () => { calls.push("assemble"); throw new Error("must not run"); },
  };

  const result = await createCompanySnapshot("Acme", "test-key", { now: NOW, services });

  assert.deepEqual(result, { state: "unavailable", reason: "description_unavailable" });
  assert.deepEqual(calls, ["describe"]);
});

test("F: a discovery provider failure maps to unavailable/provider_unavailable and stops", async () => {
  const calls = [];
  const services = {
    discoverCompany: async () => { calls.push("discover"); throw new BroadDiscoveryError("provider_unavailable", "Exa request timed out."); },
    verifyCompanyDiscovery: async () => { calls.push("verify"); throw new Error("must not run"); },
    requestCompanyDescription: async () => { calls.push("describe"); throw new Error("must not run"); },
    assembleSnapshot: () => { calls.push("assemble"); throw new Error("must not run"); },
  };

  const result = await createCompanySnapshot("Acme", "test-key", { now: NOW, services });

  assert.deepEqual(result, { state: "unavailable", reason: "provider_unavailable" });
  assert.deepEqual(calls, ["discover"]);
});

test("G: a B3 (fallback) provider failure maps to unavailable/provider_unavailable and does not describe or assemble", async () => {
  const calls = [];
  const services = {
    discoverCompany: async () => readyDiscovery(),
    verifyCompanyDiscovery: async () => { calls.push("verify"); throw new BroadDiscoveryError("provider_quota", "Exa returned HTTP 429."); },
    requestCompanyDescription: async () => { calls.push("describe"); throw new Error("must not run"); },
    assembleSnapshot: () => { calls.push("assemble"); throw new Error("must not run"); },
  };

  const result = await createCompanySnapshot("Acme", "test-key", { now: NOW, services });

  assert.deepEqual(result, { state: "unavailable", reason: "provider_unavailable" });
  assert.deepEqual(calls, ["verify"]);
});

test("H: a B4B provider failure maps to unavailable/provider_unavailable and does not assemble", async () => {
  const calls = [];
  const services = {
    discoverCompany: async () => readyDiscovery(),
    verifyCompanyDiscovery: async () => verifiedResult(3),
    requestCompanyDescription: async () => { calls.push("describe"); throw new CompanyDescriptionError("provider_auth", "EXA_API_KEY is not set."); },
    assembleSnapshot: () => { calls.push("assemble"); throw new Error("must not run"); },
  };

  const result = await createCompanySnapshot("Acme", "test-key", { now: NOW, services });

  assert.deepEqual(result, { state: "unavailable", reason: "provider_unavailable" });
  assert.deepEqual(calls, ["describe"]);
});

test("I: an unexpected programming error is rethrown, not converted to unavailable", async () => {
  const boom = new TypeError("unexpected contract violation");
  const services = {
    discoverCompany: async () => readyDiscovery(),
    verifyCompanyDiscovery: async () => { throw boom; },
    requestCompanyDescription: async () => { throw new Error("must not run"); },
    assembleSnapshot: () => { throw new Error("must not run"); },
  };

  await assert.rejects(
    () => createCompanySnapshot("Acme", "test-key", { now: NOW, services }),
    (error) => error === boom,
  );
});

test("J: an unexpected error from discovery itself is also rethrown, and no later stage runs", async () => {
  const boom = new TypeError("boom");
  const calls = [];
  const services = {
    discoverCompany: async () => { calls.push("discover"); throw boom; },
    verifyCompanyDiscovery: async () => { calls.push("verify"); throw new Error("must not run"); },
    requestCompanyDescription: async () => { calls.push("describe"); throw new Error("must not run"); },
    assembleSnapshot: () => { calls.push("assemble"); throw new Error("must not run"); },
  };

  await assert.rejects(() => createCompanySnapshot("Acme", "test-key", { now: NOW, services }), (error) => error === boom);
  assert.deepEqual(calls, ["discover"]);
});

test("with no services override, the real production discovery path is used (zero-network for invalid input)", async () => {
  const result = await createCompanySnapshot("", "test-key");
  assert.deepEqual(result, { state: "clarification_needed", reason: "invalid_input" });
});
