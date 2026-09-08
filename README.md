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

**Phase A is `BLOCKED` at pre-live-test review.**

The bounded, dependency-free Gemini diagnostic is implemented. Its initial credential preflight failed closed on 2026-09-07, so no provider request was made. The later exposed credential was never used and has now been revoked/rotated and replaced; the replacement AI Studio project is shown as Free Tier with billing not set up, and its local key has not been used. Phase A remains blocked pending human approval of the corrected local commit, push approval, and a separately authorized NVIDIA A1 smoke test. The runtime architecture remains intentionally **not frozen**.

Current provider decision sequence:

1. Gemini 2.5 Flash + Google Search grounding — smoke test and benchmark.
2. If Gemini materially fails and the project owner explicitly authorizes it, Exa — one bounded smoke test and the same benchmark.
3. If both fail, stop and reassess. Tavily and Groq are not automatic fallbacks.

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

There is no production application setup yet. The Phase A diagnostic requires Node.js 22 and a `GEMINI_API_KEY` supplied through the environment; never commit the value or a `.env` file. The operator must independently verify that the key's project has no active billing account before passing the required confirmation flag.

```bash
node scripts/gemini-phase-a.mjs smoke --company NVIDIA --confirmed-unbilled
```

The diagnostic makes at most one synchronous, non-background Interactions API request with `store: false`, does not poll, and serves returned Google material only from memory on localhost for manual inspection. It does not locally persist Grounded Results, Search Suggestions, or provider-returned links. Benchmark/repeat modes remain explicitly gated on prior-phase results; separate provider-side grounding retention remains subject to Google's terms.

## Submission targets

Before completion the repo should support:

1. live public URL;
2. plan/spec documentation;
3. preserved chat transcript or screen recording;
4. concise README with final setup/architecture/limitations;
5. testing record;
6. genuine AI failure log;
7. half-page reflection on where AI got stuck or was wrong and how those issues were detected and corrected.
