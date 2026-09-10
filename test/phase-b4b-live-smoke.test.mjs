import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  ALLOWED_CASES,
  B4B_LIVE_SMOKE_MODE,
  formatSmokeOutput,
  parseArgs,
  runB4bLiveSmoke,
  validateOptions,
} from "../scripts/phase-b4b-live-smoke.mjs";

function ok(value) {
  return { ok: true, status: 200, json: async () => value };
}

function successPayload(url, summary) {
  return {
    results: [{ id: url, url, title: "Company", summary }],
    statuses: [{ id: url, status: "success", source: "cached" }],
    costDollars: { total: 0.004 },
  };
}

test("B4B live smoke restricts live use to NVIDIA or stripe.com with confirmation and a key", () => {
  assert.throws(() => validateOptions({ mode: B4B_LIVE_SMOKE_MODE, company: "Mercury", confirmedFreeStarter: true }, "key"), /restricted/);
  assert.throws(() => validateOptions({ mode: B4B_LIVE_SMOKE_MODE, company: "NVIDIA", confirmedFreeStarter: false }, "key"), /confirmed-free-starter/);
  assert.throws(() => validateOptions({ mode: B4B_LIVE_SMOKE_MODE, company: "NVIDIA", confirmedFreeStarter: true }, ""), /EXA_API_KEY/);
  assert.throws(() => validateOptions({ mode: "other", company: "NVIDIA", confirmedFreeStarter: true }, "key"), /Phase B4B/);
  assert.doesNotThrow(() => validateOptions({ mode: B4B_LIVE_SMOKE_MODE, company: "stripe.com", confirmedFreeStarter: true }, "key"));
});

test("parseArgs reads --company and --confirmed-free-starter and rejects unknown flags", () => {
  assert.deepEqual(parseArgs([B4B_LIVE_SMOKE_MODE, "--company", "NVIDIA", "--confirmed-free-starter"]), {
    mode: B4B_LIVE_SMOKE_MODE,
    company: "NVIDIA",
    confirmedFreeStarter: true,
  });
  assert.deepEqual(parseArgs(["--help"]), { help: true });
  assert.throws(() => parseArgs([B4B_LIVE_SMOKE_MODE, "--bogus"]), /Unknown argument/);
});

test("B4B live smoke calls only the description path exactly once for the fixed NVIDIA case", async () => {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push(url);
    return ok(successPayload("https://nvidia.com/", "NVIDIA designs GPUs and accelerated computing platforms. Enterprises and researchers use them for graphics, AI, and data-center workloads."));
  };
  const summary = await runB4bLiveSmoke(
    { mode: B4B_LIVE_SMOKE_MODE, company: "NVIDIA", confirmedFreeStarter: true },
    "test-key",
    { fetchImpl },
  );

  assert.equal(calls.length, 1);
  assert.equal(calls[0], "https://api.exa.ai/contents");
  assert.equal(summary.submittedCase, "NVIDIA");
  assert.deepEqual(summary.company, ALLOWED_CASES.NVIDIA);
  assert.equal(summary.state, "described");
  assert.equal(summary.sourceUrl, "https://nvidia.com/");
  assert.equal(typeof summary.provider.latencyMs, "number");
});

test("B4B live smoke reports an honest description_unavailable state without throwing", async () => {
  const fetchImpl = async () => ok({ results: [], statuses: [{ id: "https://stripe.com/", status: "error", error: { tag: "CRAWL_NOT_FOUND", httpStatusCode: 404 } }] });
  const summary = await runB4bLiveSmoke(
    { mode: B4B_LIVE_SMOKE_MODE, company: "stripe.com", confirmedFreeStarter: true },
    "test-key",
    { fetchImpl },
  );

  assert.equal(summary.state, "description_unavailable");
  assert.equal(summary.reason, "unsuccessful_status");
  assert.equal(Object.hasOwn(summary, "description"), false);
});

test("B4B live smoke blocks before any request without confirmation or a key", async () => {
  const calls = [];
  const fetchImpl = async (url) => {
    calls.push(url);
    return ok(successPayload("https://nvidia.com/", "x"));
  };
  await assert.rejects(() => runB4bLiveSmoke({ mode: B4B_LIVE_SMOKE_MODE, company: "NVIDIA", confirmedFreeStarter: false }, "test-key", { fetchImpl }));
  await assert.rejects(() => runB4bLiveSmoke({ mode: B4B_LIVE_SMOKE_MODE, company: "NVIDIA", confirmedFreeStarter: true }, "", { fetchImpl }));
  assert.equal(calls.length, 0);
});

test("B4B live smoke does not retry a failed request", async () => {
  const calls = [];
  const fetchImpl = async (url) => {
    calls.push(url);
    return { ok: false, status: 500, json: async () => ({}) };
  };
  await assert.rejects(() =>
    runB4bLiveSmoke({ mode: B4B_LIVE_SMOKE_MODE, company: "NVIDIA", confirmedFreeStarter: true }, "test-key", { fetchImpl }),
  );
  assert.equal(calls.length, 1);
});

test("B4B live smoke output is sanitized and the harness has no persistence, Search, or B1/B2/B3 import", () => {
  const source = readFileSync(new URL("../scripts/phase-b4b-live-smoke.mjs", import.meta.url), "utf8");
  assert.equal(/writeFile|createWriteStream|fs\.write/.test(source), false);
  assert.equal(/discoverCompany|verifyCompanyDiscovery|companyTarget|selectSignals|assembleSnapshot/.test(source), false);
  assert.equal(/exaBroadDiscovery|requestExaBroadDiscovery|requestOfficialDomainFallback/.test(source), false);
  assert.equal(/retry|attempt \+\+|for \(let attempt/i.test(source), false);

  const output = formatSmokeOutput({ description: "safe" }, "exa-super-secret-key-0123456789");
  assert.equal(output.includes("exa-super-secret-key-0123456789"), false);
  assert.equal(redactedContains(formatSmokeOutput("exa_abcdefghijklmnopqrstuvwx")), false);

  function redactedContains(text) {
    return text.includes("exa_abcdefghijklmnopqrstuvwx");
  }
});
