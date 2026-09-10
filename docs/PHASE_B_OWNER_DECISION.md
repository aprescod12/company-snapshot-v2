# Phase B Owner Decision — Approved for Frontend Integration With Known Limitations

Date: 2026-09-10

## Decision

**`PHASE B — APPROVED FOR FRONTEND INTEGRATION WITH KNOWN LIMITATIONS`**

This supersedes the prior `PHASE B VALIDATION — NOT APPROVED / REQUIRES PROJECT-OWNER DECISION` status. It is a project-owner judgment call about scope and priority, not a claim that every internal validation gate in `docs/TESTING.md` §3 passed. That distinction is preserved explicitly throughout this record and is not to be blurred in any later document.

Phase B validation history (the original six-case cohort run, its project-owner review correction, B1R1, the B3R0 diagnostic, and B3R3) is preserved unchanged in `docs/PHASE_B_VALIDATION.md`, `docs/PHASE_B1R1_RECONCILIATION.md`, and `docs/PHASE_B3R3_FIRST_PARTY_COMPANY_MATCHING.md`. This document records only what happened after those: the two remaining open findings (Craigslist, Canva) were investigated to closure, and the project owner then decided to exit Phase B.

## Why Phase B is being exited now

By this point, `notion.so`'s two root causes (B1 identity resolution, B3 evidence verification) had each been diagnosed and repaired with narrow, generic, independently-reviewed fixes (B1R1, B3R3), and confirmed live end-to-end. The two remaining open findings — Craigslist and Canva — were each investigated with additional zero-repair diagnostics (below). Given what those diagnostics found, the project owner judged that further backend investigation would not materially improve the take-home relative to spending the remaining time on frontend, deployment, and production end-to-end testing — the parts of the assessment brief not yet touched at all.

## Notion — closed

Both previously-open Notion defects were root-caused and repaired:

- **B1R1** (`docs/PHASE_B1R1_RECONCILIATION.md`): a conservative, generic cross-TLD canonical-domain reconciliation rule fixed `notion.so`'s `contradictory_identity` failure, with no company-specific code.
- **B3R3** (`docs/PHASE_B3R3_FIRST_PARTY_COMPANY_MATCHING.md`): a narrow, `FIRST_PARTY`-only brand-anchor company-matching fallback fixed the resulting B3 `insufficient_evidence` failure, with the pre-existing strict match completely unchanged for every other source/company.

The one authorized live confirmation after both repairs reached a full `snapshot` for `notion.so`: `Notion Labs, Inc.` / `notion.com`, a grounded description, and 3 manually-opened, dated, distinct, first-party signals. Notion is closed as a repaired case, not merely an accepted limitation.

## Craigslist — safe provider-evidence limitation (no repair)

**Diagnostic method:** one `discoverCompanyForSmoke("Craigslist", apiKey, {})` invocation ran the unmodified production discovery path exactly once and exposed the sanitized identity/grounding diagnostic used to reconstruct the B1 decision. The production path made one Exa broad Search, with no fallback, Contents, publisher requests, or retries. One separately authorized non-Exa direct HTTP HEAD redirect chain checked the provider-proposed domain. No candidate/publisher page was fetched. One independent, read-only Identity-evidence reviewer reviewed the reconstruction.

**Result:** `resolvedCompanyName: "Craigslist, Inc."`, `officialDomain: "craigslist.org"`, `ambiguous: false`. Name consistency passed (`namesAreConsistent("Craigslist", "Craigslist, Inc.")` — both normalize to the single token `"craigslist"` after legal-suffix stripping). The exact failing predicate was `evidenceCorroboratesDomain(evidenceUrls, "craigslist.org")`: all 5 unique combined-grounding URLs (`revenuememo.com`, `villpress.com`, `demades.ai`, `completetradersedge.com`, `optout.actiontec.com`) were third-party commentary/analysis pieces about Craigslist's business, ownership, and net worth — **none hosted on `craigslist.org`**. The supplementary HTTP check confirmed `craigslist.org` genuinely resolves (HTTP 200, redirecting to `www.craigslist.org`), so the domain claim itself was correct; only the corroborating evidence required by B1 was absent from this particular provider response.

The independent sub-agent review re-traced `confirmCompanyIdentity()` line-by-line against this exact data and found no error in the reconstruction, and confirmed no earlier predicate could have failed first.

