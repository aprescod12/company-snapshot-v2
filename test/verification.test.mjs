import assert from "node:assert/strict";
import test from "node:test";

import {
  extractArticleEvidence,
  verifyCandidate,
  verifyCompanyDiscovery,
  verifyCompanyDiscoveryForSmoke,
} from "../src/verification/verifyCompany.mjs";
import { fetchHtmlSource, parseSafeSourceUrl } from "../src/verification/sourceFetch.mjs";

const NOW = new Date("2026-09-09T12:00:00.000Z");
const COMPANY = { inputKind: "name", companyName: "Acme", officialDomain: "acme.test" };

function article({ title = "Acme launches Atlas platform", date = "2026-09-01", body, jsonLd = true } = {}) {
  const articleBody = body ?? "Acme launches Atlas platform for enterprise teams with a substantial new product capability and customer rollout.";
  const metadata = jsonLd
    ? `<script type="application/ld+json">${JSON.stringify({ "@type": "NewsArticle", headline: title, datePublished: date })}</script>`
    : "";
  return `<!doctype html><html><head>${metadata}<title>${title}</title></head><body><article><h1>${title}</h1><p>${articleBody}</p><p>Acme says this material development changes its product offering for customers.</p></article></body></html>`;
}

function response(html, { status = 200, contentType = "text/html", headers = {} } = {}) {
  return new Response(html, { status, headers: { "content-type": contentType, ...headers } });
}

function candidate(overrides = {}) {
  return {
    rank: 1,
    title: "Acme launches Atlas platform",
    url: "https://acme.test/news/atlas",
    publishedDate: "2000-01-01",
    author: null,
    highlights: ["Acme launches Atlas platform for enterprise customers."],
    ...overrides,
  };
}

function sourceMap(pages, calls = []) {
  return async (url) => {
    calls.push(url);
    const item = pages[url];
    if (!item) throw new Error(`unexpected source ${url}`);
    return item instanceof Response ? item : response(item);
  };
}

function discovery(prioritized) {
  return { state: "ready_for_verification", company: COMPANY, prioritized };
}

function rawFallbackPayload(candidates) {
  return { results: candidates };
}

function bodyFallbackPage({
  title = "Acme launches Atlas platform",
  visibleDate = null,
  body = "Acme launches Atlas platform with a substantial new product capability for enterprise customers and partners. Acme says the development expands its platform and changes how customers operate.",
  footerDate = null,
  buriedDate = null,
  chromeOnly = false,
} = {}) {
  const content = chromeOnly
    ? ""
    : `<section><h1>${title}</h1>${visibleDate ? `<p>${visibleDate}</p>` : ""}<p>${body}</p>${buriedDate ? `<p>${"x".repeat(1_600)} ${buriedDate}</p>` : ""}</section>`;
  return `<!doctype html><html><head><title>${title}</title></head><body><header>Acme navigation and generic company information</header><nav>Acme products company navigation</nav><aside>Acme related resources</aside><form>Acme newsletter controls</form>${content}<footer>${footerDate ?? "Copyright 2026 Acme"}</footer></body></html>`;
}

test("source fetch accepts exact HTML and follows a bounded redirect", async () => {
  const calls = [];
  const result = await fetchHtmlSource("https://publisher.test/old", {
    fetchImpl: async (url) => {
      calls.push(url);
      return url.endsWith("/old")
        ? response("", { status: 302, headers: { location: "/article" } })
        : response(article());
    },
  });
  assert.equal(result.ok, true);
  assert.equal(result.resolvedUrl, "https://publisher.test/article");
  assert.deepEqual(calls, ["https://publisher.test/old", "https://publisher.test/article"]);
});

test("source fetch fail-closes redirect overflow, status failures, timeout, oversize, and non-HTML", async () => {
  await assert.rejects(() => fetchHtmlSource("https://publisher.test/article", { maxRedirects: 6 }), /maxRedirects/);
  await assert.rejects(() => fetchHtmlSource("https://publisher.test/article", { timeoutMs: 5_001 }), /timeoutMs/);
  await assert.rejects(() => fetchHtmlSource("https://publisher.test/article", { maxBodyBytes: 2 * 1024 * 1024 + 1 }), /maxBodyBytes/);
  const overflow = await fetchHtmlSource("https://publisher.test/0", {
    maxRedirects: 1,
    fetchImpl: async (url) => response("", { status: 302, headers: { location: `${url}/next` } }),
  });
  assert.deepEqual(overflow, { ok: false, reason: "inaccessible" });
  for (const status of [403, 429, 500]) {
    const result = await fetchHtmlSource("https://publisher.test/article", { fetchImpl: async () => response("", { status }) });
    assert.equal(result.reason, "inaccessible");
  }
  const timeout = await fetchHtmlSource("https://publisher.test/article", {
    timeoutMs: 1,
    fetchImpl: async (_url, { signal }) => new Promise((_, reject) => signal.addEventListener("abort", () => reject(new Error("aborted")))),
  });
  assert.equal(timeout.reason, "inaccessible");
  const oversized = await fetchHtmlSource("https://publisher.test/article", {
    maxBodyBytes: 20,
    fetchImpl: async () => response("x".repeat(100)),
  });
  assert.equal(oversized.reason, "inaccessible");
  const pdf = await fetchHtmlSource("https://publisher.test/article", {
    fetchImpl: async () => response("pdf", { contentType: "application/pdf" }),
  });
  assert.equal(pdf.reason, "unsupported_source_type");
  const redirectToIpv6 = await fetchHtmlSource("https://publisher.test/article", {
    fetchImpl: async () => response("", { status: 302, headers: { location: "http://[::1]/internal" } }),
  });
  assert.equal(redirectToIpv6.reason, "inaccessible");
});

test("source fetch deadline includes a body that stalls after response headers", async () => {
  let signalSeen = false;
  const startedAt = performance.now();
  const result = await fetchHtmlSource("https://publisher.test/article", {
    timeoutMs: 10,
    fetchImpl: async (_url, { signal }) => {
      const body = new ReadableStream({
        start(controller) {
          signal.addEventListener("abort", () => {
            signalSeen = true;
            controller.error(new DOMException("Aborted", "AbortError"));
          }, { once: true });
        },
      });
      return new Response(body, { headers: { "content-type": "text/html" } });
    },
  });
  assert.equal(result.reason, "inaccessible");
  assert.equal(signalSeen, true);
  assert.ok(performance.now() - startedAt < 500);
});

test("source URLs reject credentials and local/private literal targets", () => {
  for (const url of [
    "ftp://publisher.test/file",
    "https://user:pass@publisher.test/article",
    "http://localhost/article",
    "http://127.0.0.1/article",
    "http://10.0.0.1/article",
    "http://192.168.1.2/article",
    "http://8.8.8.8/article",
    "http://[::1]/article",
    "http://[fc00::1]/article",
    "http://[fe80::1]/article",
    "http://[::ffff:127.0.0.1]/article",
  ]) assert.equal(parseSafeSourceUrl(url), null);
  assert.equal(parseSafeSourceUrl("https://publisher.test/article")?.hostname, "publisher.test");
});

test("article extraction prioritizes JSON-LD then metadata then article time, never dateModified", () => {
  const jsonLd = extractArticleEvidence(article({ date: "2026-08-20" }));
  assert.equal(jsonLd.publishedDate, "2026-08-20T00:00:00.000Z");
  const meta = extractArticleEvidence(`<!doctype html><meta property="article:published_time" content="2026-08-10T08:00:00Z"><article><h1>Acme expands Orion region</h1><p>Acme expands Orion region with a major capacity investment for enterprise customers.</p><p>More supporting source evidence is available here.</p></article>`);
  assert.equal(meta.publishedDate, "2026-08-10T08:00:00.000Z");
  const time = extractArticleEvidence(`<!doctype html><article><h1>Acme signs Harbor partnership</h1><time datetime="2026-04-01">April 1</time><p>Acme signs Harbor partnership to deliver a substantial new platform capability for customers.</p><p>More supporting source evidence is available here.</p></article>`);
  assert.equal(time.publishedDate, "2026-04-01T00:00:00.000Z");
  const modifiedOnly = extractArticleEvidence(`<!doctype html><meta property="article:modified_time" content="2026-09-01"><article><h1>Acme launches Atlas platform</h1><p>Acme launches Atlas platform for enterprise customers with substantial evidence and detail.</p><p>Additional support for this source page.</p></article>`);
  assert.equal(modifiedOnly.publishedDate, null);
});

test("body fallback accepts a substantive NVIDIA-Newsroom-style release without an article or main", async () => {
  const nvidia = { ...COMPANY, companyName: "NVIDIA Corporation", officialDomain: "nvidia.com" };
  const mediaTek = candidate({
    title: "NVIDIA and MediaTek Deepen Long-Standing Partnership",
    url: "https://nvidianews.nvidia.com/news/nvidia-mediatek-partnership",
    highlights: ["NVIDIA and MediaTek Deepen Long-Standing Partnership."],
  });
  const html = bodyFallbackPage({
    title: mediaTek.title,
    visibleDate: "August 31, 2026",
    body: "NVIDIA and MediaTek deepen their long-standing partnership to develop advanced infrastructure and computing platforms for enterprise customers. The expanded collaboration combines NVIDIA accelerated computing with MediaTek technology for substantial new products and services across global markets.",
  });
  const extracted = extractArticleEvidence(html);
  assert.equal(extracted.publishedDate, "2026-08-31T00:00:00.000Z");
  assert.match(extracted.body, /NVIDIA and MediaTek deepen/);
  const result = await verifyCandidate(mediaTek, nvidia, { now: NOW, fetchImpl: async () => response(html) });
  assert.equal(result.accepted, true);
  assert.equal(result.evidence.recencyBucket, "RECENT");
  assert.equal(result.evidence.sourceClass, "FIRST_PARTY");
});

test("existing article and main content keep priority and higher-priority dates outrank visible dates", async () => {
  const articleHtml = article({ date: "2026-08-20" }).replace("<h1>Acme launches Atlas platform</h1>", "<h1>Acme launches Atlas platform</h1><p>August 31, 2026</p>");
  assert.equal(extractArticleEvidence(articleHtml).publishedDate, "2026-08-20T00:00:00.000Z");
  const metadata = extractArticleEvidence(bodyFallbackPage({ visibleDate: "August 31, 2026" }).replace("</head>", '<meta property="article:published_time" content="2026-08-10T08:00:00Z"></head>'));
  assert.equal(metadata.publishedDate, "2026-08-10T08:00:00.000Z");
  const main = `<!doctype html><main><h1>Acme opens Harbor expansion</h1><time datetime="2026-04-01">April 1</time><p>August 31, 2026</p><p>Acme opens Harbor expansion to add substantial regional capacity and a new platform capability for enterprise customers and partners.</p><p>Acme says the material development expands operations for customers.</p></main>`;
  assert.equal(extractArticleEvidence(main).publishedDate, "2026-04-01T00:00:00.000Z");
  const result = await verifyCandidate(candidate({ title: "Acme opens Harbor expansion", url: "https://acme.test/news/harbor", highlights: ["Acme opens Harbor expansion."] }), COMPANY, {
    now: NOW,
    fetchImpl: async () => response(main),
  });
  assert.equal(result.accepted, true);
});

