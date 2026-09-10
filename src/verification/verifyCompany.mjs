import { requestOfficialDomainFallback } from "../discovery/exaBroadDiscovery.mjs";
import { areDuplicateCandidates, classifyRecency, classifySource, selectSignals } from "../selection/selectSignals.mjs";
import { LEGAL_NAME_SUFFIXES } from "../targeting/companyTarget.mjs";
import { fetchHtmlSource } from "./sourceFetch.mjs";

const ARTICLE_TYPES = new Set(["article", "newsarticle", "blogposting", "report"]);
const STOPWORDS = new Set([
  "a", "an", "and", "announced", "announces", "at", "by", "company", "for", "from", "has", "have",
  "in", "is", "its", "new", "of", "on", "or", "the", "this", "to", "with",
]);
const TRIVIAL_MARKERS = [
  "bug fix", "bugfix", "changelog", "release notes", "repository", "how to", "tutorial",
  "stock price", "share price", "market commentary", "generic profile", "routine update",
  "minor update", "small update", "routine maintenance", "minor maintenance",
];
const MIN_SUBSTANTIVE_BODY_LENGTH = 120;
const VISIBLE_DATE_REGION_HTML_LENGTH = 1_400;
const MONTHS = new Map([
  ["january", 1], ["jan", 1], ["february", 2], ["feb", 2], ["march", 3], ["mar", 3],
  ["april", 4], ["apr", 4], ["may", 5], ["june", 6], ["jun", 6], ["july", 7], ["jul", 7],
  ["august", 8], ["aug", 8], ["september", 9], ["sep", 9], ["sept", 9], ["october", 10], ["oct", 10],
  ["november", 11], ["nov", 11], ["december", 12], ["dec", 12],
]);

export const VERIFICATION_REASON = Object.freeze({
  ACCEPTED: "accepted",
  INACCESSIBLE: "inaccessible",
  UNSUPPORTED_SOURCE_TYPE: "unsupported_source_type",
  UNSUPPORTED_CLAIM: "unsupported_claim",
  DATE_UNKNOWN: "date_unknown",
  STALE: "stale",
  TRIVIAL: "trivial",
  DUPLICATE: "duplicate",
});

function emptyDiagnostic() {
  return {
    resolvedUrl: null,
    sourceTitle: null,
    publisherDerivedDate: null,
    recencyBucket: null,
    sourceClass: null,
    evidenceSnippet: null,
  };
}

function withDiagnostic(result, diagnostic, options) {
  return options.includeDiagnostic ? { ...result, diagnostic } : result;
}

