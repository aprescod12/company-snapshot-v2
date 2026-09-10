import assert from "node:assert/strict";
import test from "node:test";

import {
  CompanyDescriptionError,
  DESCRIPTION_UNAVAILABLE_REASON,
  buildContentsRequestBody,
  buildDescriptionQuery,
  buildHomepageUrl,
  parseContentsPayload,
  requestCompanyDescription,
} from "../src/description/exaCompanyDescription.mjs";

const COMPANY = { companyName: "Acme", officialDomain: "acme.test" };

function ok(value) {
  return { ok: true, status: 200, json: async () => value };
}

function fail(status, tag) {
  return { ok: false, status, json: async () => ({ tag }) };
}

function successPayload({
  url = "https://acme.test/",
  summary = "Acme builds enterprise software for supply-chain teams. Retailers and manufacturers use its platform to coordinate suppliers.",
  costTotal = 0.004,
} = {}) {
  return {
    requestId: "req-1",
    results: [{ id: "https://acme.test/", url, title: "Acme", summary }],
    statuses: [{ id: "https://acme.test/", status: "success", source: "cached" }],
    costDollars: { total: costTotal },
  };
}

function fetchSpy(response) {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url, init });
    return response;
  };
  return { calls, fetchImpl };
}

test("buildHomepageUrl constructs only the HTTPS root of the confirmed domain", () => {
  assert.equal(buildHomepageUrl("acme.test"), "https://acme.test/");
  assert.equal(buildHomepageUrl("Acme.Test"), "https://acme.test/");
});

test("buildHomepageUrl rejects a domain carrying a path, query, or credentials", () => {
  assert.throws(() => buildHomepageUrl("acme.test/about"), TypeError);
  assert.throws(() => buildHomepageUrl("acme.test?x=1"), TypeError);
  assert.throws(() => buildHomepageUrl("user:pass@acme.test"), TypeError);
  assert.throws(() => buildHomepageUrl(""), TypeError);
  assert.throws(() => buildHomepageUrl(null), TypeError);
});

test("buildDescriptionQuery is narrow: names the company, bounds sentence count, and excludes current-events content", () => {
  const query = buildDescriptionQuery("Acme");
  assert.match(query, /Acme/);
  assert.match(query, /2 to 3/);
  assert.match(query, /only on the content of this webpage/i);
  for (const excluded of ["announcements", "funding", "acquisitions", "partnerships", "earnings", "leadership", "stock performance", "promotional"]) {
    assert.match(query.toLowerCase(), new RegExp(excluded));
  }
});

test("buildContentsRequestBody requests summary only against exactly one URL, with no Search/subpage/text/highlight fields", () => {
  const body = buildContentsRequestBody("Acme", "https://acme.test/");
  assert.deepEqual(Object.keys(body).sort(), ["summary", "urls"]);
  assert.deepEqual(body.urls, ["https://acme.test/"]);
  assert.deepEqual(Object.keys(body.summary), ["query"]);
  assert.equal(typeof body.summary.query, "string");
  for (const forbidden of ["text", "highlights", "subpages", "livecrawl", "query", "numResults", "type"]) {
    assert.equal(Object.hasOwn(body, forbidden), false);
  }
});

test("requestCompanyDescription makes exactly one Contents request against the confirmed homepage", async () => {
  const { calls, fetchImpl } = fetchSpy(ok(successPayload()));
  const result = await requestCompanyDescription(COMPANY, "test-key", { fetchImpl });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "https://api.exa.ai/contents");
  assert.equal(calls[0].init.method, "POST");
  assert.equal(calls[0].init.headers["x-api-key"], "test-key");
  const sentBody = JSON.parse(calls[0].init.body);
  assert.deepEqual(sentBody.urls, ["https://acme.test/"]);
  assert.equal(result.state, "described");
});

test("a successful two-sentence summary is accepted", async () => {
  const summary = "Acme builds enterprise software for supply-chain teams. Retailers and manufacturers use its platform to coordinate suppliers.";
  const { fetchImpl } = fetchSpy(ok(successPayload({ summary })));
  const result = await requestCompanyDescription(COMPANY, "test-key", { fetchImpl });

  assert.equal(result.state, "described");
  assert.equal(result.description, summary);
  assert.equal(result.sourceUrl, "https://acme.test/");
  assert.deepEqual(result.company, COMPANY);
  assert.equal(result.provider.estimatedCostUsd, 0.004);
  assert.equal(typeof result.provider.latencyMs, "number");
});

