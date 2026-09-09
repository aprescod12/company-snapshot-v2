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

/**
 * Run the B2 request and return a sanitized diagnostic summary for the bounded
 * smoke harness. It intentionally never returns raw candidates for an
 * unresolved identity.
 */
async function runCompanyDiscovery(
  rawInput,
  apiKey,
  { fetchImpl = fetch, now = new Date(), timeoutMs, onDiagnostic } = {},
) {
  const target = prepareCompanyTarget(rawInput);
  if (target.status !== TARGET_STATUS.PREPARED) {
    const diagnostic = {
      identity: null,
      groundingByField: null,
      confirmation: { state: target.status, reason: target.reason },
      provider: null,
    };
    if (typeof onDiagnostic === "function") onDiagnostic(diagnostic);
    return clarification(target.reason);
  }

  const queryTarget = target.kind === "name" ? target.companyName : target.officialDomain;
  const providerResult = await requestExaBroadDiscovery(queryTarget, apiKey, {
    fetchImpl,
    now,
    ...(timeoutMs === undefined ? {} : { timeoutMs }),
  });
  const identityResult = confirmCompanyIdentity(target, buildIdentityEvidence(providerResult));
  const diagnostic = summarizeDiagnostic(providerResult, identityResult);
  if (typeof onDiagnostic === "function") onDiagnostic(diagnostic);
  if (identityResult.status !== TARGET_STATUS.RESOLVED) {
    return clarification(identityResult.reason);
  }

  const selection = selectSignals(providerResult.candidates, {
    companyName: identityResult.companyName,
    officialDomain: identityResult.officialDomain,
    now,
  });

  return {
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
    provider: diagnostic.provider,
  };
}

/**
 * Make one broad Exa discovery request for a B1-prepared company target.
 * This function deliberately stops before source verification or fallback.
 */
export async function discoverCompany(
  rawInput,
  apiKey,
  { fetchImpl = fetch, now = new Date(), timeoutMs, onDiagnostic } = {},
) {
  return runCompanyDiscovery(rawInput, apiKey, {
    fetchImpl,
    now,
    ...(timeoutMs === undefined ? {} : { timeoutMs }),
    ...(onDiagnostic === undefined ? {} : { onDiagnostic }),
  });
}
