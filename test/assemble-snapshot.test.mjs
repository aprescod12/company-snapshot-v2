import assert from "node:assert/strict";
import test from "node:test";

import { assembleSnapshot } from "../src/snapshot/assembleSnapshot.mjs";

const COMPANY = Object.freeze({ inputKind: "name", companyName: "Acme", officialDomain: "acme.test" });
const DESCRIPTION = "Acme builds enterprise software for supply-chain teams.";

function evidenceRecord(overrides = {}) {
  return Object.freeze({
    candidateTitle: "Acme raw candidate title",
    sourceTitle: "Acme launches Atlas platform",
    sourceUrl: "https://acme.test/original-candidate-link",
    resolvedUrl: "https://acme.test/news/atlas",
    publishedDate: "2026-09-01T00:00:00.000Z",
    recencyBucket: "RECENT",
    sourceClass: "FIRST_PARTY",
    evidenceSnippet: "Acme launches Atlas platform for enterprise customers.",
    ...overrides,
  });
}

function verifiedResult(evidenceOverridesList) {
  const evidence = (evidenceOverridesList ?? [{}, {}, {}]).map((overrides, index) =>
    evidenceRecord({ sourceTitle: `Acme event ${index + 1}`, resolvedUrl: `https://acme.test/news/${index + 1}`, ...overrides }),
  );
  return Object.freeze({
    state: "verified",
    company: COMPANY,
    evidence: Object.freeze(evidence),
    retrieval: Object.freeze({ fallbackUsed: false, exaRequestCount: 1 }),
  });
}

function insufficientResult(count) {
  const evidence = Array.from({ length: count }, (_, index) =>
    evidenceRecord({ sourceTitle: `Acme event ${index + 1}`, resolvedUrl: `https://acme.test/news/${index + 1}` }),
  );
  return Object.freeze({
    state: "insufficient_evidence",
    company: COMPANY,
    evidence: Object.freeze(evidence),
    retrieval: Object.freeze({ fallbackUsed: true, exaRequestCount: 2 }),
  });
}

test("verified assembly returns a snapshot with exactly three signals in B3 order", () => {
  const verification = verifiedResult();
  const snapshot = assembleSnapshot({ verification, description: DESCRIPTION });

  assert.equal(snapshot.state, "snapshot");
  assert.deepEqual(snapshot.company, { name: "Acme", domain: "acme.test", description: DESCRIPTION });
  assert.equal(snapshot.signals.length, 3);
  assert.deepEqual(
    snapshot.signals.map((signal) => signal.title),
    ["Acme event 1", "Acme event 2", "Acme event 3"],
  );
  assert.deepEqual(
    snapshot.signals.map((signal) => signal.sourceUrl),
    ["https://acme.test/news/1", "https://acme.test/news/2", "https://acme.test/news/3"],
  );
  for (const signal of snapshot.signals) {
    assert.equal(signal.recencyBucket, "RECENT");
    assert.equal(signal.publishedDate, "2026-09-01T00:00:00.000Z");
  }
});

test("verified assembly uses the resolved publisher title/date/URL, not the raw candidate values", () => {
  const verification = verifiedResult([
    { sourceTitle: "Publisher headline", candidateTitle: "Raw Exa candidate headline", resolvedUrl: "https://acme.test/publisher/1", sourceUrl: "https://exa.example/candidate/1" },
    {},
    {},
  ]);
  const snapshot = assembleSnapshot({ verification, description: DESCRIPTION });
  const [first] = snapshot.signals;

  assert.equal(first.title, "Publisher headline");
  assert.notEqual(first.title, "Raw Exa candidate headline");
  assert.equal(first.sourceUrl, "https://acme.test/publisher/1");
  assert.notEqual(first.sourceUrl, "https://exa.example/candidate/1");
});

test("assembled signals do not leak internal B3 provenance fields", () => {
  const verification = verifiedResult();
  const snapshot = assembleSnapshot({ verification, description: DESCRIPTION });

  for (const signal of snapshot.signals) {
    assert.equal(Object.hasOwn(signal, "candidateTitle"), false);
    assert.equal(Object.hasOwn(signal, "evidenceSnippet"), false);
    assert.equal(Object.hasOwn(signal, "sourceClass"), false);
    assert.deepEqual(Object.keys(signal).sort(), ["publishedDate", "recencyBucket", "sourceUrl", "title"]);
  }
});

