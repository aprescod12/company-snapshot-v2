import { Buffer } from "node:buffer";
import assert from "node:assert/strict";
import test from "node:test";

import {
  buildDisplayHtml,
  formatSummary,
  parseArgs,
  parseInteraction,
  redact,
  requestSnapshot,
  validateTechnicalGrounding,
  validateOptions,
} from "../scripts/gemini-phase-a.mjs";

const SUGGESTIONS = "PROVIDER_SEARCH_SUGGESTIONS_FIXTURE";

function interactionPayload(overrides = {}) {
  const text = overrides.text ?? "Company <One> launched a product.";
  const segment = overrides.segment ?? "Company <One>";
  const startIndex = overrides.startIndex ?? text.indexOf(segment);
  const endIndex =
    overrides.endIndex ?? startIndex + Buffer.byteLength(segment, "utf8");
  const annotation = {
    type: "url_citation",
    url: "https://source.test/path",
    title: "Source <One>",
    start_index: startIndex,
    end_index: endIndex,
    ...overrides.annotation,
  };

  return {
    status: overrides.status ?? "completed",
    steps: overrides.steps ?? [
      {
        type: "google_search_call",
        id: "search_1",
        arguments: { queries: ["query one"] },
      },
      {
        type: "google_search_result",
        call_id: "search_1",
        result: [{ search_suggestions: SUGGESTIONS }],
      },
      {
        type: "model_output",
        content: [{ type: "text", text, annotations: [annotation] }],
      },
    ],
  };
}

function parsed(overrides = {}) {
  return parseInteraction(interactionPayload(overrides), 1234);
}

test("missing credential validation fails before any request", () => {
  const options = parseArgs(["smoke", "--company", "NVIDIA", "--confirmed-unbilled"]);
  assert.throws(() => validateOptions(options, ""), /GEMINI_API_KEY is not set/);
});

test("later modes require explicit phase gates", () => {
  const benchmark = parseArgs([
    "benchmark",
    "--company",
    "Stripe",
    "--confirmed-unbilled",
  ]);
  assert.throws(() => validateOptions(benchmark, "test-key"), /confirmed-a1-pass/);

  const repeat = parseArgs(["repeat", "--company", "NVIDIA", "--confirmed-unbilled"]);
  assert.throws(() => validateOptions(repeat, "test-key"), /confirmed-main-pass/);
});

test("native request uses one non-stored Interactions call with the approved contract", async () => {
  const calls = [];
  const fetchImpl = async (...args) => {
    calls.push(args);
    return { ok: true, status: 200, json: async () => interactionPayload() };
  };

  const result = await requestSnapshot("NVIDIA", "test-key", fetchImpl);
  validateTechnicalGrounding(result);

  assert.equal(calls.length, 1);
  const [url, options] = calls[0];
  const body = JSON.parse(options.body);
  assert.equal(url, "https://generativelanguage.googleapis.com/v1beta/interactions");
  assert.equal(options.method, "POST");
  assert.equal(options.headers["x-goog-api-key"], "test-key");
  assert.equal(body.model, "gemini-2.5-flash");
  assert.match(body.input, /Company input: NVIDIA/);
  assert.deepEqual(body.tools, [{ type: "google_search" }]);
  assert.equal(body.store, false);
  assert.equal("background" in body, false);
  assert.equal("contents" in body, false);
});

test("an incomplete interaction fails closed without polling", async () => {
  let calls = 0;
  const fetchImpl = async () => {
    calls += 1;
    return {
      ok: true,
      status: 200,
      json: async () => interactionPayload({ status: "in_progress" }),
    };
  };

  const result = await requestSnapshot("NVIDIA", "test-key", fetchImpl);
  assert.throws(() => validateTechnicalGrounding(result), /status was in_progress/);
  assert.equal(calls, 1);
});

test("display escapes result and citation text while preserving provider Suggestions content", () => {
  const result = parsed();
  const html = buildDisplayHtml(result);

  assert.match(html, /Company &lt;One&gt; launched a product/);
  assert.doesNotMatch(html, /<pre>Company <One>/);
  assert.match(html, /Source &lt;One&gt;/);
  assert.match(html, /<blockquote>Company &lt;One&gt;<\/blockquote>/);
  assert.ok(html.includes(SUGGESTIONS));
  assert.ok(html.indexOf(SUGGESTIONS) > html.indexOf("Transient Grounded Result"));
  assert.ok(html.indexOf(SUGGESTIONS) < html.indexOf("Citation support mappings"));
});

test("citation spans use UTF-8 byte offsets scoped to their text block", () => {
  const text = "Signal 👋 launched.";
  const segment = "👋";
  const startIndex = Buffer.byteLength("Signal ", "utf8");
  const endIndex = startIndex + Buffer.byteLength(segment, "utf8");
  const result = parsed({ text, segment, startIndex, endIndex });

  assert.doesNotThrow(() => validateTechnicalGrounding(result));
  assert.match(buildDisplayHtml(result), /<blockquote>👋<\/blockquote>/);
});

