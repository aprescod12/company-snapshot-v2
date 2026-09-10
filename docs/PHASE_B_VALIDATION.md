# Phase B Validation — Representative Cohort Live Gate

Date: 2026-09-10

## Authorized scope

The gate authorized exactly the six-case representative cohort already defined in `docs/TESTING.md` (Phase A representative benchmark), run once each, sequentially, through the real, already-passed `createCompanySnapshot()` orchestration at commit `d4cba3b6e17b3589902294b21ae6d6c096e95304`:

**Ordinary:** `Stripe`, `PostHog`, `Canva`, `notion.so` (domain input).
**Edge:** `Mercury`, `Craigslist`.

NVIDIA was explicitly excluded — it already has its own separately authorized, already-passed integrated live gate (`docs/PHASE_B5_LIVE_GATE.md`) and did not need another run. No retries were authorized. Provider-request observation used the same thin counting-wrapper pattern as the B5 live gate (`scripts/phase-b-validation.mjs`, reusing `scripts/phase-b5-live-smoke.mjs`'s generic, company-agnostic `checkProviderBudget`/`summarizeB5LiveSmoke`/`buildFailureDiagnostic`/`B5LiveSmokeExecutionError`/`redact` exports directly rather than duplicating them); the wrappers delegate entirely to the real `discoverCompany`, `verifyCompanyDiscovery`, `requestCompanyDescription`, and `assembleSnapshot` production exports and alter no return value or business decision.

## Harness

`scripts/phase-b-validation.mjs` requires the exact mode `b-validation` and `--confirmed-free-starter`, requires `EXA_API_KEY` present in the process environment (via `--env-file=.env`; the script never reads `.env` directly), and has no `--company` argument at all — it always runs the fixed six-case allowlist in fixed order, by construction making it impossible to invoke a seventh case or NVIDIA through this **CLI**. (Correction, recorded in the "Project-owner review correction" section below: at the time this was written, the exported `runValidationCase()` function itself — as opposed to this CLI — accepted any input when imported directly, so this claim was too strong for the module as a whole. `runValidationCase()` now also rejects any non-cohort input, including `NVIDIA` and any seventh company, before making any network request.) A case returning any normal application state (`snapshot`, `clarification_needed`, `insufficient_evidence`, `unavailable`) is recorded and the run continues to the next case; a case that throws (a provider-budget violation or an unexpected uncaught error) stops the remaining sequence immediately. Before live execution, its 11 zero-network tests (`test/phase-b-validation.test.mjs`) passed, including three full fake-network exercises of the real production pipeline end-to-end (a `snapshot` case, a `clarification_needed` case, and an `insufficient_evidence` case) and two tests proving the run-and-stop-on-failure sequencing logic. The full zero-network suite passed 254/254 (243 pre-existing + 11 new).

## Live execution

Run exactly once:

```
node --env-file=.env scripts/phase-b-validation.mjs b-validation --confirmed-free-starter
```

All six authorized cases executed in fixed order; none threw; no provider-budget violation occurred; no retry occurred.

## Results matrix

| Input | Final state | Resolved identity | Signals / evidence | Fallback | Broad Search | Contents | Publisher reqs | Latency |
| --- | --- | --- | --- | --- | ---: | ---: | ---: | ---: |
| `Stripe` | `snapshot` | `Stripe` / `stripe.com` | 3 / 3 verified | No | 1 | 1 | 3 | 4884 ms |
| `PostHog` | `snapshot` | `PostHog` / `posthog.com` | 3 / 3 verified | No | 1 | 1 | 8 | 9978 ms |
| `Canva` | `snapshot` | `Canva` / `canva.com` | 3 / 3 verified | No | 1 | 1 | 5 | 13856 ms |
| `notion.so` | `clarification_needed` (`company_ambiguous`) | — | — | — | 1 | 0 | 0 | 2103 ms |
| `Mercury` | `clarification_needed` (`company_ambiguous`) | — | — | — | 1 | 0 | 0 | 2355 ms |
| `Craigslist` | `clarification_needed` (`company_ambiguous`) | — | — | — | 1 | 0 | 0 | 1904 ms |

## Detail per case

### Stripe — `snapshot`

Description: "Stripe provides a platform of payments and financial tools that can be used individually or together to accept and optimize online and in-person payments, enable various billing models, and power embedded payments and financial services for platforms and SaaS. Its core users include businesses of all sizes, from startups to enterprises..." (source: `https://stripe.com/`).

| Title | Published | Recency | Source class | URL |
| --- | --- | --- | --- | --- |
| Stripe helps Muse, Meta's new personal AI agent, shop across the internet with Link | 2026-09-08 | `RECENT` | `FIRST_PARTY` | `stripe.com/newsroom/...` |
| Stripe celebrates 10 years in Singapore by expanding its infrastructure for global businesses | 2026-08-25 | `RECENT` | `FIRST_PARTY` | `stripe.com/newsroom/...` |
| New currency capabilities for global businesses to cut FX costs | 2026-08-17 | `RECENT` | `FIRST_PARTY` | `stripe.com/blog/...` |

Manual inspection (via the evidence snippets the live run itself captured — no additional fetch was made): all three snippets are substantively on-topic for their titles and are first-party `stripe.com` content. **No concerns.**

### PostHog — `snapshot`

Description: "PostHog offers product analytics and related tools (web analytics, session replay, feature flags, experiments, surveys, error tracking, CDP, data warehouse, and AI observability)... Its primary users are product teams and organizations that ship software..." (source: `https://posthog.com/`).

| Title | Published | Recency | Source class | URL |
| --- | --- | --- | --- | --- |
| PostHog Ships Autoresearch Mode to Automate Code Optimization With AI Agents | 2026-07-10 | `RECENT` | `OTHER` | `createwith.com/tool/posthog/...` |
| We're partnering with Stripe to solve the most annoying problem for product builders | 2026-03-26 | `FALLBACK` | `FIRST_PARTY` | `posthog.com/blog/stripe-projects` |
| The clues were there all along. Tracing is now in beta | 2026-07-16 | `RECENT` | `FIRST_PARTY` | `posthog.com/blog/traces-beta` |

Manual inspection: signal 1's snippet ("PostHog has shipped Autoresearch mode, a new capability in PostHog Code that turns metric optimization into an autonomous process.") directly supports its title but comes from a third-party tool directory (`createwith.com`), not `posthog.com` — a secondary rather than primary source. Signal 2 is ~168 days old (`FALLBACK` bucket, within the approved ≤180-day ceiling but towards its stale end) and is first-party. **Concern:** signal 3's captured evidence snippet ("Copy page The clues were there all along.") is extremely thin — essentially UI chrome ("Copy page") plus the restated headline, with almost no independently confirming body text, similar in kind to the previously-documented noisy-evidence-snippet known limitation recorded for NVIDIA. The title/date/URL/source are still legitimate (first-party `posthog.com`, JSON-LD-dated), so this is a **snippet-quality** observation, not a fabrication or wrong-entity concern.

### Canva — `snapshot`

Description: "Canva offers an all-in-one Visual Suite for creating and editing visual content, including social posts, videos, presentations, invitations, and printed materials..." (source: `https://canva.com/`).

| Title | Published | Recency | Source class | URL |
| --- | --- | --- | --- | --- |
| Canva takes the fight to Microsoft and Google for enterprise subscribers | 2026-09-03 | `RECENT` | `OTHER` | `forbes.com.au/...` |
| Canva Expands Its Productivity Bet With 100+ Visual Suite Upgrades | 2026-09-03 | `RECENT` | `OTHER` | `business.times-online.com/...` (BizWire syndication) |
| Canva expands its productivity bet with 100+ Visual Suite upgrades | 2026-09-09 | `RECENT` | `OTHER` | `digitalreg.net/...` |

**Concerns, both worth project-owner review:**
1. **Zero first-party sources.** All three accepted signals are third-party (`OTHER`); none resolve to `canva.com` itself, unlike Stripe/PostHog which had first-party signals available.
2. **Likely duplicate-event coverage.** Signals 2 and 3 have near-identical titles ("Canva Expands Its Productivity Bet With 100+ Visual Suite Upgrades" / "Canva expands its productivity bet with 100+ Visual Suite upgrades") and appear to be the same underlying press release/announcement independently syndicated by two different secondary outlets (a wire-service republication and a news aggregator) six days apart. The existing lexical-dedup heuristic (token-Jaccard over title/snippet, ~0.70 threshold) evidently did not flag them as duplicates, likely because the surrounding snippet wording differs enough between the two republications. This means Canva's "3 distinct signals" arguably represent only 2 distinct underlying events (the Forbes enterprise-competition piece, and the Visual Suite upgrade announcement, counted twice). **No dedup/source-class rule was loosened or changed to produce or accept this result** — it is reported exactly as observed for project-owner review, per instruction not to repair during the live gate.

### notion.so — `clarification_needed` / `company_ambiguous`

B2 made its one broad Search but could not confirm unambiguous identity for the domain input; B1/B2's identity-safety boundary held (no B3/B4B/B4A call, no wrong-entity resolution). **This is a genuine, unexpected finding worth project-owner attention**: `notion.so` is an "ordinary" cohort case specifically chosen to exercise domain-input behavior, and an ambiguous-identity outcome for it was not anticipated. No raw provider identity payload was retained by the harness (by design, matching the existing sanitized-diagnostic convention), so the specific cause (e.g., weak/absent field-specific grounding for this particular provider response) cannot be determined from this record alone.

### Mercury — `clarification_needed` / `company_ambiguous`

This is the **expected safe outcome** for the ambiguous-name edge case per the assessment brief's own concern (Mercury's V1 history of resolving to the wrong entity). B1/B2 correctly declined to resolve ambiguous identity rather than silently picking an entity. **Pass** (safety preserved).

