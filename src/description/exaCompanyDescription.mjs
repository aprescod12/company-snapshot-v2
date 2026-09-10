const EXA_CONTENTS_ENDPOINT = "https://api.exa.ai/contents";
const DEFAULT_TIMEOUT_MS = 60_000;
const MAX_DESCRIPTION_LENGTH = 600;
const MIN_SENTENCES = 2;
const MAX_SENTENCES = 3;

export const DESCRIPTION_UNAVAILABLE_REASON = Object.freeze({
  UNSUCCESSFUL_STATUS: "unsuccessful_status",
  EMPTY_SUMMARY: "empty_summary",
  INVALID_SENTENCE_COUNT: "invalid_sentence_count",
  TOO_LONG: "too_long",
  EMBEDDED_URL: "embedded_url",
  INVALID_SOURCE_URL: "invalid_source_url",
  UNTRUSTED_SOURCE_DOMAIN: "untrusted_source_domain",
});

export class CompanyDescriptionError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "CompanyDescriptionError";
    this.code = code;
  }
}

function providerFormat(message) {
  return new CompanyDescriptionError("provider_format", message);
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function normalizeSpace(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function normalizeHostname(hostname) {
  return String(hostname ?? "").toLowerCase().replace(/\.$/, "");
}

function isSameDomainOrSubdomain(hostname, officialDomain) {
  const host = normalizeHostname(hostname);
  const domain = normalizeHostname(officialDomain);
  return domain.length > 0 && (host === domain || host.endsWith(`.${domain}`));
}

function isHttpUrl(value) {
  if (typeof value !== "string" || value.trim().length === 0) return false;
  try {
    return ["http:", "https:"].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}

/**
 * Builds the exact HTTPS root homepage for an already-confirmed bare hostname.
 * Rejects any domain string that carries a path, query, credentials, or port
 * mismatch, since this is the only URL the Contents request is allowed to target.
 */
export function buildHomepageUrl(officialDomain) {
  if (typeof officialDomain !== "string" || officialDomain.trim().length === 0) {
    throw new TypeError("officialDomain must be a non-empty hostname.");
  }
  const domain = officialDomain.trim().toLowerCase();
  let parsed;
  try {
    parsed = new URL(`https://${domain}`);
  } catch {
    throw new TypeError("officialDomain must be a valid hostname.");
  }
  if (
    parsed.hostname !== domain ||
    parsed.pathname !== "/" ||
    parsed.search ||
    parsed.hash ||
    parsed.username ||
    parsed.password
  ) {
    throw new TypeError("officialDomain must be a bare hostname with no path, query, or credentials.");
  }
  return parsed.href;
}

/**
 * Narrow, single-purpose instruction: a stable 2-3 sentence core-business
 * description grounded only in the supplied homepage, explicitly excluding
 * current-events content that belongs to B3's signal evidence instead.
 */
export function buildDescriptionQuery(companyName) {
  if (typeof companyName !== "string" || companyName.trim().length === 0) {
    throw new TypeError("companyName must be a non-empty string.");
  }
  return (
    `In exactly 2 to 3 concise factual sentences, describe the stable core business of ${companyName.trim()}: ` +
    "its principal products or services, and who uses them or its principal use case. " +
    "Rely only on the content of this webpage. " +
    "Do not mention recent announcements, funding, acquisitions, partnerships, earnings or financial results, " +
    "leadership changes, stock performance, or dates/history that do not help explain the core business. " +
    "Avoid promotional or hype language."
  );
}

export function buildContentsRequestBody(companyName, homepageUrl) {
  return {
    urls: [homepageUrl],
    summary: { query: buildDescriptionQuery(companyName) },
  };
}

function classifyHttpFailure(status, tag) {
  if (status === 401 || tag === "INVALID_API_KEY") return "provider_auth";
  if (status === 402 || ["NO_MORE_CREDITS", "API_KEY_BUDGET_EXCEEDED", "TEAM_BUDGET_EXCEEDED"].includes(tag)) {
    return "provider_paid_required";
  }
  if (status === 429 || tag === "RATE_LIMIT_EXCEEDED") return "provider_quota";
  if (status >= 500) return "provider_unavailable";
  return "provider_format";
}

async function requestExaContentsPayload(body, apiKey, { fetchImpl = fetch, timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  if (typeof apiKey !== "string" || apiKey.length === 0) {
    throw new CompanyDescriptionError("provider_auth", "EXA_API_KEY is not set.");
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
    response = await fetchImpl(EXA_CONTENTS_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    try {
      payload = await response.json();
    } catch (error) {
      if (controller.signal.aborted || error?.name === "AbortError") {
        throw new CompanyDescriptionError("provider_unavailable", "Exa Contents request timed out.");
      }
      throw providerFormat("Exa Contents response was not valid JSON.");
    }
    latencyMs = Math.round(performance.now() - startedAt);
  } catch (error) {
    if (error instanceof CompanyDescriptionError) throw error;
    if (controller.signal.aborted || error?.name === "AbortError") {
      throw new CompanyDescriptionError("provider_unavailable", "Exa Contents request timed out.");
    }
    throw new CompanyDescriptionError("provider_unavailable", "Exa Contents request failed.");
  } finally {
    clearTimeout(timeout);
  }

  if (!response?.ok) {
    const rawTag = typeof payload?.tag === "string" ? payload.tag : "";
    const tag = /^[A-Z0-9_]{1,80}$/.test(rawTag) ? rawTag : "UNKNOWN";
    throw new CompanyDescriptionError(
      classifyHttpFailure(response?.status, tag),
      `Exa Contents returned HTTP ${response?.status ?? "unknown"}; tag=${tag}.`,
    );
  }

  return { payload, latencyMs };
}

function countSentences(text) {
  const segmenter = new Intl.Segmenter("en", { granularity: "sentence" });
  let count = 0;
  for (const { segment } of segmenter.segment(text)) {
    if (segment.trim().length > 0) count += 1;
  }
  return count;
}

function unavailable(reason) {
  return { state: "description_unavailable", reason };
}

/**
 * Validates and parses a completed single-URL Contents payload. Never throws
 * for content-quality problems; those return a narrow `description_unavailable`
 * state instead. Only a contract-shape violation — including a status/result
 * whose provider `id` does not match the exact requested homepage, since
 * array cardinality alone does not prove provider-response association — is
 * treated as a provider-format error.
 */
export function parseContentsPayload(payload, homepageUrl, officialDomain) {
  if (!isPlainObject(payload)) throw providerFormat("Exa Contents response was not an object.");
  if (!Array.isArray(payload.statuses) || payload.statuses.length !== 1) {
    throw providerFormat("Exa Contents response did not contain exactly one status entry.");
  }
  const [status] = payload.statuses;
  if (!isPlainObject(status) || typeof status.status !== "string") {
    throw providerFormat("Exa Contents status entry was malformed.");
  }
  if (typeof status.id !== "string" || status.id !== homepageUrl) {
    throw providerFormat("Exa Contents status entry did not correspond to the requested homepage.");
  }
  if (status.status !== "success") {
    return { ...unavailable(DESCRIPTION_UNAVAILABLE_REASON.UNSUCCESSFUL_STATUS), estimatedCostUsd: null };
  }

  if (!Array.isArray(payload.results) || payload.results.length !== 1) {
    throw providerFormat("Exa Contents response reported success without exactly one result.");
  }
  const [result] = payload.results;
  if (!isPlainObject(result)) throw providerFormat("Exa Contents result was not an object.");
  if (typeof result.id !== "string" || result.id !== homepageUrl) {
    throw providerFormat("Exa Contents result did not correspond to the requested homepage.");
  }

  const estimatedCostUsd =
    typeof payload?.costDollars?.total === "number" && Number.isFinite(payload.costDollars.total)
      ? payload.costDollars.total
      : null;

  if (!isHttpUrl(result.url)) {
    return { ...unavailable(DESCRIPTION_UNAVAILABLE_REASON.INVALID_SOURCE_URL), estimatedCostUsd };
  }
  const resultHostname = new URL(result.url).hostname;
  if (!isSameDomainOrSubdomain(resultHostname, officialDomain)) {
    return { ...unavailable(DESCRIPTION_UNAVAILABLE_REASON.UNTRUSTED_SOURCE_DOMAIN), estimatedCostUsd };
  }

  const description = normalizeSpace(result.summary);
  if (description.length === 0) {
    return { ...unavailable(DESCRIPTION_UNAVAILABLE_REASON.EMPTY_SUMMARY), estimatedCostUsd };
  }
  if (description.length > MAX_DESCRIPTION_LENGTH) {
    return { ...unavailable(DESCRIPTION_UNAVAILABLE_REASON.TOO_LONG), estimatedCostUsd };
  }
  if (/https?:\/\//i.test(description)) {
    return { ...unavailable(DESCRIPTION_UNAVAILABLE_REASON.EMBEDDED_URL), estimatedCostUsd };
  }
  const sentenceCount = countSentences(description);
  if (sentenceCount < MIN_SENTENCES || sentenceCount > MAX_SENTENCES) {
    return { ...unavailable(DESCRIPTION_UNAVAILABLE_REASON.INVALID_SENTENCE_COUNT), estimatedCostUsd };
  }

  return { state: "described", description, sourceUrl: result.url, estimatedCostUsd };
}

/**
 * Isolated B4B-candidate description path: one Exa Contents request against an
 * already-confirmed company's HTTPS root homepage. Performs no Search, no
 * subpage/crawl targeting beyond that single URL, no retry, and does not
 * import or invoke B1, B2, B3, or B4A.
 */
export async function requestCompanyDescription(
  { companyName, officialDomain },
  apiKey,
  { fetchImpl = fetch, timeoutMs = DEFAULT_TIMEOUT_MS } = {},
) {
  if (typeof companyName !== "string" || companyName.trim().length === 0) {
    throw new TypeError("companyName must be a non-empty string.");
  }
  const homepageUrl = buildHomepageUrl(officialDomain);
  const body = buildContentsRequestBody(companyName, homepageUrl);
  const { payload, latencyMs } = await requestExaContentsPayload(body, apiKey, { fetchImpl, timeoutMs });
  const parsed = parseContentsPayload(payload, homepageUrl, officialDomain);

  if (parsed.state === "description_unavailable") {
    return { state: "description_unavailable", reason: parsed.reason };
  }
  return {
    state: "described",
    company: { companyName, officialDomain },
    description: parsed.description,
    sourceUrl: parsed.sourceUrl,
    provider: { latencyMs, estimatedCostUsd: parsed.estimatedCostUsd },
  };
}