test("a successful three-sentence summary is accepted", async () => {
  const summary = "Acme builds enterprise software for supply-chain teams. It focuses on inventory optimization and logistics planning. Retailers and manufacturers use its platform to coordinate suppliers.";
  const { fetchImpl } = fetchSpy(ok(successPayload({ summary })));
  const result = await requestCompanyDescription(COMPANY, "test-key", { fetchImpl });

  assert.equal(result.state, "described");
  assert.equal(result.description, summary);
});

test("harmless whitespace is normalized", async () => {
  const raw = "Acme builds  enterprise   software\nfor supply-chain teams.\t Retailers and manufacturers use its platform to coordinate suppliers.  ";
  const { fetchImpl } = fetchSpy(ok(successPayload({ summary: raw })));
  const result = await requestCompanyDescription(COMPANY, "test-key", { fetchImpl });

  assert.equal(result.state, "described");
  assert.equal(result.description, "Acme builds enterprise software for supply-chain teams. Retailers and manufacturers use its platform to coordinate suppliers.");
});

test("a canonical result URL on a subdomain of the confirmed official domain is accepted", async () => {
  const { fetchImpl } = fetchSpy(ok(successPayload({ url: "https://www.acme.test/" })));
  const result = await requestCompanyDescription(COMPANY, "test-key", { fetchImpl });

  assert.equal(result.state, "described");
  assert.equal(result.sourceUrl, "https://www.acme.test/");
});

test("an unrelated result/redirect domain is rejected as untrusted, not silently accepted", async () => {
  const { fetchImpl } = fetchSpy(ok(successPayload({ url: "https://unrelated-example.test/" })));
  const result = await requestCompanyDescription(COMPANY, "test-key", { fetchImpl });

  assert.deepEqual(result, { state: "description_unavailable", reason: DESCRIPTION_UNAVAILABLE_REASON.UNTRUSTED_SOURCE_DOMAIN });
});

test("a hostname that merely shares a domain suffix string (not a true subdomain) is rejected", async () => {
  const { fetchImpl } = fetchSpy(ok(successPayload({ url: "https://notacme.test/" })));
  const result = await requestCompanyDescription(COMPANY, "test-key", { fetchImpl });

  assert.deepEqual(result, { state: "description_unavailable", reason: DESCRIPTION_UNAVAILABLE_REASON.UNTRUSTED_SOURCE_DOMAIN });
});

test("a one-sentence summary is rejected", async () => {
  const { fetchImpl } = fetchSpy(ok(successPayload({ summary: "Acme builds enterprise software." })));
  const result = await requestCompanyDescription(COMPANY, "test-key", { fetchImpl });

  assert.deepEqual(result, { state: "description_unavailable", reason: DESCRIPTION_UNAVAILABLE_REASON.INVALID_SENTENCE_COUNT });
});

test("a four-or-more-sentence summary is rejected", async () => {
  const summary = "Acme builds enterprise software. It serves supply chains. It also serves logistics teams. It is based in several countries.";
  const { fetchImpl } = fetchSpy(ok(successPayload({ summary })));
  const result = await requestCompanyDescription(COMPANY, "test-key", { fetchImpl });

  assert.deepEqual(result, { state: "description_unavailable", reason: DESCRIPTION_UNAVAILABLE_REASON.INVALID_SENTENCE_COUNT });
});

test("a missing or empty summary is rejected", async () => {
  const missing = await requestCompanyDescription(COMPANY, "test-key", { fetchImpl: fetchSpy(ok(successPayload({ summary: null }))).fetchImpl });
  assert.deepEqual(missing, { state: "description_unavailable", reason: DESCRIPTION_UNAVAILABLE_REASON.EMPTY_SUMMARY });

  const empty = await requestCompanyDescription(COMPANY, "test-key", { fetchImpl: fetchSpy(ok(successPayload({ summary: "   " }))).fetchImpl });
  assert.deepEqual(empty, { state: "description_unavailable", reason: DESCRIPTION_UNAVAILABLE_REASON.EMPTY_SUMMARY });
});