### Craigslist — `clarification_needed` / `company_ambiguous`

B2 made its one broad Search but could not confirm unambiguous identity. This was not one of the two explicitly anticipated Craigslist outcomes (valid snapshot or honest `insufficient_evidence`), but it is still an honest, non-fabricated outcome — B1/B2's identity-safety boundary held rather than guessing or padding. **Worth project-owner review** alongside the `notion.so` finding, as a second case in this run where B2 could not confirm identity for a well-known company/domain.

## Provider accounting

| Accounting | Count |
| --- | ---: |
| Starting cumulative Exa Search requests | 24 |
| Starting cumulative Exa Contents requests | 4 |
| Exa Search requests made this run (1 per case × 6, no fallback in any case) | 6 |
| Exa Contents requests made this run (Stripe, PostHog, Canva only) | 3 |
| Publisher requests made this run (3 + 8 + 5 + 0 + 0 + 0) | 16 |
| Retries | 0 |
| Provider-budget violations | 0 |
| **Ending cumulative Exa Search requests** | **30** |
| **Ending cumulative Exa Contents requests** | **7** |

## Outcome

**`PHASE B VALIDATION — COMPLETE; NO SAFETY OR FABRICATION FAILURE OBSERVED; TWO FINDINGS FLAGGED FOR PROJECT-OWNER REVIEW BEFORE BROADER RELIABILITY IS CLAIMED`**

