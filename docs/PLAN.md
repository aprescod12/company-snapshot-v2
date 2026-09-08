# Company Snapshot V2 — Plan

## Status

**Phase A is `BLOCKED` at pre-live-test review. No runtime architecture is frozen.**

This document records the current approved V2 product and technical decisions. The bounded Gemini diagnostic exists, but A1 made no provider request because `GEMINI_API_KEY` was absent from the process environment during the initial preflight. A credential that appeared later was exposed by a flawed local scan and was not used; it has now been revoked/rotated and replaced. The replacement AI Studio project is shown as Free Tier with billing not set up, but no live request has verified account behavior. Phase A remains blocked pending human approval of the corrected local commit, push approval, and a separately authorized NVIDIA A1 smoke test. Architecture becomes frozen only after Phase A demonstrates acceptable behavior on real companies and the project owner approves the evidence.

## Source-of-truth hierarchy

1. `docs/ASSESSMENT_BRIEF.md` controls product requirements.
2. `docs/WORKFLOW.md` controls development procedure.
3. This document records currently approved V2 decisions.
4. `docs/TESTING.md` controls benchmark/verification criteria and records what was actually tested.
5. Historical phase/experiment reports preserve evidence but do not silently override the living plan.

---

# 1. Product objective

Build and publicly deploy the smallest credible web app that:

1. accepts a company **name or website/domain**;
2. returns a clear **2–3 sentence description** of what the company does;
3. returns **3 recent, real, distinct company signals**;
4. includes a real source/link for each displayed signal where possible;
5. uses **live public-web information only**;
6. provides a clean one-page result with an honest loading state.

No auth, accounts, dashboards, persistence, or database unless a concrete implementation need emerges.

## Priority order

**Working required product → factual grounding → reliability → evidence quality → usability → visual differentiation → technical sophistication.**

---

# 2. Why V2 exists

V1 became too restrictive.

V1 built a rigorous deterministic evidence pipeline with company resolution, direct retrieval, bounded Tavily discovery, source qualification, recency filtering, deduplication, deterministic rendering, provenance validation, structured frontend states, and extensive tests.

It became strong at refusing weak evidence but weak at producing the required product. Ordinary company lookups frequently returned insufficient evidence instead of three useful signals.

V2 therefore treats V1 as **research and failure analysis**, not architecture to inherit.

## Lessons to preserve

- never fabricate company facts;
- never invent source URLs;
- resolve the intended company;
- distinguish recent events from evergreen material;
- deduplicate multiple articles about one event;
- fail honestly when evidence is truly weak;
- test real companies before approving an approach;
- verify real source pages manually;
- preserve useful loading/error/clarification states;
- verify generated code and dependencies rather than trusting plausible AI suggestions.

## Complexity to discard by default

Do not carry forward unless a V2 benchmark demonstrates a concrete need:

- deep source taxonomies;
- large evidence state machines;
- full provenance graphs;
- rigid publication-proof machinery;
- deterministic extractive rendering;
- large custom crawling systems;
- strict validation layers that collapse useful results into refusal;
- LangChain/LangGraph;
- runtime multi-agent architecture;
- databases;
- another broad provider bakeoff.

**Rule: every new layer must earn its existence through an observed failure.**

---

# 3. V2 architecture strategy

The first technical milestone is a **bounded viability benchmark**, not production implementation.

No provider or architecture is approved because it sounds good.

## Plan A hypothesis — Gemini 2.5 Flash + Google Search grounding

First candidate:

```text
company input
→ Gemini 2.5 Flash with Google Search grounding
→ directly user-facing grounded company snapshot
→ provider grounding/citation metadata and Search Suggestions
→ direct display with only provider-supported citation rendering
```

Why it is worth testing:

- current Google documentation lists `gemini-2.5-flash` as supporting Google Search grounding;
- current pricing documentation lists Gemini 2.5 Flash input/output as free on the Standard Free Tier and Search grounding as free up to 500 grounded prompts/day shared with Flash-Lite;
- the recommended Interactions API supports `gemini-2.5-flash` with the built-in `google_search` tool and exposes Search calls/results, provider Search Suggestions, final model output, and inline URL citations in one response.

