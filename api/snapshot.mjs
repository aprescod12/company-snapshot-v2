import { createCompanySnapshot } from "../src/orchestration/createCompanySnapshot.mjs";

const INVALID_INPUT = Object.freeze({ state: "clarification_needed", reason: "invalid_input" });
const UNAVAILABLE = Object.freeze({ state: "unavailable", reason: "provider_unavailable" });

function jsonResponse(body, status, extraHeaders = {}) {
  return Response.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
      ...extraHeaders,
    },
  });
}

/**
 * Creates the thin HTTP adapter around the frozen B5 orchestration entry point.
 * The injectable functions are a zero-network test seam; production uses the
 * real service and reads the API key from the server environment per request.
 */
export function createSnapshotHandler({
  snapshotService = createCompanySnapshot,
  env = process.env,
} = {}) {
  return async function handleSnapshotRequest(request) {
    if (request.method !== "POST") {
      return jsonResponse(INVALID_INPUT, 405, { Allow: "POST" });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return jsonResponse(INVALID_INPUT, 400);
    }

    if (
      !body ||
      typeof body !== "object" ||
      Array.isArray(body) ||
      typeof body.input !== "string" ||
      body.input.trim().length === 0
    ) {
      return jsonResponse(INVALID_INPUT, 400);
    }

    const apiKey = env.EXA_API_KEY;
    if (typeof apiKey !== "string" || apiKey.trim().length === 0) {
      return jsonResponse(UNAVAILABLE, 503);
    }

    try {
      const result = await snapshotService(body.input, apiKey);
      return jsonResponse(result, 200);
    } catch {
      return jsonResponse(UNAVAILABLE, 500);
    }
  };
}

const handleSnapshotRequest = createSnapshotHandler();

export default {
  fetch: handleSnapshotRequest,
};
