import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { ENDPOINT, buildRequestBody } from "../scripts/exa-phase-a-discovery.mjs";
import {
  FALLBACK_COMPANY,
  FALLBACK_INCLUDE_DOMAINS,
  FALLBACK_MODE,
  FALLBACK_OFFICIAL_DOMAIN,
  formatFallbackOutput,
  parseArgs,
  runFallbackCase,
  validateOptions,
} from "../scripts/exa-phase-a-fallback-feasibility.mjs";

function providerPayload() {
  return {
    requestId: "must-not-be-displayed",
    results: [
      {
        title: "Stripe launches Harbor payments product",
        url: "https://stripe.com/newsroom/harbor",
        publishedDate: "2026-09-02T00:00:00.000Z",
        author: "Stripe",
        highlights: ["Sensitive raw highlight."],
      },
    ],
    costDollars: { total: 0.007 },
  };
}

function validOptions() {
  return parseArgs([
    FALLBACK_MODE,
    "--company",
    FALLBACK_COMPANY,
    "--confirmed-free-starter",
  ]);
}

test("preflight permits only confirmed Stripe fallback", () => {
  assert.doesNotThrow(() => validateOptions(validOptions(), "test-key"));
  assert.throws(
    () => validateOptions({ ...validOptions(), mode: "discovery" }, "test-key"),
    /A4\.5/,
  );
  assert.throws(
    () => validateOptions({ ...validOptions(), company: "stripe" }, "test-key"),
    /restricted to Stripe/,
  );
  assert.throws(
    () => validateOptions({ ...validOptions(), confirmedFreeStarter: false }, "test-key"),
    /confirmed-free-starter/,
  );
  assert.throws(() => validateOptions(validOptions(), ""), /EXA_API_KEY/);
});

test("one request preserves A4.1 semantics and adds only approved includeDomains", async () => {
  const calls = [];
  const result = await runFallbackCase({
    apiKey: "test-key",
    fetchImpl: async (...args) => {
      calls.push(args);
      return { ok: true, status: 200, json: async () => providerPayload() };
    },
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], ENDPOINT);
  const requestBody = JSON.parse(calls[0][1].body);
  assert.deepEqual(requestBody.includeDomains, ["stripe.com", "*.stripe.com"]);
  const { includeDomains, ...historicalBody } = requestBody;
  const queryDate = historicalBody.query.match(/as of (\d{4}-\d{2}-\d{2})/);
  assert.ok(queryDate);
  assert.deepEqual(
    historicalBody,
    buildRequestBody(FALLBACK_COMPANY, new Date(`${queryDate[1]}T00:00:00.000Z`)),
  );
  assert.deepEqual(result.discovery.candidates, [
    {
      rank: 1,
      title: "Stripe launches Harbor payments product",
      url: "https://stripe.com/newsroom/harbor",
      publishedDate: "2026-09-02T00:00:00.000Z",
      author: "Stripe",
      highlights: ["Sensitive raw highlight."],
    },
  ]);
});

test("provider failure is transmitted once and never retried", async () => {
  let calls = 0;
  await assert.rejects(
    () =>
      runFallbackCase({
        apiKey: "test-key",
        fetchImpl: async () => {
          calls += 1;
          return { ok: false, status: 500, json: async () => ({ tag: "UNKNOWN" }) };
        },
      }),
    /provider_unavailable/,
  );
  assert.equal(calls, 1);
});

test("compact output records only the fallback boundary and review metadata", async () => {
  const result = await runFallbackCase({
    apiKey: "test-key",
    fetchImpl: async () => ({ ok: true, status: 200, json: async () => providerPayload() }),
  });
  const output = formatFallbackOutput(result);

  assert.match(output, /a4_5_case=Stripe/);
  assert.match(output, /evaluation_official_domain=stripe\.com/);
  assert.match(output, /includeDomains:\["stripe\.com","\*\.stripe\.com"\]/);
  assert.match(output, /provider_result_count=1/);
  assert.match(output, /highlights_present=yes/);
  assert.doesNotMatch(output, /Sensitive raw highlight|must-not-be-displayed/);
});

test("harness has no persistence, selector, direct provider call, or extra retrieval path", () => {
  const source = readFileSync(
    new URL("../scripts/exa-phase-a-fallback-feasibility.mjs", import.meta.url),
    "utf8",
  );

  assert.equal(FALLBACK_OFFICIAL_DOMAIN, "stripe.com");
  assert.deepEqual(FALLBACK_INCLUDE_DOMAINS, ["stripe.com", "*.stripe.com"]);
  assert.doesNotMatch(source, /node:(?:fs|http|https)/);
  assert.doesNotMatch(source, /writeFile|appendFile|createWriteStream/);
  assert.doesNotMatch(source, /selectSignals|systemPrompt/);
  assert.doesNotMatch(source, /outputSchema|startPublishedDate|category|excludeDomains|additionalQueries/);
  assert.doesNotMatch(source, /NVIDIA|PostHog|Canva|notion\.so|Mercury|Craigslist/);
  assert.doesNotMatch(source, /Promise\.all|setInterval|setTimeout/);
  assert.equal((source.match(/requestCandidates\(/g) ?? []).length, 1);
  assert.equal(
    (source.match(/body: JSON\.stringify\(\{ \.\.\.historicalBody, includeDomains:/g) ?? []).length,
    1,
  );
});
