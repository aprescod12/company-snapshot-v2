import { requestOfficialDomainFallback } from "../discovery/exaBroadDiscovery.mjs";
import { SOURCE_CLASS, areDuplicateCandidates, classifyRecency, classifySource, selectSignals } from "../selection/selectSignals.mjs";
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

/**
 * E2R1: a plain non-greedy regex (`<tag>...</tag>`) cannot correctly locate
 * the closing tag for the FIRST opening tag when the same tag name is
 * nested -- e.g. an outer `<article>` wrapping inner `<article>` card/widget
 * elements, a common pattern on publisher templates that embed related-story
 * or data cards inside the main content column. A non-greedy match stops at
 * the first (innermost) closing tag, silently truncating the real article
 * body before its actual end and admitting only the leading nested widget's
 * content. This is a generic HTML-matching correctness fix, not specific to
 * any one publisher: it walks same-name open/close tags tracking nesting
 * depth so the FIRST opening tag is paired with its true matching close.
 *
 * Adversarial review of the first version of this fix found a real overrun
 * risk: a bare tag-marker scan has no awareness that a literal `<tagName`-
 * shaped substring can appear inside non-structural regions -- a `<script>`
 * hydration/JSON payload, an HTML comment -- without being a real tag. An
 * unbalanced literal match there would make the depth counter require one
 * extra closing tag it will never structurally see, so it walks PAST the
 * true close into unrelated sibling content (e.g. a "related stories"
 * sidebar), which the old non-greedy regex could never do (it could only
 * truncate early, never overrun). The scan below skips `<script>`, `<style>`,
 * and HTML comments entirely -- the same regions `textFromHtml` and
 * `strippedDocumentBodyHtml` already exclude elsewhere in this file.
 *
 * Project-owner actual-diff review of the first corrected version then found
 * this exclusion was applied too late: the initial opening-tag search ran
 * BEFORE the token scan began, as its own separate, script/style/comment-
 * unaware regex, so a fake `<tagName...>`-shaped string sitting inside a
 * `<script>` block earlier in the document could itself be selected as the
 * "opening" tag -- after which scanning began past it, so the script region
 * containing it was never revisited and never recognized as skippable. The
 * function below is now a single unified pass with no separate initial
 * search: it treats complete `<script>`/`<style>`/comment regions as atomic
 * skipped tokens from the very start of the document, and `contentStart` is
 * only established at the first genuine structural `<tagName>` opening token
 * found outside those regions -- so a fake match inside a skipped region can
 * never become the opener, not just never affect the nesting count once
 * scanning is already underway. A raw, unescaped `<tagName`-shaped substring
 * inside some other (non-script/style/comment) tag's attribute value remains
 * a theoretical residual gap (true HTML parsing would be needed to close it
 * fully); that is a disclosed limitation, not something this bounded fix
 * attempts to solve.
 */
function balancedTagBodyHtml(html, tagName) {
  const tokenPattern = new RegExp(
    `<script\\b[^>]*>[\\s\\S]*?<\\/script>|<style\\b[^>]*>[\\s\\S]*?<\\/style>|<!--[\\s\\S]*?-->|<${tagName}\\b[^>]*>|<\\/${tagName}\\s*>`,
    "gi",
  );
  let depth = 0;
  let contentStart = -1;
  let match;
  while ((match = tokenPattern.exec(html))) {
    const token = match[0];
    if (/^<script\b/i.test(token) || /^<style\b/i.test(token) || token.startsWith("<!--")) {
      continue;
    }
    if (token.startsWith("</")) {
      if (depth === 0) continue; // stray closing tag before any real opening tag
      depth -= 1;
      if (depth === 0) return html.slice(contentStart, match.index);
    } else {
      if (depth === 0) contentStart = match.index + token.length;
      depth += 1;
    }
  }
  return depth > 0 ? html.slice(contentStart) : null;
}

