export const EXA_SEARCH_ENDPOINT = "https://api.exa.ai/search";
export const EXA_SEARCH_TYPE = "auto";
export const EXA_RESULT_LIMIT = 10;
export const DEFAULT_TIMEOUT_MS = 60_000;

export const IDENTITY_OUTPUT_SCHEMA = Object.freeze({
  type: "object",
  required: ["resolvedCompanyName", "officialDomain", "ambiguous"],
  properties: {
    resolvedCompanyName: { type: "string" },
    officialDomain: { type: "string" },
    ambiguous: { type: "boolean" },
  },
});

export class BroadDiscoveryError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "BroadDiscoveryError";
    this.code = code;
  }
}

function providerFormat(message) {
  return new BroadDiscoveryError("provider_format", message);
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isExactHttpUrl(value) {
  if (typeof value !== "string" || value !== value.trim()) return false;
  try {
    return ["http:", "https:"].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}

function optionalString(value, label) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") throw providerFormat(`${label} was not a string or null.`);
  return value.trim().length === 0 ? null : value;
}

function requireExactKeys(value, expected, label) {
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (actual.length !== wanted.length || actual.some((key, index) => key !== wanted[index])) {
    throw providerFormat(`${label} did not contain exactly ${wanted.join(", ")}.`);
  }
}

function parseCandidate(value, index) {
  if (!isPlainObject(value)) throw providerFormat(`results[${index}] was not an object.`);
  if (typeof value.url !== "string" || value.url.trim().length === 0 || !isExactHttpUrl(value.url)) {
    throw providerFormat(`results[${index}].url was not an exact non-empty http(s) URL.`);
  }

  let highlights = [];
  if (value.highlights !== undefined && value.highlights !== null) {
    if (!Array.isArray(value.highlights)) throw providerFormat(`results[${index}].highlights was not an array.`);
    highlights = value.highlights.filter((highlight, highlightIndex) => {
      if (typeof highlight !== "string") {
        throw providerFormat(`results[${index}].highlights[${highlightIndex}] was not a string.`);
      }
      return highlight.trim().length > 0;
    });
  }

  return {
    rank: index + 1,
    title: optionalString(value.title, `results[${index}].title`),
    url: value.url,
    publishedDate: optionalString(value.publishedDate, `results[${index}].publishedDate`),
    author: optionalString(value.author, `results[${index}].author`),
    highlights,
  };
}

export function buildBroadQuery(targetValue, now = new Date()) {
  if (typeof targetValue !== "string" || targetValue.trim().length === 0) {
    throw new TypeError("targetValue must be a non-empty string.");
  }
  if (!(now instanceof Date) || !Number.isFinite(now.getTime())) throw new TypeError("now must be valid.");

  const today = now.toISOString().slice(0, 10);
  return `Find recent significant company-level developments involving ${targetValue} as of ${today}. Prioritize major product or platform announcements, partnerships or customer deals, financial results, acquisitions or investments, leadership changes, geographic or capacity expansion, regulatory or legal developments, and major strategic initiatives. Prefer first-party company announcements and reputable independent reporting. Exclude routine repository or code maintenance, generic company profiles, stock-price commentary, evergreen pages, and duplicate coverage of the same event.`;
}

export function buildBroadRequestBody(targetValue, now = new Date(), { includeDomains } = {}) {
  const body = {
    query: buildBroadQuery(targetValue, now),
    type: EXA_SEARCH_TYPE,
    numResults: EXA_RESULT_LIMIT,
    contents: { highlights: true },
    outputSchema: IDENTITY_OUTPUT_SCHEMA,
    stream: false,
  };
  if (includeDomains !== undefined) body.includeDomains = includeDomains;
  return body;
}

export function extractIdentityEvidenceUrls(grounding, field) {
  if (!Array.isArray(grounding)) return [];
  const urls = [];
  for (const [entryIndex, entry] of grounding.entries()) {
    if (!isPlainObject(entry)) throw providerFormat(`grounding[${entryIndex}] was not an object.`);
    requireExactKeys(entry, ["field", "citations", "confidence"], `grounding[${entryIndex}]`);
    if (typeof entry.field !== "string" || typeof entry.confidence !== "string") {
      throw providerFormat(`grounding[${entryIndex}] had an invalid field or confidence.`);
    }
    if (!Array.isArray(entry.citations)) throw providerFormat(`grounding[${entryIndex}].citations was not an array.`);
    if (entry.field !== field) continue;
    for (const citation of entry.citations) {
      if (!isPlainObject(citation)) throw providerFormat(`grounding[${entryIndex}] contained a non-object citation.`);
      requireExactKeys(citation, ["url", "title"], `grounding[${entryIndex}] citation`);
      if (typeof citation.title !== "string") throw providerFormat(`grounding[${entryIndex}] citation title was not a string.`);
      if (isExactHttpUrl(citation.url) && !urls.includes(citation.url)) urls.push(citation.url);
    }
  }
  return urls;
}

export function parseBroadDiscoveryPayload(payload, latencyMs = 0) {
  if (!isPlainObject(payload)) throw providerFormat("provider response was not an object.");
  if (!Array.isArray(payload.results)) throw providerFormat("provider results were absent.");
  if (!isPlainObject(payload.output) || !isPlainObject(payload.output.content)) {
    throw providerFormat("synthesized identity output was absent.");
  }

  const content = payload.output.content;
  const identity = { ...content };
  const keysWithoutAmbiguity = ["officialDomain", "resolvedCompanyName"];
  const actualKeys = Object.keys(content).sort();
  const missingAmbiguityOnly =
    actualKeys.length === keysWithoutAmbiguity.length &&
    actualKeys.every((key, index) => key === keysWithoutAmbiguity[index]);
  if (!missingAmbiguityOnly) {
    requireExactKeys(identity, ["resolvedCompanyName", "officialDomain", "ambiguous"], "output.content");
  }
  if (
    typeof identity.resolvedCompanyName !== "string" ||
    typeof identity.officialDomain !== "string" ||
    (!missingAmbiguityOnly && typeof identity.ambiguous !== "boolean")
  ) {
    throw providerFormat("synthesized identity output did not match the approved schema.");
  }

  const grounding = payload.output.grounding;
  if (identity.ambiguous === false && !Array.isArray(grounding)) {
    throw providerFormat("unambiguous identity output lacked grounding.");
  }
  const resolvedCompanyNameUrls = extractIdentityEvidenceUrls(grounding, "resolvedCompanyName");
  const officialDomainUrls = extractIdentityEvidenceUrls(grounding, "officialDomain");
  if (identity.ambiguous === false && (!resolvedCompanyNameUrls.length || !officialDomainUrls.length)) {
    throw providerFormat("unambiguous identity output lacked field-specific grounding.");
  }
  const estimatedCostUsd = payload?.costDollars?.total;

  return {
    candidates: payload.results.map(parseCandidate),
    identity,
    groundingByField: { resolvedCompanyName: resolvedCompanyNameUrls, officialDomain: officialDomainUrls },
    evidenceUrls: [...new Set([...resolvedCompanyNameUrls, ...officialDomainUrls])],
    latencyMs,
    estimatedCostUsd:
      typeof estimatedCostUsd === "number" && Number.isFinite(estimatedCostUsd)
        ? estimatedCostUsd
        : null,
  };
}

function classifyHttpFailure(status, tag) {
  if (status === 401 || status === 403 || tag === "INVALID_API_KEY") return "provider_auth";
  if (status === 402 || ["NO_MORE_CREDITS", "API_KEY_BUDGET_EXCEEDED", "TEAM_BUDGET_EXCEEDED"].includes(tag)) {
    return "provider_paid_required";
  }
  if (status === 429 || tag === "RATE_LIMIT_EXCEEDED") return "provider_quota";
  if (status >= 500) return "provider_unavailable";
  return "provider_format";
}

export async function requestExaBroadDiscovery(
  targetValue,
  apiKey,
  { fetchImpl = fetch, now = new Date(), timeoutMs = DEFAULT_TIMEOUT_MS, includeDomains } = {},
) {
  if (typeof apiKey !== "string" || apiKey.length === 0) {
    throw new BroadDiscoveryError("provider_auth", "EXA_API_KEY is not set.");
  }
  if (typeof fetchImpl !== "function") throw new TypeError("fetchImpl must be a function.");
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) throw new TypeError("timeoutMs must be positive.");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const startedAt = performance.now();
  let response;
  let payload;
  let latencyMs;

  try {
    response = await fetchImpl(EXA_SEARCH_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey },
      body: JSON.stringify(buildBroadRequestBody(targetValue, now, { includeDomains })),
      signal: controller.signal,
    });
    try {
      payload = await response.json();
    } catch (error) {
      if (controller.signal.aborted || error?.name === "AbortError") {
        throw new BroadDiscoveryError("provider_unavailable", "Exa request timed out.");
      }
      throw providerFormat("provider response was not valid JSON.");
    }
    latencyMs = Math.round(performance.now() - startedAt);
  } catch (error) {
    if (error instanceof BroadDiscoveryError) throw error;
    if (controller.signal.aborted || error?.name === "AbortError") {
      throw new BroadDiscoveryError("provider_unavailable", "Exa request timed out.");
    }
    throw new BroadDiscoveryError("provider_unavailable", "Exa request failed.");
  } finally {
    clearTimeout(timeout);
  }

  if (!response?.ok) {
    const rawTag = typeof payload?.tag === "string" ? payload.tag : "";
    const tag = /^[A-Z0-9_]{1,80}$/.test(rawTag) ? rawTag : "UNKNOWN";
    throw new BroadDiscoveryError(
      classifyHttpFailure(response?.status, tag),
      `Exa returned HTTP ${response?.status ?? "unknown"}; tag=${tag}.`,
    );
  }

  return parseBroadDiscoveryPayload(payload, latencyMs);
}

/**
 * Make the sole optional B3 fallback Search. It reuses the frozen B2 parser and
 * request behavior, adding only A4.5's official-domain constraint.
 */
export async function requestOfficialDomainFallback(
  officialDomain,
  apiKey,
  { fetchImpl = fetch, now = new Date(), timeoutMs = DEFAULT_TIMEOUT_MS } = {},
) {
  if (typeof officialDomain !== "string" || officialDomain.trim().length === 0) {
    throw new TypeError("officialDomain must be a non-empty hostname.");
  }
  const domain = officialDomain.trim().toLowerCase();
  return requestExaBroadDiscovery(domain, apiKey, {
    fetchImpl,
    now,
    timeoutMs,
    includeDomains: [domain, `*.${domain}`],
  });
}

export function candidateAggregates(candidates) {
  const domains = new Set();
  let datedCount = 0;
  let highlightedCount = 0;
  for (const candidate of candidates) {
    if (candidate.publishedDate) datedCount += 1;
    if (candidate.highlights.length) highlightedCount += 1;
    domains.add(new URL(candidate.url).hostname.toLowerCase());
  }
  return {
    resultCount: candidates.length,
    datedCount,
    highlightedCount,
    uniqueDomainCount: domains.size,
  };
}
