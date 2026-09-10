#!/usr/bin/env node

import process from "node:process";
import { fileURLToPath } from "node:url";

import { discoverCompany } from "../src/discovery/discoverCompany.mjs";
import { verifyCompanyDiscovery } from "../src/verification/verifyCompany.mjs";
import { requestCompanyDescription } from "../src/description/exaCompanyDescription.mjs";
import { assembleSnapshot } from "../src/snapshot/assembleSnapshot.mjs";
import { createCompanySnapshot } from "../src/orchestration/createCompanySnapshot.mjs";

export const B5_LIVE_SMOKE_MODE = "b5-live-smoke";
export const ALLOWED_COMPANIES = Object.freeze(["NVIDIA"]);

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
  if (options.mode !== B5_LIVE_SMOKE_MODE) throw new Error("Only the Phase B5 live-smoke mode is authorized.");
  if (!ALLOWED_COMPANIES.includes(options.company)) throw new Error("The Phase B5 live smoke is restricted to NVIDIA.");
  if (!options.confirmedFreeStarter) throw new Error("Refusing network access without --confirmed-free-starter.");
  if (!apiKey) throw new Error("EXA_API_KEY is not set.");
}

/**
 * Asserts the frozen provider budget after one integrated run. A violation
 * indicates a real integration defect, not a condition to retry around.
 * When a completed B3 result (`verified` or `insufficient_evidence`) was
 * captured, B4B must have executed exactly once.
 */
export function checkProviderBudget(counters, verificationState) {
  if (counters.broadExaSearchRequests !== 1) {
    throw new Error(`Expected exactly 1 broad Exa Search request; observed ${counters.broadExaSearchRequests}.`);
  }
  if (counters.fallbackExaSearchRequests > 1) {
    throw new Error(`Expected at most 1 fallback Exa Search request; observed ${counters.fallbackExaSearchRequests}.`);
  }
  const totalExaSearchRequests = counters.broadExaSearchRequests + counters.fallbackExaSearchRequests;
  if (totalExaSearchRequests > 2) {
    throw new Error(`Exceeded the 2-Exa-Search-per-company ceiling; observed ${totalExaSearchRequests}.`);
  }
  if (counters.exaContentsRequests > 1) {
    throw new Error(`Expected at most 1 Exa Contents request; observed ${counters.exaContentsRequests}.`);
  }
  if ((verificationState === "verified" || verificationState === "insufficient_evidence") && counters.exaContentsRequests !== 1) {
    throw new Error(
      `Expected exactly 1 Exa Contents request after a completed B3 result (${verificationState}); observed ${counters.exaContentsRequests}.`,
    );
  }
}

function countingFetch(counters, key, fetchImpl) {
  return async (url, init) => {
    counters[key] += 1;
    return fetchImpl(url, init);
  };
}

function deriveObserved(captured, counters) {
  const identity = captured.verification?.company ?? captured.discovery?.company ?? null;
  return {
    identity: identity ? { companyName: identity.companyName, officialDomain: identity.officialDomain } : {},
    verification: captured.verification
      ? {
          state: captured.verification.state,
          evidenceCount: captured.verification.evidence.length,
          fallbackUsed: captured.verification.retrieval.fallbackUsed,
          exaRequestCount: captured.verification.retrieval.exaRequestCount,
          evidence: captured.verification.evidence.map((item) => ({
            sourceTitle: item.sourceTitle,
            resolvedUrl: item.resolvedUrl,
            publishedDate: item.publishedDate,
            recencyBucket: item.recencyBucket,
            sourceClass: item.sourceClass,
            evidenceSnippet: item.evidenceSnippet,
          })),
        }
      : {},
    description: captured.description
      ? {
          state: captured.description.state,
          sourceUrl: captured.description.sourceUrl,
          providerLatencyMs: captured.description.provider?.latencyMs,
          estimatedCostUsd: captured.description.provider?.estimatedCostUsd,
        }
      : {},
    providerUse: {
      broadExaSearchRequests: counters.broadExaSearchRequests,
      fallbackExaSearchRequests: counters.fallbackExaSearchRequests,
      totalExaSearchRequests: counters.broadExaSearchRequests + counters.fallbackExaSearchRequests,
      exaContentsRequests: counters.exaContentsRequests,
      publisherRequests: counters.publisherRequests,
    },
  };
}

