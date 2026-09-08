import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  ENDPOINT,
  OUTPUT_SCHEMA,
  SEARCH_TYPE,
  buildDisplayHtml,
  buildRequestBody,
  formatSummary,
  parseArgs,
  parseSearchResponse,
  redact,
  requestSnapshot,
  validateOptions,
  validateSnapshot,
} from "../scripts/exa-phase-a.mjs";

const NOW = new Date("2026-09-08T12:00:00.000Z");

function providerPayload(overrides = {}) {
  const snapshot = overrides.snapshot ?? {
    resolvedCompanyName: "NVIDIA Corporation",
    officialDomain: "nvidia.com",
    description: "NVIDIA designs accelerated computing platforms. Its products span chips, systems, software, and services.",
    signals: [
      { title: "First event", date: "2026-09-01", summary: "First summary." },
      { title: "Second event", date: "2026-08-01", summary: "Second summary." },
      { title: "Third event", date: "2026-07-01", summary: "Third summary." },
    ],
  };
  const grounding = overrides.grounding ?? [
    {
      field: "resolvedCompanyName",
      citations: [{ url: "https://grounding.test/identity", title: "Identity source" }],
      confidence: "high",
    },
    {
      field: "officialDomain",
      citations: [{ url: "https://grounding.test/domain", title: "Domain source" }],
      confidence: "high",
    },
    {
      field: "description",
      citations: [{ url: "https://grounding.test/description", title: "Description source" }],
      confidence: "medium",
    },
    {
      field: "signals[0].title",
      citations: [{ url: "https://grounding.test/news/one", title: "Source <1>" }],
      confidence: "high",
    },
    {
      field: "signals[0].date",
      citations: [{ url: "https://grounding.test/news/one", title: "Source <1>" }],
      confidence: "high",
    },
    {
      field: "signals[0].summary",
      citations: [{ url: "https://grounding.test/news/one", title: "Source <1>" }],
      confidence: "high",
    },
    {
      field: "signals[1]",
      citations: [{ url: "https://grounding.test/news/two", title: "Source 2" }],
      confidence: "medium",
    },
    {
      field: "signals[2]",
      citations: [{ url: "http://grounding.test/news/three", title: "Source 3" }],
      confidence: "low",
    },
  ];

  return {
    results: overrides.results ?? [
      { title: "Unrelated result URL", url: "https://results.test/not-a-grounding-url" },
    ],
    output: { content: snapshot, grounding },
    costDollars: { total: 0.007 },
  };
}

function parsed(overrides = {}) {
  return parseSearchResponse(providerPayload(overrides), 6123);
}

test("preflight gates missing account attestation, credential, modes, and companies", () => {
  const valid = parseArgs(["smoke", "--company", "NVIDIA", "--confirmed-free-starter"]);
  assert.doesNotThrow(() => validateOptions(valid, "test-key"));

  assert.throws(
    () => validateOptions(parseArgs(["smoke", "--company", "NVIDIA"]), "test-key"),
    /confirmed-free-starter/,
  );
  assert.throws(() => validateOptions(valid, ""), /EXA_API_KEY is not set/);
  assert.throws(
    () => validateOptions(parseArgs(["benchmark", "--company", "NVIDIA", "--confirmed-free-starter"]), "test-key"),
    /Only the Phase A3 smoke mode/,
  );
  assert.throws(
    () => validateOptions(parseArgs(["smoke", "--company", "Stripe", "--confirmed-free-starter"]), "test-key"),
    /restricted to NVIDIA/,
  );
});

test("request contract makes exactly one auto Search call with no retry or contents", async () => {
  const calls = [];
  const fetchImpl = async (...args) => {
    calls.push(args);
    return { ok: true, status: 200, json: async () => providerPayload() };
  };

  const result = await requestSnapshot("NVIDIA", "test-key", fetchImpl);
  validateSnapshot(result, NOW);
  assert.equal(calls.length, 1);

  const [url, options] = calls[0];
  const body = JSON.parse(options.body);
  assert.equal(url, ENDPOINT);
  assert.equal(options.method, "POST");
  assert.equal(options.headers["x-api-key"], "test-key");
  assert.equal(body.type, SEARCH_TYPE);
  assert.equal(body.type, "auto");
  assert.notEqual(body.type, "deep-lite");
  assert.notEqual(body.type, "deep");
  assert.equal(body.numResults, 10);
  assert.equal(body.stream, false);
  assert.deepEqual(body.outputSchema, OUTPUT_SCHEMA);
  assert.equal("contents" in body, false);
  assert.equal("additionalQueries" in body, false);
});

test("output schema is minimal and contains claims but no source metadata or redundant constraints", () => {
  assert.deepEqual(OUTPUT_SCHEMA.required, [
    "resolvedCompanyName",
    "officialDomain",
    "description",
    "signals",
  ]);
  assert.deepEqual(OUTPUT_SCHEMA.properties.signals.items.required, ["title", "date", "summary"]);

  const schema = JSON.stringify(OUTPUT_SCHEMA);
  assert.doesNotMatch(schema, /source_?url|sourceUrl|citation|confidence/i);
  assert.doesNotMatch(schema, /additionalProperties|minItems|maxItems/);
});

