import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  createSnapshotController,
  formatPublishedDate,
  isSafeSourceUrl,
  isValidPublicResult,
  renderResult,
  sourceHostname,
} from "../public/app.js";

const company = {
  name: "Example Systems",
  domain: "example.test",
  description: "Example Systems makes software for testing product interfaces.",
};

function signal(index, overrides = {}) {
  return {
    title: `Synthetic signal ${index}`,
    publishedDate: "2026-09-01T00:00:00.000Z",
    sourceUrl: `https://publisher.example.test/article-${index}`,
    recencyBucket: "RECENT",
    ...overrides,
  };
}

function snapshotResult(overrides = {}) {
  return { state: "snapshot", company, signals: [signal(1), signal(2), signal(3)], ...overrides };
}

function response(body) {
  return { json: async () => body };
}

function deferred() {
  let resolve;
  const promise = new Promise((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

class FakeNode {
  constructor(tagName, text = undefined) {
    this.tagName = tagName;
    this.children = [];
    this.attributes = new Map();
    this.textContent = text;
    this.className = "";
  }

  append(...nodes) {
    this.children.push(...nodes);
  }

  replaceChildren(...nodes) {
    this.children = nodes;
  }

  setAttribute(name, value) {
    this.attributes.set(name, value);
  }

  getAttribute(name) {
    return this.attributes.get(name) ?? null;
  }
}

function fakeDocument() {
  return {
    createElement(tagName) {
      return new FakeNode(tagName);
    },
    createTextNode(text) {
      return new FakeNode("#text", text);
    },
  };
}

function allNodes(node) {
  return [node, ...node.children.flatMap(allNodes)];
}

test("validates a complete snapshot with exactly three safe signals", () => {
  assert.equal(isValidPublicResult(snapshotResult()), true);
});

test("rejects snapshot results with fewer than three signals", () => {
  assert.equal(isValidPublicResult(snapshotResult({ signals: [signal(1), signal(2)] })), false);
});

test("rejects snapshot results with more than three signals", () => {
  assert.equal(isValidPublicResult(snapshotResult({ signals: [signal(1), signal(2), signal(3), signal(4)] })), false);
});

test("accepts an insufficient-evidence result with no signals", () => {
  assert.equal(isValidPublicResult({ state: "insufficient_evidence", company, signals: [] }), true);
});

test("accepts an insufficient-evidence result with two actual signals", () => {
  assert.equal(isValidPublicResult({ state: "insufficient_evidence", company, signals: [signal(1), signal(2)] }), true);
});

test("rejects insufficient-evidence results with three signals", () => {
  assert.equal(isValidPublicResult({ state: "insufficient_evidence", company, signals: [signal(1), signal(2), signal(3)] }), false);
});

test("accepts both documented clarification reasons", () => {
  assert.equal(isValidPublicResult({ state: "clarification_needed", reason: "invalid_input" }), true);
  assert.equal(isValidPublicResult({ state: "clarification_needed", reason: "company_ambiguous" }), true);
});

test("rejects an undocumented clarification reason", () => {
  assert.equal(isValidPublicResult({ state: "clarification_needed", reason: "provider_debug" }), false);
});

test("accepts a sanitized unavailable state", () => {
  assert.equal(isValidPublicResult({ state: "unavailable" }), true);
});

test("rejects unknown public states", () => {
  assert.equal(isValidPublicResult({ state: "internal_error" }), false);
});

test("rejects signals without a title", () => {
  assert.equal(isValidPublicResult(snapshotResult({ signals: [signal(1, { title: "" }), signal(2), signal(3)] })), false);
});

test("rejects signals without a usable date", () => {
  assert.equal(isValidPublicResult(snapshotResult({ signals: [signal(1, { publishedDate: "" }), signal(2), signal(3)] })), false);
});

test("rejects signals without a safe source URL", () => {
  assert.equal(isValidPublicResult(snapshotResult({ signals: [signal(1, { sourceUrl: "javascript:alert(1)" }), signal(2), signal(3)] })), false);
});

test("rejects unknown recency buckets", () => {
  assert.equal(isValidPublicResult(snapshotResult({ signals: [signal(1, { recencyBucket: "OLD" }), signal(2), signal(3)] })), false);
});

test("accepts the FALLBACK recency bucket", () => {
  assert.equal(isValidPublicResult(snapshotResult({ signals: [signal(1, { recencyBucket: "FALLBACK" }), signal(2), signal(3)] })), true);
});

test("accepts HTTP and HTTPS source URLs", () => {
  assert.equal(isSafeSourceUrl("http://publisher.example.test/story"), true);
  assert.equal(isSafeSourceUrl("https://publisher.example.test/story"), true);
});

test("rejects dangerous or malformed source URLs", () => {
  for (const value of ["javascript:alert(1)", "data:text/html,unsafe", "file:///etc/passwd", "not a url", ""]) {
    assert.equal(isSafeSourceUrl(value), false, value);
  }
});

test("displays only the source hostname", () => {
  assert.equal(sourceHostname("https://www.publisher.example.test/a/path?q=1"), "publisher.example.test");
});

test("uses a safe unavailable label for an invalid hostname", () => {
  assert.equal(sourceHostname("javascript:alert(1)"), "Source unavailable");
});

test("formats valid ISO publication dates", () => {
  assert.equal(formatPublishedDate("2026-09-01T00:00:00.000Z"), "Sep 1, 2026");
});

test("uses a clear fallback for missing or invalid dates", () => {
  assert.equal(formatPublishedDate(""), "Date unavailable");
  assert.equal(formatPublishedDate("not-a-date"), "Date unavailable");
});

test("does not make a request for blank input", async () => {
  let calls = 0;
  const updates = [];
  const controller = createSnapshotController({ fetchImpl: async () => { calls += 1; }, onUpdate: (update) => updates.push(update) });

  assert.equal(await controller.submit("   "), false);
  assert.equal(calls, 0);
  assert.deepEqual(updates, [{ kind: "result", result: { state: "clarification_needed", reason: "invalid_input" } }]);
});

test("submits exactly one POST with the endpoint's input-only JSON body", async () => {
  const calls = [];
  const controller = createSnapshotController({
    fetchImpl: async (...args) => {
      calls.push(args);
      return response({ state: "clarification_needed", reason: "company_ambiguous" });
    },
  });

  assert.equal(await controller.submit("  example.test  "), true);
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], "/api/snapshot");
  assert.equal(calls[0][1].method, "POST");
  assert.deepEqual(calls[0][1].headers, { "Content-Type": "application/json" });
  assert.deepEqual(JSON.parse(calls[0][1].body), { input: "  example.test  " });
});

test("emits honest loading, result, and settled updates in order", async () => {
  const updates = [];
  const controller = createSnapshotController({ fetchImpl: async () => response(snapshotResult()), onUpdate: (update) => updates.push(update) });

  await controller.submit("Example Systems");
  assert.equal(updates[0].kind, "loading");
  assert.deepEqual(updates[1], { kind: "result", result: snapshotResult() });
  assert.deepEqual(updates[2], { kind: "settled" });
  assert.equal(controller.inFlight, false);
});

test("ignores a second intentional submit while the first is in flight", async () => {
  const pending = deferred();
  let calls = 0;
  const controller = createSnapshotController({ fetchImpl: async () => { calls += 1; return pending.promise; } });
  const first = controller.submit("Example Systems");

  assert.equal(controller.inFlight, true);
  assert.equal(await controller.submit("Example Systems"), false);
  assert.equal(calls, 1);
  pending.resolve(response(snapshotResult()));
  assert.equal(await first, true);
  assert.equal(controller.inFlight, false);
});

test("maps a malformed API payload to sanitized unavailable", async () => {
  const updates = [];
  const controller = createSnapshotController({ fetchImpl: async () => response({ state: "snapshot", secrets: "no" }), onUpdate: (update) => updates.push(update) });
  await controller.submit("Example Systems");
  assert.deepEqual(updates[1], { kind: "result", result: { state: "unavailable" } });
});

test("maps a JSON parsing failure to sanitized unavailable and restores controls", async () => {
  const updates = [];
  const controller = createSnapshotController({ fetchImpl: async () => ({ json: async () => { throw new Error("upstream detail"); } }), onUpdate: (update) => updates.push(update) });
  await controller.submit("Example Systems");
  assert.deepEqual(updates.map((update) => update.kind), ["loading", "result", "settled"]);
  assert.deepEqual(updates[1].result, { state: "unavailable" });
  assert.equal(controller.inFlight, false);
});

test("maps a transport failure to sanitized unavailable", async () => {
  const updates = [];
  const controller = createSnapshotController({ fetchImpl: async () => { throw new Error("network detail"); }, onUpdate: (update) => updates.push(update) });
  await controller.submit("Example Systems");
  assert.deepEqual(updates[1].result, { state: "unavailable" });
});

test("renders exact source links with safe external-link protections", () => {
  const originalDocument = globalThis.document;
  globalThis.document = fakeDocument();
  try {
    const panel = new FakeNode("section");
    const result = snapshotResult({ signals: [signal(1, { sourceUrl: "https://www.publisher.example.test/path?a=1", recencyBucket: "FALLBACK" }), signal(2), signal(3)] });
    renderResult(panel, result);
    const nodes = allNodes(panel);
    const link = nodes.find((node) => node.tagName === "a");
    assert.equal(link.getAttribute("href"), "https://www.publisher.example.test/path?a=1");
    assert.equal(link.textContent, "publisher.example.test ↗");
    assert.equal(link.target, "_blank");
    assert.equal(link.rel, "noopener noreferrer");
    assert.equal(nodes.some((node) => node.textContent === "Older fallback"), true);
  } finally {
    globalThis.document = originalDocument;
  }
});

test("renders potentially hostile company text as text content, not markup", () => {
  const originalDocument = globalThis.document;
  globalThis.document = fakeDocument();
  try {
    const hostile = "<img src=x onerror=alert(1)>";
    const panel = new FakeNode("section");
    renderResult(panel, snapshotResult({ company: { ...company, description: hostile } }));
    const nodes = allNodes(panel);
    assert.equal(nodes.some((node) => node.textContent === hostile), true);
    assert.equal(nodes.some((node) => node.tagName === "img"), false);
  } finally {
    globalThis.document = originalDocument;
  }
});

test("renders a complete snapshot with its three recent signals", () => {
  const originalDocument = globalThis.document;
  globalThis.document = fakeDocument();
  try {
    const panel = new FakeNode("section");
    renderResult(panel, snapshotResult());
    const text = allNodes(panel).map((node) => node.textContent);
    assert.equal(text.includes("Company snapshot"), true);
    assert.equal(text.includes("Recent signals"), true);
    assert.equal(text.filter((value) => /^Synthetic signal /.test(value ?? "")).length, 3);
  } finally {
    globalThis.document = originalDocument;
  }
});

test("renders limited evidence without padding signals", () => {
  const originalDocument = globalThis.document;
  globalThis.document = fakeDocument();
  try {
    const panel = new FakeNode("section");
    renderResult(panel, { state: "insufficient_evidence", company, signals: [signal(1)] });
    const text = allNodes(panel).map((node) => node.textContent);
    assert.equal(text.includes("Limited recent evidence"), true);
    assert.equal(text.filter((value) => /^Synthetic signal /.test(value ?? "")).length, 1);
  } finally {
    globalThis.document = originalDocument;
  }
});

test("renders website guidance for an ambiguous company", () => {
  const originalDocument = globalThis.document;
  globalThis.document = fakeDocument();
  try {
    const panel = new FakeNode("section");
    renderResult(panel, { state: "clarification_needed", reason: "company_ambiguous" });
    const text = allNodes(panel).map((node) => node.textContent);
    assert.equal(text.includes("Try entering its website instead."), true);
  } finally {
    globalThis.document = originalDocument;
  }
});

test("renders a sanitized temporary-unavailable message", () => {
  const originalDocument = globalThis.document;
  globalThis.document = fakeDocument();
  try {
    const panel = new FakeNode("section");
    renderResult(panel, { state: "unavailable", internalMessage: "secret upstream failure" });
    const text = allNodes(panel).map((node) => node.textContent);
    assert.equal(text.includes("Company information is temporarily unavailable."), true);
    assert.equal(text.includes("secret upstream failure"), false);
  } finally {
    globalThis.document = originalDocument;
  }
});

test("client source uses DOM text APIs and contains no innerHTML assignment", async () => {
  const source = await readFile(new URL("../public/app.js", import.meta.url), "utf8");
  assert.equal(source.includes("innerHTML"), false);
  assert.match(source, /textContent/);
  assert.match(source, /source\.setAttribute\("href", signal\.sourceUrl\)/);
});

test("frontend stays dependency-free and only requests the local API route", async () => {
  const [html, source, styles] = await Promise.all([
    readFile(new URL("../public/index.html", import.meta.url), "utf8"),
    readFile(new URL("../public/app.js", import.meta.url), "utf8"),
    readFile(new URL("../public/styles.css", import.meta.url), "utf8"),
  ]);
  assert.equal(html.includes("http://") || html.includes("https://"), false);
  assert.equal(source.includes("EXA_API_KEY"), false);
  assert.match(source, /const API_PATH = "\/api\/snapshot"/);
  assert.match(html, /<div class="atmosphere" aria-hidden="true">/);
  assert.match(styles, /\.atmosphere \{[\s\S]*pointer-events: none/);
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)/);
});
