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
    ambiguous: false,
    ...overrides,
  };
}

function strictAmbiguousEvidence(overrides = {}) {
  return evidence({
    resolvedCompanyName: "Stripe, Inc.",
    ambiguous: true,
    groundingByField: {
      resolvedCompanyName: ["https://stripe.com/about"],
      officialDomain: ["https://stripe.com/legal"],
    },
    ...overrides,
  });
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
  for (const input of ["Stripe Inc.", "Johnson & Johnson, Inc.", "Acme Co."]) {
    assert.deepEqual(prepareCompanyTarget(input), {
      status: TARGET_STATUS.PREPARED,
      kind: TARGET_KIND.NAME,
      submittedInput: input,
      companyName: input,
      officialDomain: null,
    });
  }
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

test("an explicitly unambiguous name can resolve with a non-lexical official domain", () => {
  assert.deepEqual(confirmCompanyIdentity(prepareCompanyTarget("Acme Systems"), {
    resolvedCompanyName: "Acme Systems",
    officialDomain: "blueharbor.test",
    evidenceUrls: ["https://news.blueharbor.test/releases/example"],
    ambiguous: false,
  }), {
    status: TARGET_STATUS.RESOLVED,
    kind: TARGET_KIND.NAME,
    companyName: "Acme Systems",
    officialDomain: "blueharbor.test",
  });
});

test("name evidence requires explicit unambiguous valid corroborated identity evidence", () => {
  const target = prepareCompanyTarget("Stripe");
  for (const candidate of [
    evidence({ evidenceUrls: ["https://example.test/stripe"] }),
    evidence({ officialDomain: "https://stripe.com" }),
    undefined,
    evidence({ ambiguous: true }),
    evidence({ contradictory: true }),
    {
      resolvedCompanyName: "Stripe",
      officialDomain: "stripe.com",
      evidenceUrls: ["https://newsroom.stripe.com/releases/example"],
    },
  ]) {
    assert.equal(confirmCompanyIdentity(target, candidate).status, TARGET_STATUS.CLARIFICATION_NEEDED);
  }
});

test("strict same-entity ambiguity evidence resolves the captured Stripe shape", () => {
  assert.deepEqual(confirmCompanyIdentity(prepareCompanyTarget("Stripe"), strictAmbiguousEvidence()), {
    status: TARGET_STATUS.RESOLVED,
    kind: TARGET_KIND.NAME,
    companyName: "Stripe, Inc.",
    officialDomain: "stripe.com",
  });
});

test("ambiguous names require legal-suffix expansion and field-specific first-party corroboration", () => {
  const target = prepareCompanyTarget("Stripe");
  for (const candidate of [
    strictAmbiguousEvidence({ resolvedCompanyName: "Stripe Payments" }),
    strictAmbiguousEvidence({ resolvedCompanyName: "Stripe Payments, Inc." }),
    strictAmbiguousEvidence({ groundingByField: { officialDomain: ["https://stripe.com/legal"] } }),
    strictAmbiguousEvidence({ groundingByField: { resolvedCompanyName: ["https://stripe.com/about"] } }),
    strictAmbiguousEvidence({
      groundingByField: {
        resolvedCompanyName: ["https://example.test/about"],
        officialDomain: ["https://example.test/legal"],
      },
    }),
    strictAmbiguousEvidence({ officialDomain: "other.test" }),
    strictAmbiguousEvidence({ contradictory: true }),
  ]) {
    assert.equal(confirmCompanyIdentity(target, candidate).status, TARGET_STATUS.CLARIFICATION_NEEDED);
  }
});

test("an exact ambiguous Mercury name still requires clarification", () => {
  const result = confirmCompanyIdentity(prepareCompanyTarget("Mercury"), {
    resolvedCompanyName: "Mercury",
    officialDomain: "mercury.com",
    ambiguous: true,
    groundingByField: {
      resolvedCompanyName: ["https://mercury.com/about"],
      officialDomain: ["https://mercury.com/legal"],
    },
  });
  assert.equal(result.status, TARGET_STATUS.CLARIFICATION_NEEDED);
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
    ambiguous: true,
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

test("Mercury ambiguity requires clarification without a lexical domain rule", () => {
  const result = confirmCompanyIdentity(prepareCompanyTarget("Mercury"), {
    resolvedCompanyName: "Mercury (Fintech) and Mercury Systems (Aerospace/Defense)",
    officialDomain: "mercury.com",
    evidenceUrls: ["https://mercury.com/news/example"],
    ambiguous: true,
    groundingByField: {
      resolvedCompanyName: ["https://mercury.com/news/example"],
      officialDomain: ["https://mercury.com/news/example"],
    },
  });
  assert.equal(result.status, TARGET_STATUS.CLARIFICATION_NEEDED);
});

test("the targeting boundary contains no provider client or company-specific production branch", () => {
  const source = readFileSync(new URL("../src/targeting/companyTarget.mjs", import.meta.url), "utf8");
  assert.doesNotMatch(source, /\b(?:Mercury|shipmercury|Exa|Gemini|Tavily|Groq|Notion|Stripe|Craigslist|Canva)\b/i);
  assert.doesNotMatch(source, /\bfetch\s*\(|\bhttps?\.request\s*\(|\baxios\b|\bnode-fetch\b/i);
  assert.doesNotMatch(source, /\bdomainIsConsistentWithName\b/);
});

// --- B1R1: conservative cross-TLD canonical-domain reconciliation ---

function crossTldEvidence(overrides = {}) {
  return {
    resolvedCompanyName: "Notion",
    officialDomain: "notion.com",
    ambiguous: false,
    evidenceUrls: ["https://www.notion.com/about", "https://notion.com/blog/example"],
    groundingByField: {
      resolvedCompanyName: ["https://www.notion.com/about"],
      officialDomain: ["https://www.notion.com/about", "https://notion.com/legal"],
    },
    ...overrides,
  };
}

test("B1R1: a strongly grounded unambiguous cross-TLD identity reconciles to the provider's canonical domain", () => {
  const target = prepareCompanyTarget("notion.so");
  assert.deepEqual(confirmCompanyIdentity(target, crossTldEvidence()), {
    status: TARGET_STATUS.RESOLVED,
    kind: TARGET_KIND.DOMAIN,
    companyName: "Notion",
    officialDomain: "notion.com",
  });
});

test("B1R1: legal-suffix company-name expansions consistent with the shared brand label still reconcile", () => {
  const target = prepareCompanyTarget("notion.so");
  for (const resolvedCompanyName of ["Notion, Inc.", "Notion Labs, Inc."]) {
    assert.deepEqual(confirmCompanyIdentity(target, crossTldEvidence({ resolvedCompanyName })), {
      status: TARGET_STATUS.RESOLVED,
      kind: TARGET_KIND.DOMAIN,
      companyName: resolvedCompanyName,
      officialDomain: "notion.com",
    });
  }
});

test("B1R1: same-domain and genuine subdomain domain-input behavior is unaffected by the new reconciliation path", () => {
  const target = prepareCompanyTarget("notion.so");
  assert.deepEqual(confirmCompanyIdentity(target, crossTldEvidence({
    officialDomain: "notion.so",
    evidenceUrls: ["https://www.notion.so/about"],
  })), {
    status: TARGET_STATUS.RESOLVED,
    kind: TARGET_KIND.DOMAIN,
    companyName: "Notion",
    officialDomain: "notion.so",
  });
  assert.deepEqual(confirmCompanyIdentity(target, {
    resolvedCompanyName: "Notion",
    officialDomain: "app.notion.so",
    evidenceUrls: ["https://app.notion.so/about"],
    ambiguous: false,
  }), {
    status: TARGET_STATUS.RESOLVED,
    kind: TARGET_KIND.DOMAIN,
    companyName: "Notion",
    officialDomain: "notion.so",
  });
});

test("B1R1: a different brand label never reconciles regardless of grounding strength", () => {
  const target = prepareCompanyTarget("notion.so");
  for (const proposed of ["notionlabs.com", "stripe.com", "other.com"]) {
    assert.deepEqual(
      confirmCompanyIdentity(target, crossTldEvidence({
        officialDomain: proposed,
        groundingByField: {
          resolvedCompanyName: [`https://${proposed}/about`],
          officialDomain: [`https://${proposed}/legal`],
        },
        evidenceUrls: [`https://${proposed}/about`],
      })),
      { status: TARGET_STATUS.CLARIFICATION_NEEDED, reason: "contradictory_identity" },
    );
  }
  // stripe.com -> other.com stays contradictory too (distinct submitted domain)
  assert.deepEqual(
    confirmCompanyIdentity(prepareCompanyTarget("stripe.com"), crossTldEvidence({
      resolvedCompanyName: "Other",
      officialDomain: "other.com",
      groundingByField: {
        resolvedCompanyName: ["https://other.com/about"],
        officialDomain: ["https://other.com/legal"],
      },
      evidenceUrls: ["https://other.com/about"],
    })),
    { status: TARGET_STATUS.CLARIFICATION_NEEDED, reason: "contradictory_identity" },
  );
});

test("B1R1: ambiguous:true never reconciles even with an otherwise-matching brand label", () => {
  const target = prepareCompanyTarget("notion.so");
  assert.deepEqual(confirmCompanyIdentity(target, crossTldEvidence({ ambiguous: true })), {
    status: TARGET_STATUS.CLARIFICATION_NEEDED,
    reason: "contradictory_identity",
  });
});

test("B1R1: missing ambiguity never reconciles even with an otherwise-matching brand label", () => {
  const target = prepareCompanyTarget("notion.so");
  assert.deepEqual(confirmCompanyIdentity(target, crossTldEvidence({ ambiguous: undefined })), {
    status: TARGET_STATUS.CLARIFICATION_NEEDED,
    reason: "contradictory_identity",
  });
});

test("B1R1: a resolved company name inconsistent with the shared brand label does not reconcile", () => {
  const target = prepareCompanyTarget("notion.so");
  assert.deepEqual(confirmCompanyIdentity(target, crossTldEvidence({ resolvedCompanyName: "Acme Systems" })), {
    status: TARGET_STATUS.CLARIFICATION_NEEDED,
    reason: "contradictory_identity",
  });
});

test("B1R1: resolved-name grounding lacking direct proposed-domain corroboration does not reconcile", () => {
  const target = prepareCompanyTarget("notion.so");
  assert.deepEqual(confirmCompanyIdentity(target, crossTldEvidence({
    groundingByField: {
      resolvedCompanyName: ["https://unrelated.test/about"],
      officialDomain: ["https://notion.com/legal"],
    },
  })), { status: TARGET_STATUS.CLARIFICATION_NEEDED, reason: "contradictory_identity" });
});

test("B1R1: absent, empty, or non-array official-domain grounding does not reconcile", () => {
  const target = prepareCompanyTarget("notion.so");
  for (const officialDomain of [undefined, [], "https://notion.com/legal"]) {
    assert.deepEqual(confirmCompanyIdentity(target, crossTldEvidence({
      groundingByField: { resolvedCompanyName: ["https://notion.com/about"], officialDomain },
    })), { status: TARGET_STATUS.CLARIFICATION_NEEDED, reason: "contradictory_identity" });
  }
  assert.deepEqual(confirmCompanyIdentity(target, crossTldEvidence({ groundingByField: undefined })), {
    status: TARGET_STATUS.CLARIFICATION_NEEDED,
    reason: "contradictory_identity",
  });
});

test("B1R1: official-domain grounding mixing proposed-domain and unrelated-domain citations does not reconcile", () => {
  const target = prepareCompanyTarget("notion.so");
  assert.deepEqual(confirmCompanyIdentity(target, crossTldEvidence({
    groundingByField: {
      resolvedCompanyName: ["https://notion.com/about"],
      officialDomain: ["https://notion.com/legal", "https://unrelated.test/other"],
    },
  })), { status: TARGET_STATUS.CLARIFICATION_NEEDED, reason: "contradictory_identity" });
});

test("B1R1: a malformed evidence URL anywhere in official-domain grounding does not reconcile", () => {
  const target = prepareCompanyTarget("notion.so");
  assert.deepEqual(confirmCompanyIdentity(target, crossTldEvidence({
    groundingByField: {
      resolvedCompanyName: ["https://notion.com/about"],
      officialDomain: ["not a url", "https://notion.com/legal"],
    },
  })), { status: TARGET_STATUS.CLARIFICATION_NEEDED, reason: "contradictory_identity" });
});

test("B1R1: multi-label domain shapes on either side never enter the reconciliation rule", () => {
  assert.deepEqual(
    confirmCompanyIdentity(prepareCompanyTarget("app.example.com"), crossTldEvidence({
      resolvedCompanyName: "Example",
      officialDomain: "app.example.io",
      groundingByField: {
        resolvedCompanyName: ["https://app.example.io/about"],
        officialDomain: ["https://app.example.io/legal"],
      },
      evidenceUrls: ["https://app.example.io/about"],
    })),
    { status: TARGET_STATUS.CLARIFICATION_NEEDED, reason: "contradictory_identity" },
  );
  assert.deepEqual(
    confirmCompanyIdentity(prepareCompanyTarget("notion.so"), crossTldEvidence({ officialDomain: "notion.example.com" })),
    { status: TARGET_STATUS.CLARIFICATION_NEEDED, reason: "contradictory_identity" },
  );
});

test("B1R1: deceptive hostnames do not corroborate the proposed domain during reconciliation", () => {
  const target = prepareCompanyTarget("notion.so");
  for (const deceptive of ["https://notion.com.example.test/news", "https://notnotion.com/news"]) {
    assert.deepEqual(confirmCompanyIdentity(target, crossTldEvidence({
      groundingByField: {
        resolvedCompanyName: [deceptive],
        officialDomain: [deceptive],
      },
      evidenceUrls: [deceptive],
    })), { status: TARGET_STATUS.CLARIFICATION_NEEDED, reason: "contradictory_identity" });
  }
});

test("B1R1: combined evidenceUrls must also corroborate the proposed domain even when field grounding is strong", () => {
  const target = prepareCompanyTarget("notion.so");
  assert.deepEqual(confirmCompanyIdentity(target, crossTldEvidence({ evidenceUrls: ["https://unrelated.test/about"] })), {
    status: TARGET_STATUS.CLARIFICATION_NEEDED,
    reason: "contradictory_identity",
  });
});

test("B1R1: brand-label matching is case-insensitive end to end via existing hostname normalization", () => {
  const target = prepareCompanyTarget("NOTION.SO");
  assert.deepEqual(confirmCompanyIdentity(target, crossTldEvidence({ officialDomain: "NOTION.COM" })), {
    status: TARGET_STATUS.RESOLVED,
    kind: TARGET_KIND.DOMAIN,
    companyName: "Notion",
    officialDomain: "notion.com",
  });
});

test("B1R1: IDN/punycode-homograph domains do not silently corroborate a different-codepoint domain", () => {
  // "xn--noton-p2e.com" is the real IDNA/punycode encoding of "notіon.com"
  // using Cyrillic U+0456 in place of Latin "i" -- a classic homograph. It
  // must not be treated as the same brand label as "notion.so"; URL's own
  // IDNA normalization keeps genuinely different codepoints as distinct
  // ASCII labels, so this remains contradictory_identity rather than
  // reconciling.
  const target = prepareCompanyTarget("notion.so");
  const homographDomain = new URL(`https://not${"і"}on.com/`).hostname;
  assert.equal(homographDomain, "xn--noton-p2e.com");
  assert.deepEqual(confirmCompanyIdentity(target, crossTldEvidence({
    officialDomain: homographDomain,
    groundingByField: {
      resolvedCompanyName: [`https://${homographDomain}/about`],
      officialDomain: [`https://${homographDomain}/legal`],
    },
    evidenceUrls: [`https://${homographDomain}/about`],
  })), { status: TARGET_STATUS.CLARIFICATION_NEEDED, reason: "contradictory_identity" });
});

test("B1R1: a short/single-character shared brand label can still reconcile when every condition is otherwise satisfied (documents a known conservative-design limitation, not a bug: unrelated companies sharing a short label are not distinguishable by this rule alone)", () => {
  const target = prepareCompanyTarget("x.co");
  assert.deepEqual(confirmCompanyIdentity(target, {
    resolvedCompanyName: "X Corp",
    officialDomain: "x.com",
    ambiguous: false,
    evidenceUrls: ["https://x.com/about"],
    groundingByField: {
      resolvedCompanyName: ["https://x.com/about"],
      officialDomain: ["https://x.com/legal"],
    },
  }), {
    status: TARGET_STATUS.RESOLVED,
    kind: TARGET_KIND.DOMAIN,
    companyName: "X Corp",
    officialDomain: "x.com",
  });
});
