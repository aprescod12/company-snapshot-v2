import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  TARGET_KIND,
  TARGET_STATUS,
  confirmCompanyIdentity,
  prepareCompanyTarget,
} from "../src/targeting/companyTarget.mjs";

function evidence(overrides = {}) {
  return {
    resolvedCompanyName: "Stripe",
    officialDomain: "stripe.com",
    evidenceUrls: ["https://newsroom.stripe.com/releases/example"],
    ...overrides,
  };
}

test("name input is normalized without inventing an official domain", () => {
  assert.deepEqual(prepareCompanyTarget("Stripe"), {
    status: TARGET_STATUS.PREPARED,
    kind: TARGET_KIND.NAME,
    submittedInput: "Stripe",
    companyName: "Stripe",
    officialDomain: null,
  });
  assert.deepEqual(prepareCompanyTarget("  PostHog  "), {
    status: TARGET_STATUS.PREPARED,
    kind: TARGET_KIND.NAME,
    submittedInput: "PostHog",
    companyName: "PostHog",
    officialDomain: null,
  });
  assert.equal(prepareCompanyTarget("Acme Systems").companyName, "Acme Systems");
});

test("common website inputs use one normalized hostname anchor", () => {
  for (const input of [
    "notion.so",
    "www.notion.so",
    "https://notion.so",
    "https://www.notion.so/",
    "https://www.notion.so/product?x=1#section",
    "HTTPS://WWW.NOTION.SO/PRODUCT",
  ]) {
    assert.deepEqual(prepareCompanyTarget(input), {
      status: TARGET_STATUS.PREPARED,
      kind: TARGET_KIND.DOMAIN,
      submittedInput: input,
      companyName: null,
      officialDomain: "notion.so",
    });
  }
});

test("empty, malformed, and non-public website inputs need clarification", () => {
  for (const input of [
    "",
    "   ",
    "notion..so",
    "https://",
    "ftp://notion.so",
    "https://user:pass@notion.so",
    "company/path",
    "https://localhost/",
    "https://127.0.0.1/",
    "https://[::1]/",
  ]) {
    assert.deepEqual(prepareCompanyTarget(input), {
      status: TARGET_STATUS.CLARIFICATION_NEEDED,
      reason: "invalid_input",
    });
  }
});

test("clear name evidence with a corroborated official domain resolves", () => {
  const result = confirmCompanyIdentity(prepareCompanyTarget("Stripe"), evidence());
  assert.deepEqual(result, {
    status: TARGET_STATUS.RESOLVED,
    kind: TARGET_KIND.NAME,
    companyName: "Stripe",
    officialDomain: "stripe.com",
  });
});

test("a multi-word name can match its complete hyphenated domain label", () => {
  assert.deepEqual(confirmCompanyIdentity(prepareCompanyTarget("Acme Systems"), {
    resolvedCompanyName: "Acme Systems",
    officialDomain: "acme-systems.com",
    evidenceUrls: ["https://news.acme-systems.com/releases/example"],
  }), {
    status: TARGET_STATUS.RESOLVED,
    kind: TARGET_KIND.NAME,
    companyName: "Acme Systems",
    officialDomain: "acme-systems.com",
  });
});

test("name evidence must include a valid corroborated domain", () => {
  const target = prepareCompanyTarget("Stripe");
  for (const candidate of [
    evidence({ evidenceUrls: ["https://example.test/stripe"] }),
    evidence({ officialDomain: "https://stripe.com" }),
    undefined,
    evidence({ ambiguous: true }),
    evidence({ contradictory: true }),
  ]) {
    assert.equal(confirmCompanyIdentity(target, candidate).status, TARGET_STATUS.CLARIFICATION_NEEDED);
  }
});

test("deceptive hostnames do not corroborate an official domain", () => {
  const target = prepareCompanyTarget("Stripe");
  for (const url of ["https://stripe.com.example.test/news", "https://notstripe.com/news", "https://stripe-company.com/news"]) {
    assert.equal(
      confirmCompanyIdentity(target, evidence({ evidenceUrls: [url] })).status,
      TARGET_STATUS.CLARIFICATION_NEEDED,
    );
  }
});

test("domain input retains its submitted anchor and rejects provider retargeting", () => {
  const target = prepareCompanyTarget("https://www.notion.so/product");
  assert.deepEqual(confirmCompanyIdentity(target, {
    resolvedCompanyName: "Notion",
    officialDomain: "notion.so",
    evidenceUrls: ["https://www.notion.so/releases/example"],
  }), {
    status: TARGET_STATUS.RESOLVED,
    kind: TARGET_KIND.DOMAIN,
    companyName: "Notion",
    officialDomain: "notion.so",
  });
  assert.deepEqual(confirmCompanyIdentity(target, evidence({ officialDomain: "stripe.com" })), {
    status: TARGET_STATUS.CLARIFICATION_NEEDED,
    reason: "contradictory_identity",
  });
  assert.deepEqual(confirmCompanyIdentity(target, {
    resolvedCompanyName: "Stripe",
    evidenceUrls: ["https://stripe.com/news/example"],
  }), {
    status: TARGET_STATUS.CLARIFICATION_NEEDED,
    reason: "invalid_identity_evidence",
  });
  assert.deepEqual(confirmCompanyIdentity(target, {
    resolvedCompanyName: "Stripe",
    officialDomain: "notion.so",
    evidenceUrls: ["https://stripe.com/news/example"],
  }), {
    status: TARGET_STATUS.CLARIFICATION_NEEDED,
    reason: "insufficient_identity_evidence",
  });
});

test("generic conservative consistency guard prevents Mercury from resolving to shipmercury.com", () => {
  const result = confirmCompanyIdentity(prepareCompanyTarget("Mercury"), {
    resolvedCompanyName: "Mercury",
    officialDomain: "shipmercury.com",
    evidenceUrls: ["https://shipmercury.com/news/example"],
  });
  assert.equal(result.status, TARGET_STATUS.CLARIFICATION_NEEDED);
});

test("the targeting boundary contains no provider client or company-specific production branch", () => {
  const source = readFileSync(new URL("../src/targeting/companyTarget.mjs", import.meta.url), "utf8");
  assert.doesNotMatch(source, /\b(?:Mercury|shipmercury|Exa|Gemini|Tavily|Groq)\b/i);
  assert.doesNotMatch(source, /\bfetch\s*\(|\bhttps?\.request\s*\(|\baxios\b|\bnode-fetch\b/i);
});