test("citation title is optional and uses a neutral transient display label", () => {
  const missingTitlePayload = interactionPayload();
  delete missingTitlePayload.steps[2].content[0].annotations[0].title;
  const missingTitle = parseInteraction(missingTitlePayload);

  assert.doesNotThrow(() => validateTechnicalGrounding(missingTitle));
  assert.match(buildDisplayHtml(missingTitle), />Source<\/a>/);

  const blankTitle = parsed({ annotation: { title: "   " } });
  assert.doesNotThrow(() => validateTechnicalGrounding(blankTitle));
  assert.match(buildDisplayHtml(blankTitle), />Source<\/a>/);
});

test("aggregate summary excludes raw provider material", () => {
  const summary = formatSummary(parsed());

  assert.match(summary, /interaction_status=completed/);
  assert.match(summary, /search_call_count=1/);
  assert.match(summary, /search_result_count=1/);
  assert.match(summary, /source_count=1/);
  assert.match(summary, /citation_count=1/);
  assert.match(summary, /valid_support_mapping_count=1/);
  assert.doesNotMatch(
    summary,
    /Company <One>|source\.test|Source <One>|query one|PROVIDER_SEARCH_SUGGESTIONS_FIXTURE|search_1/,
  );
});

test("technical gates require matched successful Search steps and Suggestions arrays", () => {
  assert.doesNotThrow(() => validateTechnicalGrounding(parsed()));

  const noQueries = interactionPayload();
  noQueries.steps[0].arguments.queries = [];
  assert.throws(
    () => validateTechnicalGrounding(parseInteraction(noQueries)),
    /search_not_executed/,
  );

  const validAndEmptyQueries = interactionPayload();
  validAndEmptyQueries.steps[0].arguments.queries = ["query one", "", "   "];
  assert.doesNotThrow(() =>
    validateTechnicalGrounding(parseInteraction(validAndEmptyQueries)),
  );

  const allEmptyQueries = interactionPayload();
  allEmptyQueries.steps[0].arguments.queries = ["", "   "];
  assert.throws(
    () => validateTechnicalGrounding(parseInteraction(allEmptyQueries)),
    /search_not_executed/,
  );

  const nonStringQuery = interactionPayload();
  nonStringQuery.steps[0].arguments.queries = ["query one", null];
  assert.throws(
    () => validateTechnicalGrounding(parseInteraction(nonStringQuery)),
    /search_not_executed/,
  );

  const unmatched = interactionPayload();
  unmatched.steps[1].call_id = "other_call";
  assert.throws(
    () => validateTechnicalGrounding(parseInteraction(unmatched)),
    /no Search Suggestions/,
  );

  const searchError = interactionPayload();
  searchError.steps[1].is_error = true;
  assert.throws(
    () => validateTechnicalGrounding(parseInteraction(searchError)),
    /no Search Suggestions/,
  );

  const singularResult = interactionPayload();
  singularResult.steps[1].result = { search_suggestions: SUGGESTIONS };
  assert.throws(
    () => validateTechnicalGrounding(parseInteraction(singularResult)),
    /no Search Suggestions/,
  );
});

test("technical gates reject missing or malformed URL citation mappings", () => {
  const noCitations = interactionPayload();
  noCitations.steps[2].content[0].annotations = [];
  assert.throws(
    () => validateTechnicalGrounding(parseInteraction(noCitations)),
    /no URL citations/,
  );

  for (const annotation of [
    { url: "javascript:alert(1)" },
    { start_index: -1 },
    { end_index: 999 },
    { start_index: 4, end_index: 2 },
    { start_index: 0.5 },
  ]) {
    assert.throws(
      () => validateTechnicalGrounding(parsed({ annotation })),
      /lacked a valid source or byte span/,
    );
  }

  const splitUtf8CodePoint = parsed({
    text: "Signal 👋 launched.",
    startIndex: Buffer.byteLength("Signal ", "utf8") + 1,
    endIndex: Buffer.byteLength("Signal ", "utf8") + 3,
  });
  assert.throws(
    () => validateTechnicalGrounding(splitUtf8CodePoint),
    /lacked a valid source or byte span/,
  );

  assert.throws(
    () =>
      validateTechnicalGrounding(
        parsed({ text: "Claim   ", segment: "   ", startIndex: 5, endIndex: 8 }),
      ),
    /lacked a valid source or byte span/,
  );
});

test("errors redact both the active secret and key-shaped strings", () => {
  const activeKey = "custom-secret-value";
  const aiStudioKey = `AIza${"A".repeat(24)}`;
  const alternateKey = `AQ.${"A".repeat(24)}`;
  const safe = redact(`failed ${activeKey} ${aiStudioKey} ${alternateKey}`, activeKey);
  assert.equal(
    safe,
    "failed [REDACTED_API_KEY] [REDACTED_API_KEY] [REDACTED_API_KEY]",
  );
});