All six cases produced honest, non-fabricated application states within the frozen provider budget, with zero retries and zero unexpected errors:
- 3/3 ordinary companies with clear identities (Stripe, PostHog, Canva) reached `snapshot` with 3 real, dated, sourced signals each.
- Mercury correctly clarified rather than risking a wrong-entity resolution — the intended safety behavior for that edge case.
- Craigslist and notion.so both clarified rather than resolving or fabricating; Craigslist's clarification was an acceptable-in-spirit (though not the specifically anticipated) honest outcome, while notion.so's clarification is a genuine open finding on an "ordinary" domain-input case that deserves investigation before broader confidence is claimed.
- Canva's three accepted signals raise two evidence-quality concerns (no first-party source; likely two of three signals cover the same underlying event) that the existing approved dedup/source-class rules did not filter, recorded here rather than fixed here.

This does not claim perfect reliability. It establishes that the pipeline behaves safely (no wrong-entity resolution, no fabricated evidence, no padded signal counts) across a representative mix of ordinary and edge cases, with two concrete findings — the `notion.so`/`Craigslist` ambiguous-identity outcomes and the Canva duplicate-coverage/no-first-party-source pattern — flagged for project-owner review before any correction is authorized. No B1–B5 production `src/` file changed as part of this gate. Phase C, endpoint/UI, and deployment remain unstarted and unauthorized by this task.

