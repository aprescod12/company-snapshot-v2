#!/usr/bin/env node

import process from "node:process";
import { fileURLToPath } from "node:url";

import {
  formatSummary,
  redact,
  requestCandidates,
} from "./exa-phase-a-discovery.mjs";
import { selectSignals } from "../src/selection/selectSignals.mjs";

export const SMOKE_MODE = "selector-smoke";
export const TARGET_COMPANY = "NVIDIA";
export const OFFICIAL_DOMAIN = "nvidia.com";

export function usage() {
  return `Usage:
  node scripts/exa-phase-a-selector-smoke.mjs selector-smoke --company NVIDIA --confirmed-free-starter

This bounded Phase A4.2 smoke makes exactly one A4.1-style Exa Search request,
passes the in-memory candidates to the deterministic selector, and prints a
compact transient review representation. It does not retry or persist results.

Required environment variable: EXA_API_KEY`;
}

export function parseArgs(argv) {
  if (argv.includes("--help") || argv.includes("-h")) return { help: true };

  const [mode, ...rest] = argv;
  const options = { mode, company: undefined, confirmedFreeStarter: false };

  for (let index = 0; index < rest.length; index += 1) {
    const argument = rest[index];
    if (argument === "--company") {
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
  if (options.mode !== SMOKE_MODE) {
    throw new Error("Only the Phase A4.2 selector-smoke mode is authorized.");
  }
  if (options.company?.trim().toLowerCase() !== TARGET_COMPANY.toLowerCase()) {
    throw new Error("The Phase A4.2 selector smoke is restricted to NVIDIA.");
  }
  if (!options.confirmedFreeStarter) {
    throw new Error("Refusing network access without --confirmed-free-starter.");
  }
  if (!apiKey) throw new Error("EXA_API_KEY is not set.");
}

export async function runSelectorSmoke({
  company,
  apiKey,
  now = new Date(),
  fetchImpl = fetch,
}) {
  const discovery = await requestCandidates(company, apiKey, fetchImpl);
  const selection = selectSignals(discovery.candidates, {
    companyName: company,
    officialDomain: OFFICIAL_DOMAIN,
    now,
  });
  return { discovery, selection, selectorNow: now };
}

function displayValue(value) {
  return value === null || value === undefined ? "null" : JSON.stringify(value);
}

export function formatReviewOutput(result) {
  const selectedRanks = result.selection.selected.map(({ rank }) => rank).join(",");
  const lines = [
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
    validateOptions(options, apiKey);
    const result = await runSelectorSmoke({
      company: options.company.trim(),
      apiKey,
    });
    console.log(formatReviewOutput(result));
  } catch (error) {
    const safeMessage = redact(error?.message ?? error, process.env.EXA_API_KEY ?? "");
    console.error(`Phase A4.2 selector smoke failed: ${safeMessage}`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) await main();
