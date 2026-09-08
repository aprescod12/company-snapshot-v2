#!/usr/bin/env node

import { Buffer } from "node:buffer";
import http from "node:http";
import process from "node:process";
import { TextDecoder } from "node:util";

const MODEL = "gemini-2.5-flash";
const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/interactions";
const API_KEY_PATTERN = /(?:AIza[0-9A-Za-z_-]{20,}|AQ\.[0-9A-Za-z_-]{20,})/g;
const REQUEST_TIMEOUT_MS = 50_000;

export function usage() {
  return `Usage:
  node scripts/gemini-phase-a.mjs smoke --company NVIDIA --confirmed-unbilled
  node scripts/gemini-phase-a.mjs benchmark --company <input> --confirmed-unbilled --confirmed-a1-pass
  node scripts/gemini-phase-a.mjs repeat --company <input> --confirmed-unbilled --confirmed-main-pass

Each invocation makes at most one Interactions API request with Interaction
storage disabled and serves the complete diagnostic only in memory on
127.0.0.1. Press Enter after manual inspection to stop the server.

Required environment variable: GEMINI_API_KEY

The confirmation flags are operator attestations. Do not pass --confirmed-unbilled
unless the key's project has no active billing account.`;
}

export function parseArgs(argv) {
  if (argv.includes("--help") || argv.includes("-h")) return { help: true };

  const [mode, ...rest] = argv;
  const options = {
    mode,
    company: undefined,
    confirmedUnbilled: false,
    confirmedA1Pass: false,
    confirmedMainPass: false,
  };

  for (let index = 0; index < rest.length; index += 1) {
    const argument = rest[index];
    if (argument === "--company") {
      options.company = rest[index + 1];
      index += 1;
    } else if (argument === "--confirmed-unbilled") {
      options.confirmedUnbilled = true;
    } else if (argument === "--confirmed-a1-pass") {
      options.confirmedA1Pass = true;
    } else if (argument === "--confirmed-main-pass") {
      options.confirmedMainPass = true;
    } else {
      throw new Error(`Unknown argument: ${argument}`);
    }
  }

  return options;
}

export function validateOptions(options, apiKey) {
  if (!["smoke", "benchmark", "repeat"].includes(options.mode)) {
    throw new Error("Mode must be smoke, benchmark, or repeat.");
  }
  if (!options.company?.trim()) throw new Error("--company is required.");
  if (options.mode === "smoke" && options.company.trim().toLowerCase() !== "nvidia") {
    throw new Error("The Phase A smoke test is restricted to NVIDIA.");
  }
  if (!options.confirmedUnbilled) {
    throw new Error("Refusing network access without --confirmed-unbilled.");
  }
  if (options.mode === "benchmark" && !options.confirmedA1Pass) {
    throw new Error("Refusing benchmark access without --confirmed-a1-pass.");
  }
  if (options.mode === "repeat" && !options.confirmedMainPass) {
    throw new Error("Refusing repeat access without --confirmed-main-pass.");
  }
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set.");
}

export function redact(value, apiKey = "") {
  let redacted = String(value).replace(API_KEY_PATTERN, "[REDACTED_API_KEY]");
  if (apiKey) redacted = redacted.replaceAll(apiKey, "[REDACTED_API_KEY]");
  return redacted;
}

function buildPrompt(company) {
  const today = new Date().toISOString().slice(0, 10);
  return `You are producing the complete, directly displayable Company Snapshot requested by a take-home assessment.

Current date: ${today}
Company input: ${company}

Use Google Search grounding. Return only the user-facing snapshot, with this exact section order:

# <resolved company name>
Official identity: <unambiguous company identity>
Official website: <plain domain text, not a URL>

## What they do
<A clear, accurate description in exactly 2 or 3 sentences.>

## Recent signals
1. **<signal title>** — <YYYY-MM-DD, or Date unknown> — <concise context>
2. **<signal title>** — <YYYY-MM-DD, or Date unknown> — <concise context>
3. **<signal title>** — <YYYY-MM-DD, or Date unknown> — <concise context>

Signals must be real, useful, recent, and about three distinct underlying events. Prefer events within 90 days, then 180 days. Clearly label an older fallback. Do not count multiple articles about one event more than once. Do not author or print source URLs; the application will display only links returned by grounding annotations.

If the input is genuinely ambiguous, do not guess: return a concise clarification request instead of a snapshot. If three defensible recent signals do not exist, return an honest limited-evidence result instead of inventing, duplicating, or disguising evergreen material as news.`;
}

