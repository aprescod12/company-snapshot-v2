# Company Snapshot V2

A restart of the Company Snapshot take-home build, optimized for the smallest reliable implementation that actually satisfies the assessment.

## Product

A user enters a company name or website and receives:

- a clear 2–3 sentence description of what the company does;
- 3 recent, real company signals;
- source links where possible;
- a clean one-page experience with an honest loading state.

All production company information must come from the live public web. No mock or hardcoded company facts.

## Status

**A4.3 validly early-stopped with `A4.3 SIGNAL BENCHMARK FAIL`: NVIDIA's A4.2 pass was reused, while Stripe and PostHog were both `DISCOVERY INSUFFICIENT`. Maximum possible ordinary coverage fell to 3/5, below the required 4/5.**

The approved Gemini 2.5 Flash hypothesis failed its one-request NVIDIA smoke because that model was unavailable to the new-user project. The later Exa NVIDIA smoke made exactly one request through the verified Free Tier/no-payment path. Exa returned a structurally valid snapshot and grounding, but manual review found an assessment-trivial repository change, a 239-day-old signal from a weak secondary source, and an acquisition claim whose generic source destination was inaccessible and did not materially support the event. The tested Exa `auto + outputSchema + output.grounding` final-snapshot hypothesis is therefore `NO-GO`.

Exactly one separately authorized raw `auto` Search request returned 10 highlighted candidates. Manual review found three distinct, first-party, materially supported NVIDIA events, all within 90 days. A4.1 demonstrated that a dedicated signal-oriented raw-discovery query can retrieve enough strong recent candidates for NVIDIA, supporting a decomposed discovery → selection direction. Because the A4.1 query differed from A3's final-snapshot query, the experiment does not isolate whether A3 failed solely in downstream selection versus retrieval-query formulation. A4.1 request count is 1, cumulative Exa request count is 2, no retry occurred, and the runtime architecture remains intentionally **not frozen**.

A4.2 now provides a generic dependency-free selector for already-retrieved candidates. Its one authorized NVIDIA smoke reused the A4.1 request contract and returned 10 candidates; the selector chose ranks `1,3,5`. Manual review found those three first-party selections supported, material, distinct, and within 90 days, so the smoke passed.

A4.3 reused that NVIDIA result and then ran the frozen discovery → selector pipeline sequentially on Stripe and PostHog. Each one-request raw set contained only two qualifying distinct events, so both cases were `DISCOVERY INSUFFICIENT`. After two new failures, even successful Canva and `notion.so` cases could reach only 3/5, making the required 4/5 impossible; the benchmark stopped without those requests. A4.3 made 2 requests with zero retries, cumulative Exa request count is 5, and the result returns for project-owner reassessment. The recurring lexical duplicate-recall misses did not corrupt any observed selected set.

Current provider decision sequence:

1. Gemini 2.5 Flash + Google Search grounding — `NO-GO` at A1 model access.
2. Exa `auto` Search with structured output and provider grounding — `NO-GO` at the NVIDIA A3 manual evidence gate; representative benchmark was not run.
3. Exa raw `auto` Search plus highlights — `DISCOVERY SUFFICIENT` at A4.1.
4. Deterministic recency/provenance/lexical-dedup selector — `SELECTOR PASS` on the single A4.2 NVIDIA smoke.
5. Fixed A4.1 discovery → A4.2 selector representative benchmark — `A4.3 SIGNAL BENCHMARK FAIL` after Stripe and PostHog were both discovery-insufficient; mandatory early stop at a 3/5 coverage ceiling.
6. Stop for project-owner reassessment. `deep-lite`, Tavily, and Groq are not automatic fallbacks.

See `docs/PLAN.md` for the complete current decision record.

## Governing documents

- `docs/ASSESSMENT_BRIEF.md` — authoritative product requirements
- `docs/WORKFLOW.md` — authoritative AI-assisted development procedure
- `docs/PLAN.md` — current approved V2 plan
- `docs/TESTING.md` — benchmark and verification gates
- `docs/AI_FAILURE_LOG.md` — genuine V2 failures only
- `AGENTS.md` — coding-agent operating instructions

## Development principles

- plan before implementation;
- use one bounded task at a time;
- benchmark real companies before architecture commitment;
- verify rather than trust agent completion claims;
- prefer the smallest architecture that works;
- correctness and coverage are evaluated together;
- every new layer must earn its existence through an observed failure;
- no paid APIs or paid keys;
- no scope expansion beyond the assessment without a concrete approved need.

## Repository

This is a clean V2 repository. V1 remains separate as historical research, empirical evidence, and failure analysis. V1 architecture should not be copied into V2 by default.

## Setup

There is no production application setup yet. The Phase A diagnostics require Node.js 22 and provider keys supplied through the environment; never commit a value or a `.env` file. The current Exa smoke requires the operator to independently confirm the key belongs to a Starter account with no payment method, paid usage, or auto-recharge before passing the confirmation flag.

```bash
node scripts/gemini-phase-a.mjs smoke --company NVIDIA --confirmed-unbilled
node scripts/exa-phase-a.mjs smoke --company NVIDIA --confirmed-free-starter
node scripts/exa-phase-a-discovery.mjs discovery --company NVIDIA --confirmed-free-starter
node scripts/exa-phase-a-selector-smoke.mjs selector-smoke --company NVIDIA --confirmed-free-starter
node scripts/exa-phase-a-signal-benchmark.mjs --help
```

Do not run or rerun a live diagnostic without explicit phase-specific authorization. Each diagnostic makes at most one request and has no automatic retry or polling path. The A3 Exa diagnostic uses structured output plus grounding; the A4.1 diagnostic instead exposes raw result metadata and requested highlights for separate inspection without proving which A3 pipeline stage caused the failure. The A4.2 harness reuses that discovery request and hands candidates to the local selector in memory; the selector itself performs no network or source-page access. The A4.3 harness is a bounded historical benchmark tool, not an unrestricted production CLI; its live cases have already early-stopped and must not be rerun without new authorization. `deep-lite` has never been tested and is only a possible separately authorized fallback, never an automatic one.

## Submission targets

Before completion the repo should support:

1. live public URL;
2. plan/spec documentation;
3. preserved chat transcript or screen recording;
4. concise README with final setup/architecture/limitations;
5. testing record;
6. genuine AI failure log;
7. half-page reflection on where AI got stuck or was wrong and how those issues were detected and corrected.
