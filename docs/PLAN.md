# Company Snapshot V2 — Plan

## Status

**Phase A is `PHASE A ARCHITECTURE APPROVED FOR IMPLEMENTATION`; B1 is complete, frozen, and approved for production integration; B2 is `B2 PRODUCTION BROAD DISCOVERY — APPROVED` after B2R3's owner-run Stripe name/domain live-gate pass; B3 is `B3 PRODUCTION EVIDENCE VERIFICATION — APPROVED` after B3R2's owner-run NVIDIA replay reached `verified` and a publisher-only validation confirmed the extraction/date correction; B4A is a pure, zero-network deterministic snapshot assembler over completed B3 output, approved; and B4B is `B4B ISOLATED GROUNDED COMPANY DESCRIPTION — APPROVED` after its bounded NVIDIA and stripe.com live Contents gates each passed manual review. B5 Stage A adds a zero-network, dependency-free production orchestration boundary composing the approved B1–B4B exports. A first live-gate CLI attempt stopped at credential preflight (0 network-backed executions); a second, network-backed NVIDIA attempt reached the real pipeline but B4B rejected the description for a reason the harness failed to capture (a harness gap, since corrected); a third, network-backed NVIDIA attempt then **passed** end-to-end (`state: "snapshot"`, resolved `NVIDIA Corporation`/`nvidia.com`, 3 verified signals, no fallback, no retry). B5 is `B5 INTEGRATED LIVE GATE — PASSED FOR ONE KNOWN-GOOD COMPANY (NVIDIA)`. The broader Phase B validation gate then ran the six-case representative cohort (Stripe, PostHog, Canva, notion.so, Mercury, Craigslist) once each: three reached `snapshot` with 3 verified signals, three reached `clarification_needed` (Mercury as intended; notion.so and Craigslist as open findings for review); Canva's signals also raised a no-first-party-source and a likely-duplicate-coverage concern. A subsequent project-owner review found that framing understated the actual gate status: manual grounding continuation (0 Exa calls) opened 5 of the 9 recorded signal sources (the other 4 had no recoverable exact URL in the persisted record) and confirmed all 5 materially support their claim; the Canva duplicate-event question remains unconfirmed by page inspection because its exact URLs were unrecoverable; a validation-harness-only fix now preserves the real underlying B1/B2 discovery reason instead of only the collapsed public `company_ambiguous` reason; and two authorized single-case diagnostic reruns found `notion.so`'s underlying reason is `contradictory_identity` and Craigslist's is `insufficient_identity_evidence`. Against `docs/TESTING.md` §3, this makes §3.2 (5/5 ordinary resolution) fail outright, §3.5 (manual grounding) only partially satisfied, §3.6 (distinctness) unconfirmed for Canva, and §3.8 (Craigslist sparse-company honesty) not clearly satisfied by an identity-evidence-gap outcome. That was `PHASE B VALIDATION — NOT APPROVED / REQUIRES PROJECT-OWNER DECISION`, superseding the earlier "COMPLETE" framing, with no B1–B5 production `src/` file changed and no safety/fabrication failure newly found at that point. **B1R1** then implemented one project-owner-approved, generic, conservative cross-TLD canonical-domain reconciliation rule in `src/targeting/companyTarget.mjs`, fixing `notion.so`'s specific `contradictory_identity` root cause without any company-specific code, new dependency, or new network path; two independent sub-agent reviews found no false-positive exploit or scope issue. The one authorized live confirmation showed `notion.so` now resolves correctly to `Notion Labs, Inc.`/`notion.com`, but the same run separately reached `insufficient_evidence` in B3 verification — a new, distinct, unrepaired downstream finding, not a B1R1 defect. `PHASE B VALIDATION — NOT APPROVED / REQUIRES PROJECT-OWNER DECISION` still stands. B2–B4B remain frozen and unchanged; B1 changed only via the approved B1R1 reconciliation. Cumulative Exa experimental **Search** requests are 35; Exa Contents requests are 8, with 0 retries.**

This document records the current approved V2 product and technical decisions. On 2026-09-08, the approved Gemini and Exa A3 NVIDIA hypotheses failed their bounded gates. A4.1 subsequently showed that a dedicated signal-oriented Exa query could retrieve enough qualifying raw NVIDIA candidates, and A4.2's deterministic selector chose three supported, material, distinct first-party events in its separate NVIDIA smoke. A4.3 then reused that pass and tested the same fixed pipeline on Stripe and PostHog. Both new raw sets contained only two qualifying distinct events under the approved 180-day policy, so each was `DISCOVERY INSUFFICIENT`; the mandatory early-stop rule prevented Canva and `notion.so` requests after maximum possible coverage fell to 3/5. A4.3R0 later found that broader sparse policies would make PostHog's raw set sufficient but would not change the frozen selector's invalid `3,2,7` selection; Stripe remains insufficient under defensible qualitative safeguards. A4.3R1 tested exactly one fresh retrieval change—a fixed source-quality/novelty `systemPrompt`—and Stripe again had only two qualifying raw events, so it early-stopped before PostHog. A4.4 froze the small direction: Exa remains primary discovery, the selector is prioritization/light dedupe rather than final evidence approval, and verification can use one official-domain fallback only to fill missing slots. A4.5 then found distinct, supported first-party Stripe fallback events beyond the two preserved broad-pass signals. Phase A is approved for implementation, but no implementation phase began here.

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

Gemini materially failed its model-access smoke, after which the project owner authorized one bounded Exa A3 NVIDIA smoke, one A4.1 raw-discovery decomposition request, one A4.2 live selector smoke, and the bounded A4.3 benchmark recorded below. The project owner verified the actual Exa account as Free Tier with available credits, no payment method, and no paid billing or automatic top-up path. The first three Exa requests were consumed before A4.3; A4.3 then consumed two more before its mandatory early stop, bringing the cumulative total to five.

Preferred shape:

```text
company input
→ one Exa Search request using auto
→ structured output plus provider grounding
→ minimal application checks
→ snapshot
```

The selected A3 hypothesis is one native `POST https://api.exa.ai/search` request using `type: "auto"`, 10 results, a strict object `outputSchema`, provider-returned `output.grounding`, and no requested page contents. Current official guidance identifies `auto` as the recommended balanced default and confirms that `outputSchema` synthesis applies to every Search type. `deep-lite` was never called or empirically rejected; it is only a possible later, separately authorized fallback if `auto` materially fails, never an automatic fallback.

The `outputSchema` contains only `resolvedCompanyName`, `officialDomain`, `description`, and three signal objects with `title`, `date`, and `summary`; it contains no URL, citation, or confidence fields. Exact source destinations come only from Exa's field-level `output.grounding`. Each grounding entry and citation must match the documented response shape, and every displayed grounding URL must be valid HTTP(S), preserved byte-for-byte, and associated with the relevant scalar claim or indexed signal. Official material does not guarantee equality between grounding citation URLs and `results[].url`, so the diagnostic does not invent that contract. The local diagnostic also enforces the NVIDIA identity/domain, a 2–3 sentence description, exactly three signals, date formatting/older-fallback labeling, and basic duplicate-title rejection. Source support, source quality, and underlying-event distinctness remain manual gates.

The provider-facing schema uses only the minimal documented structural vocabulary needed here and omits `additionalProperties`, `minItems`, and `maxItems` as a risk-minimization choice, not because Exa is known to reject those JSON Schema keywords. Exact top-level keys, exact signal keys, and exactly three signals remain deterministic application-side gates.

The generated setup selected `contents.highlights`, but the bounded smoke omits it because `output.content` plus `output.grounding` already supplies the structured claims and evidence links needed for this one-call manual inspection. Omitting optional content retrieval keeps the first hypothesis smaller and avoids depending on content behavior the experiment does not need. No text, summary, livecrawl forcing, or other content mode is requested.

Official/current references, verified 2026-09-08:
- https://exa.ai/pricing?tab=api
- https://exa.ai/docs/reference/billing
- https://exa.ai/docs/reference/search
- https://exa.ai/docs/reference/search-api-guide-for-coding-agents
- https://exa.ai/docs/reference/pricing
- https://exa.ai/docs/reference/rate-limits
- https://exa.ai/docs/reference/openapi-spec
- https://exa.ai/docs/exa-spec.json

Current public pricing documents describe Starter as free, with $20 signup credits, $10 monthly credits, no payment method required, access to all endpoints, and 10 Search QPS. Public documentation does not establish the actual state of a particular key's account. Before the sole live request, the project owner or an authenticated dashboard inspection must attest that the key belongs to Starter with no payment method, paid usage, or auto-recharge enabled.

**Hard rule:** Exa is only eligible if the actual account can perform the required production workflow with no paid key, no payment requirement for the tested path, and enough free quota for benchmark + review usage.