---

## Project-owner review correction (2026-09-10)

The project owner reviewed the record above and found the "COMPLETE; two findings flagged" framing understated the actual gate status against `docs/TESTING.md` §3, and identified that the six-case run's public `company_ambiguous` reason collapses the real underlying B2 discovery reason, that the Canva duplicate-event question required page-level confirmation rather than title comparison, and that the prior manual-inspection pass had used captured evidence snippets rather than opening the actual source pages. This section records the corrective work, run separately from and in addition to the original six-case history above, which is preserved unchanged.

### Step 1 — manual grounding continuation (0 Exa calls)

**Recoverability of the 9 recorded source URLs.** The completed run's record above (and the harness's own sanitized-diagnostic convention, matching the practice already noted for `notion.so`'s discovery payload) retained only truncated domain fragments for each signal URL (e.g. `stripe.com/newsroom/...`, `forbes.com.au/...`), not the exact full URLs the live run actually displayed. No raw run output, cache, or log file survived on disk (confirmed: no untracked file other than `.env` and this session's own review artifacts exists in the working tree). This is itself a process finding, parallel to the previously-identified and fixed B5 description-reason harness gap: **the validation report's manual-inspection record is not sufficient to re-derive the exact displayed URL for every signal after the fact.**

Of the 9 signals, 5 exact URLs could be reconstructed with high confidence — not guessed — by matching each signal's exact recorded title and exact recorded date against already-verified, already-recorded exact URLs elsewhere in this repository's historical Exa records (`docs/PHASE_B1_IDENTITY_GATE.md`, `docs/PHASE_A_FALLBACK_FEASIBILITY.md`, and the run's own un-truncated PostHog paths). The remaining 4 (PostHog signal 1; all 3 Canva signals) have no matching full-URL record anywhere in the repository and were **not guessed or fetched** — opening an invented or search-derived URL would not verify what the live run actually displayed, and finding them would require a new discovery request, which this step does not authorize.

| # | Company | Title (as recorded) | Recorded date | URL basis | Opened? | Materially supports claim? | Date supported? | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Stripe | Stripe helps Muse, Meta's new personal AI agent, shop across the internet with Link | 2026-09-08 | `https://stripe.com/newsroom/news/stripe-helps-meta-muse-shop-with-link` — exact title/topic match to the B1 identity-gate grounding record | Yes | Yes — page headline matches exactly; body confirms the Muse/Link integration, 1M+ accepting businesses, instant checkout and single-use virtual cards | Yes — page states September 8, 2026 | No quality concern |
| 2 | Stripe | Stripe celebrates 10 years in Singapore by expanding its infrastructure for global businesses | 2026-08-25 | `https://stripe.com/newsroom/news/stripe-celebrates-10-years-in-singapore-by-expanding-its-infrastructure-for-global-businesses` — exact title match to the A4.5 fallback-feasibility record | Yes | Yes — headline matches exactly; body confirms the 10-year Singapore anniversary and multiple named infrastructure expansions | Yes — page states August 25, 2026 | No quality concern |
| 3 | Stripe | New currency capabilities for global businesses to cut FX costs | 2026-08-17 | `https://stripe.com/blog/reduce-fx-costs-with-stripe` — exact title match to three separate prior Phase A records (Signal Benchmark, Retrieval Repair, Fallback Feasibility) | Yes | Yes — headline matches exactly; body confirms multicurrency settlement expansion and instant conversion | Yes — page states August 17, 2026 | No quality concern |
| 4 | PostHog | PostHog Ships Autoresearch Mode to Automate Code Optimization With AI Agents | 2026-07-10 | `createwith.com/tool/posthog/...` — **truncated in the original record; no matching full-path record found elsewhere** (a different createwith.com/tool/posthog/ URL with a different title exists in `docs/PHASE_A_SIGNAL_BENCHMARK.md` but is a distinct article, not a match) | **No — not recoverable** | Not evaluated | Not evaluated | Exact URL unrecoverable without a new discovery request; not fetched |
| 5 | PostHog | We're partnering with Stripe to solve the most annoying problem for product builders | 2026-03-26 | `https://posthog.com/blog/stripe-projects` — full path already present verbatim in the original record | Yes | Yes — headline matches exactly; body confirms the Stripe Projects joint provisioning service | Yes — the opened page reported a publication date of March 26, 2026, matching the recorded date exactly | No new concern beyond the already-recorded `FALLBACK`-bucket age |
| 6 | PostHog | The clues were there all along. Tracing is now in beta | 2026-07-16 | `https://posthog.com/blog/traces-beta` — full path already present verbatim in the original record | Yes | Yes — headline matches ("Tracing is now in beta"); body confirms distributed tracing beta launch via OpenTelemetry | Yes — page states Jul 16, 2026 | Confirms the previously-recorded thin-snippet concern was a snippet-capture artifact, not a page-content problem — the actual page has substantive supporting content |
| 7 | Canva | Canva takes the fight to Microsoft and Google for enterprise subscribers | 2026-09-03 | `forbes.com.au/...` — **truncated in the original record; no full-path record found elsewhere** | **No — not recoverable** | Not evaluated | Not evaluated | Exact URL unrecoverable without a new discovery request; not fetched |
| 8 | Canva | Canva Expands Its Productivity Bet With 100+ Visual Suite Upgrades | 2026-09-03 | `business.times-online.com/...` — **truncated in the original record; no full-path record found elsewhere** | **No — not recoverable** | Not evaluated | Not evaluated | Exact URL unrecoverable without a new discovery request; not fetched |
| 9 | Canva | Canva expands its productivity bet with 100+ Visual Suite upgrades | 2026-09-09 | `digitalreg.net/...` — **truncated in the original record; no full-path record found elsewhere** | **No — not recoverable** | Not evaluated | Not evaluated | Exact URL unrecoverable without a new discovery request; not fetched |

**Result: 5/9 sources opened and confirmed materially supportive with matching dates; 4/9 (one PostHog, all three Canva) could not be opened under this step's no-new-discovery constraint because their exact URLs were never persisted.** This is a genuine gap, not a rationalized pass: `docs/TESTING.md` §3.5 requires opening the linked source for every signal in every successful benchmark snapshot, and that was not fully achieved here for Canva.

**Canva signals 2 and 3 — same underlying event?** This could **not be directly confirmed by page inspection** as instructed, because neither exact URL survived in a recoverable form. Based only on the already-recorded metadata (near-identical titles differing solely in capitalization; six days apart; one flagged in the original record as a wire-service/BizWire syndication and the other as a news-aggregator republication; both `OTHER`-class, non-`canva.com` sources), the textual evidence is **suggestive of a single underlying announcement syndicated twice**, but this remains an inference from title/metadata, not a page-verified finding. **Per the project owner's instruction, this must not be treated as confirmed, and no dedupe-logic change is made or implied here.**

### Step 2 — discovery-reason observability fix (validation-harness-only)

`scripts/phase-b5-live-smoke.mjs`'s `deriveObserved()` previously derived only `identity`, `verification`, and `description` from the captured stage results — it never surfaced the real B2/B1 `discovery.state`/`discovery.reason` when a case exited during discovery (before verification). Because `createCompanySnapshot()`'s public contract deliberately collapses every non-`invalid_input` B1/B2 clarification reason (`ambiguous_identity`, `invalid_identity_evidence`, `contradictory_identity`, `insufficient_identity_evidence`, `invalid_target`) to one public `company_ambiguous` reason, the validation report above could only record `company_ambiguous` for `notion.so`, `Mercury`, and `Craigslist` — the specific underlying cause was unknown from the harness's own output, exactly as the project owner identified.

The fix adds one field to `deriveObserved()`'s return value: `discovery: { state, reason }`, taken directly from `captured.discovery` (already captured by the existing `services.discoverCompany` wrapper, just never surfaced). This is a diagnostic-only addition to the harness's own output shape — it changes no `src/` file, no production contract, no request, and no decision. Both `summarizeB5LiveSmoke()` and `buildFailureDiagnostic()` (used by both `phase-b5-live-smoke.mjs` and `phase-b-validation.mjs`, which imports them) now expose it automatically.

Three new zero-network regression tests were added to `test/phase-b5-live-smoke.test.mjs` (18–20), covering: a clarification-shaped `captured.discovery` preserved through `summarizeB5LiveSmoke`; the same preserved through `buildFailureDiagnostic` on a later-stage failure; and a resolved (`ready_for_verification`) discovery exposing its state with `reason: null` rather than a stale value. The existing Mercury-shaped fixture test in `test/phase-b-validation.test.mjs` (test 6) was extended with an assertion that `summary.discovery.reason` is `"insufficient_identity_evidence"` (confirmed by actually running the test, not assumed) alongside the existing `summary.final.reason` of `"company_ambiguous"`, directly demonstrating the collapse this fix makes visible. All 33 tests in the two affected files pass; the full zero-network suite passes 257/257 (254 pre-existing + 3 new); `node --check` and `git diff --check` pass. No `src/` file was modified.

### Step 3 — targeted diagnostic reruns (`notion.so`, `Craigslist`; 2 Exa Search requests total)

With the fixed harness in place, the project owner's authorized single-case reruns were made by invoking the already-tested, already-live-used `runValidationCase()` export from `scripts/phase-b-validation.mjs` directly, once per company, via `node --env-file=.env`, with no code change to any allowlist and no retry. Neither existing CLI entry point supports an arbitrary single-company invocation (`phase-b5-live-smoke.mjs` is hardcoded to `NVIDIA` only; `phase-b-validation.mjs`'s CLI always runs all six fixed cases), so a small unstaged, uncommitted driver script in the session scratchpad called the exported function directly rather than modifying either harness's authorized-case surface.

