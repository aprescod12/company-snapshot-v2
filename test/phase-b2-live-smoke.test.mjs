import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { ALLOWED_INPUTS, B2_SMOKE_MODE, formatSmokeOutput, parseArgs, validateOptions } from "../scripts/phase-b2-live-smoke.mjs";

test("B2 smoke restricts live use to approved inputs and an explicit free-tier attestation", () => {
  const valid = parseArgs([B2_SMOKE_MODE, "--company", "Stripe", "--confirmed-free-starter"]);
  assert.doesNotThrow(() => validateOptions(valid, "test-key"));
  assert.deepEqual(ALLOWED_INPUTS, ["Stripe", "stripe.com"]);
  assert.throws(() => validateOptions({ ...valid, company: "Mercury" }, "test-key"), /restricted/i);
  assert.throws(() => validateOptions({ ...valid, confirmedFreeStarter: false }, "test-key"), /confirmed-free-starter/);
});

test("smoke output is transient review metadata without a key or raw response object", () => {
  const diagnostic = {
    identity: { resolvedCompanyName: "Stripe", officialDomain: "stripe.com", ambiguous: false },
    groundingByField: { resolvedCompanyName: ["https://stripe.com/about"], officialDomain: ["https://stripe.com/about"] },
    confirmation: { state: "resolved", reason: null },
    provider: { resultCount: 1, datedCount: 1, highlightedCount: 1, uniqueDomainCount: 1, latencyMs: 10, estimatedCostUsd: 0.007 },
  };
  const output = formatSmokeOutput({
    result: {
      state: "ready_for_verification",
      company: { inputKind: "name", companyName: "Stripe", officialDomain: "stripe.com" },
      candidates: [{ rank: 1, title: "Stripe event", url: "https://stripe.com/news" }],
      prioritized: [{}],
      selected: [{}],
      evaluated: [{ reason: "SELECTED" }],
    },
    diagnostic,
  });
  assert.match(output, /b2_state=ready_for_verification/);
  assert.match(output, /resolved_company_name="Stripe"/);
  assert.match(output, /official_domain_grounding_count=1/);
  assert.match(output, /candidate_review/);
  assert.doesNotMatch(output, /EXA_API_KEY|requestId|raw response/i);

  const clarificationOutput = formatSmokeOutput({
    result: { state: "clarification_needed", reason: "insufficient_identity_evidence" },
    diagnostic: {
      ...diagnostic,
      identity: { ...diagnostic.identity, ambiguous: undefined },
      confirmation: { state: "clarification_needed", reason: "insufficient_identity_evidence" },
    },
  });
  assert.match(clarificationOutput, /ambiguous=null/);
  assert.match(clarificationOutput, /b1_confirmation_state=clarification_needed/);
  assert.doesNotMatch(clarificationOutput, /candidate_review|Stripe event|https:\/\/stripe\.com\/news/);
});

test("smoke imports production B2 code and has no persistence, polling, or duplicate request path", () => {
  const source = readFileSync(new URL("../scripts/phase-b2-live-smoke.mjs", import.meta.url), "utf8");
  assert.match(source, /discoverCompanyForSmoke/);
  assert.doesNotMatch(source, /node:(?:fs|http|https)/);
  assert.doesNotMatch(source, /writeFile|appendFile|createWriteStream|setInterval|while\s*\(/);
  assert.equal((source.match(/discoverCompanyForSmoke\(/g) ?? []).length, 1);
});