**2026-09-08 A3 outcome:** `NO-GO` for the tested `auto` hypothesis. Exactly one NVIDIA request completed on the verified Free Tier path in 4,732 ms and returned 10 results, 12 grounding entries, 7 distinct grounding sources, and $0.007 total cost. Identity/domain, the accurate two-sentence description, signal count, and grounding integrity passed deterministic checks. Manual review found one supported but assessment-trivial repository-test change, one supported but 239-day-old update from a weak secondary source, and one acquisition-discussion claim whose generic Yahoo Finance homepage destination was inaccessible and did not materially support or date the event. The three topics were distinct, but the snapshot did not contain three useful, recent, materially supported signals. No retry, benchmark, alternate Exa mode, or later provider work occurred.

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

**2026-09-08 A1 outcome:** `NO-GO`. After the 2026-09-07 credential preflight blocker was resolved, exactly one authorized NVIDIA request was made from the replacement Free Tier project with billing not set up. The provider returned `model_unavailable` for `gemini-2.5-flash`, stating that it is no longer available to new users. No Search execution, grounded result, citations, Search Suggestions, or provider links were returned. Per the hard-stop rule, A2 was not run. Exa and later phases did not begin and require separate authorization.

### A2 — Gemini benchmark
Only if A1 passes, run the approved representative benchmark in `docs/TESTING.md`.

If Gemini passes the benchmark and the bounded repeatability sanity check, record a `GO` recommendation and stop provider evaluation. Do not freeze the retrieval architecture until the project owner reviews and approves the Phase A evidence.

### A3 — Exa smoke
Authorized after Gemini's material failure and completed on 2026-09-08. The project owner first verified the actual account as Free Tier with no payment method or paid billing/automatic top-up path. Exactly one NVIDIA request used the corrected dependency-free `auto + outputSchema + output.grounding` diagnostic. The request completed successfully and passed structural gates, but manual review failed the required usefulness, recency/source-quality, and material-support gates; the tested hypothesis is `NO-GO`. `deep-lite` was never tested and is not an automatic fallback. Do not run the representative benchmark or any other provider/mode without separate authorization.

### A4 — Stop and reassess
The stop-and-reassess gate was reached after Gemini A1 and Exa A3 failed their bounded hypotheses. The approved next step is not another provider or a larger architecture: it is the A4.1 decomposition below.

### A4.1 — Raw Exa signal-discovery decomposition

One separately authorized NVIDIA request used a dedicated signal-oriented query to obtain raw Exa `auto` Search results plus default highlights, with no `outputSchema`, final snapshot, ranking layer, second model, date filter, category, or forced livecrawl. It tested whether that raw-discovery strategy could retrieve at least three distinct, useful, materially supported company-level events within the 180-day fallback window. Because its query differed from A3's final-snapshot query, it was not a controlled isolation of retrieval versus downstream selection.

The diagnostic used `POST https://api.exa.ai/search`, `type: "auto"`, `numResults: 10`, `contents: { highlights: true }`, one native fetch, and no retry. Its signal-oriented query included NVIDIA and current-date context but no expected event answer. Provider `publishedDate` was treated as estimated discovery metadata only; manual source review determined event dates. Candidate material was transient on localhost, while console output remained aggregate.

**2026-09-08 A4.1 outcome: `DISCOVERY SUFFICIENT`.** The one request completed in 4,065 ms, returned 10 results (8 dated, all 10 highlighted, 8 unique domains), and reported $0.007 total cost. Manual inspection found three qualifying distinct first-party events, all within 90 days: NVIDIA's Hugging Face acquisition agreement, the IFA local-AI/PAIR and RTX Spark launch, and the expanded MediaTek partnership/investment. Duplicate clusters covered the Hugging Face acquisition (ranks 1/2/8) and PAIR/RTX Spark (ranks 3/6); inaccessible exact destinations at ranks 2, 5, and 10 were not counted. A4.1 demonstrated that a dedicated signal-oriented raw-discovery query can retrieve enough strong recent candidates for NVIDIA, supporting a decomposed discovery → selection direction. Because the A4.1 query differed from A3's final-snapshot query, the experiment does not isolate whether A3 failed solely in downstream selection versus retrieval-query formulation. A4.1 request count is **1**, cumulative Exa request count is **2**, `deep-lite` remains untested, and the A3 final-snapshot `NO-GO` is unchanged. See `docs/PHASE_A_EXA_DISCOVERY.md` for the candidate-level evidence record. At that phase exit, selector implementation and the benchmark remained separately gated; A4.2 below records the subsequently approved pre-live selector work.

### A4.2 — Lightweight deterministic signal selector

The selector accepts already-retrieved generic candidates and applies only structural validity, provider-date preference, first-party provenance, bounded lexical duplicate collapse, and original Exa rank. It uses the explicit order `RECENT` → `FALLBACK` → `UNKNOWN` → `OLD`, then `FIRST_PARTY` → `OTHER`, then lower Exa rank. Missing, malformed, and future provider dates are `UNKNOWN` and remain eligible. Exact hostname/subdomain matching is suffix-safe; there is no source allowlist.

Duplicate comparison uses normalized title tokens with conservative overlap/Jaccard thresholds. First-highlight tokens are considered only for an opaque metadata-like title and are capped, preventing the fallback from merging ordinary titles that share generic language. A cluster representative uses the same recency/provenance/rank preference, and the first three representatives are returned; fewer than three are returned honestly when necessary. The selector adds no materiality scoring, keyword blacklist, model, embedding, provider call, page fetch, persistence, or synthesis.

The repository has no TypeScript toolchain or `npm run typecheck`, so the implementation follows the existing dependency-free Node ESM convention with JSDoc contracts rather than adding infrastructure for one module.

**2026-09-08 A4.2 outcome: `SELECTOR PASS`.** Exactly one NVIDIA request reused the A4.1 `auto`, 10-result, highlights-only contract and returned 10 candidates. The selector chose ranks `1,3,5`; exact-destination review established that all three were correct-entity, real, material, first-party, supported, distinct, and within 90 days. Five distinct candidates qualified overall at ranks `1,3,4,5,10`. Rank 4 did not outrank rank 5 because its captured provider date was absent, producing `UNKNOWN/FIRST_PARTY`, while rank 5 was `RECENT/FIRST_PARTY`; this follows the frozen recency-first ordering, and rank 4's August 26 date was established only during later manual page review. Independent review agreed with the `SELECTOR PASS` outcome.

The live sample exposed a bounded duplicate-recall limitation: the lexical selector produced no clusters although human review grouped ranks `1/2` and `3/6`. Neither lower-priority duplicate was selected, so the miss did not change this outcome, but representative testing needed to probe the risk. A4.2 Exa request count was **1**, and cumulative Exa request count at that phase exit was **3**. See `docs/PHASE_A_SELECTOR.md`. The separately authorized representative benchmark is recorded below; NVIDIA was not rerun.

### A4.3 — Representative signal-pipeline benchmark

The separately authorized A4.3 benchmark reused the completed NVIDIA A4.2 `SELECTOR PASS` and fixed the remaining order as Stripe, PostHog, Canva, and `notion.so`. Human-approved official domains were evaluation fixtures only. A minimal stateless harness reused the exact A4.1 request implementation and corrected A4.2 selector, made at most one request per eligible case, passed candidates in memory, printed compact metadata, and included no retry, persistence, alternate query/mode/provider, second model, or production resolution logic.

**2026-09-08 A4.3 outcome: `A4.3 SIGNAL BENCHMARK FAIL`.** Stripe's one request returned 10 candidates and the selector chose ranks `2,1,4`; only ranks 2 and 3 qualified as distinct events, so the case was `DISCOVERY INSUFFICIENT`. PostHog's one request returned 10 candidates and the selector chose ranks `3,2,7`; only ranks 2 and 3 qualified, so it also was `DISCOVERY INSUFFICIENT`. Both cases failed at raw discovery sufficiency, not at the selector gate.

After the second insufficiency, NVIDIA was the sole confirmed pass and only two cases remained. Maximum possible ordinary coverage was therefore `3/5`, below the required `4/5`; the benchmark stopped before Canva and `notion.so`. A4.3 made **2** Exa requests with zero retries, and cumulative Exa request count is **5**. Human/selector duplicate comparisons again showed missed semantic groups—Stripe `4/5/8` and PostHog `1/5`—but those misses did not affect either selected set. See `docs/PHASE_A_SIGNAL_BENCHMARK.md` for the full candidate evidence.

Stop for project-owner reassessment. Do not rerun any cohort case, change discovery/selection behavior, begin Mercury or Craigslist edge work, test another provider, or begin A4.4/later phases without a new full-context authorization.

### A4.3R0 — Recency policy reassessment