function normalizeSpace(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function decodeEntities(value) {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function textFromHtml(value) {
  return normalizeSpace(
    decodeEntities(
      String(value ?? "")
        .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
        .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
        .replace(/<!--([\s\S]*?)-->/g, " ")
        .replace(/<[^>]+>/g, " "),
    ),
  );
}

function attributes(tag) {
  const found = Object.create(null);
  for (const match of tag.matchAll(/([^\s=/>]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)) {
    found[match[1].toLowerCase()] = match[2] ?? match[3] ?? match[4] ?? "";
  }
  return found;
}

function metaContent(html, key, value) {
  for (const match of html.matchAll(/<meta\b[^>]*>/gi)) {
    const attrs = attributes(match[0]);
    if (String(attrs[key] ?? "").toLowerCase() === value.toLowerCase() && attrs.content) {
      return normalizeSpace(decodeEntities(attrs.content));
    }
  }
  return null;
}

function firstTagText(html, tagName) {
  const match = new RegExp(`<${tagName}\\b[^>]*>([\\s\\S]*?)<\\/${tagName}>`, "i").exec(html);
  return match ? textFromHtml(match[1]) : null;
}

function preferredArticleBodyHtml(html) {
  return (
    /<article\b[^>]*>([\s\S]*?)<\/article>/i.exec(html)?.[1] ??
    /<main\b[^>]*>([\s\S]*?)<\/main>/i.exec(html)?.[1] ??
    null
  );
}

function strippedDocumentBodyHtml(html) {
  const bodyHtml = /<body\b[^>]*>([\s\S]*?)<\/body>/i.exec(html)?.[1];
  if (!bodyHtml) return null;
  return bodyHtml.replace(
    /<(?:script|style|noscript|nav|header|footer|aside|form|button|input|select|textarea)\b[^>]*>[\s\S]*?<\/(?:script|style|noscript|nav|header|footer|aside|form|button|input|select|textarea)>/gi,
    " ",
  );
}

function contentBodyHtml(html) {
  const preferred = preferredArticleBodyHtml(html);
  if (preferred && textFromHtml(preferred).length >= MIN_SUBSTANTIVE_BODY_LENGTH) return preferred;
  return strippedDocumentBodyHtml(html);
}

function collectJsonLd(value, output) {
  if (Array.isArray(value)) {
    for (const item of value) collectJsonLd(item, output);
  } else if (value && typeof value === "object") {
    output.push(value);
    if (value["@graph"]) collectJsonLd(value["@graph"], output);
  }
}

function jsonLdItems(html) {
  const output = [];
  for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    const attrs = attributes(match[1]);
    if (String(attrs.type ?? "").toLowerCase() !== "application/ld+json") continue;
    try {
      collectJsonLd(JSON.parse(match[2].trim()), output);
    } catch {
      // One malformed metadata block must not make a source usable or unusable.
    }
  }
  return output;
}

function articleJsonLd(html) {
  return jsonLdItems(html).find((item) => {
    const types = Array.isArray(item["@type"]) ? item["@type"] : [item["@type"]];
    return types.some((type) => ARTICLE_TYPES.has(String(type).toLowerCase()));
  }) ?? null;
}

function normalizeDate(value) {
  if (typeof value !== "string" || value.trim().length === 0) return null;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  const calendar = /^\d{4}-\d{2}-\d{2}/.exec(value.trim())?.[0];
  if (!calendar) return null;
  const [year, month, day] = calendar.split("-").map(Number);
  const check = new Date(0);
  check.setUTCFullYear(year, month - 1, day);
  if (check.getUTCFullYear() !== year || check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day) {
    return null;
  }
  return date.toISOString();
}

function visibleNearHeadlineDate(contentHtml) {
  const headline = /<h1\b[^>]*>[\s\S]*?<\/h1>/i.exec(contentHtml ?? "");
  if (!headline) return null;
  const topHtml = contentHtml.slice(
    headline.index + headline[0].length,
    headline.index + headline[0].length + VISIBLE_DATE_REGION_HTML_LENGTH,
  ).replace(/<template\b[^>]*>[\s\S]*?<\/template>/gi, " ").replace(
    /<([A-Za-z][\w:-]*)\b(?=[^>]*(?:\shidden(?:\s|=|>)|\saria-hidden\s*=\s*(?:"true"|'true'|true)(?:\s|>)))[^>]*>[\s\S]*?<\/\1>/gi,
    " ",
  );
  const topText = textFromHtml(
    topHtml,
  );
  const match = /\b([A-Za-z]+)\.?\s+(\d{1,2}),\s+(\d{4})\b/.exec(topText);
  if (!match) return null;
  const month = MONTHS.get(match[1].toLowerCase());
  if (!month) return null;
  return normalizeDate(`${match[3]}-${String(month).padStart(2, "0")}-${match[2].padStart(2, "0")}`);
}

export function extractArticleEvidence(html) {
  const article = articleJsonLd(html);
  const title = normalizeSpace(
    article?.headline ?? firstTagText(html, "h1") ?? metaContent(html, "property", "og:title") ?? firstTagText(html, "title"),
  );
  const bodyHtml = contentBodyHtml(html);
  const body = bodyHtml ? textFromHtml(bodyHtml) : "";
  const jsonLdDate = normalizeDate(article?.datePublished);
  const metaDate = normalizeDate(metaContent(html, "property", "article:published_time"));
  const timeMatch = /<time\b([^>]*)>/i.exec(bodyHtml ?? "");
  const timeDate = timeMatch ? normalizeDate(attributes(timeMatch[1]).datetime) : null;
  const visibleDate = visibleNearHeadlineDate(bodyHtml);
  return {
    sourceTitle: title || null,
    body,
    publishedDate: jsonLdDate ?? metaDate ?? timeDate ?? visibleDate,
    hasArticleContainer: Boolean(bodyHtml),
  };
}

function tokens(value) {
  return (
    normalizeSpace(value)
      .normalize("NFKD")
      .replace(/\p{M}/gu, "")
      .toLowerCase()
      .match(/[\p{L}\p{N}]+/gu) ?? []
  ).filter((token) => token.length > 2 && !STOPWORDS.has(token));
}

function matchesCompany(text, companyName) {
  const legalSuffixes = new Set(LEGAL_NAME_SUFFIXES);
  const companyTokens = tokens(companyName).filter((token) => !legalSuffixes.has(token));
  const textTokens = new Set(tokens(text));
  return companyTokens.length > 0 && companyTokens.every((token) => textTokens.has(token));
}

function sentenceForEvidence(body, anchorTokens) {
  const sentences = body.match(/[^.!?]+[.!?]+|[^.!?]+$/g) ?? [];
  for (const sentence of sentences) {
    const sentenceTokens = new Set(tokens(sentence));
    const shared = anchorTokens.filter((token) => sentenceTokens.has(token)).length;
    if (shared >= Math.min(2, anchorTokens.length)) return normalizeSpace(sentence).slice(0, 700);
  }
  return null;
}

function isObviouslyTrivial(text) {
  const value = text.toLowerCase();
  return TRIVIAL_MARKERS.some((marker) => value.includes(marker));
}

function candidateAnchorTokens(candidate, companyName) {
  const company = new Set(tokens(companyName));
  return [...new Set([...tokens(candidate.title), ...tokens(candidate.highlights?.[0])])].filter(
    (token) => !company.has(token),
  );
}

function evidenceAsCandidate(verified) {
  return {
    rank: 1,
    title: `${verified.sourceTitle} ${verified.candidateTitle}`,
    url: verified.resolvedUrl,
    publishedDate: verified.publishedDate,
    author: null,
    highlights: [verified.evidenceSnippet],
  };
}

function isDuplicateEvidence(verified, accepted, companyName) {
  return accepted.some(
    (existing) =>
      existing.sourceUrl === verified.sourceUrl ||
      existing.resolvedUrl === verified.resolvedUrl ||
      areDuplicateCandidates(evidenceAsCandidate(existing), evidenceAsCandidate(verified), companyName),
  );
}

export async function verifyCandidate(candidate, company, options = {}) {
  const fetched = await fetchHtmlSource(candidate.url, options);
  if (!fetched.ok) return withDiagnostic({ accepted: false, reason: fetched.reason }, emptyDiagnostic(), options);

  const article = extractArticleEvidence(fetched.html);
  const diagnostic = {
    ...emptyDiagnostic(),
    resolvedUrl: fetched.resolvedUrl,
    sourceTitle: article.sourceTitle,
    publisherDerivedDate: article.publishedDate,
  };
  if (
    new URL(fetched.resolvedUrl).pathname === "/" ||
    !article.hasArticleContainer ||
    !article.sourceTitle ||
    article.body.length < MIN_SUBSTANTIVE_BODY_LENGTH
  ) {
    return withDiagnostic({ accepted: false, reason: VERIFICATION_REASON.UNSUPPORTED_CLAIM }, diagnostic, options);
  }
  const sourceClass = classifySource(fetched.resolvedUrl, company.officialDomain);
  diagnostic.sourceClass = sourceClass;
  const fullText = `${article.sourceTitle} ${article.body}`;
  if (!matchesCompany(fullText, company.companyName)) {
    return withDiagnostic({ accepted: false, reason: VERIFICATION_REASON.UNSUPPORTED_CLAIM }, diagnostic, options);
  }
  if (isObviouslyTrivial(fullText)) {
    return withDiagnostic({ accepted: false, reason: VERIFICATION_REASON.TRIVIAL }, diagnostic, options);
  }
  if (!article.publishedDate) {
    return withDiagnostic({ accepted: false, reason: VERIFICATION_REASON.DATE_UNKNOWN }, diagnostic, options);
  }
  const recencyBucket = classifyRecency(article.publishedDate, options.now ?? new Date());
  diagnostic.recencyBucket = recencyBucket;
  if (recencyBucket === "UNKNOWN") {
    return withDiagnostic({ accepted: false, reason: VERIFICATION_REASON.DATE_UNKNOWN }, diagnostic, options);
  }
  if (recencyBucket === "OLD") return withDiagnostic({ accepted: false, reason: VERIFICATION_REASON.STALE }, diagnostic, options);

  const anchorTokens = candidateAnchorTokens(candidate, company.companyName);
  const snippet = sentenceForEvidence(article.body, anchorTokens);
  if (!snippet) return withDiagnostic({ accepted: false, reason: VERIFICATION_REASON.UNSUPPORTED_CLAIM }, diagnostic, options);
  diagnostic.evidenceSnippet = snippet;
  return withDiagnostic({
    accepted: true,
    reason: VERIFICATION_REASON.ACCEPTED,
    evidence: {
      candidateTitle: candidate.title,
      sourceTitle: article.sourceTitle,
      sourceUrl: candidate.url,
      resolvedUrl: fetched.resolvedUrl,
      publishedDate: article.publishedDate,
      recencyBucket,
      sourceClass,
      evidenceSnippet: snippet,
    },
  }, diagnostic, options);
}

function traceEntry(origin, candidate, result, reason = result.reason) {
  return {
    origin,
    rank: candidate.rank,
    candidateTitle: candidate.title,
    sourceUrl: candidate.url,
    result: reason === VERIFICATION_REASON.ACCEPTED ? "accepted" : "rejected",
    reason,
    ...(result.diagnostic ?? emptyDiagnostic()),
  };
}

async function verifyQueue(candidates, company, accepted, options, { origin, trace } = {}) {
  for (const candidate of candidates) {
    const result = await verifyCandidate(candidate, company, trace ? { ...options, includeDiagnostic: true } : options);
    if (!result.accepted) {
      trace?.push(traceEntry(origin, candidate, result));
      continue;
    }
    if (isDuplicateEvidence(result.evidence, accepted, company.companyName)) {
      trace?.push(traceEntry(origin, candidate, result, VERIFICATION_REASON.DUPLICATE));
      continue;
    }
    accepted.push(result.evidence);
    trace?.push(traceEntry(origin, candidate, result));
    if (accepted.length === 3) break;
  }
}

function resultFor(company, evidence, fallbackUsed) {
  return {
    state: evidence.length === 3 ? "verified" : "insufficient_evidence",
    company: { ...company },
    evidence,
    retrieval: { fallbackUsed, exaRequestCount: 1 + (fallbackUsed ? 1 : 0) },
  };
}

/**
 * Verify a B2-ready queue sequentially; one fallback is possible only after it
 * is exhausted with fewer than three accepted source-derived evidence records.
 */
async function runCompanyVerification(
  discovery,
  apiKey,
  { sourceFetchImpl = fetch, exaFetchImpl = fetch, now = new Date(), sourceOptions = {} } = {},
  includeDiagnostic = false,
) {
  if (!discovery || discovery.state !== "ready_for_verification") {
    throw new TypeError("B3 requires a B2 ready_for_verification result.");
  }
  const company = discovery.company;
  const accepted = [];
  const verificationOptions = { ...sourceOptions, fetchImpl: sourceFetchImpl, now };
  const diagnostic = includeDiagnostic ? { broad: [], fallback: null, finalAcceptedCount: null } : null;
  await verifyQueue(discovery.prioritized, company, accepted, verificationOptions, {
    origin: "broad",
    trace: diagnostic?.broad,
  });
  if (accepted.length === 3) {
    const result = resultFor(company, accepted, false);
    if (diagnostic) diagnostic.finalAcceptedCount = accepted.length;
    return { result, diagnostic };
  }
  if (typeof apiKey !== "string" || apiKey.length === 0) {
    throw new TypeError("apiKey is required when B3 fallback is needed.");
  }

  const fallback = await requestOfficialDomainFallback(company.companyName, company.officialDomain, apiKey, {
    fetchImpl: exaFetchImpl,
    now,
  });
  const prioritized = selectSignals(fallback.candidates, { ...company, now }).prioritized;
  if (diagnostic) {
    diagnostic.fallback = {
      triggered: true,
      broadExhaustedBelowThree: true,
      acceptedCountBeforeFallback: accepted.length,
      candidateCount: fallback.candidates.length,
      prioritizedCandidateCount: prioritized.length,
      trace: [],
    };
  }
  await verifyQueue(prioritized, company, accepted, verificationOptions, {
    origin: "fallback",
    trace: diagnostic?.fallback?.trace,
  });
  const result = resultFor(company, accepted, true);
  if (diagnostic) diagnostic.finalAcceptedCount = accepted.length;
  return { result, diagnostic };
}

export async function verifyCompanyDiscovery(discovery, apiKey, options = {}) {
  return (await runCompanyVerification(discovery, apiKey, options)).result;
}

/**
 * Smoke/test-only observer over the production verification implementation.
 * It adds no retrieval or acceptance behavior and returns no publisher HTML.
 */
export async function verifyCompanyDiscoveryForSmoke(discovery, apiKey, options = {}) {
  return runCompanyVerification(discovery, apiKey, options, true);
}