Official references, verified 2026-09-07:
- https://ai.google.dev/gemini-api/docs/models/gemini-2.5-flash
- https://ai.google.dev/gemini-api/docs/google-search
- https://ai.google.dev/gemini-api/docs/interactions-overview
- https://ai.google.dev/api/interactions-api
- https://ai.google.dev/static/api/interactions.openapi.json
- https://ai.google.dev/gemini-api/docs/interactions-breaking-changes-may-2026
- https://ai.google.dev/gemini-api/docs/pricing
- https://ai.google.dev/gemini-api/terms

### Important Gemini constraints

Gemini is **not approved yet**.

Phase A must verify the actual account can perform the required grounded request at $0 and that the resulting behavior satisfies the product and provider terms.

Google's current Grounding with Google Search terms require Grounded Results to be displayed with associated Search Suggestions and restrict modification, extraction, storage, tracking, and repurposing of grounded results/links. The terms call Gemini API grounding a Paid Service while the pricing table separately advertises an unpaid Free Tier allowance. The same terms restrict availability of Unpaid Services to end users in the EEA, Switzerland, and the UK, which is a future public-deployment risk if the production path remains unbilled. `store: false` disables Interaction storage but does not override the separate provider-side retention Google documents for grounding queries and results; the no-persistence guarantee here applies to this diagnostic's local/application behavior. For this assessment, published pricing is not sufficient evidence: the practical Phase A gate is whether the actual unbilled project/key completes the required workflow without paid usage; a successful call would not by itself resolve the terms ambiguity. Therefore:

- do not assume a hidden grounded-research → arbitrary second-call rewrite architecture is acceptable;
- first test a **direct user-facing grounded result** pattern;
- do not persist complete Grounded Results, Search Suggestions HTML, grounding link collections, citation-URL datasets, or raw API-response dumps;
- persist only factual evaluation findings that do not reproduce Google's returned grounded material or link collection;
- if the required Company Snapshot layout cannot be produced while satisfying Google's terms, Gemini is a no-go even if technically capable;
- do not attach billing or move to paid quota to make the approach work.

The smoke test must verify:
1. the project/key is actually operating on the free path;
2. `gemini-2.5-flash` is available to the account;
3. Google Search grounding executes;
4. usable source/citation metadata is returned;
5. required Search Suggestions can be rendered with the Grounded Result in a temporary local display diagnostic that is removed before phase exit;
6. the final response can be shaped closely enough to the assessment output without prohibited post-processing.

The Phase A diagnostic uses one synchronous, non-background `POST` to the recommended Interactions API with `store: false`. It requires a completed interaction, matched successful `google_search_call`/`google_search_result` steps, provider `search_suggestions`, and valid `url_citation` annotations over the final model-output text. It does not poll. The exact documented `gemini-2.5-flash` Search contract currently uses the `/v1beta/interactions` endpoint, so response-shape and API-version change risk remain production concerns even if the benchmark passes.

## Plan B hypothesis — Exa

If Gemini materially fails the smoke test or benchmark, stop. Test **one** Exa-based approach only after the project owner explicitly authorizes it.

Preferred shape:

```text
company input
→ Exa live web/deep search
→ structured sourced result
→ minimal application checks
→ snapshot
```

Exa is attractive because current product documentation describes real-time web search, readable content retrieval, deeper search, structured output, and field-level grounding/citations.

Official/current references:
- https://exa.ai/
- https://exa.ai/blog/exa-deep
- Exa pricing/account terms must be re-verified immediately before the smoke test.

**Hard rule:** Exa is only eligible if the actual account can perform the required production workflow with no paid key, no payment requirement for the tested path, and enough free quota for benchmark + review usage.

## Reserve only — Tavily

Tavily is not part of the default V2 runtime plan.

The project owner has a Tavily student allocation of 4,000 credits and has already used roughly half. Those remaining credits are treated as a finite reserve.

Do not spend Tavily credits unless:
- both primary V2 hypotheses fail or a later production defect exposes a specific retrieval gap;
- the exact role Tavily would solve is identified first;
- a bounded experiment is approved.

## Groq

Groq is not currently planned for V2 runtime.

V1 already showed provider availability/rate-limit and structured-output problems in the roles tested. Do not reintroduce Groq merely because it is familiar.

---

# 4. Minimum V2 runtime if a provider passes

The target production architecture is intentionally small:

```text
input
→ normalize / basic company targeting
→ approved live-web research provider
→ lightweight source/recency/dedup checks only where needed
→ 2–3 sentence description + 3 signals + sources
→ one server endpoint
→ one-page UI
```

