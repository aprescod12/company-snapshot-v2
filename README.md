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

**Planning / Phase A not yet started.**

The runtime architecture is intentionally **not frozen**. The first engineering milestone is a bounded live-company viability benchmark.

Current provider decision sequence:

1. Gemini 2.5 Flash + Google Search grounding — smoke test and benchmark.
2. If Gemini materially fails, Exa — one bounded smoke test and the same benchmark.
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

Application setup will be added after the Phase A architecture decision. Do not scaffold production runtime solely to make this README look complete.

## Submission targets

Before completion the repo should support:

1. live public URL;
2. plan/spec documentation;
3. preserved chat transcript or screen recording;
4. concise README with final setup/architecture/limitations;
5. testing record;
6. genuine AI failure log;
7. half-page reflection on where AI got stuck or was wrong and how those issues were detected and corrected.
