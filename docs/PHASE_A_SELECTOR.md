# Phase A4.2 Lightweight Signal Selector

## Scope and status

Phase A4.2 implements the smallest deterministic selector needed to test the decomposed signal-oriented discovery → selection direction supported by A4.1. It accepts already-retrieved raw candidates and selects at most three for later evidence verification.

This is **pre-live implementation only**. A4.2 made **0** Exa requests, cumulative Exa request count remains **2**, and no new candidate set or source page was observed. It does not fetch sources, prove event dates, assess claim support, generate snapshot prose, or freeze a production architecture.

The repository has no `package.json`, TypeScript configuration, or existing TypeScript module convention. The selector therefore uses the repository's dependency-free Node ESM convention at `src/selection/selectSignals.mjs`, with JSDoc input contracts rather than introducing a TypeScript toolchain solely for this diagnostic.

## Input, validity, and diagnostics

`selectSignals(candidates, context)` accepts candidate rank, title, exact URL, optional provider date/author, and highlights plus a company name, official domain, and fixed current date.

Only structurally unusable candidates are rejected:

- rank is not a positive integer;
- title is empty;
- URL is not an exact HTTP(S) URL.

Missing highlights do not make a titled candidate invalid. Every input receives deterministic development diagnostics containing its recency bucket, source class, duplicate-cluster identifier, selected flag, and one of four reasons: `SELECTED`, `DUPLICATE`, `INVALID`, or `LOWER_PRIORITY`.

## Recency and provenance

Provider `publishedDate` is selection metadata only:

- `RECENT`: age ≤90 days;
- `FALLBACK`: age >90 and ≤180 days;
- `OLD`: age >180 days;
- `UNKNOWN`: absent, blank, unparseable, or future-dated.

Future dates are never silently treated as recent. A missing, malformed, or future provider date does not make an otherwise usable candidate ineligible; `UNKNOWN` sorts below `FALLBACK` and above `OLD`.

Accepted provider-date syntax is deliberately limited to a calendar-valid `YYYY-MM-DD` or the bounded timezone-explicit ISO form `YYYY-MM-DDTHH:mm:ss[.fraction](Z|±HH:mm)`, with one to three fractional-second digits. Repository Exa fixtures use the UTC `.sssZ` form; offset support is a bounded syntax allowance rather than a claim that an offset value was observed. A pre-live independent review found that the original implementation's permissive `Date.parse` call normalized impossible dates and accepted trailing garbage, allowing malformed metadata to receive valid recency priority. Before any live A4.2 request, it was replaced with explicit syntax, calendar, clock, and offset validation; impossible dates and partial-prefix parses now remain `UNKNOWN`.

Source classification is deliberately binary. A URL is `FIRST_PARTY` only when its parsed hostname equals the normalized official domain or ends with `.` plus that domain. Matching is case-insensitive, handles ports through URL parsing, strips one trailing hostname dot, and rejects deceptive prefix/suffix domains. Every other source is `OTHER`; there is no publisher allowlist.

## Bounded lexical duplicate rule

Duplicate comparison normalizes Unicode, case, punctuation, whitespace, simple plural suffixes, simple silent-e past-tense forms, company-name tokens, and a small generic stopword set. Ordinary semantic titles cluster only when they share at least three tokens with overlap coefficient ≥0.72 and Jaccard similarity ≥0.70. Very short near-identical titles may also cluster when they share at least two tokens, overlap is ≥0.80, and Jaccard similarity is ≥0.67.

First-highlight tokens are consulted only when at least one title is structurally opaque or metadata-like, such as a filing identifier. That fallback is capped at the first 48 normalized highlight tokens and requires at least four shared tokens, overlap coefficient ≥0.68, and Jaccard similarity ≥0.32. This preserves the ability to link an opaque filing title to obvious duplicate coverage without allowing generic highlight language to merge otherwise distinct semantic titles.

Pairwise matches form deterministic lexical clusters. The rule is intentionally conservative and not a semantic event classifier. It can miss paraphrases with little shared vocabulary or over-merge a transitive chain of highly overlapping pages; those behaviors remain live-review risks rather than justification for embeddings, an LLM, or a larger rule system.

## Representative and selection ordering

Each duplicate cluster keeps one representative using the same explicit preference hierarchy as final selection:

1. `RECENT` → `FALLBACK` → `UNKNOWN` → `OLD`;
2. `FIRST_PARTY` → `OTHER`;
3. lower original Exa rank;
4. URL and title as deterministic tie-breakers only when the approved keys are equal.

Representatives are ordered by that hierarchy and the first three are returned. If fewer than three unique usable candidates remain, the selector returns fewer than three without relaxing validity/duplicate rules or triggering another search. Candidate objects and highlight arrays are copied rather than mutated.

## Local verification

Synthetic tests cover recency boundaries; strict provider-date syntax; impossible calendar dates, including leap-year behavior; trailing garbage; malformed/future metadata; root/subdomain and deceptive-domain cases; obvious, morphological, sparse-title, and nonduplicate lexical comparisons, including same-template headlines with different counterpart organizations or locations; representative choice; lexicographic ordering; exact/insufficient selection counts; diagnostics; deterministic stability; input immutability; and static absence of provider, network, filesystem, or company-specific selector logic. `node --test test/select-signals.test.mjs` passed 24/24 tests, and the full `node --test` suite passed 65/65.

The repository exposes no `npm run typecheck`. Applicable syntax validation used `node --check src/selection/selectSignals.mjs` and `node --check test/select-signals.test.mjs`; both passed. The selector has no third-party dependency. `git diff --check` also passed.

Exit status: **`A4.2 PRE-LIVE READY`**. No live Exa request, source verification, synthesis, `deep-lite`, alternate provider/mode, representative benchmark, Phase B, UI, or deployment work occurred. Human review is required before any live A4.2 execution.
