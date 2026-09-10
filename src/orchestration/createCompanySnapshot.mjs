import { BroadDiscoveryError } from "../discovery/exaBroadDiscovery.mjs";
import { discoverCompany } from "../discovery/discoverCompany.mjs";
import { CompanyDescriptionError, requestCompanyDescription } from "../description/exaCompanyDescription.mjs";
import { assembleSnapshot } from "../snapshot/assembleSnapshot.mjs";
import { verifyCompanyDiscovery } from "../verification/verifyCompany.mjs";

const DEFAULT_SERVICES = Object.freeze({
  discoverCompany,
  verifyCompanyDiscovery,
  requestCompanyDescription,
  assembleSnapshot,
});

function clarificationReason(reason) {
  return reason === "invalid_input" ? "invalid_input" : "company_ambiguous";
}

function unavailable(reason) {
  return { state: "unavailable", reason };
}

/**
 * Composes the approved B1/B2 -> B3 -> B4B -> B4A production exports into one
 * stable application-facing result. It performs no retrieval, verification,
 * selection, or synthesis itself; each stage's own module owns that behavior
 * and its own Search/Contents budget. Known provider-layer failures
 * (`BroadDiscoveryError`, `CompanyDescriptionError`) map to a narrow
 * `unavailable` state; any other error is unexpected and is rethrown so a
 * programming defect stays visible.
 */
export async function createCompanySnapshot(rawInput, apiKey, options = {}) {
  const { now = new Date(), services = {} } = options;
  const { discoverCompany, verifyCompanyDiscovery, requestCompanyDescription, assembleSnapshot } = {
    ...DEFAULT_SERVICES,
    ...services,
  };

  let discovery;
  try {
    discovery = await discoverCompany(rawInput, apiKey, { now });
  } catch (error) {
    if (error instanceof BroadDiscoveryError) return unavailable("provider_unavailable");
    throw error;
  }

  if (discovery.state === "clarification_needed") {
    return { state: "clarification_needed", reason: clarificationReason(discovery.reason) };
  }

  let verification;
  try {
    verification = await verifyCompanyDiscovery(discovery, apiKey, { now });
  } catch (error) {
    if (error instanceof BroadDiscoveryError) return unavailable("provider_unavailable");
    throw error;
  }

  let described;
  try {
    described = await requestCompanyDescription(
      { companyName: verification.company.companyName, officialDomain: verification.company.officialDomain },
      apiKey,
    );
  } catch (error) {
    if (error instanceof CompanyDescriptionError) return unavailable("provider_unavailable");
    throw error;
  }

  if (described.state === "description_unavailable") {
    return unavailable("description_unavailable");
  }

  return assembleSnapshot({ verification, description: described.description });
}