function classifyHttpFailure(status) {
  if (status === 401 || status === 403) return "provider_auth";
  if (status === 404) return "model_unavailable";
  if (status === 429) return "provider_quota";
  if (status >= 500) return "provider_unavailable";
  return "unknown";
}

function asArray(value) {
  if (Array.isArray(value)) return value;
  return value == null ? [] : [value];
}

export function parseInteraction(payload, latencyMs = 0) {
  const steps = Array.isArray(payload?.steps) ? payload.steps : [];
  const searchCalls = steps.filter((step) => step?.type === "google_search_call");
  const searchResults = steps.filter((step) => step?.type === "google_search_result");
  const searchQueries = searchCalls
    .flatMap((step) => asArray(step?.arguments?.queries))
    .filter((query) => typeof query === "string" && query.trim().length > 0);
  const searchSuggestions = searchResults
    .flatMap((step) => (Array.isArray(step?.result) ? step.result : []))
    .map((item) => item?.search_suggestions)
    .filter((suggestion) => typeof suggestion === "string" && suggestion.trim().length > 0);
  const modelOutputs = steps.filter((step) => step?.type === "model_output");
  const modelOutput = modelOutputs.at(-1);
  const contentBlocks = (Array.isArray(modelOutput?.content) ? modelOutput.content : []).filter(
    (block) => block?.type === "text" && typeof block?.text === "string",
  );
  const text = contentBlocks.map((block) => block.text).join("");
  const citations = contentBlocks.flatMap((block, blockIndex) =>
    (Array.isArray(block?.annotations) ? block.annotations : [])
      .filter((annotation) => annotation?.type === "url_citation")
      .map((annotation) => ({ ...annotation, blockIndex, blockText: block.text })),
  );

  if (!text.trim()) {
    throw new Error("formatting: interaction contained no displayable model output.");
  }

  return {
    status: payload?.status,
    text,
    searchCalls,
    searchResults,
    modelOutputs,
    searchQueries,
    searchSuggestions,
    citations,
    latencyMs,
  };
}

