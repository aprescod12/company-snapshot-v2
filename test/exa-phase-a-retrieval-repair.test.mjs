import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { buildRequestBody, ENDPOINT } from "../scripts/exa-phase-a-discovery.mjs";
import {
  REPAIR_CASES,
  REPAIR_MODE,
  REPAIR_SYSTEM_PROMPT,
  formatRepairOutput,
  parseArgs,
  runRepairCase,
  validateOptions,
} from "../scripts/exa-phase-a-retrieval-repair.mjs";

const NOW = new Date("2026-09-09T12:00:00.000Z");

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

function validOptions(repairCase) {
  return parseArgs([
    REPAIR_MODE,
    "--request-number",
    String(repairCase.requestNumber),
    "--company",
    repairCase.input,
    ...(repairCase.requestNumber === 2 ? ["--stripe-raw-sufficient"] : []),
    "--confirmed-free-starter",
  ]);
}

test("fixtures and preflight enforce Stripe then conditional PostHog only", () => {
  assert.deepEqual(REPAIR_CASES, [
    { requestNumber: 1, input: "Stripe", companyName: "Stripe", officialDomain: "stripe.com" },
    { requestNumber: 2, input: "PostHog", companyName: "PostHog", officialDomain: "posthog.com" },
  ]);

  for (const repairCase of REPAIR_CASES) {
    assert.equal(validateOptions(validOptions(repairCase), "test-key"), repairCase);
  }

  const stripe = validOptions(REPAIR_CASES[0]);
  const postHog = validOptions(REPAIR_CASES[1]);
  assert.throws(() => validateOptions({ ...stripe, mode: "benchmark-case" }, "test-key"), /A4\.3R1/);
  assert.throws(() => validateOptions({ ...stripe, requestNumber: 2 }, "test-key"), /fixed/);
  assert.throws(() => validateOptions({ ...stripe, company: "stripe" }, "test-key"), /fixed/);
  assert.throws(
    () => validateOptions({ ...stripe, stripeRawSufficient: true }, "test-key"),
    /only to the conditional PostHog/,
  );
  assert.throws(
    () => validateOptions({ ...postHog, stripeRawSufficient: false }, "test-key"),
    /blocked unless Stripe/,
  );
  assert.throws(
    () => validateOptions({ ...stripe, confirmedFreeStarter: false }, "test-key"),
    /confirmed-free-starter/,
  );
  assert.throws(() => validateOptions(stripe, ""), /EXA_API_KEY/);
});

test("each invocation adds only the exact fixed systemPrompt to the A4.1 request", async () => {
  for (const repairCase of REPAIR_CASES) {
    const calls = [];
    const result = await runRepairCase({
      repairCase,
      apiKey: "test-key",
      now: NOW,
      fetchImpl: async (...args) => {
        calls.push(args);
        return {
          ok: true,
          status: 200,
          json: async () => providerPayload(repairCase.officialDomain),
        };
      },
    });

    assert.equal(calls.length, 1);
    assert.equal(calls[0][0], ENDPOINT);
    const requestBody = JSON.parse(calls[0][1].body);
    assert.equal(requestBody.systemPrompt, REPAIR_SYSTEM_PROMPT);
    const { systemPrompt, ...historicalBody } = requestBody;
    const queryDate = historicalBody.query.match(/as of (\d{4}-\d{2}-\d{2})/);
    assert.ok(queryDate);
    assert.deepEqual(
      historicalBody,
      buildRequestBody(repairCase.input, new Date(`${queryDate[1]}T00:00:00.000Z`)),
    );
    assert.equal(systemPrompt, REPAIR_SYSTEM_PROMPT);
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
      runRepairCase({
        repairCase: REPAIR_CASES[0],
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

test("review output identifies the one-variable change and excludes raw highlights", async () => {
  const repairCase = REPAIR_CASES[0];
  const result = await runRepairCase({
    repairCase,
    apiKey: "test-key",
    now: NOW,
    fetchImpl: async () => ({
      ok: true,
      status: 200,
      json: async () => providerPayload(repairCase.officialDomain),
    }),
  });
  const output = formatRepairOutput(result);

  assert.match(output, /a4_3r1_request_number=1/);
  assert.match(output, /company_input="Stripe"/);
  assert.match(output, /one_variable_change=systemPrompt/);
  assert.match(output, new RegExp(REPAIR_SYSTEM_PROMPT.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(output, /provider_result_count=4/);
  assert.match(output, /selected_ranks=2,3,4/);
  assert.match(output, /cluster=DUPLICATE_1/);
  assert.match(output, /highlights_present=yes/);
  assert.match(output, /highlights_present=no/);
  assert.doesNotMatch(output, /Sensitive raw highlight|must-not-be-displayed/);
});

test("harness has no persistence, retry, direct provider call, or disallowed-case path", () => {
  const source = readFileSync(
    new URL("../scripts/exa-phase-a-retrieval-repair.mjs", import.meta.url),
    "utf8",
  );

  assert.doesNotMatch(source, /node:(?:fs|http|https)/);
  assert.doesNotMatch(source, /writeFile|appendFile|createWriteStream/);
  assert.doesNotMatch(source, /\bfetch\s*\(/);
  assert.doesNotMatch(
    source,
    /outputSchema|startPublishedDate|category|includeDomains|excludeDomains|additionalQueries/,
  );
  assert.doesNotMatch(source, /NVIDIA|Canva|notion\.so|Mercury|Craigslist/);
  assert.doesNotMatch(source, /Promise\.all|setInterval|setTimeout/);
  assert.equal((source.match(/requestCandidates\(/g) ?? []).length, 1);
  assert.equal((source.match(/selectSignals\(/g) ?? []).length, 1);
  assert.equal((source.match(/systemPrompt:/g) ?? []).length, 1);
  assert.equal(source.split(REPAIR_SYSTEM_PROMPT).length - 1, 1);
});