test("a summary containing an embedded URL is rejected", async () => {
  const summary = "Acme builds enterprise software, see https://acme.test/about for more. Retailers use its platform to coordinate suppliers.";
  const { fetchImpl } = fetchSpy(ok(successPayload({ summary })));
  const result = await requestCompanyDescription(COMPANY, "test-key", { fetchImpl });

  assert.deepEqual(result, { state: "description_unavailable", reason: DESCRIPTION_UNAVAILABLE_REASON.EMBEDDED_URL });
});

test("a summary beyond the bounded maximum length is rejected", async () => {
  const summary = `Acme builds enterprise software for supply-chain teams. ${"Retailers rely on its platform for coordination and planning across many complex supplier networks and long logistics routes. ".repeat(6)}`;
  const { fetchImpl } = fetchSpy(ok(successPayload({ summary })));
  const result = await requestCompanyDescription(COMPANY, "test-key", { fetchImpl });

  assert.deepEqual(result, { state: "description_unavailable", reason: DESCRIPTION_UNAVAILABLE_REASON.TOO_LONG });
});

test("a malformed result URL is rejected", async () => {
  const { fetchImpl } = fetchSpy(ok(successPayload({ url: "not-a-url" })));
  const result = await requestCompanyDescription(COMPANY, "test-key", { fetchImpl });

  assert.deepEqual(result, { state: "description_unavailable", reason: DESCRIPTION_UNAVAILABLE_REASON.INVALID_SOURCE_URL });
});

test("an unsuccessful per-URL Contents status is rejected without inspecting results", async () => {
  const payload = {
    requestId: "req-1",
    results: [],
    statuses: [{ id: "https://acme.test/", status: "error", error: { tag: "CRAWL_NOT_FOUND", httpStatusCode: 404 } }],
  };
  const { calls, fetchImpl } = fetchSpy(ok(payload));
  const result = await requestCompanyDescription(COMPANY, "test-key", { fetchImpl });

  assert.deepEqual(result, { state: "description_unavailable", reason: DESCRIPTION_UNAVAILABLE_REASON.UNSUCCESSFUL_STATUS });
  assert.equal(calls.length, 1);
});

test("malformed provider output (missing statuses/results despite HTTP success) throws provider_format", async () => {
  const noStatuses = fetchSpy(ok({ results: [{ url: "https://acme.test/", summary: "x" }] }));
  await assert.rejects(
    () => requestCompanyDescription(COMPANY, "test-key", { fetchImpl: noStatuses.fetchImpl }),
    (error) => error instanceof CompanyDescriptionError && error.code === "provider_format",
  );

  const successWithoutResult = fetchSpy(ok({ results: [], statuses: [{ id: "https://acme.test/", status: "success" }] }));
  await assert.rejects(
    () => requestCompanyDescription(COMPANY, "test-key", { fetchImpl: successWithoutResult.fetchImpl }),
    (error) => error instanceof CompanyDescriptionError && error.code === "provider_format",
  );

  const notJson = fetchSpy({ ok: true, status: 200, json: async () => { throw new Error("bad json"); } });
  await assert.rejects(
    () => requestCompanyDescription(COMPANY, "test-key", { fetchImpl: notJson.fetchImpl }),
    (error) => error instanceof CompanyDescriptionError && error.code === "provider_format",
  );
});

test("auth, payment-required, quota, and unavailable failures classify consistently and make no retry", async () => {
  const cases = [
    [401, "UNKNOWN", "provider_auth"],
    [401, "INVALID_API_KEY", "provider_auth"],
    [402, "NO_MORE_CREDITS", "provider_paid_required"],
    [429, "RATE_LIMIT_EXCEEDED", "provider_quota"],
    [500, "UNKNOWN", "provider_unavailable"],
  ];
  for (const [status, tag, expectedCode] of cases) {
    const { calls, fetchImpl } = fetchSpy(fail(status, tag));
    await assert.rejects(
      () => requestCompanyDescription(COMPANY, "test-key", { fetchImpl }),
      (error) => error instanceof CompanyDescriptionError && error.code === expectedCode,
    );
    assert.equal(calls.length, 1);
  }
});

test("a timeout classifies as provider_unavailable and makes no retry", async () => {
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push(url);
    return new Promise((_, reject) => {
      options.signal.addEventListener("abort", () => reject(Object.assign(new Error("aborted"), { name: "AbortError" })));
    });
  };
  await assert.rejects(
    () => requestCompanyDescription(COMPANY, "test-key", { fetchImpl, timeoutMs: 1 }),
    (error) => error instanceof CompanyDescriptionError && error.code === "provider_unavailable",
  );
  assert.equal(calls.length, 1);
});