The assessment requires “recent signals” but does not prescribe the project's ≤90-day preference or 180-day fallback cutoff. A zero-provider reassessment compared the current policy with 270-day and nine-calendar-month sparse fallbacks using only the captured NVIDIA, Stripe, and PostHog evidence.

**A4.3R0 decision: `NO POLICY CHANGE YET`.** Retain ≤90 days as preferred and 91–180 days as the currently approved fallback. Although a future sparse policy could require a discrete material event, exact-destination support and event dating, explicit older-context labeling, and rejection of evergreen or retrospective commentary, the captured evidence does not justify choosing a new maximum now.

PostHog rank 9, a supported first-party LLM trace-clustering event dated 2026-03-11, was about 182 days old and qualifies under either broader policy. That changes PostHog raw evidence from two to three events, but the frozen selector still chooses `3,2,7`; sparse rank 9 remains behind recent but invalid rank 7. Stripe rank 9's underlying 2025-12-11 event was about 272 days old: it is outside 270 days and numerically inside nine calendar months, but its returned source is a recent retrospective explainer, so it fails the discussed non-retrospective safeguard. Stripe therefore remains raw-insufficient. Even a more permissive count would not repair its frozen `2,1,4` selection.

A4.3 remains a valid `FAIL` under its then-approved contract and is not retroactively relabeled. `docs/TESTING.md` and executable behavior remain unchanged. See `docs/PHASE_A_RECENCY_REASSESSMENT.md`. Stop for project-owner review; any future recency-policy change, source-verification/backfill design, implementation, or live experiment requires separate authorization.

### A4.3R1 — Bounded retrieval repair spike

The separately authorized A4.3R1 spike tested only whether adding one fixed system-level instruction to the otherwise identical A4.1 raw Search request could repair raw retrieval sufficiency for the known A4.3 failures. It preserved `POST /search`, the generic query, `auto`, 10 results, highlights, no filters/schema/category/domain constraints, and the frozen selector. The exact instruction was: “Prefer first-party company announcements and reputable independent reporting. Return distinct company-level events. Avoid SEO/affiliate pages, generic roundups, evergreen content, rumors, and duplicate coverage.”

**2026-09-09 A4.3R1 outcome: `RETRIEVAL REPAIR FAIL`.** The sole Stripe request returned 10 candidates, but exact-destination review found only two qualifying distinct events: the August 17 first-party FX/currency expansion and the June 9 first-party Lloyds payment-tools partnership. The frozen selector chose `2,1,3`; selected ranks 1 and 3 did not provide adequate evidence, while valid rank 6 remained unselected. Because raw retrieval was still insufficient, the selector result does not become a standalone selector-failure result. The required early stop prevented any PostHog request.

A4.3R1 made **1** request with zero retries; cumulative Exa requests are **6**. This single fresh sample does not prove that the instruction caused the result, but it does not support adopting the retrieval repair. Historical A4.3 and A4.3R0 remain unchanged. See `docs/PHASE_A_RETRIEVAL_REPAIR.md`; stop for project-owner review before any additional retrieval, policy, selector, or architecture work.

### A4.4 — Phase A architecture freeze

**2026-09-09 A4.4 decision: architecture direction frozen; Phase A exit remains pending A4.5.** The single-pass shape—one generic Exa search followed by source-blind selection of the final three—is rejected as insufficiently reliable. Exa is retained as the primary discovery provider because A4.1 showed useful raw discovery, but its broad pass is not enough to guarantee three defensible events.

The approved ceiling is one broad Exa discovery request, candidate prioritization/light dedupe, prioritized exact-source verification, and only when fewer than three valid distinct events survive, one conditional official-domain/first-party Exa fallback to backfill missing slots. The hard limit is **two discovery requests per company**. The selector is no longer treated as final evidence approval; verification controls eligibility. Recency remains ≤90 days preferred and 91–180 days fallback, with an honest insufficient-evidence state after the bounded path is exhausted.

No crawler, provider waterfall, third search, Tavily fallback, embeddings/vector database, database, reputation engine, elaborate event taxonomy, LangChain/LangGraph, runtime agents, evidence graph, complex scoring, arbitrary retry, or unbounded backfill is approved. A4.5 was the single feasibility test: one official-domain-focused Stripe fallback request under an exact approved contract. Its successful result is recorded below and in `docs/PHASE_A_ARCHITECTURE_FREEZE.md`.

### A4.5 — Final official-domain fallback feasibility

**2026-09-09 A4.5 outcome: `FALLBACK FEASIBLE`; `PHASE A ARCHITECTURE APPROVED FOR IMPLEMENTATION`.** One Stripe-only A4.1-semantic fallback added only `includeDomains: ["stripe.com", "*.stripe.com"]`, returned 10 first-party candidates, and made no retry. Exact-destination review found four additional qualifying distinct events; the August 19 OpenRouter acquisition alone filled the missing third slot beyond the preserved August 17 FX and June 9 Lloyds events.

A4.5 made **1** request; cumulative Exa requests are **7**. This one Stripe feasibility case supports the bounded broad-first plus one official-domain fallback direction, not universal provider reliability, production resolution, verification implementation, synthesis, endpoint/UI readiness, or deployment. No third search, A4.6, or implementation work was started. See `docs/PHASE_A_FALLBACK_FEASIBILITY.md`.

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

**Exit:** `PHASE A ARCHITECTURE APPROVED FOR IMPLEMENTATION` after A4.5 demonstrated one valid official-domain fallback within the frozen two-search ceiling. Production implementation remains separately authorized.

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

### B1 — Company targeting / resolution

**2026-09-09 outcome: deterministic implementation complete.** `src/targeting/companyTarget.mjs` prepares a trimmed company-name target without guessing an official domain, or a normalized non-local hostname anchor from common domain/URL input. It rejects malformed, credential-bearing, unsupported-protocol, bare-host, localhost, and IP website inputs.

Later identity evidence is evaluated without a network call. Name targets require a non-empty compatible resolved name, a non-local proposed domain, an exact-root/subdomain evidence URL that corroborates it, and explicit `ambiguous: false`; a missing or true ambiguity state returns clarification. Domain targets retain the submitted domain without requiring ambiguity metadata and require any supplied identity evidence to name and corroborate that same domain; contradictory or incomplete evidence returns clarification rather than retargeting. This is an identity-evidence boundary, not deterministic semantic company resolution; the later B1 live gate validated its safe Mercury ambiguity and Stripe positive-control behavior.

The separately authorized 2026-09-09 live identity gate then made exactly one Mercury request using the frozen A4.1 raw-discovery body plus only the three-field identity `outputSchema`, with `stream: false`, no retry, and no source-page retrieval. The returned normal result at index 9 did not contain a non-empty `title`, so the inherited strict raw-candidate parser stopped with `formatting: results[9].title was not a non-empty string.` before structured identity content, field grounding, raw candidate material, latency/cost metadata, or source destinations could be evaluated or retained. This is a safe format stop, not evidence that Mercury resolved safely or unsafely. Stripe was not permitted or requested; no second request or response replay occurred. The gate is therefore **`B1 LIVE IDENTITY GATE FAIL — FORMAT BLOCKER`**. See `docs/PHASE_B1_IDENTITY_GATE.md`.

At that historical point, this result authorized neither B2 broad Exa discovery nor any parser/retrieval redesign. It added one Exa request, so cumulative Exa experimental requests were 8.

The separately authorized correction found the shared raw Search parser had incorrectly made `results[].title` mandatory, although the current Exa SDK models it as nullable and the first Mercury response proved it can be absent/empty. Only title parsing changed: absent/null/empty titles now normalize to `null` while every result still requires a non-empty exact HTTP(S) URL. The one authorized Mercury rerun preserved the identical A4.1 body plus only the frozen three-field identity schema. It returned `resolvedCompanyName: "Mercury (Fintech) and Mercury Systems (Aerospace/Defense)"`, `officialDomain: "mercury.com"`, and `ambiguous: true`; B1 correctly returned `clarification_needed` rather than accepting an entity. Exact `mercury.com` grounding pages supported the fintech entity; the exact Yahoo Mercury Systems grounding destination was rate-limited on direct review, but the provider explicitly disclosed the alternate entity and B1 safely clarified.

The final separately authorized Stripe positive control used the same frozen body/schema, one request, and no retry. It returned `resolvedCompanyName: "Stripe"`, `officialDomain: "stripe.com"`, and `ambiguous: false`; B1 returned `resolved`. Exact first-party `stripe.com` grounding supported both identity and domain, while unavailable secondary exact destinations were not replaced. Its raw set remained signal-oriented (10 results; 9 dated; 10 highlighted; 4 unique domains), although this was not a three-signal source-quality evaluation. The result is **`B1 LIVE IDENTITY GATE PASS`; `B1 COMPANY TARGETING / RESOLUTION APPROVED FOR PRODUCTION INTEGRATION`**. Mercury requests across B1 live work are 2, Stripe is 1, retries remain 0, and cumulative Exa requests are 10. No request/query/schema/targeting/architecture change or B2 work occurred. See `docs/PHASE_B1_IDENTITY_GATE.md`.

