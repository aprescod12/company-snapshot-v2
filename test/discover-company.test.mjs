import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { buildIdentityEvidence, discoverCompany } from "../src/discovery/discoverCompany.mjs";

const NOW = new Date("2026-09-09T12:00:00.000Z");

function payload({ identity = { resolvedCompanyName: "Stripe", officialDomain: "stripe.com", ambiguous: false }, evidenceDomain = "stripe.com" } = {}) {
  return {
    results: [
      { title: "Stripe platform release", url: "https://stripe.com/news/platform", publishedDate: "2026-09-01", highlights: ["Current signal"] },
      { title: null, url: "https://example.test/untitled", publishedDate: null, highlights: [] },
      { title: "Stripe partnership", url: "https://example.test/partnership", publishedDate: "2026-08-20", highlights: [] },
      { title: "Stripe expansion", url: "https://stripe.com/news/expansion", publishedDate: "2026-08-10", highlights: [] },
      { title: "Stripe leadership", url: "https://example.test/leadership", publishedDate: "2026-07-01", highlights: [] },
    ],
    output: {
      content: identity,
      grounding: [
        { field: "resolvedCompanyName", citations: [{ url: `https://${evidenceDomain}/about`, title: "About" }], confidence: "high" },
        { field: "officialDomain", citations: [{ url: `https://${evidenceDomain}/about`, title: "About" }], confidence: "high" },
      ],
    },
    costDollars: { total: 0.007 },
  };
}

function fetchPayload(value, calls) {
  return async () => {
    calls.count += 1;
    return { ok: true, status: 200, json: async () => value };
  };
}

test("clear name resolves through B1 and exposes the full prioritized verification queue", async () => {
  const calls = { count: 0 };
  const result = await discoverCompany("Stripe", "test-key", {
    now: NOW,
    fetchImpl: fetchPayload(payload(), calls),
  });

  assert.equal(calls.count, 1);
  assert.equal(result.state, "ready_for_verification");
  assert.deepEqual(result.company, { inputKind: "name", companyName: "Stripe", officialDomain: "stripe.com" });
  assert.equal(result.candidates.length, 5);
  assert.equal(result.prioritized.length, 4);
  assert.deepEqual(result.selected, result.prioritized.slice(0, 3));
  assert.equal(result.evaluated.find((entry) => entry.candidate.title === null).reason, "INVALID");
  assert.equal(result.provider.resultCount, 5);
});

test("ambiguous and unsupported name evidence quarantine candidates", async () => {
  for (const value of [
    payload({ identity: { resolvedCompanyName: "Mercury", officialDomain: "mercury.com", ambiguous: true } }),
    payload({ evidenceDomain: "unrelated.test" }),
  ]) {
    const calls = { count: 0 };
    const result = await discoverCompany(value.output.content.resolvedCompanyName === "Mercury" ? "Mercury" : "Stripe", "test-key", {
      now: NOW,
      fetchImpl: fetchPayload(value, calls),
    }).catch((error) => ({ error }));
    assert.equal(calls.count, 1);
    if (result.error) {
      assert.equal(result.error.code, "provider_format");
    } else {
      assert.deepEqual(Object.keys(result).sort(), ["reason", "state"]);
      assert.equal(result.state, "clarification_needed");
    }
  }
});

test("missing ambiguity is a safe clarification rather than a verification-ready response", async () => {
  const missingAmbiguity = payload({ identity: { resolvedCompanyName: "Stripe", officialDomain: "stripe.com" } });
  const calls = { count: 0 };
  const result = await discoverCompany("Stripe", "test-key", {
    now: NOW,
    fetchImpl: fetchPayload(missingAmbiguity, calls),
  });
  assert.equal(calls.count, 1);
  assert.deepEqual(Object.keys(result).sort(), ["reason", "state"]);
  assert.equal(result.state, "clarification_needed");
});

test("B2 hands B1 the exact parsed identity plus combined exact grounding", async () => {
  const observed = [];
  const result = await discoverCompany("Stripe", "test-key", {
    now: NOW,
    fetchImpl: fetchPayload(payload(), { count: 0 }),
    onDiagnostic: (diagnostic) => observed.push(diagnostic),
  });
  assert.equal(result.state, "ready_for_verification");
  assert.equal(observed.length, 1);
  assert.deepEqual(observed[0].identity, {
    resolvedCompanyName: "Stripe",
    officialDomain: "stripe.com",
    ambiguous: false,
  });
  assert.deepEqual(observed[0].groundingByField, {
    resolvedCompanyName: ["https://stripe.com/about"],
    officialDomain: ["https://stripe.com/about"],
  });
  assert.equal(observed[0].confirmation.state, "resolved");
  assert.deepEqual(
    buildIdentityEvidence({
      identity: observed[0].identity,
      evidenceUrls: ["https://stripe.com/about"],
    }),
    {
      resolvedCompanyName: "Stripe",
      officialDomain: "stripe.com",
      ambiguous: false,
      evidenceUrls: ["https://stripe.com/about"],
    },
  );
});

test("diagnostic observer is sanitized while default clarification remains queue-free", async () => {
  const observed = [];
  const result = await discoverCompany("Stripe", "test-key", {
    now: NOW,
    fetchImpl: fetchPayload(payload({ identity: { resolvedCompanyName: "Stripe", officialDomain: "stripe.com", ambiguous: true } }), { count: 0 }),
    onDiagnostic: (diagnostic) => observed.push(diagnostic),
  });
  assert.deepEqual(result, { state: "clarification_needed", reason: "insufficient_identity_evidence" });
  assert.equal(observed.length, 1);
  assert.deepEqual(Object.keys(observed[0]).sort(), ["confirmation", "groundingByField", "identity", "provider"]);
  assert.equal("candidates" in observed[0], false);
  assert.equal("highlights" in observed[0], false);
  assert.equal(observed[0].provider.resultCount, 5);
});

test("domain input remains anchored and contradictory retargeting stops safely", async () => {
  const calls = { count: 0 };
  const ready = await discoverCompany("https://stripe.com/product?x=1", "test-key", {
    now: NOW,
    fetchImpl: fetchPayload(payload(), calls),
  });
  assert.equal(calls.count, 1);
  assert.equal(ready.state, "ready_for_verification");
  assert.equal(ready.company.inputKind, "domain");
  assert.equal(ready.company.officialDomain, "stripe.com");
  assert.equal(ready.company.companyName, "Stripe");

  const retargetCalls = { count: 0 };
  const retarget = await discoverCompany("stripe.com", "test-key", {
    now: NOW,
    fetchImpl: fetchPayload(payload({ identity: { resolvedCompanyName: "Other", officialDomain: "other.test", ambiguous: false }, evidenceDomain: "other.test" }), retargetCalls),
  });
  assert.equal(retargetCalls.count, 1);
  assert.deepEqual(Object.keys(retarget).sort(), ["reason", "state"]);
  assert.equal(retarget.state, "clarification_needed");
});

test("invalid user input stops before provider access and production code has no script dependency", async () => {
  let calls = 0;
  const result = await discoverCompany("https://localhost", "test-key", {
    now: NOW,
    fetchImpl: async () => {
      calls += 1;
      throw new Error("should not run");
    },
  });
  assert.equal(calls, 0);
  assert.equal(result.state, "clarification_needed");

  for (const file of ["../src/discovery/exaBroadDiscovery.mjs", "../src/discovery/discoverCompany.mjs"]) {
    const source = readFileSync(new URL(file, import.meta.url), "utf8");
    assert.doesNotMatch(source, /from\s+["'][^"']*scripts\//);
  }
});
