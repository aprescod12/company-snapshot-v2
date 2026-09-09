#!/usr/bin/env node

import http from "node:http";
import process from "node:process";
import { fileURLToPath } from "node:url";

export const ENDPOINT = "https://api.exa.ai/search";
export const SEARCH_TYPE = "auto";
export const NUM_RESULTS = 10;
const REQUEST_TIMEOUT_MS = 60_000;
const API_KEY_PATTERN = /exa[-_][0-9A-Za-z_-]{20,}/gi;

export function usage() {
  return `Usage:
  node scripts/exa-phase-a-discovery.mjs discovery --company NVIDIA --confirmed-free-starter

This bounded Phase A4.1 diagnostic makes exactly one raw Exa Search request and
serves candidate metadata and highlights only in memory on 127.0.0.1. Press
Enter after manual inspection to stop the server.

Required environment variable: EXA_API_KEY

--confirmed-free-starter is an operator attestation that this key belongs to an
Exa Starter account with no payment method, paid usage, or auto-recharge enabled.`;
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
  if (options.mode !== "discovery") {
    throw new Error("Only the Phase A4.1 discovery mode is authorized.");
  }
  if (options.company?.trim().toLowerCase() !== "nvidia") {
    throw new Error("The Phase A4.1 discovery diagnostic is restricted to NVIDIA.");
  }
  if (!options.confirmedFreeStarter) {
    throw new Error("Refusing network access without --confirmed-free-starter.");
  }
  if (!apiKey) throw new Error("EXA_API_KEY is not set.");
}

export function redact(value, apiKey = "") {
  let redacted = String(value).replace(API_KEY_PATTERN, "[REDACTED_API_KEY]");
  if (apiKey) redacted = redacted.replaceAll(apiKey, "[REDACTED_API_KEY]");
  return redacted;
}

export function buildQuery(company, now = new Date()) {
  const today = now.toISOString().slice(0, 10);
  return `Find recent significant company-level developments involving ${company} as of ${today}. Prioritize major product or platform announcements, partnerships or customer deals, financial results, acquisitions or investments, leadership changes, geographic or capacity expansion, regulatory or legal developments, and major strategic initiatives. Prefer first-party company announcements and reputable independent reporting. Exclude routine repository or code maintenance, generic company profiles, stock-price commentary, evergreen pages, and duplicate coverage of the same event.`;
}

export function buildRequestBody(company, now = new Date()) {
  return {
    query: buildQuery(company, now),
    type: SEARCH_TYPE,
    numResults: NUM_RESULTS,
    contents: { highlights: true },
    stream: false,
  };
}

function classifyHttpFailure(status, tag) {
  if (status === 401 || status === 403 || tag === "INVALID_API_KEY") return "provider_auth";
  if (
    status === 402 ||
    ["NO_MORE_CREDITS", "API_KEY_BUDGET_EXCEEDED", "TEAM_BUDGET_EXCEEDED"].includes(tag)
  ) {
    return "provider_paid_required";
  }
  if (status === 429 || tag === "RATE_LIMIT_EXCEEDED") return "provider_quota";
  if (status >= 500) return "provider_unavailable";
  if (status === 400 || status === 422) return "formatting";
  return "unknown";
}

export async function requestCandidates(company, apiKey, fetchImpl = fetch) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const startedAt = performance.now();
  let response;
  let payload;
  let latencyMs;

  try {
    response = await fetchImpl(ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify(buildRequestBody(company)),
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
    throw new Error(
      `provider_unavailable: request failed; latency_ms=${Math.round(performance.now() - startedAt)}`,
    );
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const rawTag = typeof payload?.tag === "string" ? payload.tag : "";
    const tag = /^[A-Z0-9_]{1,80}$/.test(rawTag) ? rawTag : "UNKNOWN";
    throw new Error(
      `${classifyHttpFailure(response.status, tag)}: HTTP ${response.status}; tag=${tag}; latency_ms=${latencyMs}`,
    );
  }

  return parseSearchResponse(payload, latencyMs);
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function requireNonEmptyString(value, label) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`formatting: ${label} was not a non-empty string.`);
  }
}

function isHttpUrl(value) {
  if (typeof value !== "string" || value !== value.trim()) return false;
  try {
    return ["http:", "https:"].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}

function optionalString(value, label) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") {
    throw new Error(`formatting: ${label} was not a string or null.`);
  }
  return value.trim().length === 0 ? null : value;
}

function parseCandidate(value, index) {
  if (!isPlainObject(value)) {
    throw new Error(`formatting: results[${index}] was not an object.`);
  }
  requireNonEmptyString(value.url, `results[${index}].url`);
  if (!isHttpUrl(value.url)) {
    throw new Error(`formatting: results[${index}].url was not an exact http(s) URL.`);
  }

  const title = optionalString(value.title, `results[${index}].title`);
  const publishedDate = optionalString(value.publishedDate, `results[${index}].publishedDate`);
  const author = optionalString(value.author, `results[${index}].author`);
  let highlights = [];
  if (value.highlights !== undefined && value.highlights !== null) {
    if (!Array.isArray(value.highlights)) {
      throw new Error(`formatting: results[${index}].highlights was not an array.`);
    }
    highlights = value.highlights.filter((highlight, highlightIndex) => {
      if (typeof highlight !== "string") {
        throw new Error(
          `formatting: results[${index}].highlights[${highlightIndex}] was not a string.`,
        );
      }
      return highlight.trim().length > 0;
    });
  }

  return { rank: index + 1, title, url: value.url, publishedDate, author, highlights };
}

