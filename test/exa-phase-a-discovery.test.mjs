import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  ENDPOINT,
  NUM_RESULTS,
  SEARCH_TYPE,
  buildDisplayHtml,
  buildQuery,
  buildRequestBody,
  formatSummary,
  parseArgs,
  parseSearchResponse,
  redact,
  requestCandidates,
  validateOptions,
} from "../scripts/exa-phase-a-discovery.mjs";

const NOW = new Date("2026-09-08T12:00:00.000Z");

function providerPayload(overrides = {}) {
  return {
    requestId: "not-for-display",
    results: overrides.results ?? [
      {
        title: "Major <platform> announcement",
        url: "https://news.test/item?a=1&b=2",
        publishedDate: "2026-09-01T00:00:00.000Z",
        author: "Reporter <One>",
        highlights: ["NVIDIA announced <unsafe> & material news."],
        text: "unused full text",
      },
      {
        title: "Candidate without optional metadata",
        url: "http://nvidia.com/news/two",
      },
      {
        title: "Second report on the news domain",
        url: "https://news.test/three",
        publishedDate: "2026-08-15T00:00:00.000Z",
        author: null,
        highlights: ["Another relevant excerpt."],
      },
    ],
    output: { content: "must be ignored" },
    costDollars: Object.hasOwn(overrides, "costDollars")
      ? overrides.costDollars
      : { total: 0.008 },
  };
}

test("preflight restricts execution to confirmed NVIDIA discovery", () => {
  const valid = parseArgs([
    "discovery",
    "--company",
    "NVIDIA",
    "--confirmed-free-starter",
  ]);
  assert.doesNotThrow(() => validateOptions(valid, "test-key"));

  assert.throws(
    () => validateOptions(parseArgs(["discovery", "--company", "NVIDIA"]), "test-key"),
    /confirmed-free-starter/,
  );
  assert.throws(() => validateOptions(valid, ""), /EXA_API_KEY is not set/);
  assert.throws(
    () =>
      validateOptions(
        parseArgs(["benchmark", "--company", "NVIDIA", "--confirmed-free-starter"]),
        "test-key",
      ),
    /Only the Phase A4\.1 discovery mode/,
  );
  assert.throws(
    () =>
      validateOptions(
        parseArgs(["discovery", "--company", "Stripe", "--confirmed-free-starter"]),
        "test-key",
      ),
    /restricted to NVIDIA/,
  );
});

test("request contract makes exactly one raw auto Search call with default highlights", async () => {
  const calls = [];
  const fetchImpl = async (...args) => {
    calls.push(args);
    return { ok: true, status: 200, json: async () => providerPayload() };
  };

  await requestCandidates("NVIDIA", "test-key", fetchImpl);
  assert.equal(calls.length, 1);

  const [url, options] = calls[0];
  const body = JSON.parse(options.body);
  assert.equal(url, ENDPOINT);
  assert.equal(options.method, "POST");
  assert.equal(options.headers["x-api-key"], "test-key");
  assert.deepEqual(Object.keys(body).sort(), ["contents", "numResults", "query", "stream", "type"]);
  assert.equal(body.type, SEARCH_TYPE);
  assert.equal(body.type, "auto");
  assert.equal(body.numResults, NUM_RESULTS);
  assert.equal(body.numResults, 10);
  assert.deepEqual(body.contents, { highlights: true });
  assert.equal(body.stream, false);

  for (const forbidden of [
    "outputSchema",
    "systemPrompt",
    "additionalQueries",
    "summary",
    "text",
    "startPublishedDate",
    "endPublishedDate",
    "category",
    "livecrawl",
    "maxAgeHours",
  ]) {
    assert.equal(forbidden in body, false, `${forbidden} must be absent`);
  }
});

test("query targets material company developments without seeding prior NVIDIA answers", () => {
  const query = buildQuery("NVIDIA", NOW);
  assert.match(query, /NVIDIA/);
  assert.match(query, /2026-09-08/);
  assert.match(query, /significant company-level developments/);
  assert.match(query, /product or platform announcements/);
  assert.match(query, /partnerships or customer deals/);
  assert.match(query, /first-party company announcements/);
  assert.match(query, /Exclude routine repository or code maintenance/);
  assert.match(query, /duplicate coverage/);
  assert.doesNotMatch(
    query,
    /TensorRT|DLSS|Hugging Face|Blackwell|earnings|stale fallback test/i,
  );

  const body = buildRequestBody("NVIDIA", NOW);
  assert.equal(body.query, query);
});