### B2 — Production broad discovery

**2026-09-09 outcome: implementation retained; live positive gate failed safely.** B2 adds a small production Exa broad-discovery module and a B1-integrated orchestration boundary. It preserves the approved A4.1/B1 broad request semantics and exact three-field identity schema, has one request per invocation and no retry, normalizes raw candidates including nullable titles, and exposes the selector's existing ordered valid representatives as `prioritized` while preserving `selected === prioritized.slice(0, 3)`. It contains no source verification, fallback, second Search, endpoint, UI, or B3 work.

The one authorized B2 name request for `Stripe` returned only `clarification_needed` with `insufficient_identity_evidence`. No raw candidates, grounding, queue, aggregates, latency, or cost were exposed; B1's boundary correctly quarantined the unresolved result. The name positive gate therefore failed, so `stripe.com` was not requested, no retry or patch/replay occurred, and no provider root cause is inferred. B2 made 1 request with 0 retries; cumulative Exa experimental requests are 11. The implementation is automated-test-covered but **`B2 FAIL`**, not approved for production broad discovery. See `docs/PHASE_B2_BROAD_DISCOVERY.md`.

The subsequent B2R0 local-only audit made no provider calls and preserved the cumulative count of 11. It proved structural request parity and normal parsed-identity/grounding/B1-handoff parity with the B1 Stripe positive-control path. It also recorded the intentional B2-only fail-closed handling of an identity output missing only `ambiguous`: B2 safely clarifies where the historical B1 diagnostic parser format-fails. Because the previous response was not retained, that policy difference is a possible explanation but not an established cause. B2R0 is **`AUDIT INCONCLUSIVE`**; B2 remains failed and unapproved. Its smoke harness now has transient sanitized identity/grounding/B1-decision/aggregate diagnostics for a future separately authorized call, without changing the production clarification contract or retaining raw data.

The separately authorized B2R1 diagnostic rerun made exactly one additional Stripe-name request with zero retries. Exa returned `Stripe, Inc.` / `stripe.com` with three resolved-name grounding URLs, five official-domain grounding URLs, and `ambiguous: true`; B1 therefore returned `clarification_needed` / `insufficient_identity_evidence`. The request returned 10 raw results (9 dated, all 10 highlight-bearing, 5 unique domains) in 3,638 ms at a provider-reported cost of $0.007. This is **`B2R1 REPEAT SAFE FAILURE — CAUSE OBSERVED`**. It does not establish deterministic integration success or approve B2. Cumulative Exa experimental requests are 12; no retry, `stripe.com` request, other company, fallback, source verification, code patch, B3, or later work occurred.

The separately authorized B2R2 local correction made zero provider requests. For `ambiguous: true`, B1 now resolves only when submitted and resolved names are exactly equal after the existing conservative legal-suffix normalization, and each field-specific grounding array independently contains an exact root/subdomain HTTP(S) URL corroborating the proposed official domain. The existing permissive name-prefix behavior remains exclusive to `ambiguous: false`; missing ambiguity still clarifies. The captured `Stripe` → `Stripe, Inc.` / `stripe.com` fixture resolves, while the historical combined Mercury entity, loose prefixes, absent field grounding, non-corroborating grounding, and contradictory evidence clarify. B2R2 passed focused and full zero-network tests, but it does not approve B2 or begin B3. Cumulative Exa experimental requests remain 12.

The initial B2R3 Stripe-name command was invoked with the approved smoke harness and Free Starter attestation but stopped locally with `EXA_API_KEY is not set.` That preserved operational status is **`B2R3 PRE-FLIGHT BLOCKED — CREDENTIAL/ENVIRONMENT UNAVAILABLE`**: no HTTP request reached Exa, no provider response existed, and it consumed 0 Exa requests. It was not a live name-gate failure or a provider-side authentication response.

After the project owner loaded the existing ignored `.env` into the shell environment, the owner manually executed the two already-authorized B2R3 commands. The Stripe-name result was `ready_for_verification` for name input, `Stripe` / `stripe.com`, with provider identity `Stripe` / `stripe.com` / `ambiguous: false` and B1 `resolved`. It had 1 resolved-name grounding and 1 official-domain grounding; 10 raw results, 9 dated, 10 highlight-bearing, and 4 unique domains; 10 prioritized, 3 selected, 0 invalid, and 0 duplicate; 3,591 ms latency; and $0.007 provider-reported cost. The conditional `stripe.com` domain command was therefore authorized and returned `ready_for_verification` for domain input, `Stripe` / `stripe.com`, provider identity `Stripe` / `stripe.com` / `ambiguous: false`, and B1 `resolved`. It had 3 resolved-name groundings and 2 official-domain groundings; the same 10 raw, 9 dated, 10 highlight-bearing, and 4 unique-domain aggregates; 10 prioritized, 3 selected, 0 invalid, and 0 duplicate; 4,024 ms latency; and $0.007 cost. Exact grounding URLs and bounded candidate-review lines were not included in the owner-provided result summary and are not reconstructed here.

The overall classification is **`B2R3 LIVE GATE PASS`**. Starting cumulative Exa requests were 12; the initial environment-blocked attempt reached Exa 0 times; the Stripe-name and Stripe-domain commands each made 1 request; B2R3 made 2 actual provider requests with 0 retries; and the ending cumulative count is 14. No fallback, source verification, candidate-page opening, implementation patch, B3, endpoint, UI, deployment, or later work occurred. Provider dates remain discovery metadata and candidates remain unverified. B2 remains unapproved pending project-owner post-run review.

The project owner subsequently approved **`B2 PRODUCTION BROAD DISCOVERY — APPROVED`** after B2R3. That approval is a current decision, not a revision of the historical B2/B2R3 records above. B3 implementation below begins from its full prioritized candidate queue and preserves the two-search ceiling.

### B3 — source verification and bounded fallback implementation

**2026-09-09 implementation outcome: complete; pre-live correction applied; live gate pending.** B3 accepts only B2 `ready_for_verification` output and consumes its complete `prioritized` queue sequentially. It fetches each exact HTTP(S) source URL with native `fetch` using GET, manual redirects capped at five, one five-second deadline spanning redirects, response headers, and body consumption, a 2 MiB response cap, HTML/XHTML-only acceptance, no authentication/cookies/browser execution/retries/crawling, and fail-closed handling for blocked, unavailable, challenge, non-HTML, oversized, malformed, or literal-IP targets. It retains no fetched page body; literal IP hosts (including IPv6) are conservatively rejected rather than requiring a DNS/egress policy layer. Publisher company support ignores only B1's approved legal-name suffixes and still requires exact remaining company tokens.

Static HTML is used only to derive a publisher headline, one bounded supporting passage, and publication date in priority order: Article JSON-LD `datePublished`, `article:published_time`, then article-associated `<time datetime>`. Provider dates remain ranking metadata only. Unknown, future, or >180-day source dates; generic/home/profile pages; unsupported claims; and obvious trivial material are rejected. Accepted evidence contains only the candidate title, publisher title, exact source/final URL, source-derived date/recency/source class, and bounded publisher-derived snippet.

Verification-time dedupe rejects identical source/final URLs and reuses the selector's deterministic lexical duplicate behavior over publisher-derived evidence. It stops immediately at three accepted distinct records. Only after the entire broad queue is exhausted with fewer than three does B3 make one possible A4.5-role raw Exa fallback: the resolved company name is queried with `auto`, 10 results, highlights, `stream: false`, and only the root-plus-wildcard official-domain constraint. It sends no B2 identity `outputSchema`, requires no identity grounding, uses the same selector and verification boundary, and is compared against accepted broad evidence. Known provider failures propagate unchanged; successful exhaustion returns honest insufficient evidence. The total remains at most two Exa Searches per company.

Focused local fixtures passed 16/16 and the full zero-network suite passed 147/147. B3 implementation and correction made 0 Exa requests and 0 live publisher requests; cumulative Exa experimental requests remain 14. No synthesis, endpoint, UI, deployment, B4, or later work began. B3 live validation and project-owner approval remain pending.

The subsequently authorized B3 live gate added a thin production-path smoke harness for exactly `NVIDIA` or `Stripe`, with explicit Free Starter confirmation, one B2 discovery invocation, and one B3 verification invocation. Its zero-network harness suite passed 7/7, relevant B1/B2/selector regressions passed 53/53, B3 verification passed 16/16, and the full suite passed 154/154. Before the first attempted invocation, `EXA_API_KEY` was unavailable to the process; the harness therefore stopped at credential/environment preflight without reading the ignored `.env`, making an Exa request, or fetching a publisher page. This preserved historical status is **`B3 LIVE GATE PRE-FLIGHT BLOCKED — CREDENTIAL/ENVIRONMENT UNAVAILABLE`**, not a provider-side authentication or evidence-quality outcome.

