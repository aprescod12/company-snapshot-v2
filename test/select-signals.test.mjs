import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  RECENCY_BUCKET,
  SELECTION_REASON,
  SOURCE_CLASS,
  areDuplicateCandidates,
  classifyRecency,
  classifySource,
  selectSignals,
} from "../src/selection/selectSignals.mjs";

const NOW = new Date("2026-09-08T12:00:00.000Z");
const DAY_MS = 24 * 60 * 60 * 1000;
const CONTEXT = {
  companyName: "Acme Systems",
  officialDomain: "acme.test",
  now: NOW,
};

function isoDaysAgo(days) {
  return new Date(NOW.getTime() - days * DAY_MS).toISOString();
}

function candidate(overrides = {}) {
  return {
    rank: 1,
    title: "Atlas compute platform reaches general availability",
    url: "https://reporter.test/atlas-platform",
    publishedDate: isoDaysAgo(10),
    author: null,
    highlights: ["Atlas compute platform is now generally available to enterprise customers."],
    ...overrides,
  };
}

test("recency buckets include exact 90-day and 180-day boundaries", () => {
  assert.equal(classifyRecency(isoDaysAgo(0), NOW), RECENCY_BUCKET.RECENT);
  assert.equal(classifyRecency(isoDaysAgo(90), NOW), RECENCY_BUCKET.RECENT);
  assert.equal(classifyRecency(isoDaysAgo(90 + 1 / 86_400), NOW), RECENCY_BUCKET.FALLBACK);
  assert.equal(classifyRecency(isoDaysAgo(180), NOW), RECENCY_BUCKET.FALLBACK);
  assert.equal(classifyRecency(isoDaysAgo(180 + 1 / 86_400), NOW), RECENCY_BUCKET.OLD);
});

test("missing, malformed, and future dates are UNKNOWN rather than recent", () => {
  assert.equal(classifyRecency(null, NOW), RECENCY_BUCKET.UNKNOWN);
  assert.equal(classifyRecency("", NOW), RECENCY_BUCKET.UNKNOWN);
  assert.equal(classifyRecency("not-a-date", NOW), RECENCY_BUCKET.UNKNOWN);
  assert.equal(
    classifyRecency(new Date(NOW.getTime() + DAY_MS).toISOString(), NOW),
    RECENCY_BUCKET.UNKNOWN,
  );
});

test("source classification accepts the official root and true subdomains", () => {
  assert.equal(classifySource("https://example.com/news", "example.com"), SOURCE_CLASS.FIRST_PARTY);
  assert.equal(
    classifySource("https://NEWS.Example.COM:8443/item", "EXAMPLE.COM."),
    SOURCE_CLASS.FIRST_PARTY,
  );
});

test("source classification rejects deceptive prefix and suffix domains", () => {
  assert.equal(classifySource("https://fakeexample.com/news", "example.com"), SOURCE_CLASS.OTHER);
  assert.equal(
    classifySource("https://example.com.attacker.test/news", "example.com"),
    SOURCE_CLASS.OTHER,
  );
  assert.equal(classifySource("not-a-url", "example.com"), SOURCE_CLASS.OTHER);
});

test("obvious duplicate headlines cluster lexically", () => {
  const left = candidate({ title: "Acme Systems unveils Atlas cloud security platform" });
  const right = candidate({ title: "Atlas cloud security platform unveiled by Acme Systems" });
  assert.equal(areDuplicateCandidates(left, right, CONTEXT.companyName), true);
});

test("silent-e past-tense forms normalize consistently", () => {
  const left = candidate({ title: "Acme Systems created Atlas cloud security platform" });
  const right = candidate({ title: "Acme Systems will create Atlas cloud security platform" });
  assert.equal(areDuplicateCandidates(left, right, CONTEXT.companyName), true);
});

test("sparse titles can use bounded first-highlight evidence for duplicate detection", () => {
  const left = candidate({
    title: "Acme Systems filing 20260902",
    highlights: [
      "Acme Systems signed a definitive agreement to acquire Beacon Systems for two billion dollars.",
    ],
  });
  const right = candidate({
    title: "Beacon transaction filing",
    highlights: [
      "A definitive agreement says Beacon Systems will be acquired by Acme Systems in a two billion dollar transaction.",
    ],
  });
  assert.equal(areDuplicateCandidates(left, right, CONTEXT.companyName), true);
});

test("related but distinct events remain separate", () => {
  const platform = candidate({ title: "Acme Systems launches Atlas AI platform" });
  const partnership = candidate({ title: "Acme Systems announces Atlas AI partnership" });
  assert.equal(areDuplicateCandidates(platform, partnership, CONTEXT.companyName), false);
});

