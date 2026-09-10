import assert from "node:assert/strict";
import test from "node:test";

import {
  ALLOWED_CASES,
  B_VALIDATION_MODE,
  formatValidationOutput,
  parseArgs,
  runPhaseBValidation,
  runValidationCase,
  validateOptions,
} from "../scripts/phase-b-validation.mjs";
import { EXA_SEARCH_ENDPOINT } from "../src/discovery/exaBroadDiscovery.mjs";

const EXA_CONTENTS_ENDPOINT = "https://api.exa.ai/contents";
const NOW = new Date("2026-09-10T12:00:00.000Z");

function jsonResponse(value) {
  return { ok: true, status: 200, json: async () => value };
}

function htmlResponse(html) {
  return new Response(html, { status: 200, headers: { "content-type": "text/html" } });
}

function article(title, body) {
  const metadata = `<script type="application/ld+json">${JSON.stringify({ "@type": "NewsArticle", headline: title, datePublished: "2026-09-01" })}</script>`;
  return `<!doctype html><html><head>${metadata}<title>${title}</title></head><body><article><h1>${title}</h1><p>${body}</p></article></body></html>`;
}

function thinPage(title) {
  return `<!doctype html><html><head><title>${title}</title></head><body><article><h1>${title}</h1><p>Short.</p></article></body></html>`;
}

function searchPayload({ identity, results }) {
  return {
    results,
    output: {
      content: identity,
      grounding:
        identity.ambiguous === false
          ? [
              { field: "resolvedCompanyName", citations: [{ url: `https://${identity.officialDomain}/about`, title: "About" }], confidence: "high" },
              { field: "officialDomain", citations: [{ url: `https://${identity.officialDomain}/about`, title: "About" }], confidence: "high" },
            ]
          : undefined,
    },
    costDollars: { total: 0.007 },
  };
}

function contentsPayload(url, summary) {
  return {
    results: [{ id: url, url, title: "Company", summary }],
    statuses: [{ id: url, status: "success", source: "cached" }],
    costDollars: { total: 0.001 },
  };
}

function stripeFetch() {
  const pages = {
    "https://stripe.com/news/atlas": article("Stripe launches Atlas platform", "Stripe launches Atlas platform for enterprise customers with a substantial new product capability."),
    "https://stripe.com/news/beacon": article("Stripe signs Beacon partnership", "Stripe signs Beacon partnership to deliver a substantial strategic platform agreement for enterprise customers."),
    "https://stripe.com/news/cedar": article("Stripe opens Cedar expansion", "Stripe opens Cedar expansion to add substantial regional capacity for enterprise customers."),
  };
  return async (url) => {
    if (url === EXA_SEARCH_ENDPOINT) {
      return jsonResponse(
        searchPayload({
          identity: { resolvedCompanyName: "Stripe", officialDomain: "stripe.com", ambiguous: false },
          results: [
            { title: "Stripe launches Atlas platform", url: "https://stripe.com/news/atlas", publishedDate: "2026-09-01", highlights: ["Stripe launches Atlas platform."] },
            { title: "Stripe signs Beacon partnership", url: "https://stripe.com/news/beacon", publishedDate: "2026-08-20", highlights: ["Stripe signs Beacon partnership."] },
            { title: "Stripe opens Cedar expansion", url: "https://stripe.com/news/cedar", publishedDate: "2026-08-10", highlights: ["Stripe opens Cedar expansion."] },
          ],
        }),
      );
    }
    if (url === EXA_CONTENTS_ENDPOINT) {
      return jsonResponse(contentsPayload("https://stripe.com/", "Stripe builds payments infrastructure for the internet. Businesses use it to accept payments and manage financial operations online."));
    }
    if (pages[url]) return htmlResponse(pages[url]);
    throw new Error(`unexpected fetch ${url}`);
  };
}