**Classification: safe provider-evidence limitation / known limitation.** B1 behaved exactly as designed: it declined to accept an identity claim it could not independently corroborate, rather than guessing. Whether the lack of first-party corroboration is a persistent structural pattern or an artifact of this single provider sample remains unknown.

**Decision: no repair.** Craigslist remains acceptable as the sparse/limited-activity edge case in `docs/TESTING.md` §1's edge cohort, so long as the product continues to fail honestly (clarification, never a fabricated signal or a wrong-entity resolution) — which it does.

## Canva — provider-response variability (no repair)

**Diagnostic method:** three separate live attempts across three separately authorized tasks with distinct paths: (1) the original six-case Phase B cohort run; (2) the later Canva evidence-quality production run through `runValidationCase`; and (3) the fresh raw Canva identity-evidence diagnostic through `requestExaBroadDiscovery` plus local B1 reconstruction. They did not use one common diagnostic path. The failed Canva production run used no sub-agent and did not retain raw grounding detail, so its exact B1 predicate path was not independently reconstructed. The later raw identity diagnostic used one read-only B1 evidence-policy reviewer, which independently confirmed that successful B1 reconstruction.

**Three observed outcomes for the same company, across three separate live calls:**

1. **Original six-case cohort run** (`docs/PHASE_B_VALIDATION.md`): identity resolved; B3 reached `snapshot` with 3 accepted signals — but all 3 were `OTHER` source class (no first-party `canva.com` signal), and 2 of the 3 had near-identical "100+ Visual Suite Upgrades" titles from different secondary publishers, raising an unconfirmed duplicate-event question. The exact URLs were not persisted at the time, so the concern could not be manually re-adjudicated later.
2. **Later production run**: identity confirmation itself failed — `clarification_needed` / underlying reason `insufficient_identity_evidence` — before B3 was ever reached. No signals, no candidates, no grounding detail was captured for this run (it used the collapsed `runValidationCase` path).
3. **Fresh raw-identity diagnostic (this closure round)**: identity resolved cleanly — `resolvedCompanyName: "Canva"`, `officialDomain: "canva.com"`, `ambiguous: false`; name consistency passed trivially (identical strings); `evidenceCorroboratesDomain` passed because exactly one of the 10 combined grounding URLs (`https://www.canva.com/newsroom/news/google-gemini/`) was on `canva.com` — and that same URL was also present, independently, as rank 10 of the 10 raw Search candidates in that same response. 9 of the 10 candidates were secondary coverage; only this one was first-party.

Across the observed runs, no deterministic B1 defect has been established.

**Classification: provider-response variability at the identity-grounding layer — no repair.** Whether Exa's synthesized `officialDomain` grounding happens to cite a `canva.com` URL varies between otherwise-identical live calls for the same company name. This is not a wrong-entity resolution, not fabricated evidence, and not a repeatable, deterministic B1 defect — it is inherent variability in what one Search response returns.

**The historical Visual Suite duplicate-event question is explicitly left `UNRESOLVED`, not confirmed and not refuted.** Neither of the two later Canva runs reached signal selection, so there was no further opportunity to manually re-adjudicate the original two near-identical titles. It remains exactly as open as it was after the original Phase B validation review, and is deferred to later deployed/end-to-end validation — it is not treated as settled in either direction here, and is explicitly not grounds for a speculative dedupe change now.