test("visible-date fallback is bounded to near-headline publisher content and keeps safety gates", async () => {
  const footerOnly = bodyFallbackPage({ footerDate: "August 31, 2026" });
  const buriedOnly = bodyFallbackPage({ buriedDate: "August 31, 2026" });
  assert.equal(extractArticleEvidence(footerOnly).publishedDate, null);
  assert.equal(extractArticleEvidence(buriedOnly).publishedDate, null);
  assert.equal(extractArticleEvidence(bodyFallbackPage({ visibleDate: "September 31, 2026" })).publishedDate, null);
  assert.equal(extractArticleEvidence(bodyFallbackPage({ title: "Acme August 31, 2026 platform update" })).publishedDate, null);
  const invisibleDates = bodyFallbackPage().replace(
    "</h1>",
    '</h1><template><p>August 31, 2026</p></template><p hidden>August 31, 2026</p><p aria-hidden="true">August 31, 2026</p>',
  );
  assert.equal(extractArticleEvidence(invisibleDates).publishedDate, null);
  const footerResult = await verifyCandidate(candidate({ url: "https://acme.test/news/footer" }), COMPANY, { now: NOW, fetchImpl: async () => response(footerOnly) });
  assert.equal(footerResult.reason, "date_unknown");
  const homepage = await verifyCandidate(candidate({ url: "https://acme.test/" }), COMPANY, { now: NOW, fetchImpl: async () => response(bodyFallbackPage({ visibleDate: "August 31, 2026" })) });
  assert.equal(homepage.reason, "unsupported_claim");
  const chromeOnly = await verifyCandidate(candidate({ url: "https://acme.test/news/chrome" }), COMPANY, { now: NOW, fetchImpl: async () => response(bodyFallbackPage({ chromeOnly: true })) });
  assert.equal(chromeOnly.reason, "unsupported_claim");
  const stale = await verifyCandidate(candidate({ url: "https://acme.test/news/stale" }), COMPANY, { now: NOW, fetchImpl: async () => response(bodyFallbackPage({ visibleDate: "January 1, 2026" })) });
  assert.equal(stale.reason, "stale");
  const future = await verifyCandidate(candidate({ url: "https://acme.test/news/future" }), COMPANY, { now: NOW, fetchImpl: async () => response(bodyFallbackPage({ visibleDate: "January 1, 2027" })) });
  assert.equal(future.reason, "date_unknown");
  const unrelated = await verifyCandidate(candidate({ title: "Acme launches Atlas platform", url: "https://acme.test/news/unrelated" }), COMPANY, { now: NOW, fetchImpl: async () => response(bodyFallbackPage({ title: "Other launches Atlas platform", visibleDate: "August 31, 2026", body: "Other launches Atlas platform with a substantial new product capability for enterprise customers and partners. Other says the material development expands its operations for customers." })) });
  assert.equal(unrelated.reason, "unsupported_claim");
});

test("verification requires source date and support, not provider date/highlight alone", async () => {
  const noDate = await verifyCandidate(candidate(), COMPANY, {
    now: NOW,
    fetchImpl: async () => response(article({ date: null, jsonLd: false })),
  });
  assert.equal(noDate.reason, "date_unknown");
  const unsupported = await verifyCandidate(candidate({ title: "Acme acquires Beacon" }), COMPANY, {
    now: NOW,
    fetchImpl: async () => response(article({ title: "Acme opens Atlas office", body: "Acme opens Atlas office for staff with unrelated details and a substantial company update for operations." })),
  });
  assert.equal(unsupported.reason, "unsupported_claim");
  const future = await verifyCandidate(candidate(), COMPANY, {
    now: NOW,
    fetchImpl: async () => response(article({ date: "2027-01-01" })),
  });
  assert.equal(future.reason, "date_unknown");
  const old = await verifyCandidate(candidate(), COMPANY, {
    now: NOW,
    fetchImpl: async () => response(article({ date: "2026-03-01" })),
  });
  assert.equal(old.reason, "stale");
});

test("verification accepts recent and 91-to-180 day source evidence but rejects obvious trivial pages", async () => {
  const recent = await verifyCandidate(candidate(), COMPANY, { now: NOW, fetchImpl: async () => response(article({ date: "2026-08-20" })) });
  assert.equal(recent.accepted, true);
  assert.equal(recent.evidence.recencyBucket, "RECENT");
  const fallback = await verifyCandidate(candidate(), COMPANY, { now: NOW, fetchImpl: async () => response(article({ date: "2026-04-01" })) });
  assert.equal(fallback.accepted, true);
  assert.equal(fallback.evidence.recencyBucket, "FALLBACK");
  const trivial = await verifyCandidate(candidate({ title: "Acme fixes Atlas bug" }), COMPANY, {
    now: NOW,
    fetchImpl: async () => response(article({ title: "Acme fixes Atlas bug", body: "Acme fixes Atlas bug in a routine bug fix for a small code patch and release notes entry." })),
  });
  assert.equal(trivial.reason, "trivial");
});

test("verification ignores approved legal suffixes but still requires exact company tokens", async () => {
  const nvidia = await verifyCandidate(candidate({ title: "NVIDIA launches Atlas platform" }), {
    ...COMPANY,
    companyName: "NVIDIA Corporation",
  }, {
    now: NOW,
    fetchImpl: async () => response(article({ title: "NVIDIA launches Atlas platform", body: "NVIDIA launches Atlas platform with a substantial new company capability for enterprise customers." })),
  });
  assert.equal(nvidia.accepted, true);
  const stripe = await verifyCandidate(candidate({ title: "Stripe expands Atlas payments" }), {
    ...COMPANY,
    companyName: "Stripe, Inc.",
  }, {
    now: NOW,
    fetchImpl: async () => response(article({ title: "Stripe expands Atlas payments", body: "Stripe expands Atlas payments with a substantial new company capability for enterprise customers." })),
  });
  assert.equal(stripe.accepted, true);
  const unrelated = await verifyCandidate(candidate({ title: "Atlas launches platform" }), {
    ...COMPANY,
    companyName: "NVIDIA Corporation",
  }, {
    now: NOW,
    fetchImpl: async () => response(article({ title: "Atlas launches platform", body: "Atlas launches platform with a substantial new company capability for enterprise customers." })),
  });
  assert.equal(unrelated.reason, "unsupported_claim");
});

test("generic homes, evergreen/how-to pages, and stock commentary cannot qualify", async () => {
  const homepage = await verifyCandidate(candidate({ url: "https://acme.test/" }), COMPANY, {
    now: NOW,
    fetchImpl: async () => response(article()),
  });
  assert.equal(homepage.reason, "unsupported_claim");
  const evergreen = await verifyCandidate(candidate({ title: "Acme how to use Atlas" }), COMPANY, {
    now: NOW,
    fetchImpl: async () => response(article({ title: "Acme how to use Atlas", body: "Acme how to use Atlas is an evergreen tutorial with routine instructions for customers and no discrete company event." })),
  });
  assert.equal(evergreen.reason, "trivial");
  const stock = await verifyCandidate(candidate({ title: "Acme stock price rises" }), COMPANY, {
    now: NOW,
    fetchImpl: async () => response(article({ title: "Acme stock price rises", body: "Acme stock price rises in market commentary with no supported company-level strategic event for customers." })),
  });
  assert.equal(stock.reason, "trivial");
  const routine = await verifyCandidate(candidate({ title: "Acme launches Nova update" }), COMPANY, {
    now: NOW,
    fetchImpl: async () => response(article({ title: "Acme launches Nova update", body: "Acme launches Nova update as a small routine update with no material company-level development for customers." })),
  });
  assert.equal(routine.reason, "trivial");
});

test("B3 stops after three verified broad candidates without fallback or later fetches", async () => {
  const candidates = [
    candidate({ rank: 1, title: "Acme launches Atlas platform", url: "https://acme.test/atlas", highlights: ["Provider-only https://invented.test/never-used"] }),
    candidate({ rank: 2, title: "Acme signs Beacon partnership", url: "https://acme.test/beacon", highlights: ["Acme signs Beacon partnership."] }),
    candidate({ rank: 3, title: "Acme opens Cedar expansion", url: "https://acme.test/cedar", highlights: ["Acme opens Cedar expansion."] }),
    candidate({ rank: 4, title: "Acme appoints Delta leader", url: "https://acme.test/delta" }),
  ];
  const pages = {
    "https://acme.test/atlas": article(),
    "https://acme.test/beacon": article({ title: candidates[1].title, body: "Acme signs Beacon partnership to deliver a substantial strategic platform agreement for enterprise customers." }),
    "https://acme.test/cedar": article({ title: candidates[2].title, body: "Acme opens Cedar expansion to add substantial regional capacity for enterprise customers." }),
  };
  const calls = [];
  const result = await verifyCompanyDiscovery(discovery(candidates), "test-key", {
    now: NOW,
    sourceFetchImpl: sourceMap(pages, calls),
    exaFetchImpl: async () => { throw new Error("fallback must not run"); },
  });
  assert.equal(result.state, "verified");
  assert.equal(result.evidence.length, 3);
  assert.deepEqual(result.evidence.map((item) => item.sourceUrl), candidates.slice(0, 3).map((item) => item.url));
  assert.equal(result.evidence.some((item) => item.sourceUrl.includes("invented.test")), false);
  assert.deepEqual(calls, ["https://acme.test/atlas", "https://acme.test/beacon", "https://acme.test/cedar"]);
  assert.deepEqual(result.retrieval, { fallbackUsed: false, exaRequestCount: 1 });
});