export function summarizeB5LiveSmoke(submittedInput, captured, counters, final, totalLatencyMs) {
  return { submittedInput, final, ...deriveObserved(captured, counters), totalLatencyMs };
}

/**
 * Built when the run does not reach a normal summary — either the real
 * `createCompanySnapshot()` threw an unexpected error, or the post-hoc
 * provider-budget check failed. Preserves the stage reached and every
 * provider count/captured stage result gathered so far, so a live failure
 * never collapses to only an error string.
 */
export function buildFailureDiagnostic(submittedInput, stageReached, captured, counters, totalLatencyMs, error) {
  return {
    submittedInput,
    stageReached,
    error: { name: error?.name ?? "Error", message: String(error?.message ?? error) },
    ...deriveObserved(captured, counters),
    totalLatencyMs,
  };
}

export class B5LiveSmokeExecutionError extends Error {
  constructor(message, diagnostic, cause) {
    super(message);
    this.name = "B5LiveSmokeExecutionError";
    this.diagnostic = diagnostic;
    this.cause = cause;
  }
}

/**
 * Runs the real production `createCompanySnapshot()` exactly once, observing
 * provider request counts and intermediate stage results through thin
 * counting wrappers that delegate entirely to the real B1-B4B production
 * functions. It alters no return value and no business decision; it only
 * observes and asserts the frozen provider budget. `assembleSnapshotImpl`
 * defaults to the real B4A export and exists only so this file's own tests
 * can exercise the failure-diagnostic path without fabricating unreachable
 * network-layer provider behavior; live callers never need to pass it.
 */
export async function runB5LiveSmoke(
  options,
  apiKey,
  { fetchImpl = fetch, now = new Date(), assembleSnapshotImpl = assembleSnapshot } = {},
) {
  validateOptions(options, apiKey);

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
      return assembleSnapshotImpl(args);
    },
  };

  const startedAt = performance.now();
  let final;
  try {
    final = await createCompanySnapshot(options.company, apiKey, { now, services });
    stageReached = "budget-check";
    checkProviderBudget(counters, captured.verification?.state);
  } catch (error) {
    const totalLatencyMs = Math.round(performance.now() - startedAt);
    const diagnostic = buildFailureDiagnostic(options.company, stageReached, captured, counters, totalLatencyMs, error);
    throw new B5LiveSmokeExecutionError(
      `B5 live smoke failed during ${stageReached}: ${error?.message ?? error}`,
      diagnostic,
      error,
    );
  }

  const totalLatencyMs = Math.round(performance.now() - startedAt);
  return summarizeB5LiveSmoke(options.company, captured, counters, final, totalLatencyMs);
}

export function formatSmokeOutput(summary, apiKey = "") {
  return redact(JSON.stringify(summary, null, 2), apiKey);
}

async function main() {
  const apiKey = process.env.EXA_API_KEY ?? "";
  try {
    const options = parseArgs(process.argv.slice(2));
    if (options.help) {
      console.log("Usage: node scripts/phase-b5-live-smoke.mjs b5-live-smoke --company NVIDIA --confirmed-free-starter");
      return;
    }
    console.log(formatSmokeOutput(await runB5LiveSmoke(options, apiKey), apiKey));
  } catch (error) {
    console.error(`Phase B5 live smoke failed: ${redact(error?.message ?? error, apiKey)}`);
    if (error instanceof B5LiveSmokeExecutionError) {
      console.error(formatSmokeOutput(error.diagnostic, apiKey));
    }
    process.exitCode = 1;
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) await main();