Expected stack hypothesis:
- Next.js;
- TypeScript;
- one server-side snapshot endpoint;
- no database;
- no auth;
- no runtime agents/frameworks;
- minimal dependencies;
- free public deployment, likely Vercel unless a concrete issue justifies another host.

This is a hypothesis, not authorization to scaffold before Phase A is approved.

---

# 5. Lightweight correctness boundaries

If the winning provider exposes the needed data, prefer these small safeguards:

## Company identity
- Domain input is strong identity evidence.
- Clear name input should normally resolve through the research provider.
- Genuinely ambiguous names should ask for clarification rather than guess.

## Sources
- Displayed source URLs must originate from actual provider/search/grounding results.
- Never let the model invent a URL that the application cannot tie to retrieved source metadata.

## Recency
- Prefer signals within approximately 90 days.
- Expand toward 180 days when necessary.
- Older activity is an explicit sparse-coverage fallback, not silently presented as recent.

Do not rebuild forensic publication-date certification unless a benchmark demonstrates it is necessary.

## Deduplication
- Three articles about one event count as one signal.
- Start with simple event/title/URL similarity.
- Add sophistication only if actual duplicates survive.

## Sparse evidence
- A truly quiet company may return a limited-evidence state.
- Coverage matters: sparse failure should be exceptional for ordinary active companies, not the normal path.

---

# 6. Phase A — V2 reset + viability benchmark

## Objective

Determine whether the simplest live-web approach can reliably produce the required snapshot before building production architecture.

## Sequence

### A1 — Gemini smoke test
Run one minimal grounded request, initially using a clear active company such as NVIDIA.

Verify:
- free-path access;
- model availability;
- live Search execution;
- citations/source metadata;
- Search Suggestions/display requirements;
- usable final output shape;
- no paid billing requirement.

If the smoke test fails a hard requirement, stop Gemini immediately and document the exact blocker.

**2026-09-07 initial outcome:** `BLOCKED` during credential preflight. The expected `GEMINI_API_KEY` was not present in the process environment, so no provider request was made and Gemini behavior remains untested. A credential that appeared later was exposed by a flawed local scan and was not used; it has since been revoked/rotated and replaced. The replacement AI Studio project is shown as Free Tier with billing not set up, but its behavior remains untested. Phase A is still `BLOCKED` pending corrected-commit review, push approval, and separate authorization for A1. A2, Exa, and later phases did not begin.

### A2 — Gemini benchmark
Only if A1 passes, run the approved representative benchmark in `docs/TESTING.md`.

If Gemini passes the benchmark and the bounded repeatability sanity check, record a `GO` recommendation and stop provider evaluation. Do not freeze the retrieval architecture until the project owner reviews and approves the Phase A evidence.

### A3 — Exa smoke + benchmark
Only if Gemini fails materially **and** the project owner explicitly authorizes this later experiment.

First verify free/no-paid feasibility with the actual Exa account. If that passes, run the same representative benchmark.

If Exa passes, freeze it.

### A4 — Stop and reassess
If both fail, do **not** automatically test Tavily, Groq, Brave, RSS, or another provider. Stop and obtain a new approved decision.

## Phase A deliverables

- bounded benchmark code/diagnostic only;
- persistent evaluation findings only, without raw Google Grounded Results, Search Suggestions HTML, grounding link collections, citation-URL datasets, or API-response dumps;
- transient access to grounding links during manual source inspection;
- latency observations;
- failure classifications;
- concise decision record;
- Phase Completion Report;
- no production UI;
- no final API architecture;
- no later-phase work.

For Gemini, candidate-event count is `N/A` unless the provider genuinely exposes a meaningful candidate-event set. Do not add extraction merely to populate that metric. Where available, observe search-query count, citation/source count, and final signal count.

Only when the representative Gemini benchmark otherwise meets every `GO` gate, rerun NVIDIA and one private/smaller ordinary company (Stripe or PostHog) as a bounded repeatability sanity check. This adds no separate coverage threshold but material one-shot variability affects the recommendation.

---

# 7. Go / no-go requirements

The exact benchmark definitions live in `docs/TESTING.md`.

At a minimum, a provider earns production only if:

1. **Free constraint passes.**
   - The exact required workflow works without paid API usage or paid keys.

2. **Clear-company resolution is correct.**
   - 5/5 ordinary benchmark cases resolve to the intended company.

3. **Ordinary-company coverage is at least 80%.**
   - At least 4/5 ordinary active companies reach a usable three-signal result.

4. **No fabricated displayed sources.**
   - Every displayed source is tied to actual provider/search/grounding output.

