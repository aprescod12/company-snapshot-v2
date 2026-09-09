#!/usr/bin/env node

import process from "node:process";
import { fileURLToPath } from "node:url";

import {
  ENDPOINT,
  buildRequestBody,
  parseSearchResponse,
  redact,
} from "./exa-phase-a-discovery.mjs";
import { confirmCompanyIdentity, prepareCompanyTarget } from "../src/targeting/companyTarget.mjs";

export const IDENTITY_GATE_MODE = "identity-gate";
export const ALLOWED_COMPANIES = Object.freeze(["Mercury", "Stripe"]);
export const REQUEST_TIMEOUT_MS = 60_000;

export const IDENTITY_OUTPUT_SCHEMA = Object.freeze({
  type: "object",
  required: ["resolvedCompanyName", "officialDomain", "ambiguous"],
  properties: {
    resolvedCompanyName: { type: "string" },
    officialDomain: { type: "string" },
    ambiguous: { type: "boolean" },
  },
});

export function usage() {
  return `Usage:
  node scripts/exa-phase-b1-identity-gate.mjs identity-gate --company Mercury --confirmed-free-starter

This B1-only live gate makes exactly one Exa Search request for Mercury or
Stripe. Run Mercury first. Stripe is authorized only after manual review finds
the Mercury result safe. The script has no retry, polling, persistence, or
source-page retrieval path.

Required environment variable: EXA_API_KEY

--confirmed-free-starter is an operator attestation that this key belongs to an
Exa Starter account with no payment method, paid usage, or auto-recharge enabled.

For Stripe only, --confirmed-mercury-safe attests that the immediately preceding
Mercury review was safe under this phase's manual gate.`;
}

export function parseArgs(argv) {
  if (argv.includes("--help") || argv.includes("-h")) return { help: true };

  const [mode, ...rest] = argv;
  const options = {
    mode,
    company: undefined,
    confirmedFreeStarter: false,
    confirmedMercurySafe: false,
  };
  for (let index = 0; index < rest.length; index += 1) {
    const argument = rest[index];
    if (argument === "--company") {
      options.company = rest[index + 1];
      index += 1;
    } else if (argument === "--confirmed-free-starter") {
      options.confirmedFreeStarter = true;
    } else if (argument === "--confirmed-mercury-safe") {
      options.confirmedMercurySafe = true;
    } else {
      throw new Error(`Unknown argument: ${argument}`);
    }
  }
  return options;
}

export function canonicalCompany(company) {
  return ALLOWED_COMPANIES.find(
    (allowed) => typeof company === "string" && company.trim().toLowerCase() === allowed.toLowerCase(),
  );
}

export function validateOptions(options, apiKey) {
  if (options.mode !== IDENTITY_GATE_MODE) {
    throw new Error("Only the Phase B1 identity-gate mode is authorized.");
  }
  if (!canonicalCompany(options.company)) {
    throw new Error("The Phase B1 identity gate is restricted to Mercury or Stripe.");
  }
  if (!options.confirmedFreeStarter) {
    throw new Error("Refusing network access without --confirmed-free-starter.");
  }
  if (canonicalCompany(options.company) === "Stripe" && !options.confirmedMercurySafe) {
    throw new Error("Refusing Stripe before --confirmed-mercury-safe.");
  }
  if (!apiKey) throw new Error("EXA_API_KEY is not set.");
}

