#!/usr/bin/env node

import process from "node:process";
import { fileURLToPath } from "node:url";

import {
  formatSummary,
  redact,
  requestCandidates,
} from "./exa-phase-a-discovery.mjs";
import { selectSignals } from "../src/selection/selectSignals.mjs";

export const REPAIR_MODE = "repair-case";
export const REPAIR_SYSTEM_PROMPT =
  "Prefer first-party company announcements and reputable independent reporting. Return distinct company-level events. Avoid SEO/affiliate pages, generic roundups, evergreen content, rumors, and duplicate coverage.";

export const REPAIR_CASES = Object.freeze([
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
]);

export function usage() {
  return `Usage:
  node scripts/exa-phase-a-retrieval-repair.mjs repair-case --request-number 1 --company Stripe --confirmed-free-starter
  node scripts/exa-phase-a-retrieval-repair.mjs repair-case --request-number 2 --company PostHog --stripe-raw-sufficient --confirmed-free-starter

This bounded Phase A4.3R1 harness executes exactly one approved repair case. It
reuses the A4.1 request unchanged except for the fixed source-quality/novelty
systemPrompt, passes candidates directly to the frozen A4.2 selector, and prints
compact transient review metadata. It does not retry or persist results.

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
    stripeRawSufficient: false,
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
    } else if (argument === "--stripe-raw-sufficient") {
      options.stripeRawSufficient = true;
    } else {
      throw new Error(`Unknown argument: ${argument}`);
    }
  }

  return options;
}

export function validateOptions(options, apiKey) {
  if (options.mode !== REPAIR_MODE) {
    throw new Error("Only the Phase A4.3R1 repair-case mode is authorized.");
  }
  if (!Number.isInteger(options.requestNumber)) {
    throw new Error("--request-number must be 1 or 2.");
  }

  const repairCase = REPAIR_CASES[options.requestNumber - 1];
  if (!repairCase || options.company !== repairCase.input) {
    throw new Error("The request number and company must match the fixed A4.3R1 order.");
  }
  if (repairCase.requestNumber === 1 && options.stripeRawSufficient) {
    throw new Error("--stripe-raw-sufficient applies only to the conditional PostHog case.");
  }
  if (repairCase.requestNumber === 2 && !options.stripeRawSufficient) {
    throw new Error("PostHog is blocked unless Stripe raw retrieval was sufficient.");
  }
  if (!options.confirmedFreeStarter) {
    throw new Error("Refusing network access without --confirmed-free-starter.");
  }
  if (!apiKey) throw new Error("EXA_API_KEY is not set.");
  return repairCase;
}

function addRepairSystemPrompt(fetchImpl) {
  return (endpoint, request) => {
    const historicalBody = JSON.parse(request.body);
    return fetchImpl(endpoint, {
      ...request,
      body: JSON.stringify({ ...historicalBody, systemPrompt: REPAIR_SYSTEM_PROMPT }),
    });
  };
}

export async function runRepairCase({
  repairCase,
  apiKey,
  now = new Date(),
  fetchImpl = fetch,
}) {
  const discovery = await requestCandidates(
    repairCase.input,
    apiKey,
    addRepairSystemPrompt(fetchImpl),
  );
  const selection = selectSignals(discovery.candidates, {
    companyName: repairCase.companyName,
    officialDomain: repairCase.officialDomain,
    now,
  });
  return { repairCase, discovery, selection, selectorNow: now };
}

function displayValue(value) {
  return value === null || value === undefined ? "null" : JSON.stringify(value);
}

export function formatRepairOutput(result) {
  const selectedRanks = result.selection.selected.map(({ rank }) => rank).join(",");
  const lines = [
    `a4_3r1_request_number=${result.repairCase.requestNumber}`,
    `company_input=${JSON.stringify(result.repairCase.input)}`,
    `intended_company=${JSON.stringify(result.repairCase.companyName)}`,
    `evaluation_official_domain=${result.repairCase.officialDomain}`,
    `one_variable_change=systemPrompt`,
    `system_prompt=${JSON.stringify(REPAIR_SYSTEM_PROMPT)}`,
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
    const repairCase = validateOptions(options, apiKey);
    const result = await runRepairCase({ repairCase, apiKey });
    console.log(formatRepairOutput(result));
  } catch (error) {
    const safeMessage = redact(error?.message ?? error, process.env.EXA_API_KEY ?? "");
    console.error(`Phase A4.3R1 repair case failed: ${safeMessage}`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) await main();
