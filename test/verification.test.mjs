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