export function parseSearchResponse(payload, latencyMs = 0) {
  if (!isPlainObject(payload)) throw new Error("formatting: provider response was not an object.");
  if (!Array.isArray(payload.results)) throw new Error("formatting: provider results were absent.");

  const candidates = payload.results.map(parseCandidate);
  const estimatedCostUsd = payload?.costDollars?.total;
  return {
    candidates,
    latencyMs,
    estimatedCostUsd:
      typeof estimatedCostUsd === "number" && Number.isFinite(estimatedCostUsd)
        ? estimatedCostUsd
        : null,
  };
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function buildDisplayHtml(result) {
  const cards = result.candidates
    .map((candidate) => {
      const highlights = candidate.highlights.length
        ? `<ul>${candidate.highlights.map((highlight) => `<li>${escapeHtml(highlight)}</li>`).join("")}</ul>`
        : '<p class="absent">No highlights returned by Exa.</p>';
      const author = candidate.author
        ? `<span>Author: ${escapeHtml(candidate.author)}</span>`
        : "";
      return `<article>
        <p class="rank">Result ${candidate.rank}</p>
        <h2>${escapeHtml(candidate.title ?? "Untitled source")}</h2>
        <p><a href="${escapeHtml(candidate.url)}" target="_blank" rel="noreferrer">${escapeHtml(candidate.url)}</a></p>
        <p class="meta"><span>Provider publishedDate: ${escapeHtml(candidate.publishedDate ?? "unknown")}</span>${author}</p>
        <h3>Returned highlights</h3>
        ${highlights}
      </article>`;
    })
    .join("");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Exa Phase A4.1 transient NVIDIA discovery diagnostic</title>
  <style>
    :root { color-scheme: light; font-family: ui-sans-serif, system-ui, sans-serif; }
    body { margin: 0 auto; max-width: 980px; padding: 40px 24px; color: #17202a; background: #f5f6f2; }
    main { background: white; border: 1px solid #dfe2d8; border-radius: 16px; padding: 30px; box-shadow: 0 10px 30px #0000000b; }
    article { border-top: 1px solid #e3e5de; margin-top: 28px; padding-top: 22px; }
    h2 { margin: 4px 0 10px; font-size: 1.15rem; }
    h3 { font-size: .95rem; margin-bottom: 8px; }
    a { color: #175c99; overflow-wrap: anywhere; }
    .rank { color: #62685e; font-size: .82rem; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; }
    .meta { color: #62685e; display: flex; flex-wrap: wrap; gap: 8px 20px; font-size: .85rem; }
    .notice, .absent { color: #62685e; }
    .checklist { background: #f7f8f4; border-radius: 10px; margin-top: 30px; padding: 16px 20px; }
  </style>
</head>
<body>
  <main>
    <p class="notice">Transient in-memory Phase A4.1 discovery diagnostic. Nothing on this page is persisted by the script.</p>
    <h1>NVIDIA raw discovery candidates</h1>
    <p class="notice">Provider publishedDate values are estimated discovery metadata, not proof. Verify candidate dates from the returned source pages.</p>
    <section aria-label="Raw discovery results">${cards || '<p class="absent">No candidates returned by Exa.</p>'}</section>
    <section class="checklist">
      <strong>Manual experiment question</strong>
      <p>Does this raw result set contain at least three distinct, useful, materially supported NVIDIA company-level events within the 180-day fallback window? Inspect plausible candidates only; do not search for replacement sources.</p>
    </section>
  </main>
</body>
</html>`;
}

export function formatSummary(result) {
  const datedResultCount = result.candidates.filter(({ publishedDate }) => publishedDate).length;
  const highlightResultCount = result.candidates.filter(({ highlights }) => highlights.length > 0).length;
  const uniqueDomainCount = new Set(
    result.candidates.map(({ url }) => new URL(url).hostname.toLowerCase()),
  ).size;

  return [
    `endpoint=${ENDPOINT}`,
    `search_type=${SEARCH_TYPE}`,
    `latency_ms=${result.latencyMs}`,
    `provider_result_count=${result.candidates.length}`,
    `dated_result_count=${datedResultCount}`,
    `highlight_result_count=${highlightResultCount}`,
    `unique_domain_count=${uniqueDomainCount}`,
    `estimated_cost_usd=${result.estimatedCostUsd ?? "not_returned"}`,
  ].join("\n");
}

async function serveTransientDisplay(html) {
  const server = http.createServer((request, response) => {
    if (request.method !== "GET" || request.url !== "/") {
      response.writeHead(404, { "Cache-Control": "no-store" });
      response.end("Not found");
      return;
    }
    response.writeHead(200, {
      "Cache-Control": "no-store, max-age=0",
      "Content-Type": "text/html; charset=utf-8",
      Pragma: "no-cache",
    });
    response.end(html);
  });

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });

  const address = server.address();
  console.log(`transient_display_url=http://127.0.0.1:${address.port}/`);
  console.log("Press Enter after manual inspection to stop the in-memory display.");

  await new Promise((resolve) => {
    const finish = () => resolve();
    process.stdin.setEncoding("utf8");
    process.stdin.once("data", finish);
    process.once("SIGINT", finish);
    process.stdin.resume();
  });

  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
  process.stdin.pause();
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
    const result = await requestCandidates(options.company.trim(), apiKey);
    console.log(formatSummary(result));
    await serveTransientDisplay(buildDisplayHtml(result));
  } catch (error) {
    const safeMessage = redact(error?.message ?? error, process.env.EXA_API_KEY ?? "");
    console.error(`Phase A4.1 diagnostic failed: ${safeMessage}`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) await main();