export function buildIdentityRequestBody(company, now = new Date()) {
  return { ...buildRequestBody(company, now), outputSchema: IDENTITY_OUTPUT_SCHEMA };
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isHttpUrl(value) {
  if (typeof value !== "string" || value !== value.trim()) return false;
  try {
    return ["http:", "https:"].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}

function requireExactKeys(value, expected, label) {
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (actual.length !== wanted.length || actual.some((key, index) => key !== wanted[index])) {
    throw new Error(`formatting: ${label} did not contain exactly ${wanted.join(", ")}.`);
  }
}

function classifyHttpFailure(status, tag) {
  if (status === 401 || status === 403 || tag === "INVALID_API_KEY") return "provider_auth";
  if (status === 402 || ["NO_MORE_CREDITS", "API_KEY_BUDGET_EXCEEDED", "TEAM_BUDGET_EXCEEDED"].includes(tag)) {
    return "provider_paid_required";
  }
  if (status === 429 || tag === "RATE_LIMIT_EXCEEDED") return "provider_quota";
  if (status >= 500) return "provider_unavailable";
  if (status === 400 || status === 422) return "formatting";
  return "unknown";
}

export function extractIdentityEvidenceUrls(grounding, field) {
  if (!Array.isArray(grounding)) return [];
  const urls = [];
  for (const [entryIndex, entry] of grounding.entries()) {
    if (!isPlainObject(entry)) {
      throw new Error(`formatting: grounding[${entryIndex}] was not an object.`);
    }
    requireExactKeys(entry, ["field", "citations", "confidence"], `grounding[${entryIndex}]`);
    if (typeof entry.field !== "string" || typeof entry.confidence !== "string") {
      throw new Error(`formatting: grounding[${entryIndex}] had an invalid field or confidence.`);
    }
    if (!Array.isArray(entry.citations)) {
      throw new Error(`formatting: grounding[${entryIndex}].citations was not an array.`);
    }
    if (entry.field !== field) continue;
    for (const citation of entry.citations) {
      if (!isPlainObject(citation)) {
        throw new Error(`formatting: grounding[${entryIndex}] contained a non-object citation.`);
      }
      requireExactKeys(citation, ["url", "title"], `grounding[${entryIndex}] citation`);
      if (typeof citation.title !== "string") {
        throw new Error(`formatting: grounding[${entryIndex}] citation title was not a string.`);
      }
      if (isHttpUrl(citation.url) && !urls.includes(citation.url)) {
        urls.push(citation.url);
      }
    }
  }
  return urls;
}

export function parseIdentityOutput(payload) {
  if (!isPlainObject(payload?.output) || !isPlainObject(payload.output.content)) {
    throw new Error("formatting: synthesized identity output was absent.");
  }
  const content = payload.output.content;
  requireExactKeys(
    content,
    ["resolvedCompanyName", "officialDomain", "ambiguous"],
    "output.content",
  );
  if (
    typeof content.resolvedCompanyName !== "string" ||
    typeof content.officialDomain !== "string" ||
    typeof content.ambiguous !== "boolean"
  ) {
    throw new Error("formatting: synthesized identity output did not match the approved schema.");
  }

  const grounding = payload.output.grounding;
  if (content.ambiguous === false && !Array.isArray(grounding)) {
    throw new Error("citation_missing: unambiguous identity fields require provider grounding.");
  }
  const resolvedNameUrls = extractIdentityEvidenceUrls(grounding, "resolvedCompanyName");
  const officialDomainUrls = extractIdentityEvidenceUrls(grounding, "officialDomain");
  if (content.ambiguous === false && (!resolvedNameUrls.length || !officialDomainUrls.length)) {
    throw new Error("citation_missing: unambiguous identity fields require valid provider grounding.");
  }

  return {
    identity: content,
    evidenceUrls: [...new Set([...resolvedNameUrls, ...officialDomainUrls])],
    groundingByField: { resolvedCompanyName: resolvedNameUrls, officialDomain: officialDomainUrls },
  };
}

export async function requestIdentityGate(company, apiKey, fetchImpl = fetch, now = new Date()) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const startedAt = performance.now();
  let response;
  let payload;
  let latencyMs;

  try {
    response = await fetchImpl(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey },
      body: JSON.stringify(buildIdentityRequestBody(company, now)),
      signal: controller.signal,
    });
    try {
      payload = await response.json();
    } catch (error) {
      if (error?.name === "AbortError") throw error;
      payload = {};
    }
    latencyMs = Math.round(performance.now() - startedAt);
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error(`latency: request exceeded ${REQUEST_TIMEOUT_MS / 1000} seconds.`);
    }
    throw new Error(`provider_unavailable: request failed; latency_ms=${Math.round(performance.now() - startedAt)}`);
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const rawTag = typeof payload?.tag === "string" ? payload.tag : "";
    const tag = /^[A-Z0-9_]{1,80}$/.test(rawTag) ? rawTag : "UNKNOWN";
    throw new Error(`${classifyHttpFailure(response.status, tag)}: HTTP ${response.status}; tag=${tag}; latency_ms=${latencyMs}`);
  }

  const discovery = parseSearchResponse(payload, latencyMs);
  const parsedIdentity = parseIdentityOutput(payload);
  return { discovery, ...parsedIdentity };
}