test("insufficient_evidence with zero records returns an empty signal list, not padding", () => {
  const verification = insufficientResult(0);
  const snapshot = assembleSnapshot({ verification, description: DESCRIPTION });

  assert.equal(snapshot.state, "insufficient_evidence");
  assert.deepEqual(snapshot.signals, []);
});

test("insufficient_evidence with one record returns exactly one signal", () => {
  const verification = insufficientResult(1);
  const snapshot = assembleSnapshot({ verification, description: DESCRIPTION });

  assert.equal(snapshot.state, "insufficient_evidence");
  assert.equal(snapshot.signals.length, 1);
});

test("insufficient_evidence with two records returns exactly two signals", () => {
  const verification = insufficientResult(2);
  const snapshot = assembleSnapshot({ verification, description: DESCRIPTION });

  assert.equal(snapshot.state, "insufficient_evidence");
  assert.equal(snapshot.signals.length, 2);
});

test("verified with fewer than three evidence records is rejected", () => {
  const verification = { state: "verified", company: COMPANY, evidence: [evidenceRecord()] };
  assert.throws(() => assembleSnapshot({ verification, description: DESCRIPTION }), TypeError);
});

test("verified with more than three evidence records is rejected", () => {
  const verification = {
    state: "verified",
    company: COMPANY,
    evidence: [evidenceRecord(), evidenceRecord(), evidenceRecord(), evidenceRecord()],
  };
  assert.throws(() => assembleSnapshot({ verification, description: DESCRIPTION }), TypeError);
});

test("insufficient_evidence with three or more records is rejected", () => {
  const verification = {
    state: "insufficient_evidence",
    company: COMPANY,
    evidence: [evidenceRecord(), evidenceRecord(), evidenceRecord()],
  };
  assert.throws(() => assembleSnapshot({ verification, description: DESCRIPTION }), TypeError);
});

test("missing description is rejected", () => {
  const verification = verifiedResult();
  assert.throws(() => assembleSnapshot({ verification }), TypeError);
  assert.throws(() => assembleSnapshot({ verification, description: "" }), TypeError);
  assert.throws(() => assembleSnapshot({ verification, description: 42 }), TypeError);
});

test("malformed company is rejected", () => {
  const missingDomain = { state: "verified", company: { companyName: "Acme" }, evidence: [evidenceRecord(), evidenceRecord(), evidenceRecord()] };
  assert.throws(() => assembleSnapshot({ verification: missingDomain, description: DESCRIPTION }), TypeError);

  const missingName = { state: "verified", company: { officialDomain: "acme.test" }, evidence: [evidenceRecord(), evidenceRecord(), evidenceRecord()] };
  assert.throws(() => assembleSnapshot({ verification: missingName, description: DESCRIPTION }), TypeError);

  const noCompany = { state: "verified", evidence: [evidenceRecord(), evidenceRecord(), evidenceRecord()] };
  assert.throws(() => assembleSnapshot({ verification: noCompany, description: DESCRIPTION }), TypeError);
});

test("malformed final source URL is rejected", () => {
  const verification = verifiedResult([{ resolvedUrl: "not-a-url" }, {}, {}]);
  assert.throws(() => assembleSnapshot({ verification, description: DESCRIPTION }), TypeError);

  const ftp = verifiedResult([{ resolvedUrl: "ftp://acme.test/file" }, {}, {}]);
  assert.throws(() => assembleSnapshot({ verification: ftp, description: DESCRIPTION }), TypeError);
});

test("an evidence record missing a required field is rejected", () => {
  const missingTitle = verifiedResult([{ sourceTitle: undefined }, {}, {}]);
  assert.throws(() => assembleSnapshot({ verification: missingTitle, description: DESCRIPTION }), TypeError);

  const missingDate = verifiedResult([{ publishedDate: undefined }, {}, {}]);
  assert.throws(() => assembleSnapshot({ verification: missingDate, description: DESCRIPTION }), TypeError);

  const missingRecency = verifiedResult([{ recencyBucket: undefined }, {}, {}]);
  assert.throws(() => assembleSnapshot({ verification: missingRecency, description: DESCRIPTION }), TypeError);
});

test("unsupported verification state is rejected", () => {
  const verification = { state: "clarification_needed", company: COMPANY, evidence: [] };
  assert.throws(() => assembleSnapshot({ verification, description: DESCRIPTION }), TypeError);
});

test("assembling a snapshot does not mutate the B3 fixture", () => {
  const verification = verifiedResult();
  const snapshotBefore = JSON.stringify(verification);
  assembleSnapshot({ verification, description: DESCRIPTION });
  assert.equal(JSON.stringify(verification), snapshotBefore);
});