| Company | Exa Search requests | Fallback | Contents | Publisher | Latency | Final (public) | **Underlying discovery reason** |
| --- | ---: | ---: | ---: | ---: | ---: | --- | --- |
| `notion.so` | 1 | 0 | 0 | 0 | 3246 ms | `clarification_needed` / `company_ambiguous` | **`contradictory_identity`** |
| `Craigslist` | 1 | 0 | 0 | 0 | 3072 ms | `clarification_needed` / `company_ambiguous` | **`insufficient_identity_evidence`** |

No provider-budget violation, retry, or unexpected exception occurred in either case, matching the expectation of at most one Search per diagnostic case. Provider accounting for this step: Search +2 (1 each), Contents +0, retries 0.

`notion.so`'s `contradictory_identity` reason (from `src/targeting/companyTarget.mjs`) means the domain-input target's supplied identity evidence resolved to a company name that failed the domain-input consistency check against the submitted `notion.so` target — i.e., B2's broad discovery returned identity evidence B1 judged inconsistent with the submitted domain, not evidence that was merely missing. `Craigslist`'s `insufficient_identity_evidence` reason means B1 could not find sufficient corroborating evidence (missing/insufficient field-specific grounding or evidence URLs) to confirm identity at all, independent of any ambiguity in the name itself — this is an identity-evidence gap, not the "limited recent activity" sparse-evidence condition `docs/TESTING.md` §3.8 was designed to test.