export function candidateStats(candidates) {
  const domains = new Set();
  let datedCount = 0;
  let highlightedCount = 0;
  for (const candidate of candidates) {
    if (candidate.publishedDate) datedCount += 1;
    if (candidate.highlights.length) highlightedCount += 1;
    domains.add(new URL(candidate.url).hostname.toLowerCase());
  }
  return { resultCount: candidates.length, datedCount, highlightedCount, uniqueDomainCount: domains.size };
}

export function evaluateIdentityGate(company, providerResult) {
  const target = prepareCompanyTarget(company);
  const identityResult = confirmCompanyIdentity(target, {
    ...providerResult.identity,
    evidenceUrls: providerResult.evidenceUrls,
    groundingByField: providerResult.groundingByField,
  });
  return { target, identityResult, rawResultStats: candidateStats(providerResult.discovery.candidates) };
}

export async function runIdentityGate({ company, apiKey, fetchImpl = fetch, now = new Date() }) {
  const providerResult = await requestIdentityGate(company, apiKey, fetchImpl, now);
  return { providerResult, evaluation: evaluateIdentityGate(company, providerResult) };
}

function quote(value) {
  return JSON.stringify(value);
}

export function formatReviewOutput(result) {
  const { providerResult, evaluation } = result;
  const { identity, groundingByField, discovery } = providerResult;
  const stats = evaluation.rawResultStats;
  const lines = [
    `resolved_company_name=${quote(identity.resolvedCompanyName)}`,
    `official_domain=${quote(identity.officialDomain)}`,
    `ambiguous=${identity.ambiguous ? "true" : "false"}`,
    `resolved_company_name_grounding_urls=${groundingByField.resolvedCompanyName.map(quote).join(",")}`,
    `official_domain_grounding_urls=${groundingByField.officialDomain.map(quote).join(",")}`,
    `b1_status=${evaluation.identityResult.status}`,
    `b1_reason=${evaluation.identityResult.reason ?? "none"}`,
    `provider_result_count=${stats.resultCount}`,
    `provider_dated_count=${stats.datedCount}`,
    `provider_highlighted_count=${stats.highlightedCount}`,
    `provider_unique_domain_count=${stats.uniqueDomainCount}`,
    `provider_latency_ms=${discovery.latencyMs}`,
    `provider_estimated_cost_usd=${discovery.estimatedCostUsd ?? "unknown"}`,
    "candidate_review:",
  ];
  for (const candidate of discovery.candidates) {
    lines.push(
      [
        `rank=${candidate.rank}`,
        `published_date=${quote(candidate.publishedDate)}`,
        `title=${quote(candidate.title)}`,
        `url=${quote(candidate.url)}`,
        `highlights=${quote(candidate.highlights)}`,
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
    const company = canonicalCompany(options.company);
    const result = await runIdentityGate({ company, apiKey });
    console.log(formatReviewOutput(result));
  } catch (error) {
    console.error(`Phase B1 identity gate failed: ${redact(error?.message ?? error, process.env.EXA_API_KEY ?? "")}`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) await main();