test("same-template partnerships with different counterpart organizations remain separate", () => {
  const nimbus = candidate({
    title: "Acme Systems announces strategic partnership with Nimbus for AI infrastructure",
  });
  const cirrus = candidate({
    title: "Acme Systems announces strategic partnership with Cirrus for AI infrastructure",
  });
  assert.equal(areDuplicateCandidates(nimbus, cirrus, CONTEXT.companyName), false);
});

test("same-template expansion announcements with different locations remain separate", () => {
  const texas = candidate({
    title: "Acme Systems expands AI infrastructure operations in Texas",
  });
  const arizona = candidate({
    title: "Acme Systems expands AI infrastructure operations in Arizona",
  });
  assert.equal(areDuplicateCandidates(texas, arizona, CONTEXT.companyName), false);
});

test("company-name removal does not merge events with different distinctive entities", () => {
  const first = candidate({
    title: "Acme Systems launches Atlas analytics platform",
    highlights: ["Atlas analytics serves finance teams."],
  });
  const second = candidate({
    title: "Acme Systems launches Beacon analytics platform",
    highlights: ["Beacon analytics serves healthcare teams."],
  });
  assert.equal(areDuplicateCandidates(first, second, CONTEXT.companyName), false);
});

test("generic shared terms alone do not form a duplicate cluster", () => {
  const platform = candidate({ title: "Acme Systems launches new AI platform" });
  const partnership = candidate({ title: "Acme Systems announces new AI partnership" });
  assert.equal(areDuplicateCandidates(platform, partnership, CONTEXT.companyName), false);
});

test("first-party duplicate wins when recency is equal", () => {
  const result = selectSignals(
    [
      candidate({
        rank: 1,
        url: "https://reporter.test/atlas",
        title: "Atlas cloud security platform released",
      }),
      candidate({
        rank: 2,
        url: "https://news.acme.test/atlas",
        title: "Atlas cloud security platform release",
      }),
    ],
    CONTEXT,
  );

  assert.equal(result.selected.length, 1);
  assert.equal(result.selected[0].url, "https://news.acme.test/atlas");
  assert.equal(
    result.evaluated.find((entry) => entry.candidate.rank === 1).reason,
    SELECTION_REASON.DUPLICATE,
  );
});

test("more recent duplicate wins before source class or rank", () => {
  const result = selectSignals(
    [
      candidate({
        rank: 1,
        url: "https://acme.test/atlas",
        title: "Atlas cloud security platform released",
        publishedDate: isoDaysAgo(100),
      }),
      candidate({
        rank: 9,
        url: "https://reporter.test/atlas",
        title: "Atlas cloud security platform release",
        publishedDate: isoDaysAgo(5),
      }),
    ],
    CONTEXT,
  );

  assert.equal(result.selected[0].rank, 9);
  assert.equal(result.selected[0].recencyBucket, RECENCY_BUCKET.RECENT);
});

test("selection ordering is recency, source class, then original rank", () => {
  const result = selectSignals(
    [
      candidate({ rank: 1, title: "Orchid network expansion", url: "https://reporter.test/orchid" }),
      candidate({ rank: 5, title: "Beacon compute release", url: "https://acme.test/beacon" }),
      candidate({
        rank: 2,
        title: "Cedar regional opening",
        url: "https://acme.test/cedar",
        publishedDate: isoDaysAgo(120),
      }),
      candidate({
        rank: 3,
        title: "Delta leadership appointment",
        url: "https://acme.test/delta",
        publishedDate: null,
      }),
      candidate({
        rank: 4,
        title: "Elm capacity agreement",
        url: "https://acme.test/elm",
        publishedDate: isoDaysAgo(200),
      }),
    ],
    CONTEXT,
  );

  assert.deepEqual(
    result.selected.map((entry) => entry.rank),
    [5, 1, 2],
  );
});

test("lower Exa rank resolves otherwise equal candidates", () => {
  const result = selectSignals(
    [
      candidate({ rank: 8, title: "Orchid network expansion", url: "https://reporter.test/orchid" }),
      candidate({ rank: 2, title: "Beacon compute release", url: "https://reporter.test/beacon" }),
      candidate({ rank: 5, title: "Cedar regional opening", url: "https://reporter.test/cedar" }),
      candidate({ rank: 1, title: "Delta leadership appointment", url: "https://reporter.test/delta" }),
    ],
    CONTEXT,
  );

  assert.deepEqual(
    result.selected.map((entry) => entry.rank),
    [1, 2, 5],
  );
});