test("non-OK responses are minimized and never retried", async () => {
  let calls = 0;
  const fetchImpl = async () => {
    calls += 1;
    return {
      ok: false,
      status: 402,
      json: async () => ({
        tag: "NO_MORE_CREDITS",
        error: "provider prose and candidate material must not be emitted",
      }),
    };
  };

  await assert.rejects(
    () => requestCandidates("NVIDIA", "test-key", fetchImpl),
    (error) => {
      assert.match(
        error.message,
        /provider_paid_required: HTTP 402; tag=NO_MORE_CREDITS; latency_ms=\d+/,
      );
      assert.doesNotMatch(error.message, /provider prose|candidate material/);
      return true;
    },
  );
  assert.equal(calls, 1);
});

test("latency includes response body consumption", async () => {
  const fetchImpl = async () => ({
    ok: true,
    status: 200,
    json: async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
      return providerPayload();
    },
  });

  const result = await requestCandidates("NVIDIA", "test-key", fetchImpl);
  assert.ok(result.latencyMs >= 15, `expected body-inclusive latency, got ${result.latencyMs}ms`);

  let calls = 0;
  await assert.rejects(
    () =>
      requestCandidates("NVIDIA", "test-key", async () => {
        calls += 1;
        return {
          ok: true,
          status: 200,
          json: async () => {
            const error = new Error("body read aborted");
            error.name = "AbortError";
            throw error;
          },
        };
      }),
    /latency: request exceeded 60 seconds/,
  );
  assert.equal(calls, 1);
});

test("raw result fields are projected and optional metadata remains explicitly absent", () => {
  const result = parseSearchResponse(providerPayload(), 1234);
  assert.equal(result.candidates.length, 3);
  assert.deepEqual(result.candidates[0], {
    rank: 1,
    title: "Major <platform> announcement",
    url: "https://news.test/item?a=1&b=2",
    publishedDate: "2026-09-01T00:00:00.000Z",
    author: "Reporter <One>",
    highlights: ["NVIDIA announced <unsafe> & material news."],
  });
  assert.deepEqual(result.candidates[1], {
    rank: 2,
    title: "Candidate without optional metadata",
    url: "http://nvidia.com/news/two",
    publishedDate: null,
    author: null,
    highlights: [],
  });
  assert.equal("text" in result.candidates[0], false);
  assert.equal(result.estimatedCostUsd, 0.008);
});

test("missing or whitespace-only optional values render as unknown or absent", () => {
  const payload = providerPayload({
    results: [
      {
        title: "Candidate",
        url: "https://example.test/item",
        publishedDate: "   ",
        author: "",
        highlights: ["  "],
      },
    ],
  });
  const result = parseSearchResponse(payload);
  assert.equal(result.candidates[0].publishedDate, null);
  assert.equal(result.candidates[0].author, null);
  assert.deepEqual(result.candidates[0].highlights, []);

  const html = buildDisplayHtml(result);
  assert.match(html, /Provider publishedDate: unknown/);
  assert.match(html, /No highlights returned by Exa/);
  assert.doesNotMatch(html, /Author:/);
});

test("raw result titles are optional metadata while valid URLs remain required", () => {
  for (const title of [undefined, null, ""]) {
    const result = parseSearchResponse(
      providerPayload({ results: [{ title, url: "https://example.test/untitled", highlights: [] }] }),
    );
    assert.equal(result.candidates[0].title, null);
  }

  const titled = parseSearchResponse(
    providerPayload({ results: [{ title: "Provider title", url: "https://example.test/titled", highlights: [] }] }),
  );
  assert.equal(titled.candidates[0].title, "Provider title");
  assert.match(buildDisplayHtml(titled), /Provider title/);

  const untitled = parseSearchResponse(
    providerPayload({ results: [{ url: "https://example.test/untitled", highlights: [] }] }),
  );
  assert.match(buildDisplayHtml(untitled), /Untitled source/);
});

