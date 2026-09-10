#!/usr/bin/env node

import process from "node:process";
import { fileURLToPath } from "node:url";

import { discoverCompany } from "../src/discovery/discoverCompany.mjs";
import { verifyCompanyDiscovery } from "../src/verification/verifyCompany.mjs";
import { requestCompanyDescription } from "../src/description/exaCompanyDescription.mjs";
import { assembleSnapshot } from "../src/snapshot/assembleSnapshot.mjs";
import { createCompanySnapshot } from "../src/orchestration/createCompanySnapshot.mjs";
import {
  B5LiveSmokeExecutionError,
  buildFailureDiagnostic,
  checkProviderBudget,
  redact,
  summarizeB5LiveSmoke,
} from "./phase-b5-live-smoke.mjs";

export const B_VALIDATION_MODE = "b-validation";

/**
 * The fixed, ordered representative cohort from docs/TESTING.md. Exactly
 * these six inputs, exactly once each, in this order. NVIDIA is deliberately
 * absent -- it already has its own separately authorized, already-passed
 * live gate and does not need another run.
 */
export const ALLOWED_CASES = Object.freeze(["Stripe", "PostHog", "Canva", "notion.so", "Mercury", "Craigslist"]);

export function parseArgs(argv) {
  if (argv.includes("--help") || argv.includes("-h")) return { help: true };
  const [mode, ...rest] = argv;
  const options = { mode, confirmedFreeStarter: false };
  for (let index = 0; index < rest.length; index += 1) {
    const argument = rest[index];
    if (argument === "--confirmed-free-starter") {
      options.confirmedFreeStarter = true;
    } else {
      throw new Error(`Unknown argument: ${argument}`);
    }
  }
  return options;
}

export function validateOptions(options, apiKey) {
  if (options.mode !== B_VALIDATION_MODE) throw new Error("Only the Phase B validation mode is authorized.");
  if (!options.confirmedFreeStarter) throw new Error("Refusing network access without --confirmed-free-starter.");
  if (!apiKey) throw new Error("EXA_API_KEY is not set.");
}

function countingFetch(counters, key, fetchImpl) {
  return async (url, init) => {
    counters[key] += 1;
    return fetchImpl(url, init);
  };
}

/**
 * Runs the real production `createCompanySnapshot()` exactly once for one
 * already-authorized input, observing provider request counts through thin
 * counting wrappers that delegate entirely to the real B1-B4B production
 * functions and alter no return value or business decision. This mirrors
 * scripts/phase-b5-live-smoke.mjs's approach exactly (reusing its generic,
 * company-agnostic budget/diagnostic helpers directly) but is generalized to
 * any single input drawn from the fixed ALLOWED_CASES cohort rather than
 * hardcoded to NVIDIA. Any input outside ALLOWED_CASES -- including NVIDIA,
 * which has its own separate live gate -- is rejected before any network
 * request is made, whether called from this file's own CLI (which never
 * passes an out-of-cohort input) or imported and called directly.
 */
export async function runValidationCase(input, apiKey, { fetchImpl = fetch, now = new Date() } = {}) {
  if (!ALLOWED_CASES.includes(input)) {
    throw new Error(`"${input}" is not part of the fixed Phase B validation cohort; refusing before any network request.`);
  }

  const counters = { broadExaSearchRequests: 0, fallbackExaSearchRequests: 0, publisherRequests: 0, exaContentsRequests: 0 };
  const captured = { discovery: null, verification: null, description: null };
  let stageReached = "preflight";

  const services = {
    discoverCompany: async (rawInput, key, opts) => {
      stageReached = "discovery";
      const result = await discoverCompany(rawInput, key, {
        ...opts,
        fetchImpl: countingFetch(counters, "broadExaSearchRequests", fetchImpl),
      });
      captured.discovery = result;
      return result;
    },
    verifyCompanyDiscovery: async (discoveryResult, key, opts) => {
      stageReached = "verification";
      const result = await verifyCompanyDiscovery(discoveryResult, key, {
        ...opts,
        sourceFetchImpl: countingFetch(counters, "publisherRequests", fetchImpl),
        exaFetchImpl: countingFetch(counters, "fallbackExaSearchRequests", fetchImpl),
      });
      captured.verification = result;
      return result;
    },
    requestCompanyDescription: async (company, key, opts) => {
      stageReached = "description";
      const result = await requestCompanyDescription(company, key, {
        ...opts,
        fetchImpl: countingFetch(counters, "exaContentsRequests", fetchImpl),
      });
      captured.description = result;
      return result;
    },
    assembleSnapshot: (args) => {
      stageReached = "assembly";
      return assembleSnapshot(args);
    },
  };

  const startedAt = performance.now();
  let final;
  try {
    final = await createCompanySnapshot(input, apiKey, { now, services });
    stageReached = "budget-check";
    checkProviderBudget(counters, captured.verification?.state);
  } catch (error) {
    const totalLatencyMs = Math.round(performance.now() - startedAt);
    const diagnostic = buildFailureDiagnostic(input, stageReached, captured, counters, totalLatencyMs, error);
    throw new B5LiveSmokeExecutionError(
      `Phase B validation failed for "${input}" during ${stageReached}: ${error?.message ?? error}`,
      diagnostic,
      error,
    );
  }

  const totalLatencyMs = Math.round(performance.now() - startedAt);
  return summarizeB5LiveSmoke(input, captured, counters, final, totalLatencyMs);
}

/**
 * Runs each of the six fixed, ordered validation-cohort inputs exactly once.
 * A case returning any normal application state (snapshot,
 * clarification_needed, insufficient_evidence, unavailable) is recorded and
 * the run continues to the next case. A case that throws -- a provider
 * budget violation or an unexpected uncaught error -- stops the run
 * immediately; no later case in the sequence executes.
 */
export async function runPhaseBValidation(apiKey, { fetchImpl = fetch, now = new Date(), runCase = runValidationCase } = {}) {
  if (!apiKey) throw new Error("EXA_API_KEY is not set.");
  const results = [];
  for (const input of ALLOWED_CASES) {
    try {
      const summary = await runCase(input, apiKey, { fetchImpl, now });
      results.push({ input, ok: true, summary });
    } catch (error) {
      results.push({
        input,
        ok: false,
        error:
          error instanceof B5LiveSmokeExecutionError
            ? { message: error.message, diagnostic: error.diagnostic }
            : { message: String(error?.message ?? error) },
      });
      break;
    }
  }
  return results;
}

export function formatValidationOutput(results, apiKey = "") {
  return redact(JSON.stringify(results, null, 2), apiKey);
}

async function main() {
  const apiKey = process.env.EXA_API_KEY ?? "";
  try {
    const options = parseArgs(process.argv.slice(2));
    if (options.help) {
      console.log("Usage: node scripts/phase-b-validation.mjs b-validation --confirmed-free-starter");
      return;
    }
    validateOptions(options, apiKey);
    const results = await runPhaseBValidation(apiKey, {});
    console.log(formatValidationOutput(results, apiKey));
    if (results.some((entry) => !entry.ok) || results.length !== ALLOWED_CASES.length) {
      process.exitCode = 1;
    }
  } catch (error) {
    console.error(`Phase B validation failed: ${redact(error?.message ?? error, apiKey)}`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) await main();