function preferredArticleBodyHtml(html) {
  return balancedTagBodyHtml(html, "article") ?? balancedTagBodyHtml(html, "main") ?? null;
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

/**
 * B3R3: the leftmost label of the already-confirmed official domain, e.g.
 * "notion.com" -> "notion". Never fetches or guesses; uses only the
 * B1/B1R1-confirmed identity already on `company`.
 */
function officialDomainBrandLabel(officialDomain) {
  if (typeof officialDomain !== "string" || officialDomain.length === 0) return "";
  return officialDomain.split(".")[0];
}

/**
 * B3R3 narrow first-party fallback for company-name matching. Only usable
 * when the source has already been classified FIRST_PARTY against the
 * confirmed official domain. Requires: at least one deterministic brand
 * token derived from that domain; that token to be represented in the
 * resolved company name (so an unrelated official-domain label can never be
 * used); and the token to literally appear in the article text. This never
 * relaxes matching for OTHER/secondary sources, and never accepts a
 * first-party page on domain alone -- textual brand evidence is still
 * mandatory.
 */
function matchesFirstPartyBrand(text, company) {
  const brandTokens = tokens(officialDomainBrandLabel(company.officialDomain));
  if (brandTokens.length === 0) return false;
  const companyNameTokens = new Set(tokens(company.companyName));
  if (!brandTokens.every((token) => companyNameTokens.has(token))) return false;
  const textTokens = new Set(tokens(text));
  return brandTokens.every((token) => textTokens.has(token));
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

// D3: the title-only duplicate heuristic in selectSignals.mjs only ever
// compares distinctive title tokens (falling back to combined title+highlight
// tokens for sparse/metadata-like titles). Two publishers covering the same
// underlying event with substantially different headlines -- e.g. an
// editorial-style headline versus a data-heavy financial headline -- share no
// title vocabulary at all, so that check returns false without ever
// consulting the verified evidence text. Because B3 has already fetched and
// verified both pages, their full extracted article text is real,
// publisher-derived content (unlike B2's raw discovery highlights), so it is
// safe to use it here for one additional, narrow, deterministic check.
//
// Shared quantity anchors ("$99 million", "$2.5 billion", "177 percent" --
// normalized (value, unit) pairs, with million/billion/thousand additionally
// tagged as currency-scaled or plain count so "$50 million" and "50 million
// users" are never conflated) are SUPPORTING EVIDENCE of same-event coverage,
// never sufficient by themselves: two genuinely different announcements can
// restate the same recycled evergreen metric (e.g. a boilerplate "trusted by
// 50 million users, growing 20 percent year over year" line) early in their
// lede, not just in a trailing "About the company" footer. So merging
// requires BOTH (a) at least two shared exact anchors, bounded to a
// 2,000-character lede prefix to focus comparison on event-local content
// and reduce exposure to trailing boilerplate footers, AND (b) at
// least one of those shared anchors also appearing in one side's own
// extracted headline (`sourceTitle`) -- a conservative corroboration proxy
// for the figure being central to the represented event, not proof of event
// identity by itself. This intentionally favors precision over recall: a
// genuine shared event fact (like Linear's tender/valuation figures, which
// appear directly in one publisher's headline) satisfies it, but a genuine
// same-event pair where neither publisher places the shared figure in its
// own headline will not be caught by this mechanism -- a known, accepted
// residual limitation. Anchors
// are computed from the lede of the verified article text (title + a bounded
// prefix of the body), not from `evidenceSnippet`, because
// `sentenceForEvidence`'s naive sentence splitter treats an embedded decimal
// point (e.g. "$2.5") as ending a sentence and can truncate a snippet before
// a full figure appears -- that existing sentence-selection behavior is left
// completely unchanged since other support-sentence-matching tests depend on
// its exact truncation point. `eventQuantityAnchors`/`titleQuantityAnchors`
// are internal-only fields: `assembleSnapshot()` never spreads the evidence
// object, so neither can ever reach the public snapshot contract. This is a
// generic company-agnostic pattern, not a Linear-specific rule, and it only
// ever adds a new duplicate detection; it never weakens the existing
// title-similarity check.
const QUANTITY_ANCHOR_PATTERN = /(\$)?\s?(\d[\d,]*(?:\.\d+)?)\s*(percent|%|million|billion|thousand)(?!\w)/gi;
const MINIMUM_SHARED_QUANTITY_ANCHORS = 2;
const QUANTITY_ANCHOR_SCAN_CHAR_LIMIT = 2_000;

/**
 * E2R1: a headline and a body can state the identical event fact using a
 * numeral ("1 billion") versus a spelled-out cardinal word ("one billion")
 * -- e.g. one publisher's own headline quotes a milestone in numeral form
 * while a different publisher's prose paraphrases the same quoted figure in
 * words. Without normalizing these to the same anchor key, two records
 * stating the identical fact never register as sharing it. Bounded to a
 * small, fixed dictionary of common cardinal words (one-twenty) immediately
 * followed by a scale/percent unit -- this is not general natural-language
 * number parsing (no compounds, no "hundred"/"a quarter"/decimals-in-words),
 * just the same normalization principle already applied to numerals,
 * extended to the small set of word forms actually seen stating such
 * figures. The pattern requires the number word not be preceded by a word
 * character or hyphen, so a genuine compound word like "twenty-one billion"
 * is correctly excluded rather than silently misread as "one billion"
 * (value 1) -- independent review found this exact gap in the first version
 * and it is corrected here.
 *
 * Project-owner actual-diff review then found a second gap: tagging every
 * word-form anchor `:count` assumed a spelled-out currency figure would
 * always keep a literal "$" ("$one billion"), which is not how publisher
 * prose actually writes it -- the realistic form is "one billion dollars".
 * Without recognizing that, "one billion dollars" (a currency amount) and
 * "one billion users" (an unrelated count) would wrongly share the same
 * `:count`-tagged anchor. An optional trailing "dollar"/"dollars" is now
 * captured and, when present, tags the anchor `:currency` instead -- kept
 * narrow and evidenced (this one common English currency suffix only, no
 * other currency words, no general NLP) -- and normalizes to the exact same
 * anchor key as the existing numeral currency form, so "one billion dollars"
 * and "$1 billion" correctly share an anchor while "one billion users" does
 * not.
 */
const NUMBER_WORDS = Object.freeze({
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17,
  eighteen: 18, nineteen: 19, twenty: 20,
});
const NUMBER_WORD_PATTERN = new RegExp(
  `(?<![\\w-])(${Object.keys(NUMBER_WORDS).join("|")})\\s+(percent|million|billion|thousand)(\\s+dollars?)?\\b`,
  "gi",
);

function collectQuantityAnchors(text) {
  const value = String(text ?? "");
  const anchors = new Set();
  for (const match of value.matchAll(QUANTITY_ANCHOR_PATTERN)) {
    const numeric = Number(match[2].replace(/,/g, ""));
    if (!Number.isFinite(numeric)) continue;
    const unitWord = match[3].toLowerCase();
    if (unitWord === "percent" || unitWord === "%") {
      anchors.add(`${numeric}:percent`);
      continue;
    }
    const scale = match[1] ? "currency" : "count";
    anchors.add(`${numeric}:${unitWord}:${scale}`);
  }
  for (const match of value.matchAll(NUMBER_WORD_PATTERN)) {
    const numeric = NUMBER_WORDS[match[1].toLowerCase()];
    const unitWord = match[2].toLowerCase();
    if (unitWord === "percent") {
      anchors.add(`${numeric}:percent`);
      continue;
    }
    const scale = match[3] ? "currency" : "count";
    anchors.add(`${numeric}:${unitWord}:${scale}`);
  }
  return anchors;
}

function shareStrongEventQuantityAnchors(left, right) {
  const leftAnchors = new Set(left.eventQuantityAnchors ?? []);
  if (leftAnchors.size === 0) return false;
  const rightAnchors = new Set(right.eventQuantityAnchors ?? []);
  const shared = [...leftAnchors].filter((anchor) => rightAnchors.has(anchor));
  if (shared.length < MINIMUM_SHARED_QUANTITY_ANCHORS) return false;

  const leftTitleAnchors = new Set(left.titleQuantityAnchors ?? []);
  const rightTitleAnchors = new Set(right.titleQuantityAnchors ?? []);
  return shared.some((anchor) => leftTitleAnchors.has(anchor) || rightTitleAnchors.has(anchor));
}

function isDuplicateEvidence(verified, accepted, companyName) {
  return accepted.some(
    (existing) =>
      existing.sourceUrl === verified.sourceUrl ||
      existing.resolvedUrl === verified.resolvedUrl ||
      areDuplicateCandidates(evidenceAsCandidate(existing), evidenceAsCandidate(verified), companyName) ||
      shareStrongEventQuantityAnchors(existing, verified),
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
  const companyMatches =
    matchesCompany(fullText, company.companyName) ||
    (sourceClass === SOURCE_CLASS.FIRST_PARTY && matchesFirstPartyBrand(fullText, company));
  if (!companyMatches) {
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
      eventQuantityAnchors: [...collectQuantityAnchors(fullText.slice(0, QUANTITY_ANCHOR_SCAN_CHAR_LIMIT))],
      titleQuantityAnchors: [...collectQuantityAnchors(article.sourceTitle)],
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
