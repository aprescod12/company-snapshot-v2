import assert from "node:assert/strict";
import test from "node:test";

import snapshotEndpoint, { createSnapshotHandler } from "../api/snapshot.mjs";

const ENDPOINT_URL = "https://company-snapshot.test/api/snapshot";
const API_KEY = "secret-test-api-key";

function post(body, headers = { "Content-Type": "application/json" }) {
  return new Request(ENDPOINT_URL, {
    method: "POST",
    headers,
    body,
  });
}

function postJson(body) {
  return post(JSON.stringify(body));
}

async function readJson(response) {
  assert.match(response.headers.get("content-type") ?? "", /^application\/json\b/);
  assert.equal(response.headers.get("cache-control"), "no-store");
  return response.json();
}

function buildHandler(snapshotService, env = { EXA_API_KEY: API_KEY }) {
  return createSnapshotHandler({ snapshotService, env });
}

const SNAPSHOT = Object.freeze({
  state: "snapshot",
  company: Object.freeze({
    name: "Acme Corporation",
    domain: "acme.test",
    description: "Acme builds logistics software. Operations teams use it to coordinate shipments.",
  }),
  signals: Object.freeze([
    Object.freeze({
      title: "Acme launches Route One",
      publishedDate: "2026-09-08",
      sourceUrl: "https://acme.test/news/route-one?ref=exact#launch",
      recencyBucket: "RECENT",
    }),
    Object.freeze({
      title: "Acme expands in Canada",
      publishedDate: "2026-08-20",
      sourceUrl: "https://news.example/acme-expands-canada",
      recencyBucket: "RECENT",
    }),
    Object.freeze({
      title: "Acme partners with Northwind",
      publishedDate: "2026-04-01",
      sourceUrl: "https://acme.test/news/northwind%20partnership",
      recencyBucket: "FALLBACK",
    }),
  ]),
});

test("the Vercel entry point exposes a Web-standard fetch handler", () => {
  assert.equal(typeof snapshotEndpoint.fetch, "function");
});

test("valid POST calls B5 exactly once and passes a complete snapshot through without rewriting source URLs", async () => {
  const calls = [];
  const handler = buildHandler(async (...args) => {
    calls.push(args);
    return SNAPSHOT;
  });

  const response = await handler(postJson({ input: "  Acme  ", apiKey: "client-supplied-key" }));
  const body = await readJson(response);

  assert.equal(response.status, 200);
  assert.deepEqual(body, SNAPSHOT);
  assert.deepEqual(body.company, SNAPSHOT.company);
  assert.equal(body.company.description, SNAPSHOT.company.description);
  assert.equal(body.signals.length, 3);
  assert.deepEqual(
    body.signals.map((signal) => signal.sourceUrl),
    SNAPSHOT.signals.map((signal) => signal.sourceUrl),
  );
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], "  Acme  ");
  assert.equal(calls[0][1], API_KEY);
  assert.notEqual(calls[0][1], "client-supplied-key");
  assert.equal(calls[0].length, 2);
  assert.equal(JSON.stringify(body).includes(API_KEY), false);
});

test("all non-snapshot B5 states pass through unchanged with one service call each", async () => {
  const results = [
    { state: "clarification_needed", reason: "company_ambiguous" },
    { state: "insufficient_evidence", company: SNAPSHOT.company, signals: [] },
    { state: "insufficient_evidence", company: SNAPSHOT.company, signals: [SNAPSHOT.signals[0]] },
    { state: "insufficient_evidence", company: SNAPSHOT.company, signals: SNAPSHOT.signals.slice(0, 2) },
    { state: "unavailable", reason: "description_unavailable" },
    { state: "unavailable", reason: "provider_unavailable" },
  ];

  for (const result of results) {
    let calls = 0;
    const handler = buildHandler(async () => {
      calls += 1;
      return result;
    });

    const response = await handler(postJson({ input: "Acme" }));
    assert.equal(response.status, 200);
    assert.deepEqual(await readJson(response), result);
    assert.equal(calls, 1);
  }
});

