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

**Gemini A1 is `NO-GO`; the corrected Exa A3 smoke is authorized but has not run.**

The approved Gemini 2.5 Flash hypothesis failed its one-request NVIDIA smoke because that model was unavailable to the new-user project. The project owner then authorized one bounded Exa NVIDIA smoke. Pre-live review corrected its dependency-free request contract to Exa's recommended `auto + outputSchema + output.grounding` path. The project owner reports that `EXA_API_KEY` now exists in the ignored local `.env`; it was not loaded or used during the correction. Zero Exa requests have been made, actual-account free-path behavior remains untested, and the runtime architecture remains intentionally **not frozen**.

Current provider decision sequence:

1. Gemini 2.5 Flash + Google Search grounding — `NO-GO` at A1 model access.
2. Exa `auto` Search with structured output and provider grounding — one NVIDIA A3 smoke is authorized; representative benchmark is not authorized.
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

There is no production application setup yet. The Phase A diagnostics require Node.js 22 and provider keys supplied through the environment; never commit a value or a `.env` file. The current Exa smoke requires the operator to independently confirm the key belongs to a Starter account with no payment method, paid usage, or auto-recharge before passing the confirmation flag.

```bash
node scripts/gemini-phase-a.mjs smoke --company NVIDIA --confirmed-unbilled
node scripts/exa-phase-a.mjs smoke --company NVIDIA --confirmed-free-starter
```

Each diagnostic makes at most one request and has no automatic retry or polling path. The Exa diagnostic uses one non-streamed `auto` Search call, requires provider-returned field-level grounding for the displayed claims, and serves only exact HTTP(S) grounding links in an in-memory localhost view. It omits optional highlights because structured output plus grounding already supplies the bounded smoke's required evidence mapping, keeping the first hypothesis smaller and independent of content behavior it does not need. `deep-lite` has never been tested and is only a possible separately authorized fallback, never an automatic one. The representative benchmark remains separately gated.

## Submission targets

Before completion the repo should support:

1. live public URL;
2. plan/spec documentation;
3. preserved chat transcript or screen recording;
4. concise README with final setup/architecture/limitations;
5. testing record;
6. genuine AI failure log;
7. half-page reflection on where AI got stuck or was wrong and how those issues were detected and corrected.
