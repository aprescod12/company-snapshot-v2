#!/usr/bin/env node

import process from "node:process";
import { fileURLToPath } from "node:url";

import {
  formatSummary,
  redact,
  requestCandidates,
} from "./exa-phase-a-discovery.mjs";
import { selectSignals } from "../src/selection/selectSignals.mjs";

export const BENCHMARK_MODE = "benchmark-case";
export const BENCHMARK_CASES = Object.freeze([
  Object.freeze({
    requestNumber: 1,
    input: "Stripe",
    companyName: "Stripe",
    officialDomain: "stripe.com",
  }),
  Object.freeze({
    requestNumber: 2,
    input: "PostHog",
    companyName: "PostHog",
    officialDomain: "posthog.com",
  }),
  Object.freeze({
    requestNumber: 3,
    input: "Canva",
    companyName: "Canva",
    officialDomain: "canva.com",
  }),
  Object.freeze({
    requestNumber: 4,
    input: "notion.so",
    companyName: "Notion",
    officialDomain: "notion.so",
  }),
]);

export const CASE_OUTCOME = Object.freeze({
  PASS: "SELECTOR PASS",
  FAIL: "SELECTOR FAIL",
  INSUFFICIENT: "DISCOVERY INSUFFICIENT",
  BLOCKED: "BLOCKED",
});

export const BENCHMARK_OUTCOME = Object.freeze({
  PASS: "A4.3 SIGNAL BENCHMARK PASS",
  FAIL: "A4.3 SIGNAL BENCHMARK FAIL",
  BLOCKED: "A4.3 BLOCKED",
});

export function usage() {
  return `Usage:
  node scripts/exa-phase-a-signal-benchmark.mjs benchmark-case --request-number <1-4> --company <approved-input> --confirmed-free-starter

This bounded Phase A4.3 harness executes exactly one approved benchmark case,
passes candidates directly from the A4.1 request implementation to the A4.2
selector, and prints compact transient review metadata. It does not retry or
persist results. The operator must review and apply the early-stop rule before
starting the next fixed-order case.

Required environment variable: EXA_API_KEY`;
}

export function parseArgs(argv) {
  if (argv.includes("--help") || argv.includes("-h")) return { help: true };

  const [mode, ...rest] = argv;
  const options = {
    mode,
    requestNumber: undefined,
    company: undefined,
    confirmedFreeStarter: false,
  };

  for (let index = 0; index < rest.length; index += 1) {
    const argument = rest[index];
    if (argument === "--request-number") {
      options.requestNumber = Number(rest[index + 1]);
      index += 1;
    } else if (argument === "--company") {
      options.company = rest[index + 1];
      index += 1;
    } else if (argument === "--confirmed-free-starter") {
      options.confirmedFreeStarter = true;
    } else {
      throw new Error(`Unknown argument: ${argument}`);
    }
  }

  return options;
}

export function validateOptions(options, apiKey) {
  if (options.mode !== BENCHMARK_MODE) {
    throw new Error("Only the Phase A4.3 benchmark-case mode is authorized.");
  }
  if (!Number.isInteger(options.requestNumber)) {
    throw new Error("--request-number must be an integer from 1 through 4.");
  }

  const benchmarkCase = BENCHMARK_CASES[options.requestNumber - 1];
  if (!benchmarkCase || options.company !== benchmarkCase.input) {
    throw new Error("The request number and company must match the fixed A4.3 allowlist order.");
  }
  if (!options.confirmedFreeStarter) {
    throw new Error("Refusing network access without --confirmed-free-starter.");
  }
  if (!apiKey) throw new Error("EXA_API_KEY is not set.");
  return benchmarkCase;
}

export async function runBenchmarkCase({
  benchmarkCase,
  apiKey,
  now = new Date(),
  fetchImpl = fetch,
}) {
  const discovery = await requestCandidates(benchmarkCase.input, apiKey, fetchImpl);
  const selection = selectSignals(discovery.candidates, {
    companyName: benchmarkCase.companyName,
    officialDomain: benchmarkCase.officialDomain,
    now,
  });
  return { benchmarkCase, discovery, selection, selectorNow: now };
}

