#!/usr/bin/env node

import process from "node:process";
import { fileURLToPath } from "node:url";

import {
  formatSummary,
  redact,
  requestCandidates,
} from "./exa-phase-a-discovery.mjs";

export const FALLBACK_MODE = "fallback-case";
export const FALLBACK_COMPANY = "Stripe";
export const FALLBACK_OFFICIAL_DOMAIN = "stripe.com";
export const FALLBACK_INCLUDE_DOMAINS = Object.freeze([
  FALLBACK_OFFICIAL_DOMAIN,
  `*.${FALLBACK_OFFICIAL_DOMAIN}`,
]);

export function usage() {
  return `Usage:
  node scripts/exa-phase-a-fallback-feasibility.mjs fallback-case --company Stripe --confirmed-free-starter

This bounded Phase A4.5 harness makes one conditional official-domain Exa
fallback request for Stripe. It preserves the A4.1 raw discovery request except
for the approved includeDomains constraint, prints compact review metadata, and
does not retry or persist results.

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
  if (options.mode !== FALLBACK_MODE) {
    throw new Error("Only the Phase A4.5 fallback-case mode is authorized.");
  }
  if (options.company !== FALLBACK_COMPANY) {
    throw new Error("The Phase A4.5 fallback is restricted to Stripe.");
  }
  if (!options.confirmedFreeStarter) {
    throw new Error("Refusing network access without --confirmed-free-starter.");
  }
  if (!apiKey) throw new Error("EXA_API_KEY is not set.");
}

function addOfficialDomainConstraint(fetchImpl) {
  return (endpoint, request) => {
    const historicalBody = JSON.parse(request.body);
    return fetchImpl(endpoint, {
      ...request,
      body: JSON.stringify({ ...historicalBody, includeDomains: FALLBACK_INCLUDE_DOMAINS }),
    });
  };
}

export async function runFallbackCase({ apiKey, fetchImpl = fetch }) {
  const discovery = await requestCandidates(
    FALLBACK_COMPANY,
    apiKey,
    addOfficialDomainConstraint(fetchImpl),
  );
  return { discovery };
}

function displayValue(value) {
  return value === null || value === undefined ? "null" : JSON.stringify(value);
}

export function formatFallbackOutput(result) {
  const lines = [
    "a4_5_case=Stripe",
    `intended_company=${JSON.stringify(FALLBACK_COMPANY)}`,
    `evaluation_official_domain=${FALLBACK_OFFICIAL_DOMAIN}`,
    `one_variable_change=includeDomains:${JSON.stringify(FALLBACK_INCLUDE_DOMAINS)}`,
    formatSummary(result.discovery),
    "candidate_review:",
  ];

  for (const candidate of result.discovery.candidates) {
    lines.push(
      [
        `rank=${candidate.rank}`,
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
    const result = await runFallbackCase({ apiKey });
    console.log(formatFallbackOutput(result));
  } catch (error) {
    const safeMessage = redact(error?.message ?? error, process.env.EXA_API_KEY ?? "");
    console.error(`Phase A4.5 fallback case failed: ${safeMessage}`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) await main();
