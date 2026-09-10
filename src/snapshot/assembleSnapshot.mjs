const SUPPORTED_STATES = new Set(["verified", "insufficient_evidence"]);
const ELIGIBLE_RECENCY_BUCKETS = new Set(["RECENT", "FALLBACK"]);

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isHttpUrl(value) {
  if (!isNonEmptyString(value)) return false;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function assembleSignal(evidence) {
  if (
    !evidence ||
    typeof evidence !== "object" ||
    !isNonEmptyString(evidence.sourceTitle) ||
    !isNonEmptyString(evidence.publishedDate) ||
    !isHttpUrl(evidence.resolvedUrl) ||
    !ELIGIBLE_RECENCY_BUCKETS.has(evidence.recencyBucket)
  ) {
    throw new TypeError("assembleSnapshot requires a complete B3 evidence record.");
  }
  return {
    title: evidence.sourceTitle,
    publishedDate: evidence.publishedDate,
    sourceUrl: evidence.resolvedUrl,
    recencyBucket: evidence.recencyBucket,
  };
}

/**
 * Pure adapter from a completed B3 verification result plus an already-produced
 * description into the assessment-shaped snapshot. Performs no network, model,
 * or B1/B2/B3 invocation; it only maps fields already present on its input.
 */
export function assembleSnapshot({ verification, description } = {}) {
  if (!verification || typeof verification !== "object") {
    throw new TypeError("assembleSnapshot requires a verification result.");
  }
  if (!SUPPORTED_STATES.has(verification.state)) {
    throw new TypeError(`assembleSnapshot does not support verification state: ${verification.state}`);
  }
  const { company, evidence } = verification;
  if (!company || typeof company !== "object" || !isNonEmptyString(company.companyName) || !isNonEmptyString(company.officialDomain)) {
    throw new TypeError("assembleSnapshot requires a company name and official domain.");
  }
  if (!isNonEmptyString(description)) {
    throw new TypeError("assembleSnapshot requires a non-empty description.");
  }
  if (!Array.isArray(evidence)) {
    throw new TypeError("assembleSnapshot requires an evidence array.");
  }
  if (verification.state === "verified" && evidence.length !== 3) {
    throw new TypeError("verified requires exactly three evidence records.");
  }
  if (verification.state === "insufficient_evidence" && evidence.length > 2) {
    throw new TypeError("insufficient_evidence requires at most two evidence records.");
  }

  return {
    state: verification.state === "verified" ? "snapshot" : "insufficient_evidence",
    company: {
      name: company.companyName,
      domain: company.officialDomain,
      description,
    },
    signals: evidence.map(assembleSignal),
  };
}