function mercuryFetch() {
  return async (url) => {
    if (url === EXA_SEARCH_ENDPOINT) {
      return jsonResponse(
        searchPayload({
          identity: {
            resolvedCompanyName: "Mercury (Fintech) and Mercury Systems (Aerospace/Defense)",
            officialDomain: "mercury.com",
            ambiguous: true,
          },
          results: [
            { title: "Mercury banking update", url: "https://mercury.com/news/update", publishedDate: "2026-09-01", highlights: ["Mercury update."] },
          ],
        }),
      );
    }
    throw new Error(`unexpected fetch ${url}`);
  };
}

function craigslistFetch() {
  let searchCallCount = 0;
  return async (url) => {
    if (url === EXA_SEARCH_ENDPOINT) {
      searchCallCount += 1;
      if (searchCallCount === 1) {
        return jsonResponse(
          searchPayload({
            identity: { resolvedCompanyName: "Craigslist", officialDomain: "craigslist.org", ambiguous: false },
            results: [
              { title: "Craigslist thin post one", url: "https://craigslist.org/news/one", publishedDate: "2026-09-01", highlights: ["Craigslist thin post one."] },
              { title: "Craigslist thin post two", url: "https://craigslist.org/news/two", publishedDate: "2026-08-20", highlights: ["Craigslist thin post two."] },
            ],
          }),
        );
      }
      return jsonResponse({
        results: [
          { title: "Craigslist thin fallback post", url: "https://craigslist.org/news/fallback", publishedDate: "2026-08-10", highlights: ["Craigslist thin fallback post."] },
        ],
      });
    }
    if (url === EXA_CONTENTS_ENDPOINT) {
      return jsonResponse(contentsPayload("https://craigslist.org/", "Craigslist operates local online classifieds for jobs, housing, and items for sale. Individuals and small businesses use it to post and browse local listings."));
    }
    if (url === "https://craigslist.org/news/one") return htmlResponse(thinPage("Craigslist thin post one"));
    if (url === "https://craigslist.org/news/two") return htmlResponse(thinPage("Craigslist thin post two"));
    if (url === "https://craigslist.org/news/fallback") return htmlResponse(thinPage("Craigslist thin fallback post"));
    throw new Error(`unexpected fetch ${url}`);
  };
}

test("1: ALLOWED_CASES is the exact fixed ordered cohort, has no duplicates, and excludes NVIDIA", () => {
  assert.deepEqual(ALLOWED_CASES, ["Stripe", "PostHog", "Canva", "notion.so", "Mercury", "Craigslist"]);
  assert.equal(new Set(ALLOWED_CASES).size, ALLOWED_CASES.length);
  assert.equal(ALLOWED_CASES.includes("NVIDIA"), false);
});

test("2: validateOptions requires exact mode, confirmation flag, and a key", () => {
  assert.throws(() => validateOptions({ mode: "other", confirmedFreeStarter: true }, "key"), /Phase B validation/);
  assert.throws(() => validateOptions({ mode: B_VALIDATION_MODE, confirmedFreeStarter: false }, "key"), /confirmed-free-starter/);
  assert.throws(() => validateOptions({ mode: B_VALIDATION_MODE, confirmedFreeStarter: true }, ""), /EXA_API_KEY/);
  assert.doesNotThrow(() => validateOptions({ mode: B_VALIDATION_MODE, confirmedFreeStarter: true }, "key"));
});

test("3: parseArgs rejects unknown arguments and recognizes zero-network --help", () => {
  assert.deepEqual(parseArgs([B_VALIDATION_MODE, "--confirmed-free-starter"]), { mode: B_VALIDATION_MODE, confirmedFreeStarter: true });
  assert.deepEqual(parseArgs(["--help"]), { help: true });
  assert.throws(() => parseArgs([B_VALIDATION_MODE, "--company", "NVIDIA"]), /Unknown argument/);
});

test("4: formatValidationOutput redacts the API key", () => {
  const output = formatValidationOutput([{ input: "Stripe", ok: true, summary: { note: "safe" } }], "exa-super-secret-key-0123456789");
  assert.equal(output.includes("exa-super-secret-key-0123456789"), false);
});

