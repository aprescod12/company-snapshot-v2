#!/usr/bin/env node

import process from "node:process";
import { fileURLToPath } from "node:url";

import { requestCompanyDescription } from "../src/description/exaCompanyDescription.mjs";

export const B4B_LIVE_SMOKE_MODE = "b4b-live-smoke";

/**
 * Fixed, already-confirmed identities for the two owner-authorized future
 * cases. The harness deliberately does not call B1/B2 to resolve identity;
 * B4B only ever receives an already-resolved company.
 */
export const ALLOWED_CASES = Object.freeze({
  NVIDIA: Object.freeze({ companyName: "NVIDIA Corporation", officialDomain: "nvidia.com" }),
  "stripe.com": Object.freeze({ companyName: "Stripe", officialDomain: "stripe.com" }),
});

export function redact(value, apiKey = "") {
  let safe = String(value).replace(/exa[-_][0-9A-Za-z_-]{20,}/gi, "[REDACTED_API_KEY]");
  if (apiKey) safe = safe.replaceAll(apiKey, "[REDACTED_API_KEY]");
  return safe;
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
  if (options.mode !== B4B_LIVE_SMOKE_MODE) throw new Error("Only the Phase B4B live-smoke mode is authorized.");
  if (!Object.hasOwn(ALLOWED_CASES, options.company)) {
    throw new Error("The Phase B4B live smoke is restricted to NVIDIA or stripe.com.");
  }
  if (!options.confirmedFreeStarter) throw new Error("Refusing network access without --confirmed-free-starter.");
  if (!apiKey) throw new Error("EXA_API_KEY is not set.");
}

export function summarizeB4bLiveSmoke(submittedCase, company, result) {
  if (result.state === "described") {
    return {
      submittedCase,
      company: { ...company },
      state: result.state,
      description: result.description,
      sourceUrl: result.sourceUrl,
      provider: { latencyMs: result.provider.latencyMs, estimatedCostUsd: result.provider.estimatedCostUsd },
    };
  }
  return { submittedCase, company: { ...company }, state: result.state, reason: result.reason };
}

/**
 * Calls only the isolated B4B description path: exactly one Exa Contents
 * request against the confirmed company's homepage. Makes no Search request
 * and no B1/B2/B3/publisher call.
 */
export async function runB4bLiveSmoke(options, apiKey, requestOptions = {}) {
  validateOptions(options, apiKey);
  const company = ALLOWED_CASES[options.company];
  const result = await requestCompanyDescription(company, apiKey, requestOptions);
  return summarizeB4bLiveSmoke(options.company, company, result);
}

export function formatSmokeOutput(summary, apiKey = "") {
  return redact(JSON.stringify(summary, null, 2), apiKey);
}

async function main() {
  try {
    const options = parseArgs(process.argv.slice(2));
    if (options.help) {
      console.log("Usage: node scripts/phase-b4b-live-smoke.mjs b4b-live-smoke --company NVIDIA --confirmed-free-starter");
      return;
    }
    const apiKey = process.env.EXA_API_KEY ?? "";
    console.log(formatSmokeOutput(await runB4bLiveSmoke(options, apiKey), apiKey));
  } catch (error) {
    console.error(`Phase B4B live smoke failed: ${redact(error?.message ?? error, process.env.EXA_API_KEY ?? "")}`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) await main();