test("missing, non-string, and empty input are rejected before B5", async () => {
  const invalidBodies = [
    {},
    { input: null },
    { input: 42 },
    { input: false },
    { input: {} },
    { input: [] },
    { input: "" },
    { input: "   \n\t" },
    null,
    [],
  ];
  let calls = 0;
  const handler = buildHandler(async () => {
    calls += 1;
    throw new Error("must not run");
  });

  for (const invalidBody of invalidBodies) {
    const response = await handler(postJson(invalidBody));
    assert.equal(response.status, 400);
    assert.deepEqual(await readJson(response), { state: "clarification_needed", reason: "invalid_input" });
  }
  assert.equal(calls, 0);
});

test("malformed JSON is rejected safely without calling B5", async () => {
  let calls = 0;
  const handler = buildHandler(async () => {
    calls += 1;
    throw new Error("must not run");
  });

  const response = await handler(post('{"input":'));

  assert.equal(response.status, 400);
  assert.deepEqual(await readJson(response), { state: "clarification_needed", reason: "invalid_input" });
  assert.equal(calls, 0);
});

test("unsupported methods return a JSON 405 with Allow: POST and never call B5", async () => {
  let calls = 0;
  const handler = buildHandler(async () => {
    calls += 1;
    throw new Error("must not run");
  });

  for (const method of ["GET", "PUT", "DELETE", "OPTIONS"]) {
    const response = await handler(new Request(ENDPOINT_URL, { method }));
    assert.equal(response.status, 405);
    assert.equal(response.headers.get("allow"), "POST");
    assert.deepEqual(await readJson(response), { state: "clarification_needed", reason: "invalid_input" });
  }
  assert.equal(calls, 0);
});

test("missing server API-key configuration is sanitized and blocks B5", async () => {
  let calls = 0;
  const handler = buildHandler(
    async () => {
      calls += 1;
      throw new Error("must not run");
    },
    {},
  );

  const response = await handler(postJson({ input: "Acme" }));
  const text = await response.text();

  assert.equal(response.status, 503);
  assert.match(response.headers.get("content-type") ?? "", /^application\/json\b/);
  assert.deepEqual(JSON.parse(text), { state: "unavailable", reason: "provider_unavailable" });
  assert.doesNotMatch(text, /EXA_API_KEY|undefined|configuration/i);
  assert.equal(calls, 0);
});

test("blank server API-key configuration is treated as missing without trimming a valid key", async () => {
  for (const apiKey of ["", "   \n"]) {
    let calls = 0;
    const handler = buildHandler(async () => {
      calls += 1;
    }, { EXA_API_KEY: apiKey });

    const response = await handler(postJson({ input: "Acme" }));
    assert.equal(response.status, 503);
    assert.deepEqual(await readJson(response), { state: "unavailable", reason: "provider_unavailable" });
    assert.equal(calls, 0);
  }

  const spacedKey = "  valid-secret-key  ";
  let receivedKey;
  const handler = buildHandler(async (_input, apiKey) => {
    receivedKey = apiKey;
    return { state: "clarification_needed", reason: "company_ambiguous" };
  }, { EXA_API_KEY: spacedKey });
  await handler(postJson({ input: "Acme" }));
  assert.equal(receivedKey, spacedKey);
});

test("unexpected backend errors are sanitized, never retried, and cannot leak messages, stacks, provider details, or the API key", async () => {
  let calls = 0;
  const providerBody = '{"tag":"provider_auth","authorization":"Bearer secret-test-api-key"}';
  const error = new Error(`Exa HTTP 401: ${providerBody}`);
  error.stack = `Error: ${error.message}\n    at provider-internals.mjs:42:7`;
  const handler = buildHandler(async () => {
    calls += 1;
    throw error;
  });

  const response = await handler(postJson({ input: "Acme" }));
  const text = await response.text();

  assert.equal(response.status, 500);
  assert.deepEqual(JSON.parse(text), { state: "unavailable", reason: "provider_unavailable" });
  assert.equal(calls, 1);
  const serializedHeaders = JSON.stringify(Object.fromEntries(response.headers));
  for (const secret of [API_KEY, "Bearer", "provider_auth", "authorization", "provider-internals", "Exa HTTP 401"]) {
    assert.equal(text.includes(secret), false);
    assert.equal(serializedHeaders.includes(secret), false);
  }
});
