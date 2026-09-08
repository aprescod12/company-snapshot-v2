const DAY_MS = 24 * 60 * 60 * 1000;

export const RECENCY_BUCKET = Object.freeze({
  RECENT: "RECENT",
  FALLBACK: "FALLBACK",
  UNKNOWN: "UNKNOWN",
  OLD: "OLD",
});

export const SOURCE_CLASS = Object.freeze({
  FIRST_PARTY: "FIRST_PARTY",
  OTHER: "OTHER",
});

export const SELECTION_REASON = Object.freeze({
  SELECTED: "SELECTED",
  DUPLICATE: "DUPLICATE",
  INVALID: "INVALID",
  LOWER_PRIORITY: "LOWER_PRIORITY",
});

export const DUPLICATE_RULE = Object.freeze({
  titleMinimumSharedTokens: 3,
  titleOverlapCoefficient: 0.72,
  titleJaccardSimilarity: 0.7,
  sparseMinimumSharedTokens: 4,
  sparseOverlapCoefficient: 0.68,
  sparseJaccardSimilarity: 0.32,
  maximumHighlightTokens: 48,
});

const STOPWORDS = new Set([
  "a",
  "an",
  "and",
  "announce",
  "announced",
  "announces",
  "as",
  "at",
  "be",
  "by",
  "company",
  "for",
  "from",
  "has",
  "have",
  "in",
  "into",
  "is",
  "it",
  "its",
  "launch",
  "launched",
  "launches",
  "new",
  "news",
  "of",
  "on",
  "or",
  "said",
  "says",
  "that",
  "the",
  "their",
  "this",
  "to",
  "unveil",
  "unveiled",
  "unveils",
  "was",
  "were",
  "will",
  "with",
].map(canonicalizeToken));

const METADATA_TITLE_TOKENS = new Set(
  ["document", "entry", "file", "filing", "item", "press", "release", "report"].map(
    canonicalizeToken,
  ),
);

const RECENCY_PRIORITY = Object.freeze({
  [RECENCY_BUCKET.RECENT]: 0,
  [RECENCY_BUCKET.FALLBACK]: 1,
  [RECENCY_BUCKET.UNKNOWN]: 2,
  [RECENCY_BUCKET.OLD]: 3,
});

const SOURCE_PRIORITY = Object.freeze({
  [SOURCE_CLASS.FIRST_PARTY]: 0,
  [SOURCE_CLASS.OTHER]: 1,
});

/**
 * @typedef {object} Candidate
 * @property {number} rank
 * @property {string} title
 * @property {string} url
 * @property {string|null} publishedDate
 * @property {string|null} author
 * @property {string[]} highlights
 */

/**
 * @typedef {object} SelectionContext
 * @property {string} companyName
 * @property {string} officialDomain
 * @property {Date} now
 */

function normalizeHostname(hostname) {
  const normalized = hostname.toLowerCase();
  return normalized.endsWith(".") ? normalized.slice(0, -1) : normalized;
}

function normalizeOfficialDomain(officialDomain) {
  if (typeof officialDomain !== "string" || officialDomain.trim().length === 0) {
    throw new TypeError("officialDomain must be a non-empty hostname.");
  }

  const raw = officialDomain.trim();
  if (raw.includes("://")) {
    throw new TypeError("officialDomain must be a hostname, not a URL.");
  }

  let parsed;
  try {
    parsed = new URL(`https://${raw}`);
  } catch {
    throw new TypeError("officialDomain must be a valid hostname.");
  }

  if (
    parsed.username ||
    parsed.password ||
    parsed.pathname !== "/" ||
    parsed.search ||
    parsed.hash
  ) {
    throw new TypeError("officialDomain must contain only a hostname and optional port.");
  }

  const hostname = normalizeHostname(parsed.hostname);
  if (!hostname) throw new TypeError("officialDomain must contain a hostname.");
  return hostname;
}