test("exactly three unique usable candidates are selected when available", () => {
  const result = selectSignals(
    [
      candidate({ rank: 1, title: "Atlas product release", url: "https://acme.test/atlas" }),
      candidate({ rank: 2, title: "Beacon partnership signed", url: "https://acme.test/beacon" }),
      candidate({ rank: 3, title: "Cedar regional expansion", url: "https://acme.test/cedar" }),
      candidate({ rank: 4, title: "Delta executive appointment", url: "https://acme.test/delta" }),
    ],
    CONTEXT,
  );

  assert.equal(result.selected.length, 3);
  assert.equal(
    result.evaluated.filter((entry) => entry.reason === SELECTION_REASON.LOWER_PRIORITY).length,
    1,
  );
});

test("fewer than three candidates are returned honestly", () => {
  const result = selectSignals(
    [
      candidate({ rank: 1, title: "Atlas product release", url: "https://acme.test/atlas" }),
      candidate({ rank: 2, title: "Beacon partnership signed", url: "https://acme.test/beacon" }),
    ],
    CONTEXT,
  );
  assert.equal(result.selected.length, 2);
});

test("unknown provider dates remain eligible when needed", () => {
  const result = selectSignals(
    [
      candidate({
        rank: 1,
        title: "Atlas product release",
        url: "https://acme.test/atlas",
        publishedDate: "malformed",
      }),
      candidate({
        rank: 2,
        title: "Beacon partnership signed",
        url: "https://acme.test/beacon",
        publishedDate: null,
      }),
    ],
    CONTEXT,
  );

  assert.equal(result.selected.length, 2);
  assert.ok(result.selected.every((entry) => entry.recencyBucket === RECENCY_BUCKET.UNKNOWN));
});

test("duplicate pages occupy only one output slot", () => {
  const result = selectSignals(
    [
      candidate({
        rank: 1,
        title: "Atlas cloud security platform released",
        url: "https://acme.test/atlas",
      }),
      candidate({
        rank: 2,
        title: "Released Atlas cloud security platform",
        url: "https://reporter.test/atlas",
      }),
      candidate({ rank: 3, title: "Beacon partnership signed", url: "https://acme.test/beacon" }),
      candidate({ rank: 4, title: "Cedar regional expansion", url: "https://acme.test/cedar" }),
    ],
    CONTEXT,
  );

  assert.equal(result.selected.length, 3);
  assert.equal(result.selected.filter((entry) => entry.title.includes("Atlas")).length, 1);
  assert.equal(
    result.evaluated.filter((entry) => entry.reason === SELECTION_REASON.DUPLICATE).length,
    1,
  );
  const duplicateEntries = result.evaluated.filter((entry) => entry.duplicateClusterId !== null);
  assert.equal(duplicateEntries.length, 2);
  assert.equal(duplicateEntries[0].duplicateClusterId, duplicateEntries[1].duplicateClusterId);
});

test("invalid candidates are excluded with a small deterministic reason", () => {
  const result = selectSignals(
    [
      candidate({ rank: 0, title: "Invalid rank", url: "https://acme.test/rank" }),
      candidate({ rank: 2, title: "   ", url: "https://acme.test/title" }),
      candidate({ rank: 3, title: "Invalid URL", url: "javascript:alert(1)" }),
      candidate({ rank: 4, title: "Valid event", url: "https://acme.test/valid" }),
    ],
    CONTEXT,
  );

  assert.deepEqual(result.selected.map((entry) => entry.rank), [4]);
  assert.equal(
    result.evaluated.filter((entry) => entry.reason === SELECTION_REASON.INVALID).length,
    3,
  );
});

test("selection is stable and does not mutate input arrays or objects", () => {
  const input = [
    candidate({ rank: 2, title: "Beacon partnership signed", url: "https://acme.test/beacon" }),
    candidate({ rank: 1, title: "Atlas product release", url: "https://acme.test/atlas" }),
  ];
  const before = structuredClone(input);
  Object.freeze(input[0].highlights);
  Object.freeze(input[1].highlights);
  Object.freeze(input[0]);
  Object.freeze(input[1]);
  Object.freeze(input);

  const first = selectSignals(input, CONTEXT);
  const second = selectSignals(input, CONTEXT);

  assert.deepEqual(first, second);
  assert.deepEqual(input, before);
  assert.notEqual(first.selected[0], input[1]);
  assert.notEqual(first.selected[0].highlights, input[1].highlights);
});

test("selector source has no provider, network, persistence, or company-specific logic", () => {
  const source = readFileSync(
    new URL("../src/selection/selectSignals.mjs", import.meta.url),
    "utf8",
  );

  assert.doesNotMatch(source, /\bfetch\s*\(/);
  assert.doesNotMatch(source, /node:(?:fs|http|https)/);
  assert.doesNotMatch(source, /EXA_API_KEY|api\.exa\.ai/i);
  assert.doesNotMatch(source, /NVIDIA|Hugging Face|MediaTek|RTX Spark|PAIR/i);
});
