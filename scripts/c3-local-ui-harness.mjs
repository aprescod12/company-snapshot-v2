// DEVELOPMENT/TEST-ONLY tool. Not used in production and never imported by
// api/snapshot.mjs, src/**, or any production path. It never reads
// EXA_API_KEY and never calls Exa or any publisher. It exists only to let a
// real browser exercise the real public/ frontend against an HTTP-shaped
// /api/snapshot response without a live provider, so Phase C3 can validate
// the browser -> fetch -> render path end to end with zero provider network.
//
// Run: node scripts/c3-local-ui-harness.mjs
// Binds to 127.0.0.1 only. Port defaults to 8787 (override with C3_HARNESS_PORT).
//
// The synthetic company/URLs below are clearly fictitious ("Example Company",
// example.test/example.com) and are never wired into any production path.
//
// POST /api/snapshot { "input": "<trigger>" } recognizes these triggers
// (case-insensitive, whitespace-trimmed); any other non-blank input returns
// the snapshot fixture so casual manual testing always shows something safe:
//   c3:snapshot                 -> full snapshot, exactly 3 signals (1 FALLBACK)
//   c3:insufficient-0/1/2       -> insufficient_evidence with 0, 1, or 2 signals
//   c3:clarification-ambiguous  -> clarification_needed / company_ambiguous
//   c3:clarification-invalid    -> clarification_needed / invalid_input
//   c3:unavailable              -> sanitized unavailable
//   c3:transport-error          -> HTTP 200 with a non-JSON body
//   c3:delay:<ms>                -> snapshot fixture after an artificial delay
//                                   (development-only; no delay exists in production)

import http from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const PUBLIC_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "public");
const DEFAULT_DELAY_MS = 1500;
const MAX_BODY_BYTES = 1_000_000;

const CONTENT_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
};

const EXAMPLE_COMPANY = {
  name: "Example Company",
  domain: "example.test",
  description:
    "Example Company builds workflow automation tools for distributed teams. It focuses on lightweight integrations rather than a heavyweight platform.",
};

const FIXTURES = {
  "c3:snapshot": () => ({
    state: "snapshot",
    company: EXAMPLE_COMPANY,
    signals: [
      {
        title:
          "Example Company launches a considerably longer synthetic headline used only to validate title wrapping across narrow and wide viewports",
        publishedDate: "2026-09-01",
        sourceUrl: "https://example.test/newsroom/long-headline-launch",
        recencyBucket: "RECENT",
      },
      {
        title: "Example Company raises a seed round",
        publishedDate: "2026-08-15",
        sourceUrl: "https://press.example.com/example-company-seed-round",
        recencyBucket: "RECENT",
      },
      {
        title: "Example Company published an older retrospective",
        publishedDate: "2026-02-01",
        sourceUrl: "https://example.net/blog/example-company-retrospective",
        recencyBucket: "FALLBACK",
      },
    ],
  }),
  "c3:insufficient-0": () => ({ state: "insufficient_evidence", company: EXAMPLE_COMPANY, signals: [] }),
  "c3:insufficient-1": () => ({
    state: "insufficient_evidence",
    company: EXAMPLE_COMPANY,
    signals: [
      {
        title: "Example Company shipped a minor integration",
        publishedDate: "2026-07-01",
        sourceUrl: "https://example.test/blog/minor-integration",
        recencyBucket: "RECENT",
      },
    ],
  }),
  "c3:insufficient-2": () => ({
    state: "insufficient_evidence",
    company: EXAMPLE_COMPANY,
    signals: [
      {
        title: "Example Company shipped a minor integration",
        publishedDate: "2026-07-01",
        sourceUrl: "https://example.test/blog/minor-integration",
        recencyBucket: "RECENT",
      },
      {
        title: "Example Company hired a new support lead",
        publishedDate: "2026-03-10",
        sourceUrl: "https://example.net/careers/example-company-support-lead",
        recencyBucket: "FALLBACK",
      },
    ],
  }),
  "c3:clarification-ambiguous": () => ({ state: "clarification_needed", reason: "company_ambiguous" }),
  "c3:clarification-invalid": () => ({ state: "clarification_needed", reason: "invalid_input" }),
  "c3:unavailable": () => ({ state: "unavailable" }),
};

