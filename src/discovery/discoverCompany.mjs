import { selectSignals } from "../selection/selectSignals.mjs";
import { confirmCompanyIdentity, prepareCompanyTarget, TARGET_STATUS } from "../targeting/companyTarget.mjs";
import { candidateAggregates, requestExaBroadDiscovery } from "./exaBroadDiscovery.mjs";

function clarification(reason) {
  return { state: "clarification_needed", reason };
}

export function buildIdentityEvidence(providerResult) {
  return {
    ...providerResult.identity,
    evidenceUrls: providerResult.evidenceUrls,
  };
}

function summarizeDiagnostic(providerResult, identityResult) {
  return {
    identity: {
      resolvedCompanyName: providerResult.identity.resolvedCompanyName,
      officialDomain: providerResult.identity.officialDomain,
      ambiguous: providerResult.identity.ambiguous,
    },
    groundingByField: {
      resolvedCompanyName: [...providerResult.groundingByField.resolvedCompanyName],
      officialDomain: [...providerResult.groundingByField.officialDomain],
    },
    confirmation: {
      state: identityResult.status,
      reason: identityResult.reason ?? null,
    },
    provider: {
      latencyMs: providerResult.latencyMs,
      estimatedCostUsd: providerResult.estimatedCostUsd,
      ...candidateAggregates(providerResult.candidates),
    },
  };
}

async function runCompanyDiscovery(
  rawInput,
  apiKey,
  { fetchImpl = fetch, now = new Date(), timeoutMs } = {},
  includeDiagnostic = false,
) {
  const target = prepareCompanyTarget(rawInput);
  if (target.status !== TARGET_STATUS.PREPARED) {
    const result = clarification(target.reason);
    if (!includeDiagnostic) return result;
    return {
      result,
      diagnostic: {
        identity: null,
        groundingByField: null,
        confirmation: { state: target.status, reason: target.reason },
        provider: null,
      },
    };
  }

  const queryTarget = target.kind === "name" ? target.companyName : target.officialDomain;
  const providerResult = await requestExaBroadDiscovery(queryTarget, apiKey, {
    fetchImpl,
    now,
    ...(timeoutMs === undefined ? {} : { timeoutMs }),
  });
  const identityResult = confirmCompanyIdentity(target, buildIdentityEvidence(providerResult));
  const diagnostic = includeDiagnostic ? summarizeDiagnostic(providerResult, identityResult) : null;
  if (identityResult.status !== TARGET_STATUS.RESOLVED) {
    const result = clarification(identityResult.reason);
    return includeDiagnostic ? { result, diagnostic } : result;
  }

  const selection = selectSignals(providerResult.candidates, {
    companyName: identityResult.companyName,
    officialDomain: identityResult.officialDomain,
    now,
  });

  const result = {
    state: "ready_for_verification",
    company: {
      inputKind: identityResult.kind,
      companyName: identityResult.companyName,
      officialDomain: identityResult.officialDomain,
    },
    identityGrounding: providerResult.groundingByField,
    candidates: providerResult.candidates,
    prioritized: selection.prioritized,
    selected: selection.selected,
    evaluated: selection.evaluated,
    provider: {
      latencyMs: providerResult.latencyMs,
      estimatedCostUsd: providerResult.estimatedCostUsd,
      ...candidateAggregates(providerResult.candidates),
    },
  };
  return includeDiagnostic ? { result, diagnostic } : result;
}

/**
 * Make one broad Exa discovery request for a B1-prepared company target.
 * This function deliberately stops before source verification or fallback.
 */
export async function discoverCompany(
  rawInput,
  apiKey,
  { fetchImpl = fetch, now = new Date(), timeoutMs } = {},
) {
  return runCompanyDiscovery(rawInput, apiKey, {
    fetchImpl,
    now,
    ...(timeoutMs === undefined ? {} : { timeoutMs }),
  });
}

/**
 * Bounded smoke/test path. It uses the production discovery execution once,
 * then returns only its normal result plus a sanitized diagnostic summary.
 */
export async function discoverCompanyForSmoke(
  rawInput,
  apiKey,
  { fetchImpl = fetch, now = new Date(), timeoutMs } = {},
) {
  return runCompanyDiscovery(
    rawInput,
    apiKey,
    {
      fetchImpl,
      now,
      ...(timeoutMs === undefined ? {} : { timeoutMs }),
    },
    true,
  );
}