export async function requestSnapshot(company, apiKey, fetchImpl = fetch) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const startedAt = performance.now();

  try {
    const response = await fetchImpl(ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        model: MODEL,
        input: buildPrompt(company),
        tools: [{ type: "google_search" }],
        store: false,
      }),
      signal: controller.signal,
    });
    const latencyMs = Math.round(performance.now() - startedAt);
    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      const classification = classifyHttpFailure(response.status);
      const detail = payload?.error?.message ?? `HTTP ${response.status}`;
      throw new Error(`${classification}: ${detail}`);
    }

    return parseInteraction(payload, latencyMs);
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error(`latency: request exceeded ${REQUEST_TIMEOUT_MS / 1000} seconds.`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function safeCitationMappings(result) {
  return result.citations.flatMap((citation, citationIndex) => {
    let parsedUrl;
    try {
      parsedUrl = new URL(citation?.url);
      if (!["http:", "https:"].includes(parsedUrl.protocol)) return [];
    } catch {
      return [];
    }

    const startIndex = citation?.start_index;
    const endIndex = citation?.end_index;
    const textBytes = Buffer.from(citation.blockText, "utf8");
    if (
      !Number.isInteger(startIndex) ||
      !Number.isInteger(endIndex) ||
      startIndex < 0 ||
      endIndex <= startIndex ||
      endIndex > textBytes.length
    ) {
      return [];
    }

    let segmentText;
    try {
      segmentText = new TextDecoder("utf-8", { fatal: true }).decode(
        textBytes.subarray(startIndex, endIndex),
      );
    } catch {
      return [];
    }
    if (segmentText.trim().length === 0) return [];

    return [{
      citationIndex,
      segmentText,
      url: citation.url,
      title:
        typeof citation.title === "string" && citation.title.trim().length > 0
          ? citation.title
          : "Source",
    }];
  });
}

export function buildDisplayHtml(result) {
  const mappings = safeCitationMappings(result);
  const supportItems = mappings
    .map(
      ({ citationIndex, segmentText, url, title }) =>
        `<li><strong>Support ${citationIndex + 1}</strong><blockquote>${escapeHtml(segmentText)}</blockquote><a href="${escapeHtml(url)}" target="_blank" rel="noreferrer">${escapeHtml(title)}</a></li>`,
    )
    .join("");
  const suggestions = result.searchSuggestions.join("\n");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Gemini Phase A transient display diagnostic</title>
  <style>
    :root { color-scheme: light; font-family: ui-sans-serif, system-ui, sans-serif; }
    body { margin: 0 auto; max-width: 860px; padding: 40px 24px; color: #17202a; background: #f7f7f4; }
    main { background: white; border: 1px solid #deded8; border-radius: 14px; padding: 28px; box-shadow: 0 8px 28px #0000000a; }
    h1 { margin-top: 0; font-size: 1rem; color: #62625c; }
    pre { white-space: pre-wrap; overflow-wrap: anywhere; font: inherit; line-height: 1.55; }
    blockquote { border-left: 3px solid #deded8; margin: 10px 0; padding-left: 12px; }
    aside { border-top: 1px solid #deded8; margin-top: 24px; padding-top: 20px; }
    li { margin: 12px 0; }
    a { color: #1456a0; }
    .suggestions { margin-top: 24px; }
    .notice { color: #62625c; font-size: .875rem; }
  </style>
</head>
<body>
  <main>
    <h1>Transient Grounded Result</h1>
    <pre>${escapeHtml(result.text)}</pre>
    <div class="suggestions" aria-label="Google Search Suggestions">${suggestions}</div>
    <aside aria-label="Citation support mappings">
      <h2>Citation support mappings</h2>
      <p class="notice">Open links manually for source support review. This diagnostic does not fetch or track them.</p>
      <ol>${supportItems}</ol>
    </aside>
  </main>
</body>
</html>`;
}

export function formatSummary(result) {
  const mappings = safeCitationMappings(result);
  const sourceCount = new Set(mappings.map((mapping) => mapping.url)).size;
  return [
    `model=${MODEL}`,
    `interaction_status=${result.status ?? "unknown"}`,
    `latency_ms=${result.latencyMs}`,
    `search_executed=${result.searchQueries.length > 0}`,
    `search_call_count=${result.searchCalls.length}`,
    `search_query_count=${result.searchQueries.length}`,
    `search_result_count=${result.searchResults.length}`,
    `search_suggestions_count=${result.searchSuggestions.length}`,
    `source_count=${sourceCount}`,
    `citation_count=${result.citations.length}`,
    `valid_support_mapping_count=${mappings.length}`,
  ].join("\n");
}

export function validateTechnicalGrounding(result) {
  const mappings = safeCitationMappings(result);
  const callIds = new Set(result.searchCalls.map((step) => step?.id));

  if (result.status !== "completed") {
    throw new Error(`provider_unavailable: interaction status was ${result.status ?? "absent"}.`);
  }
  if (result.modelOutputs.length !== 1) {
    throw new Error("formatting: interaction did not contain exactly one model output.");
  }
  if (
    result.searchCalls.length === 0 ||
    result.searchQueries.length === 0 ||
    result.searchCalls.some(
      (step) =>
        typeof step?.id !== "string" ||
        step.id.length === 0 ||
        !Array.isArray(step?.arguments?.queries) ||
        step.arguments.queries.length === 0 ||
        step.arguments.queries.some((query) => typeof query !== "string"),
    )
  ) {
    throw new Error("search_not_executed: google_search_call contained no queries.");
  }
  if (
    result.searchResults.length === 0 ||
    result.searchSuggestions.length === 0 ||
    result.searchResults.some(
      (step) =>
        step?.is_error === true ||
        typeof step?.call_id !== "string" ||
        step.call_id.length === 0 ||
        !callIds.has(step.call_id) ||
        !Array.isArray(step?.result) ||
        step.result.length === 0 ||
        step.result.some(
          (item) =>
            typeof item?.search_suggestions !== "string" ||
            item.search_suggestions.trim().length === 0,
        ),
    ) ||
    result.searchCalls.some(
      (call) => !result.searchResults.some((searchResult) => searchResult?.call_id === call.id),
    )
  ) {
    throw new Error("citation_missing: google_search_result contained no Search Suggestions.");
  }
  if (result.citations.length === 0) {
    throw new Error("citation_missing: model output contained no URL citations.");
  }
  if (mappings.length !== result.citations.length) {
    throw new Error("citation_missing: a URL citation lacked a valid source or byte span.");
  }
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
    const apiKey = process.env.GEMINI_API_KEY ?? "";
    validateOptions(options, apiKey);
    const result = await requestSnapshot(options.company.trim(), apiKey);
    console.log(formatSummary(result));
    validateTechnicalGrounding(result);
    await serveTransientDisplay(buildDisplayHtml(result));
  } catch (error) {
    const safeMessage = redact(error?.message ?? error, process.env.GEMINI_API_KEY ?? "");
    console.error(`Phase A diagnostic failed: ${safeMessage}`);
    process.exitCode = 1;
  }
}

const invokedDirectly = process.argv[1] && new URL(import.meta.url).pathname === process.argv[1];
if (invokedDirectly) await main();