test("B3 exhausts broad candidates, uses one exact-domain fallback, and fills only missing slots", async () => {
  const broad = [
    candidate({ rank: 1, title: "Acme launches Atlas platform", url: "https://acme.test/atlas" }),
    candidate({ rank: 2, title: "Acme signs Beacon partnership", url: "https://publisher.test/beacon", highlights: ["Acme signs Beacon partnership."] }),
    candidate({ rank: 3, title: "Acme stale Delta acquisition", url: "https://publisher.test/stale" }),
  ];
  const fallback = candidate({ rank: 1, title: "Acme opens Cedar expansion", url: "https://acme.test/cedar", highlights: ["Acme opens Cedar expansion."] });
  const sourceCalls = [];
  const exaCalls = [];
  const result = await verifyCompanyDiscovery(discovery(broad), "test-key", {
    now: NOW,
    sourceFetchImpl: sourceMap({
      "https://acme.test/atlas": article(),
      "https://publisher.test/beacon": article({ title: broad[1].title, body: "Acme signs Beacon partnership as a substantial secondary-source-supported strategic agreement for customers." }),
      "https://publisher.test/stale": article({ title: broad[2].title, date: "2026-01-01", body: "Acme stale Delta acquisition was a substantial strategic event for customers and operations." }),
      "https://acme.test/cedar": article({ title: fallback.title, body: "Acme opens Cedar expansion to add substantial regional capacity for enterprise customers." }),
    }, sourceCalls),
    exaFetchImpl: async (url, request) => {
      exaCalls.push([url, request]);
      return { ok: true, status: 200, json: async () => rawFallbackPayload([fallback]) };
    },
  });
  assert.equal(result.state, "verified");
  assert.equal(result.evidence.length, 3);
  assert.equal(exaCalls.length, 1);
  const body = JSON.parse(exaCalls[0][1].body);
  assert.equal(body.type, "auto");
  assert.equal(body.numResults, 10);
  assert.deepEqual(body.contents, { highlights: true });
  assert.equal(body.stream, false);
  assert.deepEqual(body.includeDomains, ["acme.test", "*.acme.test"]);
  assert.match(body.query, /Acme/);
  assert.doesNotMatch(body.query, /acme\.test/);
  assert.equal("outputSchema" in body, false);
  assert.deepEqual(result.retrieval, { fallbackUsed: true, exaRequestCount: 2 });
  assert.equal(sourceCalls.includes("https://publisher.test/stale"), true);
});

test("one verified broad candidate may use the sole fallback to fill two remaining slots", async () => {
  const broad = [candidate({ rank: 1, title: "Acme launches Atlas platform", url: "https://acme.test/atlas" })];
  const first = candidate({ rank: 1, title: "Acme signs Beacon partnership", url: "https://acme.test/beacon", highlights: ["Acme signs Beacon partnership."] });
  const second = candidate({ rank: 2, title: "Acme opens Cedar expansion", url: "https://acme.test/cedar", highlights: ["Acme opens Cedar expansion."] });
  let exaCalls = 0;
  const result = await verifyCompanyDiscovery(discovery(broad), "test-key", {
    now: NOW,
    sourceFetchImpl: sourceMap({
      "https://acme.test/atlas": article(),
      "https://acme.test/beacon": article({ title: first.title, body: "Acme signs Beacon partnership as a substantial strategic agreement for enterprise customers." }),
      "https://acme.test/cedar": article({ title: second.title, body: "Acme opens Cedar expansion to add substantial regional capacity for enterprise customers." }),
    }),
    exaFetchImpl: async () => {
      exaCalls += 1;
      return { ok: true, status: 200, json: async () => rawFallbackPayload([first, second]) };
    },
  });
  assert.equal(result.state, "verified");
  assert.equal(result.evidence.length, 3);
  assert.equal(exaCalls, 1);
});

test("fallback duplicate evidence is rejected and exhausted evidence returns insufficient", async () => {
  const broad = [candidate({ url: "https://acme.test/fx", title: "Acme launches FX payments", highlights: ["Acme launches FX payments."] })];
  const duplicate = candidate({ url: "https://publisher.test/fx", title: "Acme launches FX payments", highlights: ["Acme launches FX payments."] });
  const result = await verifyCompanyDiscovery(discovery(broad), "test-key", {
    now: NOW,
    sourceFetchImpl: sourceMap({
      "https://acme.test/fx": article({ title: broad[0].title, body: "Acme launches FX payments as a substantial new platform capability for enterprise customers." }),
      "https://publisher.test/fx": article({ title: duplicate.title, body: "Acme launches FX payments as a substantial new platform capability for enterprise customers." }),
    }),
    exaFetchImpl: async () => ({ ok: true, status: 200, json: async () => rawFallbackPayload([duplicate]) }),
  });
  assert.equal(result.state, "insufficient_evidence");
  assert.equal(result.evidence.length, 1);
  assert.equal(result.retrieval.exaRequestCount, 2);
});

test("evidence-aware lexical dedupe rejects Sessions umbrella and component coverage", async () => {
  const broad = [candidate({
    url: "https://stripe.test/sessions",
    title: "Stripe Sessions 2026 launches agent payments",
    highlights: ["Stripe Sessions 2026 launches agent payments."],
  })];
  const component = candidate({
    url: "https://stripe.test/link",
    title: "Stripe Sessions 2026 launches agent payments component",
    highlights: ["Stripe Sessions 2026 launches agent payments component."],
  });
  const stripe = { ...COMPANY, companyName: "Stripe", officialDomain: "stripe.test" };
  const result = await verifyCompanyDiscovery({ state: "ready_for_verification", company: stripe, prioritized: broad }, "test-key", {
    now: NOW,
    sourceFetchImpl: sourceMap({
      "https://stripe.test/sessions": article({ title: broad[0].title, body: "Stripe Sessions 2026 launches agent payments as a substantial broader platform event for customers." }),
      "https://stripe.test/link": article({ title: component.title, body: "Stripe Sessions 2026 launches agent payments component as part of the same substantial broader platform event." }),
    }),
    exaFetchImpl: async () => ({ ok: true, status: 200, json: async () => rawFallbackPayload([component]) }),
  });
  assert.equal(result.state, "insufficient_evidence");
  assert.equal(result.evidence.length, 1);
});

test("B3 propagates a fallback provider failure instead of misclassifying it as insufficient evidence", async () => {
  await assert.rejects(
    () => verifyCompanyDiscovery(discovery([]), "test-key", {
      now: NOW,
      exaFetchImpl: async () => ({ ok: false, status: 429, json: async () => ({ tag: "RATE_LIMIT_EXCEEDED" }) }),
    }),
    (error) => error?.code === "provider_quota",
  );
});

test("B3 smoke diagnostics trace each evaluated broad candidate without changing the production result", async () => {
  const accepted = candidate({ rank: 1, url: "https://acme.test/atlas", highlights: ["Acme launches Atlas platform."] });
  const inaccessible = candidate({ rank: 2, title: "Acme signs Beacon partnership", url: "https://publisher.test/inaccessible" });
  const nonHtml = candidate({ rank: 3, title: "Acme opens Cedar expansion", url: "https://publisher.test/pdf" });
  const noDate = candidate({ rank: 4, title: "Acme launches Delta service", url: "https://publisher.test/no-date" });
  const stale = candidate({ rank: 5, title: "Acme acquires Echo", url: "https://publisher.test/stale" });
  const trivial = candidate({ rank: 6, title: "Acme updates Foxtrot", url: "https://publisher.test/trivial" });
  const unsupported = candidate({ rank: 7, title: "Acme announces Golf", url: "https://publisher.test/unsupported" });
  const duplicate = candidate({ ...accepted, rank: 8, url: "https://publisher.test/duplicate" });
  const broad = [accepted, inaccessible, nonHtml, noDate, stale, trivial, unsupported, duplicate];
  const pages = {
    [accepted.url]: article(),
    [nonHtml.url]: response("pdf", { contentType: "application/pdf" }),
    [noDate.url]: article({ title: noDate.title, date: null, jsonLd: false, body: "Acme launches Delta service with a substantial new platform capability for enterprise customers and partners." }),
    [stale.url]: article({ title: stale.title, date: "2026-01-01", body: "Acme acquires Echo in a substantial strategic transaction for enterprise customers and operations." }),
    [trivial.url]: article({ title: trivial.title, body: "Acme updates Foxtrot in a routine update with a small maintenance change for enterprise customers and partners." }),
    [unsupported.url]: "<!doctype html><script type=\"application/ld+json\">{\"@type\":\"NewsArticle\",\"headline\":\"Other announces Golf\",\"datePublished\":\"2026-09-01\"}</script><article><h1>Other announces Golf</h1><p>Other announces Golf with a substantial strategic product capability for enterprise customers and partners.</p><p>Additional publisher reporting describes the business impact for customers and operations.</p></article>",
    [duplicate.url]: article(),
  };
  const verificationOptions = {
    now: NOW,
    sourceFetchImpl: async (url) => {
      if (url === inaccessible.url) throw new Error("unavailable");
      const item = pages[url];
      if (!item) throw new Error(`unexpected source ${url}`);
      return item instanceof Response ? item : response(item);
    },
    exaFetchImpl: async () => ({ ok: true, status: 200, json: async () => rawFallbackPayload([]) }),
  };
  const plain = await verifyCompanyDiscovery(discovery(broad), "test-key", verificationOptions);
  const observed = await verifyCompanyDiscoveryForSmoke(discovery(broad), "test-key", verificationOptions);
  assert.deepEqual(observed.result, plain);
  assert.deepEqual(observed.diagnostic.broad.map((entry) => entry.reason), [
    "accepted", "inaccessible", "unsupported_source_type", "date_unknown", "stale", "trivial", "unsupported_claim", "duplicate",
  ]);
  assert.deepEqual(observed.diagnostic.broad.map((entry) => entry.result), [
    "accepted", "rejected", "rejected", "rejected", "rejected", "rejected", "rejected", "rejected",
  ]);
  assert.equal(observed.diagnostic.broad[0].origin, "broad");
  assert.equal(observed.diagnostic.broad[0].resolvedUrl, accepted.url);
  assert.equal(observed.diagnostic.broad[1].sourceTitle, null);
  assert.equal(observed.diagnostic.broad[2].sourceClass, null);
  assert.equal(observed.diagnostic.broad[3].publisherDerivedDate, null);
  assert.equal(observed.diagnostic.broad[4].recencyBucket, "OLD");
  assert.equal(observed.diagnostic.broad[7].sourceTitle, accepted.title);
  assert.deepEqual(observed.diagnostic.fallback, {
    triggered: true,
    broadExhaustedBelowThree: true,
    acceptedCountBeforeFallback: 1,
    candidateCount: 0,
    prioritizedCandidateCount: 0,
    trace: [],
  });
});