test("non-OK errors expose only status and tag, classify free-path failure, and do not retry", async () => {
  let calls = 0;
  const fetchImpl = async () => {
    calls += 1;
    return {
      ok: false,
      status: 402,
      json: async () => ({
        tag: "NO_MORE_CREDITS",
        error: "secret-bearing provider prose must not be emitted",
      }),
    };
  };

  await assert.rejects(
    () => requestSnapshot("NVIDIA", "test-key", fetchImpl),
    (error) => {
      assert.match(error.message, /provider_paid_required: HTTP 402; tag=NO_MORE_CREDITS; latency_ms=\d+/);
      assert.doesNotMatch(error.message, /secret-bearing/);
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

  const result = await requestSnapshot("NVIDIA", "test-key", fetchImpl);
  assert.ok(result.latencyMs >= 15, `expected body-inclusive latency, got ${result.latencyMs}ms`);

  let abortCalls = 0;
  const abortingBody = async () => {
    abortCalls += 1;
    return {
      ok: true,
      status: 200,
      json: async () => {
        const error = new Error("body read aborted");
        error.name = "AbortError";
        throw error;
      },
    };
  };
  await assert.rejects(
    () => requestSnapshot("NVIDIA", "test-key", abortingBody),
    /latency: request exceeded 60 seconds/,
  );
  assert.equal(abortCalls, 1);
});

test("valid NVIDIA snapshot and provider grounding pass strict gates", () => {
  const result = parsed();
  const integrity = validateSnapshot(result, NOW);
  assert.equal(integrity.groundingSourceCount, 6);
  assert.deepEqual(
    integrity.signalSources.map((sources) => sources.map(({ url }) => url)),
    [
      ["https://grounding.test/news/one"],
      ["https://grounding.test/news/two"],
      ["http://grounding.test/news/three"],
    ],
  );
});

test("description gate uses sentence segmentation", () => {
  const payload = providerPayload();
  payload.output.content.description = "One sentence only.";
  assert.throws(() => validateSnapshot(parseSearchResponse(payload), NOW), /expected 2-3 sentences/);

  payload.output.content.description = "NVIDIA Inc. builds accelerated computing platforms. It also develops software.";
  assert.doesNotThrow(() => validateSnapshot(parseSearchResponse(payload), NOW));
});

test("shape and identity failures fail closed", () => {
  const extraField = providerPayload();
  extraField.output.content.unexpected = true;
  assert.throws(() => validateSnapshot(parseSearchResponse(extraField), NOW), /snapshot did not contain exactly/);

  const extraSignalField = providerPayload();
  extraSignalField.output.content.signals[0].unexpected = true;
  assert.throws(
    () => validateSnapshot(parseSearchResponse(extraSignalField), NOW),
    /signals\[0\] did not contain exactly/,
  );

  const wrongIdentity = providerPayload();
  wrongIdentity.output.content.resolvedCompanyName = "Nvidia Industries";
  assert.throws(() => validateSnapshot(parseSearchResponse(wrongIdentity), NOW), /NVIDIA Corporation/);

  const wrongDomain = providerPayload();
  wrongDomain.output.content.officialDomain = "example.com";
  assert.throws(() => validateSnapshot(parseSearchResponse(wrongDomain), NOW), /nvidia.com/);
});

test("signal count, date, recency, and duplicate-title gates fail closed", () => {
  const twoSignals = providerPayload();
  twoSignals.output.content.signals.pop();
  assert.throws(() => validateSnapshot(parseSearchResponse(twoSignals), NOW), /exactly three/);

  const fourSignals = providerPayload();
  fourSignals.output.content.signals.push({
    title: "Fourth event",
    date: "2026-06-01",
    summary: "Fourth summary.",
  });
  assert.throws(() => validateSnapshot(parseSearchResponse(fourSignals), NOW), /exactly three/);

  const badDate = providerPayload();
  badDate.output.content.signals[0].date = "September 1";
  assert.throws(() => validateSnapshot(parseSearchResponse(badDate), NOW), /YYYY-MM-DD/);

  const oldWithoutLabel = providerPayload();
  oldWithoutLabel.output.content.signals[0].date = "2025-01-01";
  assert.throws(() => validateSnapshot(parseSearchResponse(oldWithoutLabel), NOW), /Older fallback/);

  const oldWithLabel = providerPayload();
  oldWithLabel.output.content.signals[0].date = "2025-01-01";
  oldWithLabel.output.content.signals[0].summary = "Older fallback: context.";
  assert.doesNotThrow(() => validateSnapshot(parseSearchResponse(oldWithLabel), NOW));

  const duplicateTitle = providerPayload();
  duplicateTitle.output.content.signals[1].title = "FIRST---EVENT";
  assert.throws(() => validateSnapshot(parseSearchResponse(duplicateTitle), NOW), /duplicate signal titles/);
});

test("missing required provider grounding fails closed", () => {
  const missingGrounding = providerPayload();
  delete missingGrounding.output.grounding;
  assert.throws(
    () => validateSnapshot(parseSearchResponse(missingGrounding), NOW),
    /provider grounding was absent/,
  );

  const noGrounding = providerPayload({ grounding: [] });
  assert.throws(() => validateSnapshot(parseSearchResponse(noGrounding), NOW), /provider grounding was absent/);

  const missingDescription = providerPayload();
  missingDescription.output.grounding = missingDescription.output.grounding.filter(
    ({ field }) => field !== "description",
  );
  assert.throws(
    () => validateSnapshot(parseSearchResponse(missingDescription), NOW),
    /description had no provider grounding citation/,
  );

  const missingSignal = providerPayload();
  missingSignal.output.grounding = missingSignal.output.grounding.filter(
    ({ field }) => !field.startsWith("signals[1]"),
  );
  assert.throws(
    () => validateSnapshot(parseSearchResponse(missingSignal), NOW),
    /signals\[1\]\.title had no provider grounding citation/,
  );

  const dateOnly = providerPayload();
  dateOnly.output.grounding = dateOnly.output.grounding
    .filter(({ field }) => !field.startsWith("signals[2]"))
    .concat({
      field: "signals[2].date",
      citations: [{ url: "https://grounding.test/news/three", title: "Date-only source" }],
      confidence: "high",
    });
  assert.throws(
    () => validateSnapshot(parseSearchResponse(dateOnly), NOW),
    /signals\[2\]\.title had no provider grounding citation/,
  );
});

test("malformed grounding URLs and unsupported protocols fail closed", () => {
  for (const sourceUrl of [
    "not a URL",
    "javascript:alert(1)",
    "ftp://grounding.test/source",
    " https://grounding.test/source ",
  ]) {
    const payload = providerPayload();
    payload.output.grounding[3].citations[0].url = sourceUrl;
    assert.throws(
      () => validateSnapshot(parseSearchResponse(payload), NOW),
      /grounding\[3\].*url was not http\(s\)/,
    );
  }
});

test("an empty provider citation title uses a neutral transient label", () => {
  const result = parsed();
  result.grounding[3].citations[0].title = "";
  validateSnapshot(result, NOW);
  const html = buildDisplayHtml(result);

  assert.match(html, />Source<\/a>/);
  assert.match(html, /https:\/\/grounding\.test\/news\/one/);
});

test("transient display derives exact links and titles from grounding, never results or content", () => {
  const result = parsed();
  result.snapshot.signals[0].title = "Event <unsafe>";
  validateSnapshot(result, NOW);
  const html = buildDisplayHtml(result);

  assert.match(html, /Event &lt;unsafe&gt;/);
  assert.doesNotMatch(html, /<h2>Event <unsafe>/);
  assert.match(html, /Source &lt;1&gt;/);
  assert.match(html, /https:\/\/grounding\.test\/news\/one/);
  assert.doesNotMatch(html, /https:\/\/results\.test\/not-a-grounding-url/);
  assert.match(html, /Nothing on this page is persisted/);
  assert.doesNotMatch(html, /costDollars|confidence/);
});

test("aggregate summary excludes snapshot text and provider URLs", () => {
  const result = parsed();
  const summary = formatSummary(result, validateSnapshot(result, NOW));

  assert.match(summary, /search_type=auto/);
  assert.match(summary, /latency_ms=6123/);
  assert.match(summary, /provider_result_count=1/);
  assert.match(summary, /grounding_entry_count=8/);
  assert.match(summary, /grounding_source_count=6/);
  assert.match(summary, /signal_count=3/);
  assert.match(summary, /signal_source_count=3/);
  assert.match(summary, /grounding_integrity=pass/);
  assert.match(summary, /estimated_cost_usd=0.007/);
  assert.doesNotMatch(summary, /NVIDIA Corporation|grounding\.test|First event|First summary/);
});

test("errors redact both the active secret and Exa-shaped keys", () => {
  const activeKey = "custom-secret-value";
  const shapedKey = `exa_${"A".repeat(24)}`;
  assert.equal(
    redact(`failed ${activeKey} ${shapedKey}`, activeKey),
    "failed [REDACTED_API_KEY] [REDACTED_API_KEY]",
  );
});

test("request body contains no seeded NVIDIA facts or legacy/deep-only options", () => {
  const body = buildRequestBody("NVIDIA", NOW);
  const serialized = JSON.stringify(body);
  assert.match(body.query, /as of 2026-09-08/);
  assert.doesNotMatch(serialized, /NVIDIA Corporation|nvidia\.com|revenue|CEO|Blackwell|earnings/);
  assert.doesNotMatch(serialized, /deep-lite|deep-reasoning|useAutoprompt|includeUrls|excludeUrls/);
});

test("diagnostic contains no filesystem persistence path", () => {
  const script = readFileSync(new URL("../scripts/exa-phase-a.mjs", import.meta.url), "utf8");
  assert.doesNotMatch(script, /node:fs|writeFile|appendFile|createWriteStream/);
});
