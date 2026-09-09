import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { buildRequestBody, ENDPOINT } from "../scripts/exa-phase-a-discovery.mjs";
import {
  OFFICIAL_DOMAIN,
  SMOKE_MODE,
  TARGET_COMPANY,
  formatReviewOutput,
  parseArgs,
  runSelectorSmoke,
  validateOptions,
} from "../scripts/exa-phase-a-selector-smoke.mjs";

const NOW = new Date("2026-09-08T12:00:00.000Z");

function providerPayload() {
  return {
    requestId: "must-not-be-displayed",
    results: [
      {
        title: "NVIDIA releases Atlas cloud security platform",
        url: "https://reporter.test/atlas",
        publishedDate: "2026-09-01T00:00:00.000Z",
        author: "Reporter One",
        highlights: ["Sensitive raw highlight one."],
      },
      {
        title: "Atlas cloud security platform released by NVIDIA",
        url: "https://nvidia.com/atlas",
        publishedDate: "2026-09-01T00:00:00.000Z",
        author: null,
        highlights: ["Sensitive raw highlight two."],
      },
      {
        title: "NVIDIA signs Beacon infrastructure partnership",
        url: "https://news.test/beacon",
        publishedDate: "2026-08-30T00:00:00.000Z",
        highlights: [],
      },
      {
        title: "NVIDIA opens Cedar regional facility",
        url: "https://nvidia.com/cedar",
        publishedDate: "2026-05-01T00:00:00.000Z",
        highlights: ["Sensitive raw highlight four."],
      },
    ],
    costDollars: { total: 0.007 },
  };
}

test("preflight restricts execution to the confirmed NVIDIA selector smoke", () => {
  const valid = parseArgs([
    SMOKE_MODE,
    "--company",
    TARGET_COMPANY,
    "--confirmed-free-starter",
  ]);
  assert.doesNotThrow(() => validateOptions(valid, "test-key"));

  assert.throws(() => validateOptions({ ...valid, mode: "benchmark" }, "test-key"), /only/i);
  assert.throws(() => validateOptions({ ...valid, company: "Stripe" }, "test-key"), /NVIDIA/);
  assert.throws(
    () => validateOptions({ ...valid, confirmedFreeStarter: false }, "test-key"),
    /confirmed-free-starter/,
  );
  assert.throws(() => validateOptions(valid, ""), /EXA_API_KEY/);
});

test("harness makes one exact A4.1 request and passes candidates directly to the selector", async () => {
  const calls = [];
  const fetchImpl = async (...args) => {
    calls.push(args);
    return { ok: true, status: 200, json: async () => providerPayload() };
  };

  const result = await runSelectorSmoke({
    company: TARGET_COMPANY,
    apiKey: "test-key",
    now: NOW,
    fetchImpl,
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], ENDPOINT);
  const requestBody = JSON.parse(calls[0][1].body);
  const queryDate = requestBody.query.match(/as of (\d{4}-\d{2}-\d{2})/);
  assert.ok(queryDate);
  const expectedBody = buildRequestBody(
    TARGET_COMPANY,
    new Date(`${queryDate[1]}T00:00:00.000Z`),
  );
  assert.deepEqual(requestBody, expectedBody);
  assert.deepEqual(
    result.selection.selected.map(({ rank }) => rank),
    [2, 3, 4],
  );
  assert.deepEqual(result.selection.evaluated[0].candidate, result.discovery.candidates[0]);
  assert.notEqual(result.selection.evaluated[0].candidate, result.discovery.candidates[0]);
  assert.equal(OFFICIAL_DOMAIN, "nvidia.com");
});

test("failed provider response is not retried by the harness", async () => {
  let calls = 0;
  await assert.rejects(
    () =>
      runSelectorSmoke({
        company: TARGET_COMPANY,
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

test("review output is compact, complete, and excludes raw highlights", async () => {
  const result = await runSelectorSmoke({
    company: TARGET_COMPANY,
    apiKey: "test-key",
    now: NOW,
    fetchImpl: async () => ({ ok: true, status: 200, json: async () => providerPayload() }),
  });
  const output = formatReviewOutput(result);

  assert.match(output, /provider_result_count=4/);
  assert.match(output, /selected_ranks=2,3,4/);
  assert.match(output, /rank=1\tselected=no\trecency=RECENT\tsource=OTHER/);
  assert.match(output, /rank=2\tselected=yes\trecency=RECENT\tsource=FIRST_PARTY/);
  assert.match(output, /cluster=DUPLICATE_1/);
  assert.match(output, /highlights_present=yes/);
  assert.match(output, /highlights_present=no/);
  assert.match(output, /title="NVIDIA signs Beacon infrastructure partnership"/);
  assert.match(output, /url="https:\/\/nvidia\.com\/atlas"/);
  assert.doesNotMatch(output, /Sensitive raw highlight|must-not-be-displayed/);
});

test("harness has no persistence, second-model, or direct provider-call implementation", () => {
  const source = readFileSync(
    new URL("../scripts/exa-phase-a-selector-smoke.mjs", import.meta.url),
    "utf8",
  );

  assert.doesNotMatch(source, /node:(?:fs|http|https)/);
  assert.doesNotMatch(source, /writeFile|appendFile|createWriteStream/);
  assert.doesNotMatch(source, /\bfetch\s*\(/);
  assert.doesNotMatch(source, /outputSchema|systemPrompt|startPublishedDate|additionalQueries/);
  assert.equal((source.match(/requestCandidates\(/g) ?? []).length, 1);
});