test("B3 smoke diagnostics stop at three accepted broad records and do not invoke fallback", async () => {
  const broad = [
    candidate({ rank: 1, url: "https://acme.test/atlas" }),
    candidate({ rank: 2, title: "Acme signs Beacon partnership", url: "https://acme.test/beacon" }),
    candidate({ rank: 3, title: "Acme opens Cedar expansion", url: "https://acme.test/cedar" }),
    candidate({ rank: 4, title: "Acme appoints Delta leader", url: "https://acme.test/delta" }),
  ];
  const calls = [];
  const observed = await verifyCompanyDiscoveryForSmoke(discovery(broad), "test-key", {
    now: NOW,
    sourceFetchImpl: sourceMap({
      [broad[0].url]: article(),
      [broad[1].url]: article({ title: broad[1].title, body: "Acme signs Beacon partnership as a substantial strategic agreement for enterprise customers." }),
      [broad[2].url]: article({ title: broad[2].title, body: "Acme opens Cedar expansion to add substantial regional capacity for enterprise customers." }),
    }, calls),
    exaFetchImpl: async () => { throw new Error("fallback must not run"); },
  });
  assert.equal(observed.result.state, "verified");
  assert.equal(observed.diagnostic.fallback, null);
  assert.equal(observed.diagnostic.finalAcceptedCount, 3);
  assert.deepEqual(observed.diagnostic.broad.map((entry) => entry.rank), [1, 2, 3]);
  assert.deepEqual(calls, broad.slice(0, 3).map((item) => item.url));
});

test("B3 smoke diagnostics separate the fallback trace after broad exhaustion", async () => {
  const broad = [candidate({ rank: 1, url: "https://acme.test/atlas" })];
  const fallback = [
    candidate({ rank: 1, title: "Acme signs Beacon partnership", url: "https://acme.test/beacon" }),
    candidate({ rank: 2, title: "Acme opens Cedar expansion", url: "https://acme.test/cedar" }),
  ];
  const observed = await verifyCompanyDiscoveryForSmoke(discovery(broad), "test-key", {
    now: NOW,
    sourceFetchImpl: sourceMap({
      [broad[0].url]: article(),
      [fallback[0].url]: article({ title: fallback[0].title, body: "Acme signs Beacon partnership as a substantial strategic agreement for enterprise customers." }),
      [fallback[1].url]: article({ title: fallback[1].title, body: "Acme opens Cedar expansion to add substantial regional capacity for enterprise customers." }),
    }),
    exaFetchImpl: async () => ({ ok: true, status: 200, json: async () => rawFallbackPayload(fallback) }),
  });
  assert.equal(observed.result.state, "verified");
  assert.equal(observed.diagnostic.fallback.acceptedCountBeforeFallback, 1);
  assert.equal(observed.diagnostic.fallback.candidateCount, 2);
  assert.deepEqual(observed.diagnostic.broad.map((entry) => entry.origin), ["broad"]);
  assert.deepEqual(observed.diagnostic.fallback.trace.map((entry) => entry.origin), ["fallback", "fallback"]);
  assert.deepEqual(observed.diagnostic.fallback.trace.map((entry) => entry.reason), ["accepted", "accepted"]);
});

test("B3 has no historical-script dependency and rejects non-ready B2 input before network", async () => {
  await assert.rejects(() => verifyCompanyDiscovery({ state: "clarification_needed" }, "test-key"), /ready_for_verification/);
});

// --- B3R3: narrow FIRST_PARTY-only brand-anchor company-matching fallback ---

const NOTION = { inputKind: "domain", companyName: "Notion Labs, Inc.", officialDomain: "notion.com" };

function notionArticle({ title = "Introducing Notion's Developer Platform", date = "2026-09-01", body } = {}) {
  const articleBody =
    body ??
    "Notion today announced a substantial new developer platform for building custom integrations and automations. Notion says the material update expands what teams can build on top of the product for customers.";
  const metadata = `<script type="application/ld+json">${JSON.stringify({ "@type": "NewsArticle", headline: title, datePublished: date })}</script>`;
  return `<!doctype html><html><head>${metadata}<title>${title}</title></head><body><article><h1>${title}</h1><p>${articleBody}</p></article></body></html>`;
}

test("B3R3: existing strict full-name company matching is unaffected", async () => {
  const strict = await verifyCandidate(candidate(), COMPANY, { now: NOW, fetchImpl: async () => response(article()) });
  assert.equal(strict.accepted, true);
  assert.equal(strict.evidence.sourceClass, "FIRST_PARTY");
});

test("B3R3: a first-party Notion page saying 'Notion' but never 'Labs' passes company matching and can be accepted", async () => {
  const result = await verifyCandidate(
    candidate({ title: "Introducing Notion's Developer Platform", url: "https://notion.com/blog/developer-platform" }),
    NOTION,
    { now: NOW, fetchImpl: async () => response(notionArticle()) },
  );
  assert.equal(result.accepted, true);
  assert.equal(result.evidence.sourceClass, "FIRST_PARTY");
  assert.equal(result.evidence.recencyBucket, "RECENT");
  assert.doesNotMatch(notionArticle(), /\bLabs\b/i);
});

test("B3R3: the identical Notion-shaped content on an OTHER/secondary domain does not receive brand fallback", async () => {
  const result = await verifyCandidate(
    candidate({ title: "Introducing Notion's Developer Platform", url: "https://technewsdaily.com/notion-developer-platform" }),
    NOTION,
    { now: NOW, fetchImpl: async () => response(notionArticle()) },
  );
  assert.equal(result.accepted, false);
  assert.equal(result.reason, "unsupported_claim");
});

test("B3R3: a first-party page whose text never mentions the domain brand remains rejected", async () => {
  const html = article({ title: "Acme launches Atlas platform" }); // says "Acme", never "Notion"
  const result = await verifyCandidate(
    candidate({ title: "Acme launches Atlas platform", url: "https://notion.com/blog/unrelated" }),
    NOTION,
    { now: NOW, includeDiagnostic: true, fetchImpl: async () => response(html) },
  );
  assert.equal(result.accepted, false);
  assert.equal(result.reason, "unsupported_claim");
  assert.equal(result.diagnostic.sourceClass, "FIRST_PARTY");
});

test("B3R3: a first-party page whose domain brand is inconsistent with the resolved company name remains rejected", async () => {
  const unrelatedCompany = { inputKind: "domain", companyName: "Widget Corp", officialDomain: "acme.test" };
  const result = await verifyCandidate(candidate(), unrelatedCompany, {
    now: NOW,
    includeDiagnostic: true,
    fetchImpl: async () => response(article()), // says "Acme", matching the domain brand but not the resolved name
  });
  assert.equal(result.accepted, false);
  assert.equal(result.reason, "unsupported_claim");
  assert.equal(result.diagnostic.sourceClass, "FIRST_PARTY");
});

test("B3R3: an existing company with a strict full-name match is unaffected even on an OTHER source", async () => {
  const result = await verifyCandidate(
    candidate({ title: "Stripe expands Atlas payments", url: "https://publisher.test/stripe-atlas" }),
    { ...COMPANY, companyName: "Stripe, Inc." },
    {
      now: NOW,
      fetchImpl: async () => response(article({ title: "Stripe expands Atlas payments", body: "Stripe expands Atlas payments with a substantial new company capability for enterprise customers." })),
    },
  );
  assert.equal(result.accepted, true);
  assert.equal(result.evidence.sourceClass, "OTHER");
});

test("B3R3: a deceptive impostor hostname is classified OTHER and cannot use brand fallback", async () => {
  const result = await verifyCandidate(
    candidate({ title: "Introducing Notion's Developer Platform", url: "https://notion.com.example.test/blog/developer-platform" }),
    NOTION,
    { now: NOW, includeDiagnostic: true, fetchImpl: async () => response(notionArticle()) },
  );
  assert.equal(result.accepted, false);
  assert.equal(result.reason, "unsupported_claim");
  assert.equal(result.diagnostic.sourceClass, "OTHER");
});

test("B3R3: brand fallback does not bypass triviality, date, staleness, or duplicate rejection", async () => {
  const trivial = await verifyCandidate(
    candidate({ title: "Notion fixes a bug", url: "https://notion.com/blog/bugfix" }),
    NOTION,
    { now: NOW, fetchImpl: async () => response(notionArticle({ title: "Notion fixes a bug", body: "Notion fixes a bug in a routine bug fix release notes entry for a small code patch and minor maintenance change with no material company-level development." })) },
  );
  assert.equal(trivial.reason, "trivial");

  const noDate = await verifyCandidate(
    candidate({ title: "Introducing Notion's Developer Platform", url: "https://notion.com/blog/no-date" }),
    NOTION,
    { now: NOW, fetchImpl: async () => response(notionArticle({ date: null })) },
  );
  assert.equal(noDate.reason, "date_unknown");

  const stale = await verifyCandidate(
    candidate({ title: "Introducing Notion's Developer Platform", url: "https://notion.com/blog/stale" }),
    NOTION,
    { now: NOW, fetchImpl: async () => response(notionArticle({ date: "2026-01-01" })) },
  );
  assert.equal(stale.reason, "stale");

  const first = candidate({ rank: 1, title: "Notion launches Atlas feature", url: "https://notion.com/blog/atlas-1", highlights: ["Notion launches Atlas feature."] });
  const duplicateOfFirst = candidate({ rank: 2, title: "Notion launches Atlas feature", url: "https://notion.com/blog/atlas-2", highlights: ["Notion launches Atlas feature."] });
  const atlasHtml = notionArticle({ title: "Notion launches Atlas feature", body: "Notion launches Atlas feature as a substantial new capability for teams building on the product." });
  const dedupeOptions = {
    now: NOW,
    sourceFetchImpl: sourceMap({ [first.url]: atlasHtml, [duplicateOfFirst.url]: atlasHtml }),
    exaFetchImpl: async () => ({ ok: true, status: 200, json: async () => rawFallbackPayload([]) }),
  };
  const dedupeResult = await verifyCompanyDiscovery(
    { state: "ready_for_verification", company: NOTION, prioritized: [first, duplicateOfFirst] },
    "test-key",
    dedupeOptions,
  );
  assert.equal(dedupeResult.state, "insufficient_evidence");
  assert.equal(dedupeResult.evidence.length, 1);
  assert.equal(dedupeResult.evidence[0].sourceClass, "FIRST_PARTY");
  const dedupeObserved = await verifyCompanyDiscoveryForSmoke(
    { state: "ready_for_verification", company: NOTION, prioritized: [first, duplicateOfFirst] },
    "test-key",
    dedupeOptions,
  );
  assert.deepEqual(dedupeObserved.diagnostic.broad.map((entry) => entry.reason), ["accepted", "duplicate"]);
});