test("a missing API key is rejected before any fetch is attempted", async () => {
  const { calls, fetchImpl } = fetchSpy(ok(successPayload()));
  await assert.rejects(
    () => requestCompanyDescription(COMPANY, "", { fetchImpl }),
    (error) => error instanceof CompanyDescriptionError && error.code === "provider_auth",
  );
  assert.equal(calls.length, 0);
});

test("parseContentsPayload rejects a status entry that is not a single element", () => {
  assert.throws(
    () => parseContentsPayload({ results: [], statuses: [] }, "https://acme.test/", "acme.test"),
    (error) => error instanceof CompanyDescriptionError && error.code === "provider_format",
  );
});

test("matching status.id and result.id for the requested homepage are accepted", async () => {
  const { fetchImpl } = fetchSpy(ok(successPayload()));
  const result = await requestCompanyDescription(COMPANY, "test-key", { fetchImpl });

  assert.equal(result.state, "described");
});

test("a mismatched status.id is treated as a provider-format contract violation", async () => {
  const payload = successPayload();
  payload.statuses[0].id = "https://acme.test/about";
  const { fetchImpl } = fetchSpy(ok(payload));

  await assert.rejects(
    () => requestCompanyDescription(COMPANY, "test-key", { fetchImpl }),
    (error) => error instanceof CompanyDescriptionError && error.code === "provider_format",
  );
});

test("a mismatched result.id is treated as a provider-format contract violation", async () => {
  const payload = successPayload();
  payload.results[0].id = "https://acme.test/about";
  const { fetchImpl } = fetchSpy(ok(payload));

  await assert.rejects(
    () => requestCompanyDescription(COMPANY, "test-key", { fetchImpl }),
    (error) => error instanceof CompanyDescriptionError && error.code === "provider_format",
  );
});

test("a missing or malformed status.id is treated as a provider-format contract violation", async () => {
  const missing = successPayload();
  delete missing.statuses[0].id;
  await assert.rejects(
    () => requestCompanyDescription(COMPANY, "test-key", { fetchImpl: fetchSpy(ok(missing)).fetchImpl }),
    (error) => error instanceof CompanyDescriptionError && error.code === "provider_format",
  );

  const malformed = successPayload();
  malformed.statuses[0].id = 12345;
  await assert.rejects(
    () => requestCompanyDescription(COMPANY, "test-key", { fetchImpl: fetchSpy(ok(malformed)).fetchImpl }),
    (error) => error instanceof CompanyDescriptionError && error.code === "provider_format",
  );
});

test("a missing or malformed result.id is treated as a provider-format contract violation", async () => {
  const missing = successPayload();
  delete missing.results[0].id;
  await assert.rejects(
    () => requestCompanyDescription(COMPANY, "test-key", { fetchImpl: fetchSpy(ok(missing)).fetchImpl }),
    (error) => error instanceof CompanyDescriptionError && error.code === "provider_format",
  );

  const malformed = successPayload();
  malformed.results[0].id = null;
  await assert.rejects(
    () => requestCompanyDescription(COMPANY, "test-key", { fetchImpl: fetchSpy(ok(malformed)).fetchImpl }),
    (error) => error instanceof CompanyDescriptionError && error.code === "provider_format",
  );
});

test("a matching requested ID with a legitimate same-domain canonical result.url still passes", async () => {
  const payload = successPayload({ url: "https://www.acme.test/home" });
  const { fetchImpl } = fetchSpy(ok(payload));
  const result = await requestCompanyDescription(COMPANY, "test-key", { fetchImpl });

  assert.equal(result.state, "described");
  assert.equal(result.sourceUrl, "https://www.acme.test/home");
});

test("a matching requested ID with an off-domain canonical result.url is still rejected by the domain gate", async () => {
  const payload = successPayload({ url: "https://unrelated-example.test/" });
  const { fetchImpl } = fetchSpy(ok(payload));
  const result = await requestCompanyDescription(COMPANY, "test-key", { fetchImpl });

  assert.deepEqual(result, { state: "description_unavailable", reason: DESCRIPTION_UNAVAILABLE_REASON.UNTRUSTED_SOURCE_DOMAIN });
});