test("malformed, unsupported, and whitespace-padded result URLs fail closed", () => {
  for (const sourceUrl of [
    undefined,
    null,
    "",
    "not a URL",
    "javascript:alert(1)",
    "ftp://example.test/source",
    " https://example.test/source ",
  ]) {
    const payload = providerPayload({
      results: [{ title: "Candidate", url: sourceUrl, highlights: [] }],
    });
    assert.throws(
      () => parseSearchResponse(payload),
      /results\[0\]\.url was not (a non-empty string|an exact http\(s\) URL)/,
    );
  }
});

test("invalid raw result field shapes fail closed", () => {
  assert.throws(() => parseSearchResponse(null), /provider response was not an object/);
  assert.throws(() => parseSearchResponse({}), /provider results were absent/);
  assert.throws(
    () => parseSearchResponse({ results: [null] }),
    /results\[0\] was not an object/,
  );
  assert.throws(
    () => parseSearchResponse({ results: [{ title: 42, url: "https://example.test" }] }),
    /title was not a string or null/,
  );
  assert.throws(
    () =>
      parseSearchResponse({
        results: [{ title: "Candidate", url: "https://example.test", highlights: "excerpt" }],
      }),
    /highlights was not an array/,
  );
  assert.throws(
    () =>
      parseSearchResponse({
        results: [{ title: "Candidate", url: "https://example.test", highlights: [123] }],
      }),
    /highlights\[0\] was not a string/,
  );
});

test("candidate display escapes all text and preserves exact provider destinations", () => {
  const result = parseSearchResponse(providerPayload());
  const html = buildDisplayHtml(result);

  assert.equal(result.candidates[0].url, "https://news.test/item?a=1&b=2");
  assert.match(html, /Major &lt;platform&gt; announcement/);
  assert.doesNotMatch(html, /<h2>Major <platform>/);
  assert.match(html, /Reporter &lt;One&gt;/);
  assert.match(html, /NVIDIA announced &lt;unsafe&gt; &amp; material news/);
  assert.match(html, /href="https:\/\/news\.test\/item\?a=1&amp;b=2"/);
  assert.match(html, /Provider publishedDate values are estimated discovery metadata, not proof/);
  assert.match(html, /Nothing on this page is persisted/);
  assert.match(html, /No candidates returned by Exa|Raw discovery results/);
  assert.doesNotMatch(html, /not-for-display|unused full text|costDollars/);
});

test("aggregate diagnostics report counts without candidate material", () => {
  const result = parseSearchResponse(providerPayload(), 4567);
  const summary = formatSummary(result);

  assert.match(summary, /endpoint=https:\/\/api\.exa\.ai\/search/);
  assert.match(summary, /search_type=auto/);
  assert.match(summary, /latency_ms=4567/);
  assert.match(summary, /provider_result_count=3/);
  assert.match(summary, /dated_result_count=2/);
  assert.match(summary, /highlight_result_count=2/);
  assert.match(summary, /unique_domain_count=2/);
  assert.match(summary, /estimated_cost_usd=0.008/);
  assert.doesNotMatch(
    summary,
    /Major|Candidate|news\.test|nvidia\.com|Reporter|material news|Another relevant/,
  );

  const noCost = parseSearchResponse(providerPayload({ costDollars: undefined }));
  assert.match(formatSummary(noCost), /estimated_cost_usd=not_returned/);
});

test("errors redact both the active secret and Exa-shaped keys", () => {
  const activeKey = "custom-secret-value";
  const shapedKey = `exa_${"A".repeat(24)}`;
  assert.equal(
    redact(`failed ${activeKey} ${shapedKey}`, activeKey),
    "failed [REDACTED_API_KEY] [REDACTED_API_KEY]",
  );
});

test("diagnostic has no persistence path and keeps the display local and non-cacheable", () => {
  const script = readFileSync(
    new URL("../scripts/exa-phase-a-discovery.mjs", import.meta.url),
    "utf8",
  );
  assert.doesNotMatch(script, /node:fs|writeFile|appendFile|createWriteStream/);
  assert.match(script, /server\.listen\(0, "127\.0\.0\.1"/);
  assert.match(script, /"Cache-Control": "no-store, max-age=0"/);
  assert.match(script, /Pragma: "no-cache"/);
  assert.match(script, /console\.log\(formatSummary\(result\)\)/);
  assert.doesNotMatch(script, /console\.log\([^\n]*(candidate|results|payload)/i);
});