### Cumulative provider accounting after this review

| Accounting | Before this review | After this review |
| --- | ---: | ---: |
| Cumulative Exa Search requests | 30 | **32** |
| Cumulative Exa Contents requests | 7 | **7** (unchanged) |
| Retries | 0 | **0** (unchanged) |

### Revised gate-by-gate status against `docs/TESTING.md` §3

| Gate | Original framing | Revised status | Basis |
| --- | --- | --- | --- |
| §3.2 Clear-company resolution (5/5 ordinary) | Implicitly treated as passed ("3/3 ordinary companies with clear identities... reached snapshot") | **FAILS** | `notion.so` is one of the 5 ordinary cohort cases (`docs/TESTING.md` §1) and did not resolve (`clarification_needed`/`contradictory_identity`); 4/5 (NVIDIA, Stripe, PostHog, Canva) resolved. This is a safe non-resolution, not a wrong-entity resolution, but §3.2's literal bar is 5/5. |
| §3.3 Ordinary-company coverage (≥4/5) | Passed | **Passes narrowly** — 4/5 ordinary cases (NVIDIA, Stripe, PostHog, Canva) reached a usable three-signal snapshot; `notion.so` did not. |
| §3.4 Source integrity (no fabricated URLs) | Passed | **Passes** — unaffected by this review; every displayed URL still traces to actual provider/grounding output. |
| §3.5 Manual grounding (open every source, confirm support) | Treated as satisfied by the original snippet-based review | **Partially satisfied** — 5/9 signals across the three `snapshot` cases were actually opened and confirmed supportive with matching dates in this review. 4/9 (1 PostHog, all 3 Canva) could not be opened because their exact URLs were never persisted in recoverable form — a harness/report gap, recorded above, not a support failure, but also not a completed pass under §3.5's literal standard. |
| §3.6 Distinctness (no duplicate event counted twice) | Recorded as a flagged concern, not resolved | **Unconfirmed** — Canva signals 2/3's shared-event status could not be verified by page inspection per the project owner's explicit instruction; title/metadata evidence is suggestive but not proof. |
| §3.7 Ambiguity safety (Mercury) | Passed | **Passes** — unaffected; Mercury correctly clarified. |
| §3.8 Sparse-company honesty (Craigslist) | Treated as "acceptable-in-spirit" | **Does not clearly satisfy §3.8** — §3.8 accepts either three legitimate signals or "an honest limited-evidence result" (i.e., `insufficient_evidence`). Craigslist instead returned `clarification_needed`/`insufficient_identity_evidence`, an identity-evidence gap rather than a sparse-evidence result; it is honest and non-fabricated, but it is not the specific outcome §3.8 was written to accept. |
| §3.9 Performance | Passed | **Passes** — unaffected; no case exceeded the target thresholds materially. |

