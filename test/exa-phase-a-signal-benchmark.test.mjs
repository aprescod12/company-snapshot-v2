import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { buildRequestBody, ENDPOINT } from "../scripts/exa-phase-a-discovery.mjs";
import {
  BENCHMARK_CASES,
  BENCHMARK_MODE,
  BENCHMARK_OUTCOME,
  CASE_OUTCOME,
  assessBenchmarkProgress,
  formatReviewOutput,
  parseArgs,
  runBenchmarkCase,
  validateOptions,
} from "../scripts/exa-phase-a-signal-benchmark.mjs";

const NOW = new Date("2026-09-08T12:00:00.000Z");

function providerPayload(officialDomain) {
  return {
    requestId: "must-not-be-displayed",
    results: [
      {
        title: "Company launches Atlas enterprise platform",
        url: `https://news.test/${officialDomain}/atlas`,
        publishedDate: "2026-09-01T00:00:00.000Z",
        author: "Reporter One",
        highlights: ["Sensitive raw highlight one."],
      },
      {
        title: "Atlas enterprise platform launched by company",
        url: `https://${officialDomain}/atlas`,
        publishedDate: "2026-09-01T00:00:00.000Z",
        author: null,
        highlights: ["Sensitive raw highlight two."],
      },
      {
        title: "Company signs Beacon infrastructure partnership",
        url: "https://news.test/beacon",
        publishedDate: "2026-08-30T00:00:00.000Z",
        highlights: [],
      },
      {
        title: "Company opens Cedar regional facility",
        url: `https://${officialDomain}/cedar`,
        publishedDate: "2026-05-01T00:00:00.000Z",
        highlights: ["Sensitive raw highlight four."],
      },
    ],
    costDollars: { total: 0.007 },
  };
}

test("fixtures and preflight enforce only the four approved cases in fixed order", () => {
  assert.deepEqual(BENCHMARK_CASES, [
    { requestNumber: 1, input: "Stripe", companyName: "Stripe", officialDomain: "stripe.com" },
    { requestNumber: 2, input: "PostHog", companyName: "PostHog", officialDomain: "posthog.com" },
    { requestNumber: 3, input: "Canva", companyName: "Canva", officialDomain: "canva.com" },
    { requestNumber: 4, input: "notion.so", companyName: "Notion", officialDomain: "notion.so" },
  ]);

  for (const benchmarkCase of BENCHMARK_CASES) {
    const options = parseArgs([
      BENCHMARK_MODE,
      "--request-number",
      String(benchmarkCase.requestNumber),
      "--company",
      benchmarkCase.input,
      "--confirmed-free-starter",
    ]);
    assert.equal(validateOptions(options, "test-key"), benchmarkCase);
  }

  const valid = parseArgs([
    BENCHMARK_MODE,
    "--request-number",
    "1",
    "--company",
    "Stripe",
    "--confirmed-free-starter",
  ]);
  assert.throws(() => validateOptions({ ...valid, mode: "discovery" }, "test-key"), /A4\.3/);
  assert.throws(() => validateOptions({ ...valid, requestNumber: 2 }, "test-key"), /fixed/);
  assert.throws(() => validateOptions({ ...valid, company: "stripe" }, "test-key"), /fixed/);
  assert.throws(() => validateOptions({ ...valid, company: "NVIDIA" }, "test-key"), /fixed/);
  assert.throws(
    () => validateOptions({ ...valid, confirmedFreeStarter: false }, "test-key"),
    /confirmed-free-starter/,
  );
  assert.throws(() => validateOptions(valid, ""), /EXA_API_KEY/);
});

test("each invocation makes one exact A4.1 request and passes candidates to the selector", async () => {
  for (const benchmarkCase of BENCHMARK_CASES) {
    const calls = [];
    const result = await runBenchmarkCase({
      benchmarkCase,
      apiKey: "test-key",
      now: NOW,
      fetchImpl: async (...args) => {
        calls.push(args);
        return {
          ok: true,
          status: 200,
          json: async () => providerPayload(benchmarkCase.officialDomain),
        };
      },
    });

    assert.equal(calls.length, 1);
    assert.equal(calls[0][0], ENDPOINT);
    const requestBody = JSON.parse(calls[0][1].body);
    const queryDate = requestBody.query.match(/as of (\d{4}-\d{2}-\d{2})/);
    assert.ok(queryDate);
    assert.deepEqual(
      requestBody,
      buildRequestBody(benchmarkCase.input, new Date(`${queryDate[1]}T00:00:00.000Z`)),
    );
    assert.match(requestBody.query, new RegExp(`involving ${benchmarkCase.input} as of`));
    assert.equal(result.selection.evaluated[1].sourceClass, "FIRST_PARTY");
    assert.deepEqual(
      result.selection.selected.map(({ rank }) => rank),
      [2, 3, 4],
    );
    assert.deepEqual(result.selection.evaluated[0].candidate, result.discovery.candidates[0]);
    assert.notEqual(result.selection.evaluated[0].candidate, result.discovery.candidates[0]);
  }
});