const INVALID_INPUT = { state: "clarification_needed", reason: "invalid_input" };

function sendJson(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json", "Cache-Control": "no-store" });
  res.end(JSON.stringify(body));
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function serveStatic(pathname, res) {
  let decoded;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    res.writeHead(400, { "Content-Type": "text/plain" }).end("Bad request");
    return;
  }

  const relative = decoded === "/" ? "index.html" : decoded.replace(/^\/+/, "");
  const resolved = path.resolve(PUBLIC_DIR, relative);
  if (resolved !== PUBLIC_DIR && !resolved.startsWith(PUBLIC_DIR + path.sep)) {
    res.writeHead(403, { "Content-Type": "text/plain" }).end("Forbidden");
    return;
  }

  try {
    const data = await readFile(resolved);
    const contentType = CONTENT_TYPES[path.extname(resolved)] ?? "application/octet-stream";
    res.writeHead(200, { "Content-Type": contentType, "Cache-Control": "no-store" });
    res.end(data);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain" }).end("Not found");
  }
}

function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        req.destroy();
        reject(new Error("body too large"));
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

async function handleSnapshotApi(req, res) {
  if (req.method !== "POST") {
    res.writeHead(405, { "Content-Type": "application/json", Allow: "POST" });
    res.end(JSON.stringify(INVALID_INPUT));
    return;
  }

  let raw;
  try {
    raw = await readRequestBody(req);
  } catch {
    sendJson(res, 400, INVALID_INPUT);
    return;
  }

  let body;
  try {
    body = JSON.parse(raw);
  } catch {
    sendJson(res, 400, INVALID_INPUT);
    return;
  }

  const input = typeof body?.input === "string" ? body.input.trim() : "";
  if (!input) {
    sendJson(res, 400, INVALID_INPUT);
    return;
  }

  const trigger = input.toLowerCase();

  if (trigger === "c3:transport-error") {
    res.writeHead(200, { "Content-Type": "text/plain", "Cache-Control": "no-store" });
    res.end("not-json-on-purpose");
    return;
  }

  const delayMatch = /^c3:delay(?::(\d+))?$/.exec(trigger);
  if (delayMatch) {
    const delayMs = delayMatch[1] ? Number(delayMatch[1]) : DEFAULT_DELAY_MS;
    await sleep(delayMs);
    sendJson(res, 200, FIXTURES["c3:snapshot"]());
    return;
  }

  const makeFixture = FIXTURES[trigger] ?? FIXTURES["c3:snapshot"];
  sendJson(res, 200, makeFixture());
}

export function createHarnessServer() {
  return http.createServer((req, res) => {
    const { pathname } = new URL(req.url, "http://localhost");
    if (pathname === "/api/snapshot") {
      handleSnapshotApi(req, res).catch(() => sendJson(res, 500, { state: "unavailable" }));
      return;
    }
    if (req.method !== "GET") {
      res.writeHead(405, { "Content-Type": "text/plain" }).end("Method not allowed");
      return;
    }
    serveStatic(pathname, res).catch(() => {
      res.writeHead(500, { "Content-Type": "text/plain" }).end("Internal error");
    });
  });
}

const isMainModule = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMainModule) {
  const port = Number(process.env.C3_HARNESS_PORT) || 8787;
  const server = createHarnessServer();
  server.listen(port, "127.0.0.1", () => {
    const { port: actualPort } = server.address();
    console.log(`[c3-local-ui-harness] DEVELOPMENT/TEST-ONLY server at http://127.0.0.1:${actualPort}`);
    console.log("[c3-local-ui-harness] Serves public/ and a synthetic-fixture /api/snapshot. Never calls Exa.");
  });
}