export function assessBenchmarkProgress(outcomes) {
  if (!Array.isArray(outcomes) || outcomes.length > BENCHMARK_CASES.length) {
    throw new TypeError("outcomes must contain at most four completed A4.3 case outcomes.");
  }

  const allowedOutcomes = new Set(Object.values(CASE_OUTCOME));
  for (const outcome of outcomes) {
    if (!allowedOutcomes.has(outcome)) throw new TypeError(`Unsupported case outcome: ${outcome}`);
  }

  const completedPasses = outcomes.filter((outcome) => outcome === CASE_OUTCOME.PASS).length;
  const completedFailures = outcomes.filter(
    (outcome) => outcome === CASE_OUTCOME.FAIL || outcome === CASE_OUTCOME.INSUFFICIENT,
  ).length;
  const ordinaryPasses = 1 + completedPasses;
  const remainingCases = BENCHMARK_CASES.length - outcomes.length;
  const maximumPossiblePasses = ordinaryPasses + remainingCases;

  let benchmarkOutcome = null;
  if (outcomes.includes(CASE_OUTCOME.BLOCKED)) {
    benchmarkOutcome = BENCHMARK_OUTCOME.BLOCKED;
  } else if (ordinaryPasses >= 4) {
    benchmarkOutcome = BENCHMARK_OUTCOME.PASS;
  } else if (completedFailures >= 2 || outcomes.length === BENCHMARK_CASES.length) {
    benchmarkOutcome = BENCHMARK_OUTCOME.FAIL;
  }

  return {
    shouldStop: benchmarkOutcome !== null,
    benchmarkOutcome,
    ordinaryPasses,
    maximumPossiblePasses,
    completedNewCases: outcomes.length,
    nextCase: benchmarkOutcome === null ? BENCHMARK_CASES[outcomes.length] : null,
  };
}

function displayValue(value) {
  return value === null || value === undefined ? "null" : JSON.stringify(value);
}

export function formatReviewOutput(result) {
  const selectedRanks = result.selection.selected.map(({ rank }) => rank).join(",");
  const lines = [
    `a4_3_request_number=${result.benchmarkCase.requestNumber}`,
    `company_input=${JSON.stringify(result.benchmarkCase.input)}`,
    `intended_company=${JSON.stringify(result.benchmarkCase.companyName)}`,
    `evaluation_official_domain=${result.benchmarkCase.officialDomain}`,
    formatSummary(result.discovery),
    `selector_now=${result.selectorNow.toISOString()}`,
    `selected_ranks=${selectedRanks}`,
    "candidate_review:",
  ];

  for (const evaluated of result.selection.evaluated) {
    const candidate = evaluated.candidate;
    lines.push(
      [
        `rank=${candidate.rank}`,
        `selected=${evaluated.selected ? "yes" : "no"}`,
        `recency=${evaluated.recencyBucket}`,
        `source=${evaluated.sourceClass}`,
        `cluster=${evaluated.duplicateClusterId ?? "none"}`,
        `reason=${evaluated.reason}`,
        `published_date=${displayValue(candidate.publishedDate)}`,
        `author=${displayValue(candidate.author)}`,
        `highlights_present=${candidate.highlights.length > 0 ? "yes" : "no"}`,
        `title=${displayValue(candidate.title)}`,
        `url=${displayValue(candidate.url)}`,
      ].join("\t"),
    );
  }

  return lines.join("\n");
}

async function main() {
  try {
    const options = parseArgs(process.argv.slice(2));
    if (options.help) {
      console.log(usage());
      return;
    }

    const apiKey = process.env.EXA_API_KEY ?? "";
    const benchmarkCase = validateOptions(options, apiKey);
    const result = await runBenchmarkCase({ benchmarkCase, apiKey });
    console.log(formatReviewOutput(result));
  } catch (error) {
    const safeMessage = redact(error?.message ?? error, process.env.EXA_API_KEY ?? "");
    console.error(`Phase A4.3 benchmark case failed: ${safeMessage}`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) await main();