**A proposed idea was surfaced but explicitly not implemented:** using same-response candidate URLs as an alternate/supplementary domain-corroboration signal when field-specific grounding cites only secondary sources (motivated by the observation that the successful Canva run's on-domain grounding citation and on-domain candidate happened to be the same URL). This was **not implemented** because the one Canva run that actually failed (#2 above) did not retain its raw candidate list — there is no direct evidence this idea would have rescued that specific failure, only a plausible-sounding hypothesis. It is recorded here for a later, separately authorized investigation, not approved as a change.

**Decision: no repair.**

## The internal §3.2 gate — explicit status

`docs/TESTING.md` §3.2 states: **"5/5 ordinary cases must resolve to the intended company."**

**This gate is NOT marked passed.** It is preserved in `docs/TESTING.md` exactly as written, unedited, and remains factually not repeatably demonstrated: across the diagnostics above, Canva (an ordinary cohort case) resolved successfully in 2 of 3 live attempts and failed identity confirmation in 1 of 3.

The project owner is explicitly exiting Phase B despite this, because:

- §3.2 was an internal pre-build reliability benchmark adopted to de-risk architecture before implementation, not a literal requirement stated in `docs/ASSESSMENT_BRIEF.md`;
- the observed Canva failure mode is safe provider variability (an honest `clarification_needed`, never a wrong-entity resolution or fabricated signal) rather than a defect that produces an incorrect or unsafe result;
- further live Search repetitions would only sample stochastic provider behavior across additional calls, not identify or confirm a deterministic fix — repeated re-running is not equivalent to root-causing;
- the one concrete idea for improving Canva's identity-resolution reliability (candidate-URL corroboration) lacks direct supporting evidence from the actual failure it would need to address, so implementing it now would be speculative complexity, not a verified fix;
- the product already has an honest, safe fallback behavior for exactly this situation — a clarification state, with no auto-retry and no guessing — so the assessment's own stated priority ("never fabricate," "fail honestly when evidence is truly weak") is upheld even without this gate being formally satisfied;
- and continued backend-only work no longer materially improves the take-home relative to the substantial, currently-unstarted remaining scope: frontend (Phase C), deployment (Phase D), and production end-to-end verification (Phase E) — a live, deployed, testable product is a stronger deliverable than a marginally more reliable backend that no one outside this session has yet seen work end-to-end in a browser.

This is recorded as an explicit, dated owner judgment call — not a retroactive edit to any historical test result, and not a claim that §3.2 was secretly satisfied all along.

## Backend freeze

Effective immediately, the following are **frozen** pending Phase C/D/E:

- B1 targeting and identity-confirmation policy (including B1R1's cross-TLD reconciliation rule);
- B2 broad discovery, Exa query construction, and the identity `outputSchema`;
- the selector/prioritization/dedupe logic in `src/selection/selectSignals.mjs`;
- B3 publisher verification, extraction, recency, date rules, triviality rules, support-sentence matching, and company matching (including B3R3's brand-anchor fallback);
- B4B description generation;
- B4A snapshot assembly;
- B5 orchestration and its public state/reason contract;
- provider request-budget limits and the zero-retry policy.

No further changes to any of the above are authorized **unless** later deployed/end-to-end testing (Phase D/E) demonstrates a concrete correctness or security defect — not for proactive reliability polishing, not for chasing better coverage on Craigslist or Canva, and not in response to a stochastic single bad run without a reproduced, diagnosed cause (as was done for `notion.so` before B1R1/B3R3 were authorized).

## Phase C authorization

Phase C (frontend) may begin once this closure record has been reviewed and its closure commit has been pushed. It must represent the existing public states honestly and without embellishment:

- `snapshot`
- `clarification_needed`
- `insufficient_evidence`
- `unavailable`

For a `clarification_needed` result caused by identity uncertainty, the UI should offer a concise, honest recovery instruction — for example, suggesting the user try the company's website/domain instead of its name — rather than silently failing or implying the system is broken. No automatic retry behavior is authorized anywhere in the frontend.

This document does not itself begin Phase C.

## Provider accounting

| Accounting | Before post-B3R3 diagnostics | Current total |
| --- | ---: | ---: |
| Cumulative Exa Search | 39 | **42** |
| Cumulative Exa Contents | 9 | **9** (unchanged) |
| Retries | 0 | **0** (unchanged) |

Post-B3R3 chronology: Craigslist diagnostic Search **39 → 40**; Canva evidence-quality production run **40 → 41**; Canva raw identity-evidence diagnostic **41 → 42**. These three Searches made 0 Contents calls and 0 retries.

## What remains unresolved, by design

- The historical Canva Visual Suite duplicate-event question — **UNRESOLVED**, deferred to later deployed/end-to-end validation.
- Whether Craigslist's grounding sparsity is a persistent structural pattern or an artifact of a single sample — only one live sample exists.
- Whether Canva's identity-grounding variability is a persistent ~coin-flip or was influenced by timing/ordering — only two raw-grounding samples exist, from two of the three attempts.
- The candidate-URL-as-domain-corroboration idea for Canva — surfaced, not evaluated against the actual failure it would need to address, not implemented.

None of these block the decision above; they are recorded as explicit known limitations, not silently dropped.