The project owner subsequently ran the already-authorized B3 commands in an environment with the key available. NVIDIA reached B2 `ready_for_verification` as `NVIDIA Corporation` / `nvidia.com`; its broad request and single official-domain fallback each ran once, and B3 returned `insufficient_evidence` with two accepted first-party NVIDIA records: `NVIDIA to Acquire Hugging Face` and `Sparks Fly: NVIDIA Accelerates Local AI at IFA 2026`, both dated 2026-09-03 and classified `RECENT`. The first accepted snippet was header-like (`NVIDIA to Acquire Hugging Face September 3, 2026 ... Share...`); no extraction correction is inferred or made from that fact alone. Stripe's production B3 run made one broad request but stopped at B2 `clarification_needed` / `insufficient_identity_evidence`, so B3 was not reached. A separate authorized B2 diagnostic request for the identical Stripe input then resolved `Stripe, Inc.` / `stripe.com` with `ambiguous:true`, B1 `resolved`, and three first-party `stripe.com` grounding URLs for each identity field. The original Stripe clarification response was not retained, so the source of the differing identity outcome is unknown.

The owner-run continuation began at cumulative Exa 14 and made NVIDIA broad 1 + NVIDIA fallback 1 + Stripe broad 1 + Stripe B2 diagnostic 1 = 4 actual Exa requests, with 0 retries; the cumulative count is therefore **18**. The preflight block remains historical fact and is superseded only for live-gate evaluation by these owner-run results. No additional provider interpretation, production-policy correction, B4, synthesis, endpoint, UI, deployment, or later work is authorized here. B3 remains unapproved pending diagnostic root-cause review and project-owner decision.

**B3R1 Stage A — diagnostic observability:** The owner-run outcomes above earned a smoke-only observer, not a production-policy change. The B3 harness now reuses B2's existing sanitized `discoverCompanyForSmoke(...)` result and a shared B3 verifier observer. It reports B2 identity/grounding/confirmation aggregates on either resolution or clarification, and records each candidate actually evaluated with its real post-dedupe decision, broad/fallback origin, safe parsed-source metadata where available, fallback trigger/counts, and final accepted count. The normal `discoverCompany(...)`, `verifyCandidate(...)`, and `verifyCompanyDiscovery(...)` contracts and their acceptance/retrieval decisions remain unchanged. Stage A made 0 Exa requests and 0 publisher requests. Syntax checks, focused B3/B3-smoke diagnostics (27/27), full zero-network regression (`node --test test/*.test.mjs`, 158/158), and `git diff --check` passed. B3R1's optional replay remains separately bounded to the authorized NVIDIA and Stripe production-path commands only if the executing process has the key; no retry, third search, or policy correction is authorized.

**B3R1 Stage B — owner-run factual continuation:** Starting at cumulative Exa 18, the owner ran NVIDIA once (broad 1, fallback 1) and Stripe once (broad 1, fallback 0), with 0 retries. NVIDIA reached B2 `ready_for_verification` as `NVIDIA Corporation` / `nvidia.com` but remained `insufficient_evidence` with the same two accepted first-party recent records. The new diagnostic trace established that several legitimate `nvidianews.nvidia.com` pages had a resolved URL and extracted title but no publisher date or source class because they failed the structural `<article>`/`<main>` content gate as `unsupported_claim`; they therefore never reached company support, materiality, recency, anchoring, or dedupe. Stripe was the control case: B2 resolved `Stripe` / `stripe.com` / `ambiguous:false`, its first three broad candidates were distinct first-party recent publisher-derived evidence, and B3 was `verified` without fallback (Meta Muse / Link, Singapore infrastructure expansion, and FX/currency capabilities). The Stage B total was 3 Exa requests; cumulative Exa is **21**. The concrete NVIDIA first-party incompatibility earned B3R2's extraction/date-proof correction only; B1/B2, selection, recency, materiality, dedupe, and fallback policy remain frozen.

**B3R2 — narrow publisher extraction correction:** B3R2 adds no provider or parser dependency. It preserves `<article>` then `<main>` as preferred content sources and uses a generic body fallback only when neither is substantive, after removing a small set of generic chrome/control regions. It retains every existing source/evidence gate. When JSON-LD `datePublished`, `article:published_time`, and `<time datetime>` are absent, it may use one strict calendar-valid English month-name date visible immediately after the content headline in a bounded top-of-content region; provider dates remain ineligible. Synthetic zero-network NVIDIA-Newsroom-style fixtures reproduce the observed no-`article`/no-`main` failure and prove the fallback, date precedence, headline/footer/buried/inert-date rejection, homepage/thin-page protection, support, stale/future handling, and no-provider-date rule. Syntax checks, focused B3/B3-smoke tests (30/30), the full suite (161/161), and `git diff --check` passed with 0 B3R2 provider or publisher requests. B3 remains unapproved pending the one separately authorized NVIDIA replay.

The owner then ran the one authorized B3R2 NVIDIA production-path replay (no retry): one broad Exa request, no fallback, and B3 `verified` with exactly three accepted evidence records. Cumulative Exa is **22**. A subsequent publisher-only check made 0 Exa requests and re-ran the exact `nvidianews.nvidia.com` page that previously failed the structural gate in B3R1 Stage B through B3R2's corrected extraction path; it was accepted with a publisher-derived date of `2026-08-31`, `RECENT`, `FIRST_PARTY`, directly validating the intended structural/date-extraction correction. The project owner subsequently approved **`B3 PRODUCTION EVIDENCE VERIFICATION — APPROVED`**. That approval is a current decision and does not revise the historical B3/B3R1/B3R2 records above. See `docs/PHASE_B3_LIVE_GATE.md`.

### B4A — pure deterministic snapshot assembly

B4A is intentionally split from B4B. It adds one small pure module, `src/snapshot/assembleSnapshot.mjs`, that consumes an already-completed B3 verification result plus a description string supplied by its caller and returns the assessment-shaped snapshot. It performs zero network, Exa, publisher, or model activity; it does not import or invoke B1, B2, or B3, and it does not select, rerank, rewrite, or synthesize any signal. `verified` evidence (always exactly three records) maps to exactly three signals in B3's existing order; `insufficient_evidence` evidence (0–2 records) maps to that same partial count with no padding. Each signal exposes only `title` (B3 `sourceTitle`), `publishedDate` (B3 `publishedDate`), `sourceUrl` (B3 `resolvedUrl`, not the original candidate/source URL), and `recencyBucket` (B3 `recencyBucket`); `evidenceSnippet`, `candidateTitle`, and `sourceClass` are not exposed. B4A fails fast (`TypeError`) on malformed internal inputs — unsupported state, wrong evidence count for the state, missing/empty company name or domain, missing/non-string description, or a non-HTTP(S) final source URL — rather than manufacturing an output. It mutates neither its `verification` input nor the caller-supplied description.

B4A adds no dependency and makes no B1–B3 change. Focused tests (`test/assemble-snapshot.test.mjs`) cover verified assembly and order, publisher-title/date/URL precedence over raw candidate values, no provenance leakage, all three insufficient-evidence counts, invalid-contract rejection (wrong evidence counts per state, missing description, malformed company, malformed source URL, unsupported state), and non-mutation of the B3 fixture; the full zero-network suite and `git diff --check` also passed. B4A accepts a future grounded description as an input only; generating that description is separately authorized future work as B4B, which remains unstarted. Endpoint/UI integration (B5) and Phase C remain unstarted.

### B4B Stage A — isolated Exa Contents description candidate (unapproved)

B4B exists solely to produce the description string B4A intentionally does not generate. It is deliberately isolated rather than added to B2's existing broad-discovery `outputSchema`, so a description feature cannot risk the already-approved Search/identity/signal-retrieval behavior. `src/description/exaCompanyDescription.mjs` accepts an already-confirmed `{ companyName, officialDomain }` plus an API key and makes one Exa **Contents** request (never Search) against the exact HTTPS root of the confirmed domain, requesting `summary` only — no text, highlights, subpages, or forced livecrawl. It does not import or invoke B1, B2, B3, or B4A. The narrow summary instruction asks for exactly 2–3 factual sentences on the stable core business, principal products/services, and principal use case, grounded only in the supplied page, explicitly excluding recent announcements, funding, acquisitions, partnerships, earnings, leadership changes, stock performance, and promotional language — that current-events territory remains B3/B4A's job.

