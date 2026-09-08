#!/usr/bin/env node

import http from "node:http";
import process from "node:process";
import { fileURLToPath } from "node:url";

export const ENDPOINT = "https://api.exa.ai/search";
export const SEARCH_TYPE = "auto";
const REQUEST_TIMEOUT_MS = 60_000;
const API_KEY_PATTERN = /exa[-_][0-9A-Za-z_-]{20,}/gi;

export const OUTPUT_SCHEMA = {
  type: "object",
  required: ["resolvedCompanyName", "officialDomain", "description", "signals"],
  properties: {
    resolvedCompanyName: {
      type: "string",
      description: "The unambiguous legal or commonly accepted full company name.",
    },
    officialDomain: {
      type: "string",
      description: "The company's official domain only, without a path.",
    },
    description: {
      type: "string",
      description: "An accurate, directly displayable company description in exactly 2 or 3 sentences.",
    },
    signals: {
      type: "array",
      items: {
        type: "object",
        required: ["title", "date", "summary"],
        properties: {
          title: { type: "string" },
          date: {
            type: "string",
            description: "The event date in YYYY-MM-DD format.",
          },
          summary: {
            type: "string",
            description: "Concise, directly displayable context for the event.",
          },
        },
      },
    },
  },
};

export function usage() {
  return `Usage:
  node scripts/exa-phase-a.mjs smoke --company NVIDIA --confirmed-free-starter

This bounded Phase A3 diagnostic makes exactly one Exa Search request and serves
the validated snapshot only in memory on 127.0.0.1. Press Enter after manual
inspection to stop the server.

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
  if (options.mode !== "smoke") {
    throw new Error("Only the Phase A3 smoke mode is authorized.");
  }
  if (options.company?.trim().toLowerCase() !== "nvidia") {
    throw new Error("The Phase A3 smoke is restricted to NVIDIA.");
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

function buildQuery(company, now = new Date()) {
  const today = now.toISOString().slice(0, 10);
  return `Build a directly displayable Company Snapshot for the company input ${company} as of ${today}.

Resolve the input unambiguously. Give an accurate 2-3 sentence description of what the company does. Find exactly three useful, distinct, real company events. Prefer events from the last 90 days, then the last 180 days; use older material only when necessary and label it "Older fallback" in the signal summary. Do not turn multiple reports of one underlying event into multiple signals.

Use YYYY-MM-DD event dates. Do not guess when the input is ambiguous or evidence is insufficient. Ensure the company identity, description, and each signal are supported by evidence so Exa can return field-level grounding.`;
}

export function buildRequestBody(company, now = new Date()) {
  return {
    query: buildQuery(company, now),
    type: SEARCH_TYPE,
    numResults: 10,
    outputSchema: OUTPUT_SCHEMA,
    systemPrompt:
      "Prefer recent primary sources from the resolved company and reputable independent reporting. Resolve the supplied input unambiguously and return its official domain. Deduplicate underlying events and return exactly three distinct, defensible signals only where evidence exists. Return exactly the requested schema.",
    stream: false,
  };
}

function classifyHttpFailure(status, tag) {
  if (status === 401 || status === 403 || tag === "INVALID_API_KEY") return "provider_auth";
  if (status === 402 || ["NO_MORE_CREDITS", "API_KEY_BUDGET_EXCEEDED", "TEAM_BUDGET_EXCEEDED"].includes(tag)) {
    return "provider_paid_required";
  }
  if (status === 429 || tag === "RATE_LIMIT_EXCEEDED") return "provider_quota";
  if (status >= 500) return "provider_unavailable";
  if (status === 400) return "formatting";
  return "unknown";
}

export async function requestSnapshot(company, apiKey, fetchImpl = fetch) {
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

function requireExactKeys(value, expected, label) {
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (actual.length !== wanted.length || actual.some((key, index) => key !== wanted[index])) {
    throw new Error(`formatting: ${label} did not contain exactly ${wanted.join(", ")}.`);
  }
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

function sentenceCount(value) {
  const segmenter = new Intl.Segmenter("en", { granularity: "sentence" });
  return [...segmenter.segment(value)].filter(({ segment }) => segment.trim()).length;
}

function parseDateOnly(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.valueOf()) || date.toISOString().slice(0, 10) !== value ? null : date;
}

export function parseSearchResponse(payload, latencyMs = 0) {
  if (!isPlainObject(payload)) throw new Error("formatting: provider response was not an object.");
  if (!Array.isArray(payload.results)) throw new Error("formatting: provider results were absent.");
  if (!isPlainObject(payload.output) || !isPlainObject(payload.output.content)) {
    throw new Error("formatting: synthesized object output was absent.");
  }

  return {
    snapshot: payload.output.content,
    results: payload.results,
    grounding: payload.output.grounding,
    latencyMs,
    estimatedCostUsd:
      typeof payload?.costDollars?.total === "number" ? payload.costDollars.total : null,
  };
}

function validateGrounding(grounding) {
  if (!Array.isArray(grounding) || grounding.length === 0) {
    throw new Error("citation_missing: provider grounding was absent.");
  }

  const entries = grounding.map((entry, entryIndex) => {
    if (!isPlainObject(entry)) {
      throw new Error(`formatting: grounding[${entryIndex}] was not an object.`);
    }
    requireExactKeys(entry, ["field", "citations", "confidence"], `grounding[${entryIndex}]`);
    requireNonEmptyString(entry.field, `grounding[${entryIndex}].field`);
    if (!Array.isArray(entry.citations)) {
      throw new Error(`formatting: grounding[${entryIndex}].citations was not an array.`);
    }
    if (!["low", "medium", "high"].includes(entry.confidence)) {
      throw new Error(`formatting: grounding[${entryIndex}].confidence was invalid.`);
    }

    const citations = entry.citations.map((citation, citationIndex) => {
      if (!isPlainObject(citation)) {
        throw new Error(
          `formatting: grounding[${entryIndex}].citations[${citationIndex}] was not an object.`,
        );
      }
      requireExactKeys(
        citation,
        ["url", "title"],
        `grounding[${entryIndex}].citations[${citationIndex}]`,
      );
      requireNonEmptyString(
        citation.url,
        `grounding[${entryIndex}].citations[${citationIndex}].url`,
      );
      if (typeof citation.title !== "string") {
        throw new Error(
          `formatting: grounding[${entryIndex}].citations[${citationIndex}].title was not a string.`,
        );
      }
      if (!isHttpUrl(citation.url)) {
        throw new Error(
          `citation_missing: grounding[${entryIndex}].citations[${citationIndex}].url was not http(s).`,
        );
      }
      return { url: citation.url, title: citation.title.trim() ? citation.title : "Source" };
    });

    return { field: entry.field, citations };
  });

  const citationsFor = (...fields) => {
    const seen = new Set();
    return entries
      .filter((entry) => fields.includes(entry.field))
      .flatMap((entry) => entry.citations)
      .filter((citation) => {
        if (seen.has(citation.url)) return false;
        seen.add(citation.url);
        return true;
      });
  };

  const requiredScalarFields = ["resolvedCompanyName", "officialDomain", "description"];
  for (const field of requiredScalarFields) {
    if (citationsFor(field).length === 0) {
      throw new Error(`citation_missing: ${field} had no provider grounding citation.`);
    }
  }

  const signalSources = [0, 1, 2].map((index) => {
    const signalField = `signals[${index}]`;
    const objectSources = citationsFor(signalField);
    if (objectSources.length > 0) return objectSources;

    const childFields = ["title", "date", "summary"].map(
      (childField) => `${signalField}.${childField}`,
    );
    for (const childField of childFields) {
      if (citationsFor(childField).length === 0) {
        throw new Error(`citation_missing: ${childField} had no provider grounding citation.`);
      }
    }
    return citationsFor(...childFields);
  });
  const allSourceUrls = new Set(entries.flatMap((entry) => entry.citations.map(({ url }) => url)));

  return { groundingSourceCount: allSourceUrls.size, signalSources };
}

export function validateSnapshot(result, now = new Date()) {
  const { snapshot } = result;
  requireExactKeys(
    snapshot,
    ["resolvedCompanyName", "officialDomain", "description", "signals"],
    "snapshot",
  );
  requireNonEmptyString(snapshot.resolvedCompanyName, "resolvedCompanyName");
  requireNonEmptyString(snapshot.officialDomain, "officialDomain");
  requireNonEmptyString(snapshot.description, "description");

  if (snapshot.resolvedCompanyName.trim().toLowerCase() !== "nvidia corporation") {
    throw new Error("targeting: NVIDIA did not resolve to NVIDIA Corporation.");
  }
  if (!/^(?:www\.)?nvidia\.com$/i.test(snapshot.officialDomain.trim())) {
    throw new Error("targeting: officialDomain was not nvidia.com.");
  }
  const descriptions = sentenceCount(snapshot.description);
  if (descriptions < 2 || descriptions > 3) {
    throw new Error(`description: expected 2-3 sentences; received ${descriptions}.`);
  }
  if (!Array.isArray(snapshot.signals) || snapshot.signals.length !== 3) {
    throw new Error("signal_count: expected exactly three signals.");
  }

  const normalizedTitles = new Set();
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());

  for (const [index, signal] of snapshot.signals.entries()) {
    if (!isPlainObject(signal)) throw new Error(`formatting: signals[${index}] was not an object.`);
    requireExactKeys(signal, ["title", "date", "summary"], `signals[${index}]`);
    for (const field of ["title", "date", "summary"]) {
      requireNonEmptyString(signal[field], `signals[${index}].${field}`);
    }

    const eventDate = parseDateOnly(signal.date);
    if (!eventDate) throw new Error(`signal_recency: signals[${index}].date was not YYYY-MM-DD.`);
    const ageDays = Math.floor((today - eventDate.valueOf()) / 86_400_000);
    if (ageDays < 0) throw new Error(`signal_recency: signals[${index}] used a future date.`);
    if (ageDays > 180 && !/older fallback/i.test(`${signal.title} ${signal.summary}`)) {
      throw new Error(`signal_recency: signals[${index}] was older than 180 days without an Older fallback label.`);
    }

    const normalizedTitle = signal.title.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    if (normalizedTitles.has(normalizedTitle)) {
      throw new Error("signal_duplication: duplicate signal titles were returned.");
    }
    normalizedTitles.add(normalizedTitle);
  }

  return validateGrounding(result.grounding);
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
  const snapshot = result.snapshot;
  const integrity = validateGrounding(result.grounding);
  const signalCards = snapshot.signals
    .map((signal, index) => {
      const sourceLinks = integrity.signalSources[index]
        .map(
          (source) =>
            `<li><a href="${escapeHtml(source.url)}" target="_blank" rel="noreferrer">${escapeHtml(source.title)}</a></li>`,
        )
        .join("");
      return `<article>
        <p class="eyebrow">Signal ${index + 1} · ${escapeHtml(signal.date)}</p>
        <h2>${escapeHtml(signal.title)}</h2>
        <p>${escapeHtml(signal.summary)}</p>
        <p class="source">Exa grounding evidence:</p>
        <ul>${sourceLinks}</ul>
      </article>`;
    })
    .join("");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Exa Phase A3 transient NVIDIA diagnostic</title>
  <style>
    :root { color-scheme: light; font-family: ui-sans-serif, system-ui, sans-serif; }
    body { margin: 0 auto; max-width: 880px; padding: 40px 24px; color: #17202a; background: #f5f6f2; }
    main { background: white; border: 1px solid #dfe2d8; border-radius: 16px; padding: 30px; box-shadow: 0 10px 30px #0000000b; }
    h1 { margin-bottom: 4px; }
    h2 { margin: 4px 0 10px; font-size: 1.15rem; }
    article { border-top: 1px solid #e3e5de; margin-top: 24px; padding-top: 20px; }
    a { color: #175c99; overflow-wrap: anywhere; }
    .domain, .eyebrow, .meta, .notice { color: #62685e; }
    .eyebrow { font-size: .82rem; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; }
    .meta, .notice { font-size: .85rem; }
    .checklist { background: #f7f8f4; border-radius: 10px; margin-top: 28px; padding: 16px 20px; }
  </style>
</head>
<body>
  <main>
    <p class="notice">Transient in-memory Phase A3 diagnostic. Nothing on this page is persisted by the script.</p>
    <h1>${escapeHtml(snapshot.resolvedCompanyName)}</h1>
    <p class="domain">${escapeHtml(snapshot.officialDomain)}</p>
    <p>${escapeHtml(snapshot.description)}</p>
    <section aria-label="Recent signals">${signalCards}</section>
    <section class="checklist">
      <strong>Manual gate</strong>
      <p>Open every grounding link. Confirm company identity, event and date support, source quality, recency, and three distinct underlying events. Record blocked or inaccessible pages honestly.</p>
    </section>
  </main>
</body>
</html>`;
}

export function formatSummary(result, integrity) {
  return [
    `endpoint=${ENDPOINT}`,
    `search_type=${SEARCH_TYPE}`,
    `latency_ms=${result.latencyMs}`,
    `provider_result_count=${result.results.length}`,
    `grounding_entry_count=${result.grounding.length}`,
    `grounding_source_count=${integrity.groundingSourceCount}`,
    `signal_count=${result.snapshot.signals.length}`,
    `signal_source_count=${integrity.signalSources.reduce((count, sources) => count + sources.length, 0)}`,
    "grounding_integrity=pass",
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
    const result = await requestSnapshot(options.company.trim(), apiKey);
    const integrity = validateSnapshot(result);
    console.log(formatSummary(result, integrity));
    await serveTransientDisplay(buildDisplayHtml(result));
  } catch (error) {
    const safeMessage = redact(error?.message ?? error, process.env.EXA_API_KEY ?? "");
    console.error(`Phase A3 diagnostic failed: ${safeMessage}`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) await main();