function parseHttpUrl(value) {
  if (typeof value !== "string" || value.trim() !== value) return null;

  try {
    const parsed = new URL(value);
    if (!["http:", "https:"].includes(parsed.protocol) || !parsed.hostname) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function classifyRecency(publishedDate, now) {
  if (!(now instanceof Date) || !Number.isFinite(now.getTime())) {
    throw new TypeError("now must be a valid Date.");
  }

  if (typeof publishedDate !== "string" || publishedDate.trim().length === 0) {
    return RECENCY_BUCKET.UNKNOWN;
  }

  const publishedAt = Date.parse(publishedDate);
  if (!Number.isFinite(publishedAt) || publishedAt > now.getTime()) {
    return RECENCY_BUCKET.UNKNOWN;
  }

  const ageMs = now.getTime() - publishedAt;
  if (ageMs <= 90 * DAY_MS) return RECENCY_BUCKET.RECENT;
  if (ageMs <= 180 * DAY_MS) return RECENCY_BUCKET.FALLBACK;
  return RECENCY_BUCKET.OLD;
}

export function classifySource(url, officialDomain) {
  const parsed = parseHttpUrl(url);
  if (!parsed) return SOURCE_CLASS.OTHER;

  const candidateHostname = normalizeHostname(parsed.hostname);
  const officialHostname = normalizeOfficialDomain(officialDomain);
  return candidateHostname === officialHostname || candidateHostname.endsWith(`.${officialHostname}`)
    ? SOURCE_CLASS.FIRST_PARTY
    : SOURCE_CLASS.OTHER;
}

export function isCandidateValid(candidate) {
  return Boolean(
    candidate &&
      typeof candidate === "object" &&
      Number.isInteger(candidate.rank) &&
      candidate.rank > 0 &&
      typeof candidate.title === "string" &&
      candidate.title.trim().length > 0 &&
      parseHttpUrl(candidate.url),
  );
}

function canonicalizeToken(token) {
  if (token.length > 5 && token.endsWith("ies")) return `${token.slice(0, -3)}y`;
  if (token.length > 4 && token.endsWith("ed")) return token.slice(0, -1);
  if (token.length > 4 && token.endsWith("s") && !token.endsWith("ss")) {
    return token.slice(0, -1);
  }
  return token;
}

function tokenize(value) {
  return (
    String(value)
      .normalize("NFKD")
      .replace(/\p{M}/gu, "")
      .toLowerCase()
      .match(/[\p{L}\p{N}]+/gu) ?? []
  ).map(canonicalizeToken);
}

function companyTokenSet(companyName) {
  if (typeof companyName !== "string" || companyName.trim().length === 0) {
    throw new TypeError("companyName must be a non-empty string.");
  }
  return new Set(tokenize(companyName));
}

function distinctiveTokens(value, companyTokens) {
  return tokenize(value).filter(
    (token) => token.length > 1 && !STOPWORDS.has(token) && !companyTokens.has(token),
  );
}

function candidateTokenSets(candidate, companyTokens) {
  const titleTokens = new Set(distinctiveTokens(candidate.title, companyTokens));
  const firstHighlight =
    Array.isArray(candidate.highlights) && typeof candidate.highlights[0] === "string"
      ? candidate.highlights[0]
      : "";
  const highlightTokens = distinctiveTokens(firstHighlight, companyTokens).slice(
    0,
    DUPLICATE_RULE.maximumHighlightTokens,
  );
  return {
    titleTokens,
    combinedTokens: new Set([...titleTokens, ...highlightTokens]),
  };
}

function similarity(left, right) {
  if (left.size === 0 || right.size === 0) {
    return { shared: 0, overlapCoefficient: 0, jaccardSimilarity: 0 };
  }

  let shared = 0;
  for (const token of left) {
    if (right.has(token)) shared += 1;
  }

  return {
    shared,
    overlapCoefficient: shared / Math.min(left.size, right.size),
    jaccardSimilarity: shared / (left.size + right.size - shared),
  };
}

function meetsThreshold(metrics, minimumShared, overlapThreshold, jaccardThreshold) {
  return (
    metrics.shared >= minimumShared &&
    metrics.overlapCoefficient >= overlapThreshold &&
    metrics.jaccardSimilarity >= jaccardThreshold
  );
}

function isMetadataLikeSparseTitle(tokens) {
  return (
    tokens.size <= 2 &&
    [...tokens].some((token) => /^\d{6,}$/.test(token) || METADATA_TITLE_TOKENS.has(token))
  );
}

export function areDuplicateCandidates(left, right, companyName) {
  const companyTokens = companyTokenSet(companyName);
  const leftTokens = candidateTokenSets(left, companyTokens);
  const rightTokens = candidateTokenSets(right, companyTokens);
  const titleSimilarity = similarity(leftTokens.titleTokens, rightTokens.titleTokens);

  if (
    meetsThreshold(
      titleSimilarity,
      DUPLICATE_RULE.titleMinimumSharedTokens,
      DUPLICATE_RULE.titleOverlapCoefficient,
      DUPLICATE_RULE.titleJaccardSimilarity,
    )
  ) {
    return true;
  }

  const maximumTitleSize = Math.max(leftTokens.titleTokens.size, rightTokens.titleTokens.size);
  if (
    titleSimilarity.shared >= 2 &&
    maximumTitleSize <= 3 &&
    titleSimilarity.overlapCoefficient >= 0.8 &&
    titleSimilarity.jaccardSimilarity >= 0.67
  ) {
    return true;
  }

  if (
    !isMetadataLikeSparseTitle(leftTokens.titleTokens) &&
    !isMetadataLikeSparseTitle(rightTokens.titleTokens)
  ) {
    return false;
  }

  return meetsThreshold(
    similarity(leftTokens.combinedTokens, rightTokens.combinedTokens),
    DUPLICATE_RULE.sparseMinimumSharedTokens,
    DUPLICATE_RULE.sparseOverlapCoefficient,
    DUPLICATE_RULE.sparseJaccardSimilarity,
  );
}

function compareText(left, right) {
  if (left === right) return 0;
  return left < right ? -1 : 1;
}

function comparePreference(left, right) {
  return (
    RECENCY_PRIORITY[left.recencyBucket] - RECENCY_PRIORITY[right.recencyBucket] ||
    SOURCE_PRIORITY[left.sourceClass] - SOURCE_PRIORITY[right.sourceClass] ||
    left.candidate.rank - right.candidate.rank ||
    compareText(left.candidate.url, right.candidate.url) ||
    compareText(left.candidate.title, right.candidate.title)
  );
}

function compareIdentity(left, right) {
  return (
    left.candidate.rank - right.candidate.rank ||
    compareText(left.candidate.url, right.candidate.url) ||
    compareText(left.candidate.title, right.candidate.title)
  );
}

function cloneCandidate(candidate) {
  if (!candidate || typeof candidate !== "object") return candidate;
  return {
    ...candidate,
    ...(Array.isArray(candidate.highlights) ? { highlights: [...candidate.highlights] } : {}),
  };
}

function clusterCandidates(items, companyName) {
  const parent = items.map((_, index) => index);

  function find(index) {
    while (parent[index] !== index) {
      parent[index] = parent[parent[index]];
      index = parent[index];
    }
    return index;
  }

  function union(left, right) {
    const leftRoot = find(left);
    const rightRoot = find(right);
    if (leftRoot !== rightRoot) parent[rightRoot] = leftRoot;
  }

  for (let left = 0; left < items.length; left += 1) {
    for (let right = left + 1; right < items.length; right += 1) {
      if (areDuplicateCandidates(items[left].candidate, items[right].candidate, companyName)) {
        union(left, right);
      }
    }
  }

  const groupsByRoot = new Map();
  for (let index = 0; index < items.length; index += 1) {
    const root = find(index);
    const group = groupsByRoot.get(root) ?? [];
    group.push(items[index]);
    groupsByRoot.set(root, group);
  }

  const groups = [...groupsByRoot.values()];
  for (const group of groups) group.sort(compareIdentity);
  groups.sort((left, right) => compareIdentity(left[0], right[0]));

  let duplicateNumber = 0;
  return groups.map((group) => {
    const duplicateClusterId = group.length > 1 ? `DUPLICATE_${++duplicateNumber}` : null;
    const representative = [...group].sort(comparePreference)[0];
    return { group, duplicateClusterId, representative };
  });
}

/**
 * Select at most three candidates without provider access, source fetching, or input mutation.
 *
 * @param {Candidate[]} candidates
 * @param {SelectionContext} context
 */
export function selectSignals(candidates, context) {
  if (!Array.isArray(candidates)) throw new TypeError("candidates must be an array.");
  if (!context || typeof context !== "object") {
    throw new TypeError("context must be an object.");
  }

  const officialHostname = normalizeOfficialDomain(context.officialDomain);
  companyTokenSet(context.companyName);
  if (!(context.now instanceof Date) || !Number.isFinite(context.now.getTime())) {
    throw new TypeError("now must be a valid Date.");
  }

  const validItems = [];
  const metadataByInputIndex = new Map();

  candidates.forEach((candidate, inputIndex) => {
    const recencyBucket = classifyRecency(candidate?.publishedDate, context.now);
    const parsedUrl = parseHttpUrl(candidate?.url);
    const candidateHostname = parsedUrl ? normalizeHostname(parsedUrl.hostname) : null;
    const sourceClass =
      candidateHostname === officialHostname || candidateHostname?.endsWith(`.${officialHostname}`)
        ? SOURCE_CLASS.FIRST_PARTY
        : SOURCE_CLASS.OTHER;
    const valid = isCandidateValid(candidate);
    const metadata = {
      candidate,
      inputIndex,
      recencyBucket,
      sourceClass,
      duplicateClusterId: null,
      representative: false,
    };
    metadataByInputIndex.set(inputIndex, metadata);
    if (valid) validItems.push(metadata);
  });

  const clusters = clusterCandidates(validItems, context.companyName);
  const representatives = [];
  for (const cluster of clusters) {
    for (const item of cluster.group) item.duplicateClusterId = cluster.duplicateClusterId;
    cluster.representative.representative = true;
    representatives.push(cluster.representative);
  }

  representatives.sort(comparePreference);
  const selectedItems = representatives.slice(0, 3);
  const selectedInputIndexes = new Set(selectedItems.map((item) => item.inputIndex));

  const selected = selectedItems.map((item) => ({
    ...cloneCandidate(item.candidate),
    recencyBucket: item.recencyBucket,
    sourceClass: item.sourceClass,
    duplicateClusterId: item.duplicateClusterId,
  }));

  const evaluated = candidates.map((candidate, inputIndex) => {
    const metadata = metadataByInputIndex.get(inputIndex);
    let reason = SELECTION_REASON.INVALID;
    if (isCandidateValid(candidate)) {
      if (!metadata.representative) reason = SELECTION_REASON.DUPLICATE;
      else if (selectedInputIndexes.has(inputIndex)) reason = SELECTION_REASON.SELECTED;
      else reason = SELECTION_REASON.LOWER_PRIORITY;
    }

    return {
      candidate: cloneCandidate(candidate),
      recencyBucket: metadata.recencyBucket,
      sourceClass: metadata.sourceClass,
      duplicateClusterId: metadata.duplicateClusterId,
      selected: selectedInputIndexes.has(inputIndex),
      reason,
    };
  });

  return { selected, evaluated };
}