test("B3R3: brand fallback lets company matching pass but does not bypass support-sentence matching", async () => {
  // The article's real headline/body (via notionArticle()'s defaults) is
  // about the Developer Platform launch and contains "Notion" (satisfying
  // B3R3's brand fallback, since "Labs" is absent and strict matching
  // fails) but never discusses the specific "Quantum Ledger integration"
  // event the candidate/highlight claims. No sentence in the body shares
  // enough anchor tokens with that claimed event, so sentenceForEvidence()
  // must still reject it -- proving company matching and support-sentence
  // matching are independent gates and the fallback bypasses neither.
  const mismatchedCandidate = candidate({
    title: "Notion unveils Quantum Ledger integration",
    url: "https://notion.com/blog/quantum-ledger",
    highlights: ["Notion unveils Quantum Ledger integration for enterprise finance teams."],
  });
  const result = await verifyCandidate(mismatchedCandidate, NOTION, {
    now: NOW,
    includeDiagnostic: true,
    fetchImpl: async () => response(notionArticle({ date: "2026-08-20" })),
  });
  assert.equal(result.accepted, false);
  assert.equal(result.reason, "unsupported_claim");
  // Confirm the rejection is genuinely at the support-sentence gate, not an
  // earlier one: sourceClass is set right before the company-match check
  // (so its presence proves that gate was reached), and recencyBucket is
  // only ever set by code that runs strictly after company matching and
  // date presence both succeed -- its non-null "RECENT" value proves this
  // candidate passed company matching (via brand fallback) and recency,
  // leaving only the trailing support-sentence check as the rejection point.
  assert.equal(result.diagnostic.sourceClass, "FIRST_PARTY");
  assert.equal(result.diagnostic.recencyBucket, "RECENT");
});

test("B3R3: a hyphenated multi-token official-domain brand requires every token present, both in the resolved name and in the article text", async () => {
  const bigApple = { inputKind: "domain", companyName: "Big Apple Media, Inc.", officialDomain: "big-apple.com" };
  const bothTokensPresent = await verifyCandidate(
    candidate({ title: "Big Apple launches new streaming platform", url: "https://big-apple.com/news/streaming" }),
    bigApple,
    {
      now: NOW,
      fetchImpl: async () => response(article({
        title: "Big Apple launches new streaming platform",
        body: "Big Apple today launched a substantial new streaming platform for subscribers. Big Apple says the material update expands its content library for customers.",
      })),
    },
  );
  assert.equal(bothTokensPresent.accepted, true);
  assert.equal(bothTokensPresent.evidence.sourceClass, "FIRST_PARTY");

  const onlyOneTokenPresent = await verifyCandidate(
    candidate({ title: "Big launches new streaming platform", url: "https://big-apple.com/news/streaming-2" }),
    bigApple,
    {
      now: NOW,
      includeDiagnostic: true,
      fetchImpl: async () => response(article({
        title: "Big launches new streaming platform",
        body: "Big today launched a substantial new streaming platform for subscribers. Big says the material update expands its content library for customers.",
      })),
    },
  );
  assert.equal(onlyOneTokenPresent.accepted, false);
  assert.equal(onlyOneTokenPresent.reason, "unsupported_claim");
  assert.equal(onlyOneTokenPresent.diagnostic.sourceClass, "FIRST_PARTY");
});

// --- D3: generic same-event duplicate detection via shared verified-evidence quantity anchors ---

const LINEAR = { inputKind: "domain", companyName: "Linear", officialDomain: "linear.app" };

function linearGrowthArticle() {
  return article({
    title: "Sharing Linear's growth with the people building it",
    date: "2026-08-26",
    body: "Linear is sharing its growth with the people building it: the team completed a $99 million tender offer that values the company at $2.5 billion, alongside continued gains in annual recurring revenue and net retention. Linear says the milestone reflects strong adoption of its product development system across engineering teams.",
  });
}

function linearTenderArticle() {
  return article({
    title: "Linear Completes $99 Million Tender At $2.5 Billion Valuation As ARR Tops $100 Million And Net Retention Hits 177%",
    date: "2026-08-28",
    body: "Linear completed a $99 million tender offer at a $2.5 billion valuation as ARR tops $100 million and net retention hits 177 percent. The milestone reflects strong customer growth and product adoption across engineering teams.",
  });
}

test("D3: two dissimilar-headline pages covering the same $99M tender / $2.5B valuation event are recognized as duplicate coverage", async () => {
  const growth = candidate({
    rank: 1,
    title: "Sharing Linear's growth with the people building it",
    url: "https://linear.app/blog/sharing-growth",
    publishedDate: "2026-08-26",
    highlights: ["Sharing Linear's growth with the people building it."],
  });
  const tender = candidate({
    rank: 2,
    title: "Linear Completes $99 Million Tender At $2.5 Billion Valuation As ARR Tops $100 Million And Net Retention Hits 177%",
    url: "https://techfinance.test/linear-tender-offer",
    publishedDate: "2026-08-28",
    highlights: ["Linear Completes $99 Million Tender At $2.5 Billion Valuation."],
  });
  const observed = await verifyCompanyDiscoveryForSmoke(
    { state: "ready_for_verification", company: LINEAR, prioritized: [growth, tender] },
    "test-key",
    {
      now: NOW,
      sourceFetchImpl: sourceMap({
        [growth.url]: linearGrowthArticle(),
        [tender.url]: linearTenderArticle(),
      }),
      exaFetchImpl: async () => ({ ok: true, status: 200, json: async () => rawFallbackPayload([]) }),
    },
  );
  // Precondition: the old title-only heuristic could never have merged these
  // two headlines by lexical similarity alone -- confirming this test is
  // actually exercising the new evidence-quantity-anchor path, not the
  // pre-existing title-similarity dedupe.
  assert.deepEqual(observed.diagnostic.broad.map((entry) => entry.reason), ["accepted", "duplicate"]);
  assert.equal(observed.result.state, "insufficient_evidence");
  assert.equal(observed.result.evidence.length, 1);
  assert.equal(observed.result.evidence[0].sourceUrl, growth.url);
});

test("D3 anti-overdedupe (A): two funding rounds with different amounts and overlapping growth language stay distinct", async () => {
  const seriesA = candidate({
    rank: 1,
    title: "Acme raises new funding to expand its team",
    url: "https://acme.test/news/funding-a",
    highlights: ["Acme raises new funding to expand its team."],
  });
  const seriesB = candidate({
    rank: 2,
    title: "Acme secures fresh capital for global expansion",
    url: "https://secondary.test/funding-b",
    highlights: ["Acme secures fresh capital for global expansion."],
  });
  const result = await verifyCompanyDiscovery(discovery([seriesA, seriesB]), "test-key", {
    now: NOW,
    sourceFetchImpl: sourceMap({
      [seriesA.url]: article({
        title: seriesA.title,
        body: "Acme announced today that it raised $50 million in a new funding round to expand its team and accelerate product development. The company said the investment reflects strong growth and customer demand for its platform.",
      }),
      [seriesB.url]: article({
        title: seriesB.title,
        body: "Acme secured $120 million in fresh capital to fund its global expansion and scale operations across new markets. The company highlighted continued growth and strong customer adoption of its platform.",
      }),
    }),
    exaFetchImpl: async () => ({ ok: true, status: 200, json: async () => rawFallbackPayload([]) }),
  });
  assert.equal(result.state, "insufficient_evidence");
  assert.equal(result.evidence.length, 2);
});

test("D3 anti-overdedupe (B): a financing event and an unrelated product launch stay distinct", async () => {
  const funding = candidate({
    rank: 1,
    title: "Acme raises $50 million in Series B funding",
    url: "https://acme.test/news/series-b",
    highlights: ["Acme raises $50 million in Series B funding."],
  });
  const launch = candidate({
    rank: 2,
    title: "Acme launches new Atlas AI feature for enterprise customers",
    url: "https://acme.test/news/atlas-ai",
    highlights: ["Acme launches new Atlas AI feature for enterprise customers."],
  });
  const result = await verifyCompanyDiscovery(discovery([funding, launch]), "test-key", {
    now: NOW,
    sourceFetchImpl: sourceMap({
      [funding.url]: article({
        title: funding.title,
        body: "Acme announced a $50 million Series B funding round to accelerate hiring and product development. The company said the raise reflects strong investor confidence in its growth trajectory.",
      }),
      [launch.url]: article({
        title: launch.title,
        body: "Acme launched a new Atlas AI feature designed to help enterprise customers automate routine workflows. The company said the feature is now generally available across all paid plans.",
      }),
    }),
    exaFetchImpl: async () => ({ ok: true, status: 200, json: async () => rawFallbackPayload([]) }),
  });
  assert.equal(result.state, "insufficient_evidence");
  assert.equal(result.evidence.length, 2);
});

test("D3 anti-overdedupe (C): two product announcements sharing generic AI/enterprise/platform/customer/launch language stay distinct", async () => {
  const first = candidate({
    rank: 1,
    title: "Acme launches new AI platform for enterprise customers",
    url: "https://acme.test/news/ai-platform",
    highlights: ["Acme launches new AI platform for enterprise customers."],
  });
  const second = candidate({
    rank: 2,
    title: "Acme partners with Globex to bring AI tools to enterprise customers",
    url: "https://acme.test/news/globex-partnership",
    highlights: ["Acme partners with Globex to bring AI tools to enterprise customers."],
  });
  const result = await verifyCompanyDiscovery(discovery([first, second]), "test-key", {
    now: NOW,
    sourceFetchImpl: sourceMap({
      [first.url]: article({
        title: first.title,
        body: "Acme launched a new AI platform giving enterprise customers tools to automate operations, promising 40 percent faster workflows and analysis at scale. The company said the platform is available immediately for enterprise accounts.",
      }),
      [second.url]: article({
        title: second.title,
        body: "Acme announced a partnership with Globex to bring joint AI tools to enterprise customers across regulated industries, citing 65 percent faster compliance reviews in early trials. The companies said the partnership expands what enterprise customers can build.",
      }),
    }),
    exaFetchImpl: async () => ({ ok: true, status: 200, json: async () => rawFallbackPayload([]) }),
  });
  // Both bodies carry a real, non-overlapping quantity anchor (40 percent vs
  // 65 percent) alongside the shared generic AI/enterprise/platform/customer
  // language, so this test genuinely exercises the new anchor comparison
  // (not just the pre-existing title check) and confirms it correctly
  // declines to merge on differing values.
  assert.equal(result.state, "insufficient_evidence");
  assert.equal(result.evidence.length, 2);
});

test("D3 anti-overdedupe (D): a single shared incidental quantity anchor does not trigger dedupe", async () => {
  const security = candidate({
    rank: 1,
    title: "Acme reports fewer security incidents this year",
    url: "https://acme.test/news/security-report",
    highlights: ["Acme reports fewer security incidents this year."],
  });
  const performance = candidate({
    rank: 2,
    title: "Acme ships faster page load times in new release",
    url: "https://acme.test/news/performance-release",
    highlights: ["Acme ships faster page load times in new release."],
  });
  const result = await verifyCompanyDiscovery(discovery([security, performance]), "test-key", {
    now: NOW,
    sourceFetchImpl: sourceMap({
      [security.url]: article({
        title: security.title,
        body: "Acme reported a 50 percent reduction in security incidents blocked this year following a new detection system. The company said the improvement reflects sustained investment in its security team.",
      }),
      [performance.url]: article({
        title: performance.title,
        body: "Acme shipped a new release delivering 50 percent faster page load times across its product. The company said the performance work improves the experience for every customer.",
      }),
    }),
    exaFetchImpl: async () => ({ ok: true, status: 200, json: async () => rawFallbackPayload([]) }),
  });
  assert.equal(result.state, "insufficient_evidence");
  assert.equal(result.evidence.length, 2);
});