test("failed provider response is not retried", async () => {
  let calls = 0;
  await assert.rejects(
    () =>
      runBenchmarkCase({
        benchmarkCase: BENCHMARK_CASES[0],
        apiKey: "test-key",
        now: NOW,
        fetchImpl: async () => {
          calls += 1;
          return { ok: false, status: 500, json: async () => ({ tag: "UNKNOWN" }) };
        },
      }),
    /provider_unavailable/,
  );
  assert.equal(calls, 1);
});

test("progress calculation enforces blocked, mathematical-failure, and success stops", () => {
  assert.deepEqual(assessBenchmarkProgress([]), {
    shouldStop: false,
    benchmarkOutcome: null,
    ordinaryPasses: 1,
    maximumPossiblePasses: 5,
    completedNewCases: 0,
    nextCase: BENCHMARK_CASES[0],
  });

  const oneFailure = assessBenchmarkProgress([CASE_OUTCOME.FAIL]);
  assert.equal(oneFailure.shouldStop, false);
  assert.equal(oneFailure.maximumPossiblePasses, 4);
  assert.equal(oneFailure.nextCase, BENCHMARK_CASES[1]);

  const mathematicalFailure = assessBenchmarkProgress([
    CASE_OUTCOME.PASS,
    CASE_OUTCOME.FAIL,
    CASE_OUTCOME.INSUFFICIENT,
  ]);
  assert.equal(mathematicalFailure.shouldStop, true);
  assert.equal(mathematicalFailure.benchmarkOutcome, BENCHMARK_OUTCOME.FAIL);
  assert.equal(mathematicalFailure.maximumPossiblePasses, 3);
  assert.equal(mathematicalFailure.nextCase, null);

  const success = assessBenchmarkProgress([
    CASE_OUTCOME.PASS,
    CASE_OUTCOME.PASS,
    CASE_OUTCOME.PASS,
  ]);
  assert.equal(success.shouldStop, true);
  assert.equal(success.benchmarkOutcome, BENCHMARK_OUTCOME.PASS);
  assert.equal(success.ordinaryPasses, 4);
  assert.equal(success.nextCase, null);

  const blocked = assessBenchmarkProgress([CASE_OUTCOME.BLOCKED]);
  assert.equal(blocked.shouldStop, true);
  assert.equal(blocked.benchmarkOutcome, BENCHMARK_OUTCOME.BLOCKED);
  assert.equal(blocked.nextCase, null);
});

test("review output is compact, complete, and excludes raw highlights", async () => {
  const benchmarkCase = BENCHMARK_CASES[0];
  const result = await runBenchmarkCase({
    benchmarkCase,
    apiKey: "test-key",
    now: NOW,
    fetchImpl: async () => ({
      ok: true,
      status: 200,
      json: async () => providerPayload(benchmarkCase.officialDomain),
    }),
  });
  const output = formatReviewOutput(result);

  assert.match(output, /a4_3_request_number=1/);
  assert.match(output, /company_input="Stripe"/);
  assert.match(output, /intended_company="Stripe"/);
  assert.match(output, /evaluation_official_domain=stripe\.com/);
  assert.match(output, /provider_result_count=4/);
  assert.match(output, /selected_ranks=2,3,4/);
  assert.match(output, /rank=1\tselected=no\trecency=RECENT\tsource=OTHER/);
  assert.match(output, /rank=2\tselected=yes\trecency=RECENT\tsource=FIRST_PARTY/);
  assert.match(output, /cluster=DUPLICATE_1/);
  assert.match(output, /highlights_present=yes/);
  assert.match(output, /highlights_present=no/);
  assert.doesNotMatch(output, /Sensitive raw highlight|must-not-be-displayed/);
});

test("harness has no persistence, direct provider call, second model, or disallowed-case path", () => {
  const source = readFileSync(
    new URL("../scripts/exa-phase-a-signal-benchmark.mjs", import.meta.url),
    "utf8",
  );

  assert.doesNotMatch(source, /node:(?:fs|http|https)/);
  assert.doesNotMatch(source, /writeFile|appendFile|createWriteStream/);
  assert.doesNotMatch(source, /\bfetch\s*\(/);
  assert.doesNotMatch(source, /outputSchema|systemPrompt|startPublishedDate|additionalQueries/);
  assert.doesNotMatch(source, /NVIDIA|Mercury|Craigslist/);
  assert.doesNotMatch(source, /Promise\.all|setInterval/);
  assert.equal((source.match(/requestCandidates\(/g) ?? []).length, 1);
  assert.equal((source.match(/selectSignals\(/g) ?? []).length, 1);
});