### Revised outcome

**`PHASE B VALIDATION — NOT APPROVED / REQUIRES PROJECT-OWNER DECISION`**

This supersedes the earlier `PHASE B VALIDATION — COMPLETE; ... TWO FINDINGS FLAGGED` framing above, which is preserved as history but is corrected here: at least one numbered hard gate (§3.2) currently fails outright, one (§3.5) is only partially satisfied due to a URL-persistence gap now identified, one (§3.6) remains unconfirmed rather than resolved, and one (§3.8) is not clearly satisfied by the specific outcome observed. No safety or fabrication failure is newly found — B1/B2's identity-safety boundary held in every case, and every displayed source in the 5 openable signals genuinely supports its claim — but "no safety failure" is not the same as "gates passed," and the original framing conflated the two. No B1–B5 production `src/` file changed anywhere in this review; no recency, dedupe, source, targeting, or description rule was loosened or tightened. B1/B2 production behavior is not repaired here — `notion.so`'s and Craigslist's specific failure modes are now identified (`contradictory_identity`, `insufficient_identity_evidence`) but not investigated further or corrected, per instruction. Phase C, endpoint/UI, and deployment remain unstarted and unauthorized.

---

## Second-pass correction — harness hardening and documentation-accuracy fixes (2026-09-10)

The project owner separately reviewed the actual patch produced by the review above and found four further issues, corrected here with 0 Exa/Contents/publisher requests and 0 retries. Cumulative accounting is unchanged by this pass: Search remains **32**, Contents remains **7**.

1. **README was stale.** `README.md`'s status paragraphs still presented the six-case run as `PHASE B VALIDATION — COMPLETE` with Search 30 / Contents 7. Both paragraphs are corrected to state the current `NOT APPROVED / REQUIRES PROJECT-OWNER DECISION` status, the `contradictory_identity`/`insufficient_identity_evidence` underlying reasons, the 5/9 manual-grounding result, Canva's unconfirmed (not established) duplicate status, and Search 32 / Contents 7 / retries 0.