test("D3 anti-overdedupe (E): identical recycled 'About the company' boilerplate quantities in the footer of two unrelated articles do not trigger dedupe", async () => {
  const filler = "Acme continues to invest in its distributed engineering and research teams across multiple global offices this quarter. ".repeat(20);
  const boilerplate = "About Acme: Acme is trusted by 50 million users worldwide and has grown revenue 20 percent year over year.";
  const lab = candidate({
    rank: 1,
    title: "Acme opens new research lab in Austin",
    url: "https://acme.test/news/austin-lab",
    highlights: ["Acme opens new research lab in Austin."],
  });
  const cto = candidate({
    rank: 2,
    title: "Acme names new chief technology officer",
    url: "https://acme.test/news/new-cto",
    highlights: ["Acme names new chief technology officer."],
  });
  const result = await verifyCompanyDiscovery(discovery([lab, cto]), "test-key", {
    now: NOW,
    sourceFetchImpl: sourceMap({
      [lab.url]: article({
        title: lab.title,
        body: `Acme today opened a new research lab in Austin, Texas, to expand its engineering capacity. ${filler}${boilerplate}`,
      }),
      [cto.url]: article({
        title: cto.title,
        body: `Acme named a new chief technology officer to lead its product and engineering organization. ${filler}${boilerplate}`,
      }),
    }),
    exaFetchImpl: async () => ({ ok: true, status: 200, json: async () => rawFallbackPayload([]) }),
  });
  // Both articles share the identical boilerplate figures ("50 million
  // users", "20 percent") far past the anchor-scan bound, proving the bound
  // -- not mere coincidence -- is what keeps these distinct: without it,
  // this recycled footer would supply two matching anchors and wrongly
  // merge two genuinely unrelated announcements.
  assert.equal(result.state, "insufficient_evidence");
  assert.equal(result.evidence.length, 2);
});

test("D3-correction: a same-event pair requiring both a monetary anchor and a percent-symbol anchor dedupes ('%' must normalize like 'percent')", async () => {
  const journey = candidate({
    rank: 1,
    title: "Acme's founders share more about their fundraising journey",
    url: "https://acme.test/news/founders-journey",
    highlights: ["Acme's founders share more about their fundraising journey."],
  });
  const stakeSale = candidate({
    rank: 2,
    title: "Acme Sells 50 Percent Stake In $20 Million Funding Round",
    url: "https://financewire.test/acme-stake-sale",
    highlights: ["Acme Sells 50 Percent Stake In $20 Million Funding Round."],
  });
  const observed = await verifyCompanyDiscoveryForSmoke(
    { state: "ready_for_verification", company: { ...COMPANY, companyName: "Acme", officialDomain: "acme.test" }, prioritized: [journey, stakeSale] },
    "test-key",
    {
      now: NOW,
      sourceFetchImpl: sourceMap({
        [journey.url]: article({
          title: journey.title,
          date: "2026-08-26",
          body: "Acme's founders are sharing more about their fundraising journey: the round included a $20 million investment and gave new investors a 50% stake in the company. Acme says the milestone reflects strong momentum for the team.",
        }),
        [stakeSale.url]: article({
          title: stakeSale.title,
          date: "2026-08-28",
          body: "Acme sold a 50 percent stake in the company as part of a $20 million funding round. Acme says the deal reflects strong investor confidence in the business.",
        }),
      }),
      exaFetchImpl: async () => ({ ok: true, status: 200, json: async () => rawFallbackPayload([]) }),
    },
  );
  // This pair requires BOTH the $20 million anchor and the 50%/50-percent
  // anchor to reach the 2-anchor threshold -- there is no other shared
  // anchor and the titles are dissimilar enough that the pre-existing
  // title-similarity check cannot merge them on its own. If "%" fails to
  // normalize like "percent", only one anchor (20:million) is ever shared
  // and this pair is wrongly left distinct.
  assert.deepEqual(observed.diagnostic.broad.map((entry) => entry.reason), ["accepted", "duplicate"]);
  assert.equal(observed.result.state, "insufficient_evidence");
  assert.equal(observed.result.evidence.length, 1);
});

test("D3-correction: two distinct events (a research lab opening and a CTO hire) sharing recycled early evergreen metrics must NOT be deduped", async () => {
  const lab = candidate({
    rank: 1,
    title: "Acme opens new research lab in Austin",
    url: "https://acme.test/news/austin-lab-2",
    highlights: ["Acme opens new research lab in Austin."],
  });
  const cto = candidate({
    rank: 2,
    title: "Acme names new chief technology officer",
    url: "https://acme.test/news/new-cto-2",
    highlights: ["Acme names new chief technology officer."],
  });
  const result = await verifyCompanyDiscovery(discovery([lab, cto]), "test-key", {
    now: NOW,
    sourceFetchImpl: sourceMap({
      [lab.url]: article({
        title: lab.title,
        body: "Acme, used by 50 million customers and growing 20 percent year over year, opened a new research lab in Austin, Texas, to expand its engineering capacity.",
      }),
      [cto.url]: article({
        title: cto.title,
        body: "Acme, used by 50 million customers and growing 20 percent year over year, named a new chief technology officer to lead its product and engineering organization.",
      }),
    }),
    exaFetchImpl: async () => ({ ok: true, status: 200, json: async () => rawFallbackPayload([]) }),
  });
  // Both articles restate the same evergreen "50 million customers / 20
  // percent growth" positioning language EARLY, well within the anchor scan
  // window (unlike anti-overdedupe (E), which places its boilerplate past
  // the bound). Neither title contains either figure, so neither event is
  // actually "about" $50 million or 20 percent -- these are two genuinely
  // different events (a lab opening and a CTO hire) that must stay distinct.
  // This is the exact realistic gap independent review identified: shared
  // quantity anchors alone, without any event-local corroboration, are not
  // sufficient evidence of same-event coverage.
  assert.equal(result.state, "insufficient_evidence");
  assert.equal(result.evidence.length, 2);
});

test("D3-correction anti-overdedupe (G): a currency quantity and an unrelated operational (non-currency) quantity of the same number are not conflated", async () => {
  const funding = candidate({
    rank: 1,
    title: "Acme Raises $50 Million Series C At A 30 Percent Higher Valuation",
    url: "https://acme.test/news/series-c-2",
    highlights: ["Acme Raises $50 Million Series C At A 30 Percent Higher Valuation."],
  });
  const milestone = candidate({
    rank: 2,
    title: "Acme Surpasses 50 Million Users Milestone",
    url: "https://acme.test/news/users-milestone",
    highlights: ["Acme Surpasses 50 Million Users Milestone."],
  });
  const result = await verifyCompanyDiscovery(discovery([funding, milestone]), "test-key", {
    now: NOW,
    sourceFetchImpl: sourceMap({
      [funding.url]: article({
        title: funding.title,
        body: "Acme raised $50 million in a Series C round at a 30 percent higher valuation than its prior round. The company said the funding will accelerate hiring and product development.",
      }),
      [milestone.url]: article({
        title: milestone.title,
        body: "Acme announced it has surpassed 50 million users, growing 30 percent year over year. The company said the milestone reflects strong product adoption.",
      }),
    }),
    exaFetchImpl: async () => ({ ok: true, status: 200, json: async () => rawFallbackPayload([]) }),
  });
  // Both articles' evidence bodies mention "30 percent" (the funding round's
  // higher valuation; the milestone's year-over-year growth), so "30:percent"
  // is a genuinely shared anchor -- and it appears in the funding headline
  // ("...At A 30 Percent Higher Valuation"), which alone is enough to
  // satisfy the runtime's one-side headline-corroboration condition (the
  // milestone headline, "Acme Surpasses 50 Million Users Milestone", does
  // not need to contain it too). Without the currency-vs-count distinction,
  // "$50 million" (a funding amount) and "50 million users" (an operational
  // headcount) would ALSO normalize to the same "50:million" anchor, and
  // that second shared anchor is what would wrongly lift this pair to the
  // 2-anchor threshold and merge two unrelated events. Tagging money-scaled
  // anchors as `:currency` or `:count` keeps "$50 million" and "50 million
  // users" distinct, leaving only the shared, headline-corroborated percent
  // anchor -- one anchor, below the threshold.
  assert.equal(result.state, "insufficient_evidence");
  assert.equal(result.evidence.length, 2);
});

// --- E2R1: nested-article extraction truncation + numeral/word-form quantity normalization ---
//
// E2 found a live production case (a company's name-input Q3-earnings query)
// where two publisher pages covering the identical underlying event were not
// deduped. Investigation proved the true, generic cause is NOT abbreviated
// notation (the original E2 hypothesis) but a nesting bug: one page nested
// an `<article>` widget/card element (e.g. an embedded stock-ticker or
// related-content card) inside the real outer `<article>`, and the old
// non-greedy `<article>...</article>` regex stopped at the widget's own
// closing tag, truncating the extracted body before the real story prose --
// which independently also stated its shared milestone figure as a spelled
// -out word ("one million") where the other publisher's own headline used a
// numeral ("1 million"). Reproduced and fixed with two complementary,
// company-agnostic corrections in `verifyCompany.mjs`: (1) nesting-aware
// balanced-tag body extraction (`balancedTagBodyHtml`), and (2) a bounded
// spelled-out cardinal-number (one-twenty) normalization in
// `collectQuantityAnchors`. Neither alone reproduces the fix (verified
// directly against the real captured production HTML before implementation,
// not merely asserted): without the nesting fix, the real prose is never
// reached at all; without the word-number fix, the nesting fix alone still
// leaves the milestone figure unmatched in word form, so the pair still
// lacks headline-corroborated overlap.

function nestedWidgetArticle({
  title,
  jsonLdHeadline = title,
  date = "2026-09-02",
  widgetNoise = "Ticker snapshot widget: today's session moved between 12 and 36 points across the trading window with routine volatility noted by automated monitoring.",
  prose,
}) {
  const metadata = `<script type="application/ld+json">${JSON.stringify({ "@type": "NewsArticle", headline: jsonLdHeadline, datePublished: date })}</script>`;
  return `<!doctype html><html><head>${metadata}<title>${title}</title></head><body><article class="page"><article class="widget-card" data-card="ticker"><script type="application/json">{"points":[12,15,18,21,19,22,24,26]}</script><p>${widgetNoise}</p></article><h1>${title}</h1><p>${prose}</p></article></body></html>`;
}

