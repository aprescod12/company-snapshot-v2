import assert from "node:assert/strict";
import http from "node:http";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { createHarnessServer } from "../scripts/c3-local-ui-harness.mjs";
import { isValidPublicResult } from "../public/app.js";

async function withServer(run) {
  const server = createHarnessServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { address, port } = server.address();
  try {
    await run(`http://${address}:${port}`);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

function post(base, input) {
  return fetch(`${base}/api/snapshot`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ input }),
  });
}

function rawGet(base, rawPath) {
  return new Promise((resolve, reject) => {
    const url = new URL(base);
    const req = http.get({ hostname: url.hostname, port: url.port, path: rawPath }, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => resolve({ status: res.statusCode, body: data }));
    });
    req.on("error", reject);
  });
}

test("binds to loopback only", async () => {
  await withServer(async (base) => {
    assert.equal(new URL(base).hostname, "127.0.0.1");
  });
});

test("serves the real frontend index, script, and stylesheet", async () => {
  await withServer(async (base) => {
    const html = await fetch(`${base}/`);
    assert.equal(html.status, 200);
    assert.match(html.headers.get("content-type") ?? "", /text\/html/);
    assert.match(await html.text(), /<title>Company Snapshot<\/title>/);

    const script = await fetch(`${base}/app.js`);
    assert.equal(script.status, 200);
    assert.match(script.headers.get("content-type") ?? "", /javascript/);

    const styles = await fetch(`${base}/styles.css`);
    assert.equal(styles.status, 200);
    assert.match(styles.headers.get("content-type") ?? "", /text\/css/);
  });
});

test("rejects encoded path traversal outside the public directory", async () => {
  await withServer(async (base) => {
    for (const rawPath of ["/%2e%2e/%2e%2e/AGENTS.md", "/%2e%2e/api/snapshot.mjs", "/..%2f..%2fpackage.json"]) {
      const { status, body } = await rawGet(base, rawPath);
      assert.ok([400, 403, 404].includes(status), `${rawPath} -> ${status}`);
      assert.equal(body.includes("EXA_API_KEY"), false);
    }
  });
});

test("returns a deterministic snapshot fixture with exactly three distinct-source signals", async () => {
  await withServer(async (base) => {
    const response = await post(base, "c3:snapshot");
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(isValidPublicResult(body), true);
    assert.equal(body.state, "snapshot");
    assert.equal(body.signals.length, 3);
    assert.equal(new Set(body.signals.map((signal) => signal.sourceUrl)).size, 3);
    assert.ok(body.signals.some((signal) => signal.recencyBucket === "FALLBACK"));
    assert.equal(body.company.domain, "example.test");
  });
});

test("returns insufficient-evidence fixtures preserving 0, 1, and 2 signals without padding", async () => {
  await withServer(async (base) => {
    for (const [trigger, count] of [
      ["c3:insufficient-0", 0],
      ["c3:insufficient-1", 1],
      ["c3:insufficient-2", 2],
    ]) {
      const body = await (await post(base, trigger)).json();
      assert.equal(isValidPublicResult(body), true);
      assert.equal(body.state, "insufficient_evidence");
      assert.equal(body.signals.length, count);
    }
  });
});

test("returns both documented clarification reasons", async () => {
  await withServer(async (base) => {
    assert.deepEqual(await (await post(base, "c3:clarification-ambiguous")).json(), {
      state: "clarification_needed",
      reason: "company_ambiguous",
    });
    assert.deepEqual(await (await post(base, "c3:clarification-invalid")).json(), {
      state: "clarification_needed",
      reason: "invalid_input",
    });
  });
});

test("returns the sanitized unavailable state", async () => {
  await withServer(async (base) => {
    assert.deepEqual(await (await post(base, "c3:unavailable")).json(), { state: "unavailable" });
  });
});

test("simulates a non-JSON transport failure on request", async () => {
  await withServer(async (base) => {
    const response = await post(base, "c3:transport-error");
    assert.equal(response.status, 200);
    const text = await response.text();
    assert.throws(() => JSON.parse(text));
  });
});

test("simulates an artificial delay for manual loading-state validation only", async () => {
  await withServer(async (base) => {
    const start = Date.now();
    const response = await post(base, "c3:delay:200");
    const elapsed = Date.now() - start;
    assert.equal(response.status, 200);
    assert.ok(elapsed >= 190, `expected an artificial delay, elapsed ${elapsed}ms`);
    assert.equal((await response.json()).state, "snapshot");
  });
});

test("unrecognized non-empty input still returns a safe synthetic fixture, never a real company fact", async () => {
  await withServer(async (base) => {
    const body = await (await post(base, "Stripe")).json();
    assert.equal(body.company.domain, "example.test");
  });
});

test("rejects blank input with the same shape as the production contract", async () => {
  await withServer(async (base) => {
    const response = await post(base, "   ");
    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), { state: "clarification_needed", reason: "invalid_input" });
  });
});

test("malformed JSON body fails safely without crashing the harness", async () => {
  await withServer(async (base) => {
    const response = await fetch(`${base}/api/snapshot`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{not json",
    });
    assert.equal(response.status, 400);
  });
});

test("only POST is accepted on the API route", async () => {
  await withServer(async (base) => {
    const response = await fetch(`${base}/api/snapshot`);
    assert.equal(response.status, 405);
  });
});

test("harness source never imports production api/orchestration code and never reads EXA_API_KEY", async () => {
  const source = await readFile(new URL("../scripts/c3-local-ui-harness.mjs", import.meta.url), "utf8");
  assert.equal(/from\s+["']\.\.\/api\//.test(source), false);
  assert.equal(/from\s+["']\.\.\/src\//.test(source), false);
  assert.equal(/(?:process\.)?env(?:\.|\[)["']?EXA_API_KEY/.test(source), false);
  assert.match(source, /DEVELOPMENT\/TEST-ONLY/);
  assert.match(source, /127\.0\.0\.1/);
});

test("no synthetic fixture trigger is special-cased by the real production endpoint", async () => {
  const { createSnapshotHandler } = await import("../api/snapshot.mjs");
  let receivedInput;
  const handler = createSnapshotHandler({
    snapshotService: async (input) => {
      receivedInput = input;
      return { state: "clarification_needed", reason: "company_ambiguous" };
    },
    env: { EXA_API_KEY: "test-key" },
  });

  const response = await handler(
    new Request("https://company-snapshot.test/api/snapshot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ input: "c3:snapshot" }),
    }),
  );

  assert.equal(response.status, 200);
  assert.equal(receivedInput, "c3:snapshot");

  const source = await readFile(new URL("../api/snapshot.mjs", import.meta.url), "utf8");
  assert.equal(source.includes("c3:"), false);
});