5. **Manual grounding passes.**
   - Opened sources materially support the signal claims.

6. **Signals are genuinely distinct.**
   - Duplicate coverage of one event is not counted as multiple signals.

7. **Ambiguity is safe.**
   - The ambiguous case does not silently resolve to an unrelated company.

8. **Sparse-company behavior is honest.**
   - The limited-activity case returns legitimate evidence or an honest limited-evidence result.

9. **Latency is credible.**
   - Target median ordinary-company end-to-end latency ≤20 seconds.
   - No normal case should routinely exceed roughly 45 seconds.

If a provider fails these materially, reject it quickly.

---

# 8. Lean implementation phases

## Phase A — V2 reset + viability benchmark
Prove the retrieval/research approach on real companies. No polished UI.

**Exit:** provider architecture is GO, NO-GO, or BLOCKED with evidence.

## Phase B — Minimal production snapshot pipeline
Build only what Phase A proved useful:

```text
input
→ company targeting
→ live research
→ only necessary lightweight checks
→ 3 signals + description + sources
→ structured endpoint response
```

**Exit:** route reproduces approved benchmark behavior and focused tests pass.

## Phase C — Frontend
Build the required one-page experience:
- input;
- honest loading;
- success;
- limited evidence;
- clarification if needed;
- not found/error.

Visual direction: restrained editorial/research intelligence product. Clear typography, hierarchy, and source attribution. Avoid generic AI-demo styling.

**Exit:** complete responsive assessment-facing experience.

## Phase D — Deployment + production verification
Deploy early and test the actual production URL.

Verify:
- environment variables;
- provider requests from production;
- fresh companies not used during development;
- source links;
- loading/error states;
- response time.

**Exit:** deployed system works independently of localhost.

## Phase E — Skeptical review + submission
Prepare:
- live URL;
- plan/spec;
- README;
- testing record;
- transcript/export or recording;
- genuine AI failure log;
- half-page reflection.

Run a final line-by-line assessment review.

---

# 9. V1 reuse policy

V2 is a new repo. Do **not** copy V1 architecture wholesale.

Potentially reusable later:
- restrained editorial visual ideas;
- useful frontend state concepts;
- test-case ideas;
- historical failure lessons;
- reporting/git discipline.

Do not copy by default:
- V1 `evidence`, `retrieval`, `rendering`, `validation`, or synthesis layers;
- large resolver machinery;
- hundreds of tests that encode V1 architecture;
- old provider dependencies.

Reuse is allowed only when the V2 task benefits materially and the reused code does not drag V1 architecture back in.

---

# 10. Highest risks

1. **Provider feasibility is assumed instead of proven.**
   - Mitigation: smoke test before architecture.

2. **Gemini Search terms do not fit the required presentation.**
   - Mitigation: direct user-facing grounded-result experiment; render Search Suggestions as returned; treat compliance and regional availability as hard production gates.

3. **Free documentation differs from actual account behavior.**
   - Mitigation: account-level verification; never attach billing just to make a candidate work.

4. **Agentic variability creates inconsistent three-signal output.**
   - Mitigation: representative benchmark and manual source review before freeze.

5. **V2 starts recreating V1 complexity after the first imperfect result.**
   - Mitigation: every new layer must solve an observed failure.

6. **Provider experimentation consumes the evening.**
   - Mitigation: Gemini → Exa → stop. No automatic third provider.

7. **UI polish happens before retrieval and deployment are reliable.**
   - Mitigation: production pipeline and early deployment precede visual refinement.

8. **Local success hides serverless/production problems.**
   - Mitigation: mandatory fresh-company tests through the deployed URL.

---

# 11. Immediate build sequence after plan approval

1. Establish this documentation baseline in the V2 repo.
2. Approve Phase A only.
3. Give the coding agent a **full-context, self-contained Phase A brief** covering the product, prior attempts, failures, definition of done, and the specific Gemini smoke/benchmark task.
4. Review its actual diff and Phase Completion Report.
5. Run/inspect the required live verification and source links.
6. Decide Gemini GO / NO-GO / BLOCKED.
7. Only if NO-GO/BLOCKED for a material reason, authorize the Exa fallback benchmark.
8. Freeze the first provider that passes.
9. Phase B production endpoint.
10. Phase C UI.
11. Phase D deployment and production verification.
12. Phase E final review and submission.

No application implementation begins until the project owner explicitly approves Phase A.
