#!/usr/bin/env node

import process from "node:process";
import { fileURLToPath } from "node:url";

import { discoverCompany } from "../src/discovery/discoverCompany.mjs";
import { verifyCompanyDiscovery } from "../src/verification/verifyCompany.mjs";

export const B3_LIVE_SMOKE_MODE = "b3-live-smoke";
export const ALLOWED_COMPANIES = Object.freeze(["NVIDIA", "Stripe"]);

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
  if (options.mode !== B3_LIVE_SMOKE_MODE) throw new Error("Only the Phase B3 live-smoke mode is authorized.");
  if (!ALLOWED_COMPANIES.includes(options.company)) throw new Error("The Phase B3 live smoke is restricted to NVIDIA or Stripe.");
  if (!options.confirmedFreeStarter) throw new Error("Refusing network access without --confirmed-free-starter.");
  if (!apiKey) throw new Error("EXA_API_KEY is not set.");
}

function evidenceSummary(evidence) {
  return evidence.map((item) => ({
    candidateTitle: item.candidateTitle,
    sourceTitle: item.sourceTitle,
    sourceUrl: item.sourceUrl,
    resolvedUrl: item.resolvedUrl,
    publishedDate: item.publishedDate,
    recencyBucket: item.recencyBucket,
    sourceClass: item.sourceClass,
    evidenceSnippet: item.evidenceSnippet,
  }));
}

export function summarizeB3LiveSmoke(company, discovery, verification) {
  const fallbackRequestCount = verification.retrieval.fallbackUsed ? 1 : 0;
  const totalExaRequestCount = verification.retrieval.exaRequestCount;
  if (totalExaRequestCount !== 1 + fallbackRequestCount || totalExaRequestCount > 2) {
    throw new Error("B3 live smoke exceeded the approved two-Exa-request ceiling.");
  }
  return {
    submittedCompany: company,
    b2: {
      state: discovery.state,
      company: { ...discovery.company },
      identityConfirmation: "resolved",
      broadProviderLatencyMs: discovery.provider.latencyMs,
      broadProviderEstimatedCostUsd: discovery.provider.estimatedCostUsd,
    },
    providerUse: {
      broadExaRequestCount: 1,
      fallbackExaRequestCount: fallbackRequestCount,
      totalExaRequestCount,
      fallbackUsed: verification.retrieval.fallbackUsed,
      fallbackProviderLatencyMs: null,
      fallbackProviderEstimatedCostUsd: null,
    },
    b3: {
      state: verification.state,
      evidenceCount: verification.evidence.length,
      evidence: evidenceSummary(verification.evidence),
    },
  };
}

export async function runB3LiveSmoke(
  options,
  apiKey,
  { discoverOptions = {}, verificationOptions = {} } = {},
) {
  validateOptions(options, apiKey);
  const discovery = await discoverCompany(options.company, apiKey, discoverOptions);
  if (discovery.state !== "ready_for_verification") {
    return {
      submittedCompany: options.company,
      b2: { state: discovery.state, reason: discovery.reason ?? null },
      providerUse: {
        broadExaRequestCount: 1,
        fallbackExaRequestCount: 0,
        totalExaRequestCount: 1,
        fallbackUsed: false,
        fallbackProviderLatencyMs: null,
        fallbackProviderEstimatedCostUsd: null,
      },
      b3: null,
    };
  }
  const verification = await verifyCompanyDiscovery(discovery, apiKey, verificationOptions);
  return summarizeB3LiveSmoke(options.company, discovery, verification);
}

export function formatSmokeOutput(summary, apiKey = "") {
  return redact(JSON.stringify(summary, null, 2), apiKey);
}

async function main() {
  try {
    const options = parseArgs(process.argv.slice(2));
    if (options.help) {
      console.log("Usage: node scripts/phase-b3-live-smoke.mjs b3-live-smoke --company NVIDIA --confirmed-free-starter");
      return;
    }
    const apiKey = process.env.EXA_API_KEY ?? "";
    console.log(formatSmokeOutput(await runB3LiveSmoke(options, apiKey), apiKey));
  } catch (error) {
    console.error(`Phase B3 live smoke failed: ${redact(error?.message ?? error, process.env.EXA_API_KEY ?? "")}`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) await main();