test("5: runValidationCase drives the real pipeline to a verified snapshot (Stripe-shaped fixture)", async () => {
  const summary = await runValidationCase("Stripe", "test-key", { fetchImpl: stripeFetch(), now: NOW });

  assert.equal(summary.final.state, "snapshot");
  assert.equal(summary.final.signals.length, 3);
  assert.equal(summary.verification.state, "verified");
  assert.equal(summary.verification.fallbackUsed, false);
  assert.deepEqual(summary.providerUse, {
    broadExaSearchRequests: 1,
    fallbackExaSearchRequests: 0,
    totalExaSearchRequests: 1,
    exaContentsRequests: 1,
    publisherRequests: 3,
  });
});

test("6: runValidationCase honestly reaches clarification_needed for an ambiguous identity (Mercury-shaped fixture)", async () => {
  const summary = await runValidationCase("Mercury", "test-key", { fetchImpl: mercuryFetch(), now: NOW });

  assert.equal(summary.final.state, "clarification_needed");
  assert.equal(summary.final.reason, "company_ambiguous");
  assert.deepEqual(summary.verification, {});
  assert.deepEqual(summary.description, {});
  assert.deepEqual(summary.providerUse, {
    broadExaSearchRequests: 1,
    fallbackExaSearchRequests: 0,
    totalExaSearchRequests: 1,
    exaContentsRequests: 0,
    publisherRequests: 0,
  });
  // The public B5 reason collapses every non-invalid_input clarification to
  // "company_ambiguous"; this asserts the harness still exposes the real
  // underlying B2 discovery reason for diagnostic purposes.
  assert.equal(summary.discovery.state, "clarification_needed");
  assert.equal(summary.discovery.reason, "insufficient_identity_evidence");
});

test("7: runValidationCase honestly reaches insufficient_evidence without padding (Craigslist-shaped fixture)", async () => {
  const summary = await runValidationCase("Craigslist", "test-key", { fetchImpl: craigslistFetch(), now: NOW });

  assert.equal(summary.final.state, "insufficient_evidence");
  assert.deepEqual(summary.final.signals, []);
  assert.equal(summary.verification.state, "insufficient_evidence");
  assert.equal(summary.verification.evidenceCount, 0);
  assert.equal(summary.verification.fallbackUsed, true);
  assert.deepEqual(summary.providerUse, {
    broadExaSearchRequests: 1,
    fallbackExaSearchRequests: 1,
    totalExaSearchRequests: 2,
    exaContentsRequests: 1,
    publisherRequests: 3,
  });
});

test("8: runPhaseBValidation runs every case exactly once, in fixed order, when all succeed", async () => {
  const calls = [];
  const results = await runPhaseBValidation("test-key", {
    now: NOW,
    runCase: async (input) => {
      calls.push(input);
      return { final: { state: "snapshot" }, providerUse: {} };
    },
  });

  assert.deepEqual(calls, ALLOWED_CASES.slice());
  assert.equal(results.length, ALLOWED_CASES.length);
  assert.ok(results.every((entry) => entry.ok));
});

test("9: runPhaseBValidation stops immediately on a failing case and never runs later cases", async () => {
  const calls = [];
  const results = await runPhaseBValidation("test-key", {
    now: NOW,
    runCase: async (input) => {
      calls.push(input);
      if (input === "PostHog") throw new Error("simulated provider budget violation");
      return { final: { state: "snapshot" }, providerUse: {} };
    },
  });

  assert.deepEqual(calls, ["Stripe", "PostHog"]);
  assert.equal(results.length, 2);
  assert.equal(results[0].ok, true);
  assert.equal(results[1].ok, false);
  assert.equal(results[1].input, "PostHog");
  assert.match(results[1].error.message, /simulated provider budget violation/);
});

