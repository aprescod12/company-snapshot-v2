export const TARGET_KIND = Object.freeze({
  NAME: "name",
  DOMAIN: "domain",
});

export const TARGET_STATUS = Object.freeze({
  PREPARED: "prepared",
  RESOLVED: "resolved",
  CLARIFICATION_NEEDED: "clarification_needed",
});

const HTTP_PROTOCOLS = new Set(["http:", "https:"]);
const NAME_SUFFIXES = new Set(["co", "company", "corp", "corporation", "inc", "ltd", "llc", "plc"]);

function clarification(reason) {
  return { status: TARGET_STATUS.CLARIFICATION_NEEDED, reason };
}

function normalizeHostname(hostname) {
  const normalized = hostname.toLowerCase().replace(/\.$/, "");
  const withoutWww = normalized.startsWith("www.") ? normalized.slice(4) : normalized;
  if (!withoutWww || withoutWww.split(".").some((label) => !label)) return "";
  return withoutWww;
}

function isPublicDomainHostname(hostname) {
  if (!hostname.includes(".") || hostname === "localhost" || hostname.endsWith(".localhost")) {
    return false;
  }

  return !/^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname);
}

function parseHttpUrl(value) {
  if (typeof value !== "string" || value.trim() !== value || value.length === 0) return null;

  try {
    const parsed = new URL(value);
    if (
      !HTTP_PROTOCOLS.has(parsed.protocol) ||
      !parsed.hostname ||
      parsed.username ||
      parsed.password
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function parseDomainInput(value) {
  const hasScheme = /^[a-z][a-z\d+.-]*:/i.test(value);
  let parsed;

  try {
    parsed = hasScheme ? new URL(value) : new URL(`https://${value}`);
  } catch {
    return null;
  }

  if (
    !HTTP_PROTOCOLS.has(parsed.protocol) ||
    !parsed.hostname ||
    parsed.username ||
    parsed.password
  ) {
    return null;
  }

  const hostname = normalizeHostname(parsed.hostname);
  return hostname && isPublicDomainHostname(hostname) ? hostname : null;
}

function looksLikeWebsiteInput(value) {
  if (/^[a-z][a-z\d+.-]*:/i.test(value) || /^www\./i.test(value)) return true;
  if (/\s/.test(value)) return false;
  return /[./?#@]/.test(value);
}

function normalizeName(value) {
  return value.replace(/\s+/g, " ").trim();
}

function normalizedWords(value) {
  return value
    .toLocaleLowerCase("en-US")
    .match(/[\p{L}\p{N}]+/gu)
    ?.filter((word) => !NAME_SUFFIXES.has(word)) ?? [];
}

function namesAreConsistent(submittedName, resolvedName) {
  const submitted = normalizedWords(submittedName);
  const resolved = normalizedWords(resolvedName);
  if (submitted.length === 0 || resolved.length === 0) return false;

  const submittedText = submitted.join(" ");
  const resolvedText = resolved.join(" ");
  return submittedText === resolvedText || resolvedText.startsWith(`${submittedText} `);
}

function namesStrictlyMatch(submittedName, resolvedName) {
  const submitted = normalizedWords(submittedName);
  const resolved = normalizedWords(resolvedName);
  return submitted.length > 0 && submitted.join(" ") === resolved.join(" ");
}

function isSameDomainOrSubdomain(hostname, officialDomain) {
  return hostname === officialDomain || hostname.endsWith(`.${officialDomain}`);
}

function normalizeEvidenceDomain(value) {
  if (typeof value !== "string" || value.trim() !== value || value.length === 0) return null;
  if (/^[a-z][a-z\d+.-]*:/i.test(value)) return null;

  try {
    const parsed = new URL(`https://${value}`);
    if (parsed.username || parsed.password || parsed.pathname !== "/" || parsed.search || parsed.hash) {
      return null;
    }
    const hostname = normalizeHostname(parsed.hostname);
    return hostname && isPublicDomainHostname(hostname) ? hostname : null;
  } catch {
    return null;
  }
}

function evidenceCorroboratesDomain(evidenceUrls, officialDomain) {
  return (
    Array.isArray(evidenceUrls) &&
    evidenceUrls.some((value) => {
      const parsed = parseHttpUrl(value);
      return parsed && isSameDomainOrSubdomain(normalizeHostname(parsed.hostname), officialDomain);
    })
  );
}

function fieldSpecificGroundingCorroboratesDomain(groundingByField, officialDomain) {
  if (!groundingByField || typeof groundingByField !== "object" || Array.isArray(groundingByField)) {
    return false;
  }
  return (
    evidenceCorroboratesDomain(groundingByField.resolvedCompanyName, officialDomain) &&
    evidenceCorroboratesDomain(groundingByField.officialDomain, officialDomain)
  );
}

/**
 * Classify a user-entered company name or website without any lookup or domain guessing.
 *
 * @param {unknown} rawInput
 * @returns {{status: "prepared", kind: "name"|"domain", submittedInput: string, companyName: string|null, officialDomain: string|null}|{status: "clarification_needed", reason: string}}
 */
export function prepareCompanyTarget(rawInput) {
  if (typeof rawInput !== "string") return clarification("invalid_input");

  const input = rawInput.trim();
  if (!input) return clarification("invalid_input");

  if (!looksLikeWebsiteInput(input)) {
    return {
      status: TARGET_STATUS.PREPARED,
      kind: TARGET_KIND.NAME,
      submittedInput: input,
      companyName: normalizeName(input),
      officialDomain: null,
    };
  }

  const officialDomain = parseDomainInput(input);
  if (!officialDomain) return clarification("invalid_input");

  return {
    status: TARGET_STATUS.PREPARED,
    kind: TARGET_KIND.DOMAIN,
    submittedInput: input,
    companyName: null,
    officialDomain,
  };
}

/**
 * Confirm later, caller-supplied identity evidence without fetching or resolving anything.
 * Evidence URLs must be complete HTTP(S) URLs. `officialDomain` is a hostname only.
 *
 * @param {ReturnType<typeof prepareCompanyTarget>} target
 * @param {{resolvedCompanyName?: unknown, officialDomain?: unknown, evidenceUrls?: unknown, groundingByField?: unknown, ambiguous?: unknown, contradictory?: unknown}|undefined} identityEvidence
 * @returns {{status: "resolved", kind: "name"|"domain", companyName: string|null, officialDomain: string}|{status: "clarification_needed", reason: string}}
 */
export function confirmCompanyIdentity(target, identityEvidence) {
  if (!target || target.status !== TARGET_STATUS.PREPARED) {
    return clarification("invalid_target");
  }

  const evidence = identityEvidence && typeof identityEvidence === "object" ? identityEvidence : {};
  if (evidence.contradictory === true) {
    return clarification("ambiguous_identity");
  }

  if (target.kind === TARGET_KIND.DOMAIN) {
    const hasIdentityEvidence =
      evidence.resolvedCompanyName !== undefined ||
      evidence.officialDomain !== undefined ||
      evidence.evidenceUrls !== undefined;
    if (!hasIdentityEvidence) {
      return {
        status: TARGET_STATUS.RESOLVED,
        kind: TARGET_KIND.DOMAIN,
        companyName: null,
        officialDomain: target.officialDomain,
      };
    }

    const resolvedCompanyName =
      typeof evidence.resolvedCompanyName === "string" ? normalizeName(evidence.resolvedCompanyName) : "";
    const proposedDomain =
      evidence.officialDomain === undefined ? null : normalizeEvidenceDomain(evidence.officialDomain);
    if (!resolvedCompanyName || !proposedDomain || !Array.isArray(evidence.evidenceUrls)) {
      return clarification("invalid_identity_evidence");
    }
    if (proposedDomain && !isSameDomainOrSubdomain(proposedDomain, target.officialDomain)) {
      return clarification("contradictory_identity");
    }
    if (!evidenceCorroboratesDomain(evidence.evidenceUrls, target.officialDomain)) {
      return clarification("insufficient_identity_evidence");
    }

    return {
      status: TARGET_STATUS.RESOLVED,
      kind: TARGET_KIND.DOMAIN,
      companyName: resolvedCompanyName,
      officialDomain: target.officialDomain,
    };
  }

  const resolvedCompanyName =
    typeof evidence.resolvedCompanyName === "string" ? normalizeName(evidence.resolvedCompanyName) : "";
  const proposedDomain = normalizeEvidenceDomain(evidence.officialDomain);
  if (!resolvedCompanyName || !proposedDomain) {
    return clarification("insufficient_identity_evidence");
  }

  if (evidence.ambiguous === false) {
    if (!Array.isArray(evidence.evidenceUrls)) {
      return clarification("insufficient_identity_evidence");
    }
    if (!namesAreConsistent(target.companyName, resolvedCompanyName)) {
      return clarification("contradictory_identity");
    }
    if (!evidenceCorroboratesDomain(evidence.evidenceUrls, proposedDomain)) {
      return clarification("insufficient_identity_evidence");
    }
  } else if (evidence.ambiguous === true) {
    if (!namesStrictlyMatch(target.companyName, resolvedCompanyName)) {
      return clarification("insufficient_identity_evidence");
    }
    if (!fieldSpecificGroundingCorroboratesDomain(evidence.groundingByField, proposedDomain)) {
      return clarification("insufficient_identity_evidence");
    }
  } else {
    return clarification("insufficient_identity_evidence");
  }

  return {
    status: TARGET_STATUS.RESOLVED,
    kind: TARGET_KIND.NAME,
    companyName: resolvedCompanyName,
    officialDomain: proposedDomain,
  };
}