A successful result requires the per-URL Contents status to be `"success"`, a non-empty summary, exactly 2–3 sentences via `Intl.Segmenter` sentence segmentation, a bounded maximum length, no embedded HTTP(S) URL, and a returned result URL that is a valid HTTP(S) URL on the confirmed official domain or a subdomain (suffix-safe comparison; an unrelated redirected domain is never silently accepted). Any of those failing returns a narrow `description_unavailable` state with one of a small fixed reason vocabulary; only a genuine contract-shape violation (e.g. a missing `statuses`/`results` array) throws a typed `CompanyDescriptionError`, alongside auth/payment-required/quota/timeout/unavailable conditions classified the same way B2's discovery error boundary already does. There is no retry.

Stage A made 0 live Exa Search or Contents requests; Search accounting remains 22. Focused tests (`test/exa-company-description.test.mjs`, 30/30) cover the exact-homepage-only request construction, the summary-only/no-Search/no-subpage/no-highlight body shape, the narrow instruction content, 2- and 3-sentence acceptance, whitespace normalization, same-domain/subdomain acceptance, off-domain rejection, a domain-suffix-string (non-subdomain) rejection, 1- and 4+-sentence rejection, empty-summary rejection, embedded-URL rejection, over-length rejection, malformed-URL rejection, unsuccessful-status rejection, malformed-provider-output handling, request/result-ID association with the requested homepage (matching accepted; mismatched or missing/malformed `statuses[].id`/`results[].id` rejected as `provider_format`, independent of a legitimate same-domain canonical `result.url`), and consistent auth/quota/payment/unavailable/timeout classification with no retry. A bounded future live-gate harness (`scripts/phase-b4b-live-smoke.mjs`, tested zero-network in `test/phase-b4b-live-smoke.test.mjs`) is restricted to two fixed, already-confirmed cases (`NVIDIA` → `nvidia.com`; `stripe.com` → `stripe.com`), requires an explicit free-Starter confirmation flag, calls only this description path once per invocation with no retry, and was **not executed** in Stage A. B4B is an unapproved isolated production candidate pending a separately authorized live validation gate; it does not alter B1–B4A, and B5/Phase C remain unstarted.

### B4B — owner-run live gate and approval

The owner subsequently ran the two owner-authorized B4B Contents live gates, each exactly one Contents request with no retry and no Exa Search request. NVIDIA (submitted `NVIDIA`, resolved `NVIDIA Corporation` / `nvidia.com`) returned `state: "described"` from `https://nvidia.com/`, latency 2783 ms, estimated cost $0.001. Stripe (submitted `stripe.com`, resolved `Stripe` / `stripe.com`) returned `state: "described"` from `https://stripe.com/`, latency 2115 ms, estimated cost $0.001. Both descriptions contained exactly three sentences and passed manual review against current official NVIDIA/Stripe materials for factual accuracy, stable core-business focus, sentence-count compliance, company/product/use-case clarity, absence of recent-news contamination, official-domain grounding, and no material unsupported specificity.

Provider accounting: B4B Contents requests are 2; retries are 0; B4B made 0 Exa Search requests; cumulative Exa Search accounting remains **22**, tracked separately from Contents.

The project owner approved **`B4B ISOLATED GROUNDED COMPANY DESCRIPTION — APPROVED`**, based on the reviewed zero-network implementation and tests, the frozen B1–B4A boundary, the one-Contents-request-per-company/no-retry/summary-only-homepage design, and these two live passes with manual sanity checks. Two cases do not establish universal reliability across arbitrary companies; broader end-to-end coverage — smaller, private, ambiguous, or low-activity companies — remains a later validation concern, not yet run. This approval does not modify B1–B4A or the B4B implementation, and does not authorize B5 or Phase C.

### B5 Stage A — bounded production orchestration boundary (implemented, not live-gate approved)

B5 adds one small, dependency-free composition module, `src/orchestration/createCompanySnapshot.mjs`, that sequences the existing approved B1–B4B production exports — `discoverCompany`, `verifyCompanyDiscovery`, `requestCompanyDescription`, `assembleSnapshot` — into one application-facing `createCompanySnapshot(rawInput, apiKey, options)` result. It performs no retrieval, verification, selection, deduplication, or synthesis itself; each stage's own module retains exclusive ownership of its behavior and Search/Contents budget, including B3's sole conditional official-domain fallback decision. B2 `clarification_needed` stops immediately before any B3/B4B/B4A call. Both B3 outcomes (`verified` and `insufficient_evidence`) proceed to B4B using the confirmed `verification.company.companyName`/`officialDomain`, never the raw submitted input; B4A's result is returned unchanged for both `snapshot` and `insufficient_evidence`, with no padding.