test("10: runPhaseBValidation requires an API key before running any case", async () => {
  const calls = [];
  await assert.rejects(
    () => runPhaseBValidation("", { runCase: async (input) => { calls.push(input); return {}; } }),
    /EXA_API_KEY/,
  );
  assert.deepEqual(calls, []);
});

test("11: formatValidationOutput redacts the API key even when a failure diagnostic is embedded", () => {
  const results = [
    { input: "Stripe", ok: true, summary: { note: "safe" } },
    { input: "PostHog", ok: false, error: { message: "boom", diagnostic: { note: "exa_abcdefghijklmnopqrstuvwx leaked" } } },
  ];
  const output = formatValidationOutput(results, "super-secret-test-key");
  assert.equal(output.includes("super-secret-test-key"), false);
  assert.equal(output.includes("exa_abcdefghijklmnopqrstuvwx"), false);
});

test("12: runValidationCase rejects NVIDIA before any network request, even though it has its own separate live gate", async () => {
  const calls = [];
  const throwingFetch = async (url) => {
    calls.push(url);
    throw new Error("fetch must never be called for a rejected input");
  };

  await assert.rejects(
    () => runValidationCase("NVIDIA", "test-key", { fetchImpl: throwingFetch, now: NOW }),
    /not part of the fixed Phase B validation cohort/,
  );
  assert.deepEqual(calls, []);
});

test("13: runValidationCase rejects an arbitrary seventh company before any network request", async () => {
  const calls = [];
  const throwingFetch = async (url) => {
    calls.push(url);
    throw new Error("fetch must never be called for a rejected input");
  };

  await assert.rejects(
    () => runValidationCase("Acme Corp", "test-key", { fetchImpl: throwingFetch, now: NOW }),
    /not part of the fixed Phase B validation cohort/,
  );
  assert.deepEqual(calls, []);
});

test("14: the fixed cohort remains exactly the six authorized cases, unaffected by the allowlist rejection", () => {
  assert.deepEqual(ALLOWED_CASES, ["Stripe", "PostHog", "Canva", "notion.so", "Mercury", "Craigslist"]);
});

function notionSoDomainMismatchFetch() {
  return async (url) => {
    if (url === EXA_SEARCH_ENDPOINT) {
      return jsonResponse(
        searchPayload({
          // The real B1 domain-input identity check (src/targeting/companyTarget.mjs,
          // TARGET_KIND.DOMAIN branch) compares this provider-returned officialDomain
          // against the submitted "notion.so" target. "notion.com" is neither equal
          // to nor a subdomain of "notion.so", so the real production targeting code
          // returns clarification("contradictory_identity") -- this is not injected,
          // it is the actual documented mismatch behavior exercised end to end.
          identity: { resolvedCompanyName: "Notion Labs, Inc.", officialDomain: "notion.com", ambiguous: false },
          results: [
            { title: "Notion product update", url: "https://notion.com/blog/update", publishedDate: "2026-09-01", highlights: ["Notion product update."] },
          ],
        }),
      );
    }
    throw new Error(`unexpected fetch ${url}`);
  };
}

test("15: runValidationCase drives the real targeting/discovery pipeline to the genuine contradictory_identity reason for a domain-input mismatch (notion.so-shaped fixture), while the public B5 reason still collapses to company_ambiguous", async () => {
  const summary = await runValidationCase("notion.so", "test-key", { fetchImpl: notionSoDomainMismatchFetch(), now: NOW });

  assert.equal(summary.final.state, "clarification_needed");
  assert.equal(summary.final.reason, "company_ambiguous");
  assert.equal(summary.discovery.state, "clarification_needed");
  assert.equal(summary.discovery.reason, "contradictory_identity");
  assert.deepEqual(summary.providerUse, {
    broadExaSearchRequests: 1,
    fallbackExaSearchRequests: 0,
    totalExaSearchRequests: 1,
    exaContentsRequests: 0,
    publisherRequests: 0,
  });
});