test("E2R1: extractArticleEvidence reaches real prose past a nested <article> widget (unit-level, not just pipeline-level)", async () => {
  const html = nestedWidgetArticle({
    title: "Acme Q3 2026: platform milestone and leadership update",
    prose: "Executives noted that Acme has reached more than one million active users across its platform, and quarterly revenue reached $500 million, growing 150 percent from continued momentum.",
  });
  const evidence = extractArticleEvidence(html);
  // The old non-nesting-aware match would stop at the widget's own closing
  // </article>, so `body` would contain only the ticker sentence and never
  // reach the h1/real paragraph at all.
  assert.ok(evidence.body.includes("one million active users"), `expected real prose in body, got: ${evidence.body}`);
  assert.ok(evidence.body.includes("500 million"), `expected the revenue figure in body, got: ${evidence.body}`);
});

test("E2R1: two dissimilar-headline pages covering the same event -- one behind a nested non-editorial widget, one stating the shared milestone as a numeral in its own headline and the other as a word in its body -- are recognized as duplicate coverage", async () => {
  const numeralHeadline = candidate({
    rank: 1,
    title: "Acme reports strong Q3, tops 1 million active users",
    url: "https://acme.test/news/q3-milestone",
    highlights: ["Acme reports strong Q3, tops 1 million active users."],
  });
  const nestedWidgetPage = candidate({
    rank: 2,
    title: "Acme Q3 2026: platform milestone and leadership update",
    url: "https://financewire.test/acme-q3-2026",
    highlights: ["Acme Q3 2026: platform milestone and leadership update."],
  });
  const observed = await verifyCompanyDiscoveryForSmoke(
    { state: "ready_for_verification", company: { ...COMPANY, companyName: "Acme", officialDomain: "acme.test" }, prioritized: [numeralHeadline, nestedWidgetPage] },
    "test-key",
    {
      now: NOW,
      sourceFetchImpl: sourceMap({
        [numeralHeadline.url]: article({
          title: numeralHeadline.title,
          date: "2026-09-01",
          body: "Acme's third quarter results topped estimates as momentum accelerated 150 percent from a year ago. Acme reported quarterly revenue of $500 million and confirmed it has surpassed 1 million active users across its platform.",
        }),
        [nestedWidgetPage.url]: nestedWidgetArticle({
          title: nestedWidgetPage.title,
          date: "2026-09-02",
          prose: "Executives noted that Acme has reached more than one million active users across its platform, and quarterly revenue reached $500 million, growing 150 percent from continued momentum. The leadership team expressed confidence heading into next year.",
        }),
      }),
      exaFetchImpl: async () => ({ ok: true, status: 200, json: async () => rawFallbackPayload([]) }),
    },
  );
  assert.deepEqual(observed.diagnostic.broad.map((entry) => entry.reason), ["accepted", "duplicate"]);
  assert.equal(observed.result.state, "insufficient_evidence");
  assert.equal(observed.result.evidence.length, 1);
  assert.equal(observed.result.evidence[0].sourceUrl, numeralHeadline.url);
});

test("E2R1 anti-overdedupe (H): a nested non-editorial widget's own incidental figures must not cause two different real stories to merge", async () => {
  const launch = candidate({
    rank: 1,
    title: "Acme launches Atlas platform for enterprise teams",
    url: "https://acme.test/news/atlas-launch",
    highlights: ["Acme launches Atlas platform for enterprise teams."],
  });
  const hire = candidate({
    rank: 2,
    title: "Acme names new VP of engineering",
    url: "https://financewire.test/acme-vp-hire",
    highlights: ["Acme names new VP of engineering."],
  });
  const result = await verifyCompanyDiscovery(discovery([launch, hire]), "test-key", {
    now: NOW,
    sourceFetchImpl: sourceMap({
      // Independent adversarial review found the first version of this test
      // weak: the launch article had zero quantity figures at all, so the
      // comparison short-circuited on an empty anchor set before ever
      // exercising the 2-anchor-plus-corroboration logic against reachable
      // nested content. Both sides now carry a REAL, DIFFERENT figure so the
      // comparison genuinely runs and must correctly find no overlap.
      [launch.url]: article({
        title: launch.title,
        body: "Acme launched its new Atlas platform for enterprise teams, following 40 percent growth in platform adoption this year.",
      }),
      [hire.url]: nestedWidgetArticle({
        title: hire.title,
        // The widget's own generic "market moved 12 percent" chatter is
        // real (post-fix, reachable) content, but it does not match the
        // launch article's 40 percent figure at all -- zero shared anchors,
        // well below the 2-anchor minimum, so this must stay distinct.
        widgetNoise: "Ticker snapshot widget: broader market activity moved 12 percent across the session, unrelated to any single company's own results.",
        prose: "Acme named a new VP of engineering to lead its platform organization, continuing a series of leadership additions this year.",
      }),
    }),
    exaFetchImpl: async () => ({ ok: true, status: 200, json: async () => rawFallbackPayload([]) }),
  });
  assert.equal(result.state, "insufficient_evidence");
  assert.equal(result.evidence.length, 2);
});

test("E2R1 anti-overrun: a literal unbalanced '<article'-shaped substring inside an embedded <script> payload must not make the scanner walk past the true closing tag into an unrelated sibling section", async () => {
  // Independent adversarial review found this exact exploit: without
  // skipping <script>/<style>/comment regions during the depth-counting
  // scan, a literal "<article"-shaped substring inside a hydration/JSON
  // payload (a realistic pattern on JS-hydrated publisher templates) is
  // miscounted as a real nested open tag, so the scanner needs one MORE
  // closing tag than actually exists and overruns past the true </article>
  // into a sibling <aside> section -- swallowing its unrelated figures. The
  // old non-greedy regex could only ever truncate early; it could never do
  // this. Two DIFFERENT real stories are used: one whose page has this
  // contaminated script sitting inside its own <article>, and a second,
  // genuinely unrelated story that happens to restate the sibling <aside>'s
  // two incidental figures. They must NOT merge.
  const primary = candidate({
    rank: 1,
    title: "Acme launches new billing engine",
    url: "https://acme.test/news/billing-engine",
    highlights: ["Acme launches new billing engine."],
  });
  const unrelated = candidate({
    rank: 2,
    title: "Acme rival Globex posts strong quarter",
    url: "https://financewire.test/globex-quarter",
    highlights: ["Acme rival Globex posts strong quarter."],
  });
  const primaryHtml = `<!doctype html><html><head><script type="application/ld+json">${JSON.stringify({ "@type": "NewsArticle", headline: primary.title, datePublished: "2026-09-01" })}</script><title>${primary.title}</title></head><body><article class="story"><script type="application/json">{"preview":"content begins <article and continues from an earlier draft"}</script><h1>${primary.title}</h1><p>Acme launched a new billing engine for enterprise customers, its first major platform release this quarter.</p></article><aside id="related"><p>Unrelated: a separate analyst note pegs the sector at a $500 billion valuation, up 12 percent from last quarter.</p></aside></body></html>`;
  const result = await verifyCompanyDiscovery(discovery([primary, unrelated]), "test-key", {
    now: NOW,
    sourceFetchImpl: sourceMap({
      [primary.url]: primaryHtml,
      [unrelated.url]: article({
        title: unrelated.title,
        body: "Acme rival Globex posted a strong quarter, with the broader sector now valued at $500 billion, up 12 percent from last quarter according to analysts.",
      }),
    }),
    exaFetchImpl: async () => ({ ok: true, status: 200, json: async () => rawFallbackPayload([]) }),
  });
  // If the scanner overran into <aside>, the primary article's evidence
  // would spuriously pick up "500:billion:currency" and "12:percent" and
  // wrongly dedupe against the unrelated Globex story. It must not.
  assert.equal(result.state, "insufficient_evidence");
  assert.equal(result.evidence.length, 2);
});

test("E2R1: extractArticleEvidence does not overrun into a sibling section when a <script> payload contains an unbalanced '<article'-shaped substring (unit-level)", () => {
  const html = `<!doctype html><html><body><article class="story"><script type="application/json">{"preview":"content begins <article and continues from an earlier draft"}</script><h1>Acme launches new billing engine</h1><p>Acme launched a new billing engine for enterprise customers.</p></article><aside id="related"><p>Unrelated: a separate analyst note pegs the sector at a $500 billion valuation, up 12 percent from last quarter.</p></aside></body></html>`;
  const evidence = extractArticleEvidence(html);
  assert.ok(evidence.body.includes("billing engine"), `expected real prose in body, got: ${evidence.body}`);
  assert.ok(!evidence.body.includes("500 billion"), `body must not include the unrelated sibling <aside> content, got: ${evidence.body}`);
});

test("E2R1: a compound spelled-out number ('twenty-one billion') is not misread as 'one billion'", async () => {
  // collectQuantityAnchors is not exported, so this proves the practical,
  // pipeline-level consequence directly: a genuinely different article
  // stating an unrelated real "one billion" figure must not gain a shared
  // anchor with a "twenty-one billion" article merely because "twenty-one"
  // contains the substring "one".
  const other = candidate({
    rank: 1,
    title: "Acme opens new lab, tops one billion in orders",
    url: "https://acme.test/news/lab-milestone",
    highlights: ["Acme opens new lab, tops one billion in orders."],
  });
  const compoundOne = candidate({
    rank: 2,
    title: "Acme valuation update",
    url: "https://financewire.test/acme-valuation",
    highlights: ["Acme valuation update."],
  });
  const result = await verifyCompanyDiscovery(discovery([other, compoundOne]), "test-key", {
    now: NOW,
    sourceFetchImpl: sourceMap({
      [other.url]: article({
        title: other.title,
        body: "Acme opened a new research lab and confirmed cumulative orders have topped one billion units, a milestone for the platform.",
      }),
      [compoundOne.url]: article({
        title: compoundOne.title,
        body: "Acme's valuation reached twenty-one billion dollars this quarter, a figure investors called unprecedented for the sector.",
      }),
    }),
    exaFetchImpl: async () => ({ ok: true, status: 200, json: async () => rawFallbackPayload([]) }),
  });
  // "twenty-one billion" must not be misread as a shared "1:billion:count"
  // anchor against the genuinely unrelated "one billion units" story.
  assert.equal(result.state, "insufficient_evidence");
  assert.equal(result.evidence.length, 2);
});