The public contract is deliberately small: `clarification_needed` (B2 `invalid_input` maps to `invalid_input`; every other B2 clarification reason maps to `company_ambiguous`, without exposing the full B1/B2 diagnostic vocabulary), `snapshot`, `insufficient_evidence`, and a narrow `unavailable` state. `unavailable` has exactly two reasons: `description_unavailable` (a normal B4B content-quality result) and `provider_unavailable` (a caught `BroadDiscoveryError` from B2/B3's fallback, or a caught `CompanyDescriptionError` from B4B). No API key, provider error message, HTTP body, tag, stack trace, or other internal diagnostic is exposed. Any other error — an unexpected programming/contract defect — is deliberately rethrown rather than absorbed into `unavailable`, so it remains visible; there is no blanket `catch`. Testability uses one narrow internal `services` dependency-injection object (defaulting to the real B1–B4B exports) rather than any mocking library, framework, or change to B1–B4B; a caller-supplied `now` propagates consistently to discovery and verification.

Focused tests (`test/create-company-snapshot.test.mjs`, 11/11) cover: invalid-input and ambiguous clarification stopping before later stages; full verified-success ordering and exact-once call counts with confirmed-identity pass-through; insufficient-evidence at 0 and 2 records still describing/assembling with no padding; a normal `description_unavailable` result skipping assembly; discovery, B3, and B4B provider-layer failures each mapping to `unavailable`/`provider_unavailable` and stopping later stages; an unexpected `TypeError` propagating unchanged rather than being converted to `unavailable`; and the real (non-faked) production discovery path handling zero-network invalid input correctly. The full zero-network suite passed 224/224 (213 pre-existing + 11 new); syntax checks and `git diff --check` passed. B5 Stage A made 0 Exa Search, 0 Exa Contents, 0 publisher, and 0 other network requests; cumulative accounting remains Search 22 / Contents 2 / B4B retries 0. No B1–B4B source file changed.

B5 Stage A is **implemented and zero-network tested, but not live-gate approved** — mocked-dependency tests passing does not constitute a live-gate pass or phase approval (see `docs/WORKFLOW.md` §4's four-state model). No integrated live B5 request has been made. No HTTP endpoint, frontend, or deployment exists yet; Phase C and deployment remain unstarted.

### B5 — integrated live gate (preflight blocked)

The subsequently authorized B5 integrated live gate added `scripts/phase-b5-live-smoke.mjs`, restricted to exactly one live case (`NVIDIA` name input, no retry, no second company), and `test/phase-b5-live-smoke.test.mjs`. The harness calls the real, reviewed `createCompanySnapshot()` and observes provider request counts only through thin counting wrappers registered via B5's existing `services` seam; the wrappers delegate entirely to the real `discoverCompany`, `verifyCompanyDiscovery`, `requestCompanyDescription`, and `assembleSnapshot` exports and alter no return value or business decision. Its 15 zero-network tests passed, including two full fake-network exercises that drove the real production pipeline end-to-end (one without a B3 fallback, one with) and confirmed correct call-counting, correct confirmed-identity propagation, and a correct final `snapshot` shape, plus a fake-network exercise proving the harness's failure-diagnostic path genuinely reaches the assembly stage after real counted broad/publisher/Contents activity rather than collapsing to an error string, and a direct regression confirming a completed B3 result implies exactly one Exa Contents request. The full zero-network suite passed 239/239 (224 pre-existing + 15 new).

The one authorized live command — `node scripts/phase-b5-live-smoke.mjs b5-live-smoke --company NVIDIA --confirmed-free-starter` — was run exactly once. It stopped at credential preflight: `EXA_API_KEY` was not available to the process, and the harness never reads or sources `.env` or any file containing secrets, so it failed before any network call. This is **`B5 LIVE GATE PRE-FLIGHT BLOCKED — CREDENTIAL/ENVIRONMENT UNAVAILABLE`** — an environment/credential-availability stop, not a provider-side authentication result and not an integration-correctness outcome. 0 Exa Search, 0 Exa Contents, and 0 publisher requests occurred; cumulative accounting remains Search 22 / Contents 2, unchanged. No second company, no retry, and no production `src/` change occurred. See `docs/PHASE_B5_LIVE_GATE.md`.

No conclusion is drawn about B5's integration correctness from this attempt — it never reached the pipeline. This first CLI attempt produced zero network-backed B5 executions; that remains historical fact.

### B5 — first network-backed execution (not passed; harness diagnostic gap found and fixed)

A second CLI attempt — the same authorized command, run with `EXA_API_KEY` present — reached the real pipeline: `node --env-file=.env scripts/phase-b5-live-smoke.mjs b5-live-smoke --company NVIDIA --confirmed-free-starter`. NVIDIA resolved to `NVIDIA Corporation` / `nvidia.com`; B3 reached `verified` with exactly 3 evidence items and no fallback (1 broad Search, 6 publisher requests); B4B then made 1 Contents request but returned `description_unavailable`; B5 correctly mapped this to the public `{state: "unavailable", reason: "description_unavailable"}` result. Total latency was 6378 ms. Cumulative accounting is now Search 23 / Contents 3, with 0 retries.

The live run exposed a real gap in the smoke harness, not in production code: `requestCompanyDescription()`'s `description_unavailable` result always carries a specific `reason` (e.g. `empty_summary`, `invalid_sentence_count`, `untrusted_source_domain`), but the harness's diagnostic derivation omitted that field, so this run proved B4B rejected the description without recording why. The exact reason for this specific run is unknown and is not guessed. The harness has been corrected to preserve `captured.description.reason` in both its normal summary and its failure diagnostic going forward, with 4 new zero-network regressions; this does not retroactively recover the missing reason from this already-completed run. See `docs/PHASE_B5_LIVE_GATE.md` and `docs/AI_FAILURE_LOG.md`.

This is **`B5 INTEGRATED LIVE GATE — NOT PASSED (B4B DESCRIPTION REJECTED; UNDERLYING REASON UNKNOWN DUE TO A HARNESS DIAGNOSTIC GAP, NOW FIXED)`**. B1–B3 integration through the real B5 orchestration was observed to work correctly (identity, verification, budget, no retry); B5's error-mapping was also observed to work correctly. No conclusion is drawn that B5's orchestration logic is broken. As of this record no second network-backed NVIDIA execution had occurred; a further live attempt, to observe the actual B4B rejection reason under the corrected harness, required fresh project-owner authorization. Broader Phase B validation, Phase C, endpoint/UI, and deployment remained unstarted. (That further attempt is recorded below.)

### B5 — second network-backed execution (passed)

The project owner subsequently authorized exactly one further network-backed NVIDIA execution with the corrected harness — `node --env-file=.env scripts/phase-b5-live-smoke.mjs b5-live-smoke --company NVIDIA --confirmed-free-starter`, run exactly once. It resolved `NVIDIA Corporation` / `nvidia.com`; B3 reached `verified` with exactly 3 evidence items and no fallback (1 broad Search, 6 publisher requests); B4B returned `state: "described"` from `https://nvidia.com/` (1 Contents request); B5 assembled the final `state: "snapshot"` result with a two-sentence grounded description and 3 signals matching the verified evidence (NVIDIA to Acquire Hugging Face; Sparks Fly: NVIDIA Accelerates Local AI at IFA 2026; NVIDIA Expands AI Infrastructure Capacity in Partnership With Australia's Data Center Ecosystem — two `FIRST_PARTY` `blogs.nvidia.com` sources and one `OTHER` `globenewswire.com` source, all `RECENT`). Total latency was 5533 ms; 0 retries. Cumulative accounting is now Search 24 / Contents 4.

This is **`B5 INTEGRATED LIVE GATE — PASSED FOR ONE KNOWN-GOOD COMPANY (NVIDIA)`**. The full B1→B4A path succeeded end-to-end within the frozen provider budget, confirming the integrated path can succeed for the one authorized case. It does not establish broad reliability across arbitrary companies, and it does not retroactively explain the prior attempt's `description_unavailable` rejection — that reason remains permanently unknown; ordinary content-quality variability across two separate live Contents calls is a plausible but unconfirmed explanation. No second NVIDIA execution occurred after this one; no other company was run; no production `src/` file changed. See `docs/PHASE_B5_LIVE_GATE.md`. Broader Phase B validation (additional/edge-case companies), Phase C, endpoint/UI, and deployment remain unstarted.

## Phase B validation — representative cohort (complete)

The subsequently authorized broader Phase B validation gate added `scripts/phase-b-validation.mjs` (with no `--company` argument at all — it always runs the fixed six-case cohort from `docs/TESTING.md`'s Phase A representative benchmark in fixed order, making a seventh or NVIDIA case impossible to invoke through this **CLI**; a later correction below closed the same gap in the module's exported `runValidationCase()` function, which had accepted arbitrary input when imported directly) and `test/phase-b-validation.test.mjs`. It reuses `scripts/phase-b5-live-smoke.mjs`'s generic, company-agnostic budget/diagnostic helpers directly rather than duplicating them. Its 11 zero-network tests passed, including three full fake-network exercises of the real pipeline reaching `snapshot`, `clarification_needed`, and `insufficient_evidence` respectively, plus run/stop-on-failure sequencing tests. The full zero-network suite passed 254/254 (243 pre-existing + 11 new).

The six authorized cases — `Stripe`, `PostHog`, `Canva`, `notion.so`, `Mercury`, `Craigslist` — were each run exactly once via `node --env-file=.env scripts/phase-b-validation.mjs b-validation --confirmed-free-starter`. None threw; no budget violation; no retry. Results: `Stripe`, `PostHog`, and `Canva` each reached `snapshot` with 3 verified, sourced, dated signals; `Mercury`, `Craigslist`, and `notion.so` each reached `clarification_needed`/`company_ambiguous`. Mercury's clarification is the intended safety outcome for that edge case. `notion.so`'s and `Craigslist`'s clarifications are honest, non-fabricated outcomes but were not the specifically anticipated result for those cases (domain-input snapshot for notion.so; snapshot-or-insufficient_evidence for Craigslist) and are flagged for project-owner review rather than explained or fixed here. Canva's three accepted signals also raise two evidence-quality concerns — no first-party (`canva.com`) source among them, and two of the three appear to be syndicated coverage of the same underlying announcement that the existing lexical-dedup heuristic did not catch — recorded, not repaired. Cumulative accounting is now Search 30 / Contents 7, 0 retries. See `docs/PHASE_B_VALIDATION.md` for the full six-case matrix, per-signal manual-inspection notes, and provider accounting.

This is **`PHASE B VALIDATION — COMPLETE; NO SAFETY OR FABRICATION FAILURE OBSERVED; TWO FINDINGS FLAGGED FOR PROJECT-OWNER REVIEW BEFORE BROADER RELIABILITY IS CLAIMED`**. No B1–B5 production `src/` file changed; no recency, dedupe, source, targeting, or description rule was loosened to produce or accept any of these results. Phase C, endpoint/UI, and deployment remain unstarted and unauthorized by this task.

### Phase B validation — project-owner review correction (superseding, 2026-09-10)

The project owner reviewed the outcome above and found it understated the actual gate status. Three corrections were made, in order, with no repair to B1/B2 production behavior:

1. **Manual grounding continuation, 0 Exa calls.** Of the 9 signal sources recorded across the three `snapshot` cases (Stripe, PostHog, Canva), only 5 exact URLs could be reconstructed with confidence from already-recorded exact-title/exact-date matches elsewhere in this repository's history; the completed run's own record had preserved only truncated domain fragments for the other 4 (1 PostHog signal, all 3 Canva signals), and no raw run output survived to recover them. Those 5 were opened and all materially supported their displayed claim with a matching date. The other 4 were not guessed or fetched. This is itself a process finding: the validation report's manual-inspection pass previously relied on captured snippets rather than opened pages, and even a corrected inspection cannot fully re-derive every displayed URL after the fact.
2. **Canva's duplicate-event question remains unconfirmed.** It could not be resolved by page inspection as instructed, because neither exact Canva signal-2/3 URL was recoverable. Title/metadata evidence (near-identical titles six days apart, two different secondary syndication sources) is suggestive of one underlying announcement but is not a page-verified finding, and no dedupe-logic change was made or implied.
3. **Harness-only fix + diagnostic reruns.** `scripts/phase-b5-live-smoke.mjs` previously discarded the real underlying B1/B2 discovery reason once a case exited during discovery, exposing only the public B5 contract's collapsed `company_ambiguous` reason — a diagnostic gap parallel to the earlier B4B-description-reason gap. A validation-harness-only fix (no `src/` change; 3 new zero-network regression tests; full suite 257/257) now preserves it. Two owner-authorized diagnostic reruns (1 Exa Search each, 0 retries, 0 fallback) then found the real reasons: `notion.so` → `contradictory_identity`; `Craigslist` → `insufficient_identity_evidence`. Cumulative Exa Search is now 32 (Contents unchanged at 7).

Against `docs/TESTING.md` §3, this changes the gate-by-gate status: **§3.2 (5/5 ordinary clear-company resolution) fails** because `notion.so`, an ordinary cohort case, did not resolve; **§3.5 (manual grounding) is only partially satisfied** (5/9 sources actually opened); **§3.6 (distinctness)** remains **unconfirmed** for Canva rather than resolved either way; and **§3.8 (Craigslist sparse-company honesty) is not clearly satisfied**, because Craigslist's actual outcome was an identity-evidence gap (`insufficient_identity_evidence`), not the three-legitimate-signals-or-honest-limited-evidence result §3.8 was written to accept. §3.3, §3.4, §3.7, and §3.9 remain passed, and no safety or fabrication failure is newly found — B1/B2's identity-safety boundary held in every case, and every openable source genuinely supported its claim.

This is now **`PHASE B VALIDATION — NOT APPROVED / REQUIRES PROJECT-OWNER DECISION`**, superseding the "COMPLETE" framing immediately above (preserved as history, not deleted). No B1–B5 production `src/` file changed; B1/B2's `notion.so`/Craigslist failure modes are now identified but deliberately not investigated further or corrected here. See `docs/PHASE_B_VALIDATION.md`'s "Project-owner review correction (2026-09-10)" section and `docs/TESTING.md`'s corresponding entry for the full per-signal matrix and rationale. Phase C, endpoint/UI, and deployment remain unstarted and unauthorized.

### B1R1 — conservative cross-TLD canonical-domain reconciliation (2026-09-10)

The project owner approved a narrow, generic repair of the `notion.so` `contradictory_identity` root cause identified above: a company-domain input may now accept a provider-proposed *different* top-level domain (e.g. `notion.so` → `notion.com`) only when **all** of the following hold, implemented entirely in `src/targeting/companyTarget.mjs`'s existing `confirmCompanyIdentity()` domain branch: the provider is explicitly `ambiguous: false`; both the submitted and proposed hostnames are exactly two-label domains (no public-suffix dependency); their leftmost labels are exactly, non-fuzzily equal; the resolved company name is consistent with that shared label via the existing `namesAreConsistent()` machinery (reused, not duplicated); the resolved-name grounding directly corroborates the proposed domain; **every** official-domain grounding citation (not just one) is on the proposed domain; and the combined evidence URLs also corroborate it. Any failed condition preserves the existing `contradictory_identity` safety outcome unchanged. No company- or domain-specific branch, new dependency, new network call, or retry was added; same-domain, subdomain, name-input, and Mercury-ambiguity behavior are all unaffected.

Two sub-agent reviews ran: an investigation pass found no exploitable false positive (empty labels, multi-label hosts, and IDN homographs are all correctly excluded) but documented one structural, by-design residual risk — very short/generic shared brand labels (e.g. `x.co`/`x.com`) cannot be distinguished from unrelated companies by this rule alone, an inherent limitation of domain-only input with no independent submitted name to cross-check, not an implementation defect; an independent review of the complete diff against 16 specific safety/scope criteria found no issues. 30 focused targeting tests (17 new), 10 discovery tests (2 new), and 16 validation-harness tests (one existing fixture updated to reflect its exact scenario now correctly reconciling, one new end-to-end regression added) all pass; the full zero-network suite passed 281/281.

The one authorized live confirmation (`runValidationCase("notion.so", ...)`, the same production entry point used by the Phase B validation harness) showed B1R1 working exactly as intended: `notion.so` now resolves to `ready_for_verification` as `Notion Labs, Inc.` / `notion.com` — no longer `clarification_needed`. Per the pre-authorized stop rule, the run was recorded and not repeated or investigated further when the same run's B3 verification separately reached `insufficient_evidence` (0 accepted evidence records, despite 1 broad + 1 naturally-triggered fallback Exa Search and 20 publisher fetch attempts) and B4B still produced a grounded description from `https://notion.com/`. This is a **new, distinct downstream finding**, not a B1R1 regression, and is not repaired here. Cumulative Exa Search is now 35 (Contents 8, retries 0).

**Gate impact:** the specific identity-resolution defect behind `notion.so`'s §3.2 failure is fixed and confirmed live, but this does not formally re-certify §3.2's "5/5" cohort metric (that requires an authorized full six-case re-run, not performed here), and §3.3 (usable three-signal coverage) remains unsatisfied for `notion.so` because it still does not reach a snapshot. No other §3 gate is affected; Craigslist, Canva, and the manual-grounding URL-persistence gap remain exactly as previously recorded. **`PHASE B VALIDATION — NOT APPROVED / REQUIRES PROJECT-OWNER DECISION` still stands.** See `docs/PHASE_B1R1_RECONCILIATION.md` for the full record. Phase C, endpoint/UI, and deployment remain unstarted and unauthorized.

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

# 11. Current sequence after B1

1. Phase A is architecture-approved from the bounded broad-first plus one official-domain-fallback evidence.
2. B1's deterministic company targeting and identity-safety boundary is complete; its two-request Mercury live work ended in SAFE AMBIGUITY after the factual parser correction, and its Stripe positive control passed.
3. B2's initial name gate safely clarified, its zero-provider audits/correction established a narrow ambiguity boundary, and B2R3's authorized Stripe name/domain sequence passed. It is now **`B2 PRODUCTION BROAD DISCOVERY — APPROVED`**.
4. B3's verification/fallback implementation passed its owner-run NVIDIA replay and publisher-only validation; it is now `B3 PRODUCTION EVIDENCE VERIFICATION — APPROVED`.
5. B4A adds a pure, zero-network deterministic snapshot assembler over completed B3 output; it is approved and does not modify B1–B3.
6. B4B's isolated Exa Contents description candidate passed its two owner-authorized NVIDIA and stripe.com live gates with manual review; it is now `B4B ISOLATED GROUNDED COMPANY DESCRIPTION — APPROVED` and still does not modify B1–B4A.
7. B5 Stage A adds a zero-network, dependency-free production orchestration boundary composing the approved B1–B4B exports; it is implemented and zero-network tested.
8. B5's integrated live gate passed for NVIDIA (`B5 INTEGRATED LIVE GATE — PASSED FOR ONE KNOWN-GOOD COMPANY (NVIDIA)`), after a credential-preflight-blocked first attempt and a description-rejected second attempt (harness gap, since fixed).
9. The broader Phase B validation gate ran the six-case representative cohort once each; three reached `snapshot`, three reached `clarification_needed` (one as intended, two as open findings). It was initially recorded as `PHASE B VALIDATION — COMPLETE; NO SAFETY OR FABRICATION FAILURE OBSERVED; TWO FINDINGS FLAGGED FOR PROJECT-OWNER REVIEW BEFORE BROADER RELIABILITY IS CLAIMED`. A subsequent project-owner review corrected this: manual grounding continuation (0 Exa calls) opened 5 of the 9 recorded sources and confirmed support (4 had no recoverable exact URL); Canva's duplicate-event question remains unconfirmed by page inspection; a validation-harness-only fix now preserves the real underlying B1/B2 discovery reason instead of the collapsed public `company_ambiguous`; and two authorized diagnostic reruns (2 Exa Search, 0 retries) found `notion.so`'s reason is `contradictory_identity` and Craigslist's is `insufficient_identity_evidence`. That made it **`PHASE B VALIDATION — NOT APPROVED / REQUIRES PROJECT-OWNER DECISION`** because §3.2, §3.5, §3.6, and §3.8 of `docs/TESTING.md` were not all cleanly satisfied.
10. **B1R1** implemented the project-owner-approved generic, conservative cross-TLD canonical-domain reconciliation rule fixing `notion.so`'s specific `contradictory_identity` root cause, with no company-specific code and no B2–B4B change. The one authorized live confirmation showed `notion.so` now resolves correctly (`Notion Labs, Inc.` / `notion.com`), but the same run separately surfaced a new `insufficient_evidence` finding at B3 — not investigated or repaired here. `PHASE B VALIDATION — NOT APPROVED / REQUIRES PROJECT-OWNER DECISION` still stands. Do not begin endpoint/UI, deployment, or Phase C, and do not repair B3's new `notion.so` finding, Craigslist, or the Canva dedupe question, without a new full-context authorization.

No B3/source verification, synthesis, endpoint, UI, deployment, or other later-phase work occurred during the historical B2 experiments; B3 implementation began only under its subsequent separate authorization. B4A did not begin B4B, B5, or Phase C. B4B's live-gate approval did not begin B5 or Phase C. B5 Stage A did not begin an integrated live gate, endpoint/UI, deployment, or Phase C. Neither the B5 preflight block, the first network-backed attempt, the passed second network-backed attempt, the Phase B validation gate, its project-owner review correction, nor B1R1 began endpoint/UI, deployment, or Phase C.