2. **The fixed-cohort guarantee was CLI-only, not function-level.** `scripts/phase-b-validation.mjs`'s CLI has always had no `--company` argument, but its exported `runValidationCase(input, ...)` — the same function Step 3 above used directly to run the two diagnostic reruns — accepted any string when imported and called directly, making the earlier claim that "a seventh case or NVIDIA [is] impossible to invoke through this harness" too strong for the module as a whole. `runValidationCase()` now checks `ALLOWED_CASES.includes(input)` as its first action, before any counter/service setup or fetch, and throws if the input is not one of the six fixed cases — `notion.so` and `Craigslist` remain callable (they are in the cohort; this is exactly how Step 3's reruns were made), while `NVIDIA` or any other input is rejected pre-network. Two new zero-network tests (`test/phase-b-validation.test.mjs` 12–13) prove `NVIDIA` and an arbitrary seventh company (`"Acme Corp"`) are both rejected with zero fetch calls (a fetch implementation that throws if invoked is used to detect any call). No `src/` file changed; no CLI surface changed.

3. **`contradictory_identity` lacked a genuine pipeline-level regression.** The Step 2 tests proved `deriveObserved()`/`summarizeB5LiveSmoke()` propagate an already-constructed `captured.discovery` value, but none of them drove the real `src/targeting/companyTarget.mjs` domain-identity check itself to produce `contradictory_identity` — the specific reason found for `notion.so`. A new test (`test/phase-b-validation.test.mjs` 15) runs the real `runValidationCase("notion.so", ...)` pipeline end to end against a fake-network fixture in which the Exa broad-discovery response's synthesized identity returns `officialDomain: "notion.com"` (a genuinely different domain from the submitted `notion.so` target, not equal to it and not a subdomain of it). This drives the actual, unmodified `confirmCompanyIdentity()` domain-kind branch to its real `contradictory_identity` clarification — confirmed by actually running the test, not asserted from a mocked value — while `createCompanySnapshot()`'s public contract still collapses the final result to `{state: "clarification_needed", reason: "company_ambiguous"}`, exactly reproducing the collapse this whole correction exists to make visible. This fixture is illustrative of the general domain-mismatch mechanism that produces this reason; it is not a claim that Exa's actual `notion.so` live response returned `officialDomain: "notion.com"` specifically — the real live payload was not retained (see Step 1/3 above), so the exact live provider values remain unknown. No `src/` behavior changed to make this test pass.

4. **Manual-grounding wording was internally inconsistent for one PostHog signal.** Signal 5's row (`https://posthog.com/blog/stripe-projects`) said the page materially supported its claim but that "no explicit dateline was independently found," while the aggregate result line above claimed all 5 opened pages had a confirmed matching date. Re-inspecting the fetch-tool output already produced for that exact URL during the original Step 1 manual-grounding pass (no new fetch was made for this correction) shows it explicitly reported "Publication Date: March 26, 2026," matching the recorded date exactly — the same basis already used, and already stated as such, for the other 4 opened signals. **Provenance caveat, stated plainly because an independent reviewer flagged this exact gap:** that fetch-tool output was never written to any file in this repository — consistent with this project's established convention of not persisting raw fetched page content (see, e.g., B1/A3/A4.1's "no raw response... persisted" language) — so this basis is not independently greppable from repo contents alone; it rests on the AI session's own same-pass tool-call record, the same way every other "opened page" claim in this correction and in the historical Phase A/B manual-inspection sections does. The row is corrected to state the date was confirmed from the opened page, removing the inaccurate caveat; the aggregate "5/9 ... with matching dates" line required no change, since it was accurate once this one row is corrected. The distinction between claim support and publication-date support remains preserved as two separate table columns.

Verification for this pass: `node --check` on both changed `.mjs` files; `node --test test/phase-b-validation.test.mjs` (15/15) and `test/phase-b5-live-smoke.test.mjs` (22/22, unchanged by this pass); full zero-network suite `node --test test/*.test.mjs` (261/261: 257 pre-existing + 4 new — tests 12–15 in `test/phase-b-validation.test.mjs`); `git diff --check`. No Exa Search, Exa Contents, or publisher request was made. No `src/` file changed. No safety/fabrication conclusion changes as a result of this pass — it corrects documentation accuracy and closes a harness-scope gap, nothing more. `PHASE B VALIDATION — NOT APPROVED / REQUIRES PROJECT-OWNER DECISION` stands unchanged.
