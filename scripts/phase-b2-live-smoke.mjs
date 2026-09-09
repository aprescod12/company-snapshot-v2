#!/usr/bin/env node

import process from "node:process";
import { fileURLToPath } from "node:url";

import { discoverCompanyForSmoke } from "../src/discovery/discoverCompany.mjs";

export const B2_SMOKE_MODE = "b2-smoke";
export const ALLOWED_INPUTS = Object.freeze(["Stripe", "stripe.com"]);

function redact(value, apiKey = "") {
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
  if (options.mode !== B2_SMOKE_MODE) throw new Error("Only the Phase B2 smoke mode is authorized.");
  if (!ALLOWED_INPUTS.includes(options.company)) throw new Error("The Phase B2 smoke is restricted to Stripe or stripe.com.");
  if (!options.confirmedFreeStarter) throw new Error("Refusing network access without --confirmed-free-starter.");
  if (!apiKey) throw new Error("EXA_API_KEY is not set.");
}

function diagnosticLines(diagnostic) {
  const { identity, groundingByField, confirmation, provider } = diagnostic;
  if (!identity || !groundingByField || !provider) {
    return [
      "resolved_company_name=null",
      "official_domain=null",
      "ambiguous=null",
      "resolved_company_name_grounding_urls=",
      "resolved_company_name_grounding_count=0",
      "official_domain_grounding_urls=",
      "official_domain_grounding_count=0",
      `b1_confirmation_state=${confirmation.state}`,
      `b1_confirmation_reason=${confirmation.reason ?? "none"}`,
      "raw_result_count=null",
      "dated_result_count=null",
      "highlight_bearing_result_count=null",
      "unique_domain_count=null",
      "provider_latency_ms=null",
      "provider_estimated_cost_usd=null",
    ];
  }
  return [
    `resolved_company_name=${JSON.stringify(identity.resolvedCompanyName)}`,
    `official_domain=${JSON.stringify(identity.officialDomain)}`,
    `ambiguous=${typeof identity.ambiguous === "boolean" ? String(identity.ambiguous) : "null"}`,
    `resolved_company_name_grounding_urls=${groundingByField.resolvedCompanyName.map(JSON.stringify).join(",")}`,
    `resolved_company_name_grounding_count=${groundingByField.resolvedCompanyName.length}`,
    `official_domain_grounding_urls=${groundingByField.officialDomain.map(JSON.stringify).join(",")}`,
    `official_domain_grounding_count=${groundingByField.officialDomain.length}`,
    `b1_confirmation_state=${confirmation.state}`,
    `b1_confirmation_reason=${confirmation.reason ?? "none"}`,
    `raw_result_count=${provider.resultCount}`,
    `dated_result_count=${provider.datedCount}`,
    `highlight_bearing_result_count=${provider.highlightedCount}`,
    `unique_domain_count=${provider.uniqueDomainCount}`,
    `provider_latency_ms=${provider.latencyMs}`,
    `provider_estimated_cost_usd=${provider.estimatedCostUsd ?? "null"}`,
  ];
}

export function formatSmokeOutput({ result, diagnostic }) {
  if (result.state === "clarification_needed") {
    return [
      "b2_state=clarification_needed",
      `b2_reason=${result.reason}`,
      ...diagnosticLines(diagnostic),
    ].join("\n");
  }
  const lines = [
    `b2_state=${result.state}`,
    `company_input_kind=${result.company.inputKind}`,
    `company_name=${JSON.stringify(result.company.companyName)}`,
    `official_domain=${JSON.stringify(result.company.officialDomain)}`,
    ...diagnosticLines(diagnostic),
    `prioritized_count=${result.prioritized.length}`,
    `selected_count=${result.selected.length}`,
    `invalid_count=${result.evaluated.filter((entry) => entry.reason === "INVALID").length}`,
    `duplicate_count=${result.evaluated.filter((entry) => entry.reason === "DUPLICATE").length}`,
    "candidate_review:",
  ];
  for (const candidate of result.candidates) {
    lines.push(`rank=${candidate.rank}\ttitle=${JSON.stringify(candidate.title)}\turl=${JSON.stringify(candidate.url)}`);
  }
  return lines.join("\n");
}

async function main() {
  try {
    const options = parseArgs(process.argv.slice(2));
    if (options.help) {
      console.log("Usage: node scripts/phase-b2-live-smoke.mjs b2-smoke --company Stripe --confirmed-free-starter");
      return;
    }
    const apiKey = process.env.EXA_API_KEY ?? "";
    validateOptions(options, apiKey);
    const observed = await discoverCompanyForSmoke(options.company, apiKey);
    console.log(formatSmokeOutput(observed));
  } catch (error) {
    console.error(`Phase B2 smoke failed: ${redact(error?.message ?? error, process.env.EXA_API_KEY ?? "")}`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) await main();