test("E2R1 anti-overdedupe (I): a single shared word-form quantity anchor alone does not trigger dedupe (same 2-anchor-plus-corroboration rule governs word forms, not a bypass)", async () => {
  const productA = candidate({
    rank: 1,
    title: "Acme ships new analytics dashboard",
    url: "https://acme.test/news/analytics-dashboard",
    highlights: ["Acme ships new analytics dashboard."],
  });
  const productB = candidate({
    rank: 2,
    title: "Acme opens second data center region",
    url: "https://financewire.test/acme-data-center",
    highlights: ["Acme opens second data center region."],
  });
  const result = await verifyCompanyDiscovery(discovery([productA, productB]), "test-key", {
    now: NOW,
    sourceFetchImpl: sourceMap({
      [productA.url]: article({
        title: productA.title,
        body: "Acme shipped a new analytics dashboard used already by more than five million customers, giving teams real-time visibility into product usage.",
      }),
      [productB.url]: article({
        title: productB.title,
        body: "Acme opened a second data center region as demand grew past five million customers globally, expanding redundancy for its infrastructure.",
      }),
    }),
    exaFetchImpl: async () => ({ ok: true, status: 200, json: async () => rawFallbackPayload([]) }),
  });
  // Both bodies restate the same "five million customers" word-form figure,
  // but it is the ONLY shared anchor (one, not two) and neither title
  // contains it -- so this must stay distinct exactly like the existing
  // numeral-form single-shared-anchor case, proving the new word-number path
  // is bound by the same threshold, not an independent, weaker rule.
  assert.equal(result.state, "insufficient_evidence");
  assert.equal(result.evidence.length, 2);
});

// --- E2R1 corrections: initial-opener exclusion gap + word-form currency/count gap ---
//
// Project-owner actual-diff review of commit 4f623ca found two further real
// gaps in the E2R1 repair, both reproduced and corrected here.

test("E2R1 correction (Finding 1, unit-level): a fake '<article'-shaped string inside a <script> BEFORE the real article must not be selected as the opener or cause overrun into unrelated sibling content", () => {
  const html = `<!doctype html><html><body>
<script type="application/json">{"preview":"<article class=\\"ghost\\">"}</script>
<article><h1>Real story</h1><p>Real article content about the actual event.</p></article>
<aside><p>Unrelated sibling: a different fact mentions $777 million and 33 percent growth.</p></aside>
</body></html>`;
  const evidence = extractArticleEvidence(html);
  assert.ok(evidence.body.includes("Real article content"), `expected real prose in body, got: ${evidence.body}`);
  assert.ok(!evidence.body.includes("777 million"), `body must not include unrelated sibling <aside> content, got: ${evidence.body}`);
});

test("E2R1 correction (Finding 1, pipeline-level): two different real stories must not merge when one page has a fake opener before its real article and an unrelated sibling section restating the other story's own figures", async () => {
  // The fake opener sits BEFORE the real <article>, inside a <script>. If it
  // is wrongly selected as the "opening" tag (the exact gap independent
  // review found in 4f623ca), the scanner never gets to recognize the
  // script region as skippable, and can overrun past the true </article>
  // into the sibling <aside> -- picking up figures that happen to match a
  // genuinely different, unrelated real story.
  const primary = candidate({
    rank: 1,
    title: "Acme launches new billing engine",
    url: "https://acme.test/news/billing-engine-2",
    highlights: ["Acme launches new billing engine."],
  });
  const unrelated = candidate({
    rank: 2,
    title: "Acme rival Globex posts strong quarter",
    url: "https://financewire.test/globex-quarter-2",
    highlights: ["Acme rival Globex posts strong quarter."],
  });
  const primaryHtml = `<!doctype html><html><head><script type="application/ld+json">${JSON.stringify({ "@type": "NewsArticle", headline: primary.title, datePublished: "2026-09-01" })}</script><title>${primary.title}</title></head><body>
<script type="application/json">{"preview":"<article class=\\"ghost\\">"}</script>
<article><h1>${primary.title}</h1><p>Acme launched a new billing engine for enterprise customers, its first major platform release this quarter.</p></article>
<aside id="related"><p>Unrelated: a separate analyst note pegs the sector at a $500 billion valuation, up 12 percent from last quarter.</p></aside>
</body></html>`;
  const result = await verifyCompanyDiscovery(discovery([primary, unrelated]), "test-key", {
    now: NOW,
    sourceFetchImpl: sourceMap({
      [primary.url]: primaryHtml,
      [unrelated.url]: article({
        title: unrelated.title,
        body: "Acme rival Globex posted a strong quarter, with the broader sector now valued at $500 billion, up 12 percent from last quarter according to analysts.",
      }),
    }),
    exaFetchImpl: async () => ({ ok: true, status: 200, json: async () => rawFallbackPayload([]) }),
  });
  assert.equal(result.state, "insufficient_evidence");
  assert.equal(result.evidence.length, 2);
});

test("E2R1 correction (Finding 2, pipeline-level, red-before-green): a spelled-out currency amount ('one billion dollars') must not share an anchor with an unrelated plain count ('one billion users')", async () => {
  // Article A (a funding event) states its headline figure as a spelled-out
  // CURRENCY amount ("one billion dollars") and a second, headline-stated
  // percent figure. Article B (a genuinely different, unrelated user-
  // milestone event) states an unrelated plain COUNT ("one billion users")
  // and happens to also restate the same percent figure for an unrelated
  // reason. Under the bug (every word-form anchor tagged :count regardless
  // of a "dollars" suffix), "one billion" would wrongly register as a
  // SHARED anchor between the two, and combined with the shared percent
  // anchor (headline-corroborated on side A), the pair would incorrectly
  // dedupe. The corrected currency-vs-count tagging must keep them distinct.
  const funding = candidate({
    rank: 1,
    title: "Acme raises one billion dollars in new funding, up 50 percent from last round",
    url: "https://acme.test/news/funding-round",
    highlights: ["Acme raises one billion dollars in new funding, up 50 percent from last round."],
  });
  const milestone = candidate({
    rank: 2,
    title: "Acme surpasses one billion users worldwide",
    url: "https://financewire.test/acme-user-milestone",
    highlights: ["Acme surpasses one billion users worldwide."],
  });
  const result = await verifyCompanyDiscovery(discovery([funding, milestone]), "test-key", {
    now: NOW,
    sourceFetchImpl: sourceMap({
      [funding.url]: article({
        title: funding.title,
        body: "Acme raised one billion dollars in its latest funding round, marking a 50 percent increase in valuation versus its previous round.",
      }),
      [milestone.url]: article({
        title: milestone.title,
        body: "Acme confirmed it has surpassed one billion users worldwide, and separately noted platform engagement grew 50 percent year over year.",
      }),
    }),
    exaFetchImpl: async () => ({ ok: true, status: 200, json: async () => rawFallbackPayload([]) }),
  });
  // Only "50:percent" remains genuinely shared once "one billion dollars"
  // (currency) and "one billion users" (count) are correctly kept distinct
  // -- one anchor, below the 2-anchor minimum, so this must stay distinct.
  assert.equal(result.state, "insufficient_evidence");
  assert.equal(result.evidence.length, 2);
});

test("E2R1 correction (Finding 2, compatibility): a spelled-out currency amount ('one billion dollars') correctly shares an anchor with the equivalent numeral currency form ('$1 billion')", async () => {
  // Confirms the corrected word-form currency tagging normalizes to the
  // SAME anchor key as the existing numeral currency pattern, so a true
  // same-event pair stated in different forms is still caught.
  const numeralHeadline = candidate({
    rank: 1,
    title: "Acme valued at $1 billion after new funding, up 50 percent from last round",
    url: "https://acme.test/news/valuation-numeral",
    highlights: ["Acme valued at $1 billion after new funding, up 50 percent from last round."],
  });
  const wordForm = candidate({
    rank: 2,
    title: "Acme celebrates new funding milestone",
    url: "https://financewire.test/acme-funding-milestone",
    highlights: ["Acme celebrates new funding milestone."],
  });
  const observed = await verifyCompanyDiscoveryForSmoke(
    { state: "ready_for_verification", company: { ...COMPANY, companyName: "Acme", officialDomain: "acme.test" }, prioritized: [numeralHeadline, wordForm] },
    "test-key",
    {
      now: NOW,
      sourceFetchImpl: sourceMap({
        [numeralHeadline.url]: article({
          title: numeralHeadline.title,
          date: "2026-09-01",
          body: "Acme was valued at $1 billion after its new funding round, a 50 percent increase from its previous valuation.",
        }),
        [wordForm.url]: article({
          title: wordForm.title,
          date: "2026-09-02",
          body: "Acme celebrated a new funding milestone: the company confirmed it raised one billion dollars, marking a 50 percent jump in valuation from its prior round.",
        }),
      }),
      exaFetchImpl: async () => ({ ok: true, status: 200, json: async () => rawFallbackPayload([]) }),
    },
  );
  assert.deepEqual(observed.diagnostic.broad.map((entry) => entry.reason), ["accepted", "duplicate"]);
  assert.equal(observed.result.state, "insufficient_evidence");
  assert.equal(observed.result.evidence.length, 1);
});

test("B3R3: pipeline-level regression — real B3 flow accepts multiple valid first-party Notion candidates that say Notion but never Labs", async () => {
  const broad = [
    candidate({ rank: 1, title: "Introducing Notion's Developer Platform", url: "https://notion.com/blog/developer-platform", highlights: ["Introducing Notion's Developer Platform."] }),
    candidate({ rank: 2, title: "Notion expands multi-region infrastructure", url: "https://notion.com/blog/multi-region", highlights: ["Notion expands multi-region infrastructure."] }),
    candidate({ rank: 3, title: "Notion adds new AI agent controls", url: "https://notion.com/blog/agent-controls", highlights: ["Notion adds new AI agent controls."] }),
  ];
  const pages = {
    "https://notion.com/blog/developer-platform": notionArticle({
      title: "Introducing Notion's Developer Platform",
      body: "Notion today announced a substantial new developer platform for building custom integrations. Notion says this material update expands what teams can build for customers.",
    }),
    "https://notion.com/blog/multi-region": notionArticle({
      title: "Notion expands multi-region infrastructure",
      body: "Notion expanded its multi-region infrastructure to add substantial new regional capacity for enterprise customers. Notion says the material development improves reliability for teams.",
    }),
    "https://notion.com/blog/agent-controls": notionArticle({
      title: "Notion adds new AI agent controls",
      body: "Notion added substantial new controls for which AI models agents can use across a workspace. Notion says the material update gives teams more control over automation.",
    }),
  };
  const result = await verifyCompanyDiscovery({ state: "ready_for_verification", company: NOTION, prioritized: broad }, "test-key", {
    now: NOW,
    sourceFetchImpl: sourceMap(pages),
    exaFetchImpl: async () => { throw new Error("fallback must not run"); },
  });
  assert.equal(result.state, "verified");
  assert.equal(result.evidence.length, 3);
  assert.equal(result.evidence.every((item) => item.sourceClass === "FIRST_PARTY"), true);
  for (const page of Object.values(pages)) assert.doesNotMatch(page, /\bLabs\b/i);
});
