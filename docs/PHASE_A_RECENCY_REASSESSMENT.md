# Phase A4.3R0 Recency Policy Reassessment

## Decision

**Recommendation: `NO POLICY CHANGE YET`.**

Keep ≤90 days preferred and 91–180 days as the currently approved fallback for now. The PostHog evidence shows that the 180-day boundary can be arbitrary, but neither proposed expansion materially improves the frozen pipeline: each changes only PostHog's raw count while leaving its invalid selected set unchanged, and Stripe remains either insufficient or dependent on a borderline retrospective interpretation.

The assessment requires three “recent signals” but prescribes no 90- or 180-day cutoff. The project's 180-day boundary is therefore a conservative implementation policy, not an assessment requirement. PostHog rank 9 is high-quality first-party evidence only about two days beyond that boundary, which demonstrates an edge effect worth preserving as evidence. It does not, by itself, justify expanding the maximum by roughly 50% to 270 days or nine calendar months. The nine-month alternative also makes Stripe rank 9 flip on only a one-to-two-day difference from the 270-day approximation even though the returned page is retrospective.

`docs/TESTING.md`, selector code, and future live contracts therefore remain unchanged. A broader sparse policy may be reconsidered only alongside the unresolved evidence-aware selection question and under separate project-owner authorization.

## Scope and evidence boundary

This zero-provider reassessment uses only evidence already recorded in:

- `docs/PHASE_A_SIGNAL_BENCHMARK.md`;
- `docs/PHASE_A_SELECTOR.md`;
- `docs/TESTING.md`;
- `docs/PLAN.md`.

No provider request, source retrieval, source search, or A4.3 rerun occurred. A4.3 requests remain 2 and cumulative Exa requests remain 5. No executable file changed.

Benchmark ages below use each captured selector time: NVIDIA `2026-09-08T22:14:07.900Z`, Stripe `2026-09-09T00:28:43.400Z`, and PostHog `2026-09-09T00:35:21.856Z`. Ages are approximate because recorded source/event dates are calendar dates rather than exact event timestamps.

## Policies compared

| Policy | Boundary | Intended behavior | Principal risk |
| --- | --- | --- | --- |
| A — current | ≤90 preferred; 91–180 fallback; >180 reject | Strongest ordinary meaning of recent | A hard day-count boundary rejects a strong event just outside 180 days |
| B — 270-day sparse fallback | Add 181–270 only when fewer than three ≤180 events qualify | Roughly nine months while retaining a fixed-day calculation | “Nine months” is not always 270 days; Stripe rank 9 falls outside by about two days |
| C — nine-calendar-month sparse fallback | Add 181 days through the inclusive calendar date nine months before the run, only when sparse | Human-readable boundary without month-length drift | Numerically admits nearly nine-month-old events, so qualitative safeguards and explicit labeling are essential |

The calendar alternative would be a maximum, not an automatic qualification. For a September 9, 2026 evaluation, its inclusive calendar cutoff would be December 9, 2025. Evidence would still need to pass every correctness, materiality, support, distinctness, and non-retrospective safeguard.

## Company evidence and approximate ages

| Company / rank | Destination-derived event/source date | Approximate age | Recorded evidence judgment | Sparse-fallback judgment |
| --- | --- | --- | --- | --- |
| NVIDIA 1 | 2026-09-03 | 6 days | Supported, material Hugging Face acquisition | Already ≤90; unaffected |
| NVIDIA 3 | 2026-09-03 | 6 days | Supported, material PAIR / RTX Spark event | Already ≤90; unaffected |
| NVIDIA 4 | 2026-08-26 | 14 days | Supported, material AWS expansion | Already ≤90; unaffected |
| NVIDIA 5 | 2026-08-31 | 9 days | Supported, material MediaTek partnership/investment | Already ≤90; unaffected |
| NVIDIA 10 | 2026-07-28 | 43 days | Supported, material Amkor partnership | Already ≤90; unaffected |
| Stripe 2 | 2026-08-17 | 23 days | Supported, material FX/multicurrency event | Already ≤90 |
| Stripe 3 | 2026-06-09 | 92 days | Supported, material Lloyds payment-suite event | Already 91–180 |
| Stripe 9 | Underlying event 2025-12-11; retrospective page 2026-09-05 | 272 days | Material historical Agentic Commerce event supported by a recent explainer | Outside 270 days; numerically inside nine calendar months, but reject under both proposed safeguards because the returned page is retrospective commentary about the historical announcement rather than a current event source |
| PostHog 2 | 2026-08-30 | 10 days | Supported, material scheduled-Scouts preview | Already ≤90 |
| PostHog 3 | 2026-06-24 | 77 days | Supported, material marketing/positioning change | Already ≤90 |
| PostHog 9 | 2026-03-11 | 182 days | Supported, material first-party LLM trace-clustering event | Qualifies under 270-day and nine-calendar-month sparse policies: discrete, first-party, materially supported, genuinely dated, and only about two days beyond the normal window |

The Stripe judgment deliberately separates the recent provider/page date from the December 2025 event date. A recently published explainer does not refresh the age of the underlying event. Although December 11 is inside the nine-calendar-month numeric maximum, rank 9 fails the discussed non-retrospective safeguard.

## Raw sufficiency versus frozen selected-set validity

The two questions produce different answers:

| Company | Policy A raw / interpretation | Policy B raw / interpretation | Policy C raw / interpretation | Frozen selector result under every policy |
| --- | --- | --- | --- | --- |
| NVIDIA | 5; sufficient | 5; sufficient | 5; sufficient | `1,3,5`; three valid selections; unchanged `SELECTOR PASS` evidence |
| Stripe | 2; insufficient | 2; rank 9 is about 272 days old and outside 270 | 2 under safeguards; rank 9 is numerically eligible but retrospective and therefore rejected | Actual `2,1,4`; only rank 2 qualifies. Rank 9 did not outrank ranks 1 or 4 when its provider date was treated as recent; using its true sparse event date would make it still lower priority. No policy produces a valid selected three |
| PostHog | 2; insufficient | 3 with rank 9; raw discovery becomes sufficient | 3 with rank 9; raw discovery becomes sufficient | Actual `3,2,7`; ranks 3 and 2 qualify, rank 7 does not. A sparse rank 9 would remain behind the three `RECENT` candidates under recency-first ordering, so the selector still would not produce three valid selections |

For PostHog, broader recency changes the raw-evidence diagnosis from insufficient to sufficient, but it does not repair the combined pipeline. Counterfactually applying Policy B or C to the recorded raw set would expose a selected-set failure: valid rank 9 remains unselected while invalid rank 7 occupies the third slot.

For Stripe, the defensible raw count remains two. A more permissive interpretation that counted the retrospective rank 9 would raise the raw count to three, but the frozen selection `2,1,4` would still contain only one valid event. Thus even the lenient sensitivity case would change the failure category, not make the pipeline pass.

## Recommendation, benefits, and tradeoffs

Recommend **`NO POLICY CHANGE YET`**. Policy A remains the operative—and currently smallest defensible—interpretation, not because 180 days is proven optimal, but because the recorded evidence is insufficient to choose a broader boundary without fitting it to the failed cases.

The benefit of no change is that it preserves the precommitted meaning of “recent” and avoids reverse-fitting a wider window to two failed captures. The downside is that it retains a demonstrable boundary effect: PostHog rank 9 is strong evidence only about two days outside the normal window. That cost should remain visible for a future evidence-aware pipeline decision rather than be hidden by claiming the existing cutoff is intrinsically correct.

If a later authorized experiment revisits sparse fallback, a nine-calendar-month maximum is conceptually clearer than 270 days, and it should be evaluated with all of these safeguards:

1. Trigger it only when fewer than three events qualify within 180 days.
2. Admit at most one 181-day-to-nine-calendar-month event into a three-signal result.
3. Use the underlying destination-supported event date; never substitute a recent provider/article date for an older event.
4. Require a discrete, material company event supported by the exact destination.
5. Reject evergreen pages, recycled/retrospective explainers, rumors, and commentary that merely revisits an older event.
6. Preserve entity correctness and duplicate checks.
7. Label the result explicitly as older context rather than silently presenting it as equally recent.

Potential benefit: such a rule would avoid rejecting a high-quality event like PostHog rank 9 solely because it is about two days beyond an internal 180-day boundary, while keeping at least two of three signals within 180 days.

Downside: nine months is materially older than the normal window and may feel stale for fast-moving companies. Adopting it from this evidence would be driven by one 182-day event, while Stripe becomes numerically eligible only because calendar months differ from 270 days and still fails the qualitative safeguard. Most importantly, recency eligibility alone cannot make a weak selected set valid.

No tested policy improves A4.3's historical result or demonstrates ordinary 4/5 coverage. Policies B and C show only that PostHog's recorded raw set would contain three defensible events under a broader sparse policy. Stripe remains raw-insufficient under the qualitative safeguards, and both recorded selected sets remain unusable. The benefit is therefore analytical, not an actual pipeline improvement; that is insufficient evidence for a policy change now.

## Historical integrity and remaining Phase A question

> A4.3 remains a valid result under the then-approved contract. This post-benchmark reassessment evaluates whether that contract was unnecessarily strict; it does not retroactively change the experiment outcome.

A4.3 therefore remains **`A4.3 SIGNAL BENCHMARK FAIL`**. No new recency policy is recommended for approval from this evidence.

The remaining architectural question is not merely “how old may a signal be?” It is whether a future bounded pipeline should verify source support and destination-derived event dates before final selection, then backfill from lower-ranked valid candidates when a selected candidate fails. The recorded PostHog set shows why: a source-blind recency-first selector chooses rank 7 while a valid sparse fallback sits at rank 9. Stripe additionally shows that discovery can remain insufficient even after a reasonable policy adjustment. Resolving that verification/backfill boundary requires separate approval; no retrieval or selector repair is part of A4.3R0.

## Independent challenge

An independent reviewer challenged whether the cutoff was being chosen to make the benchmark look better, whether a nearly nine-month-old event remained defensibly recent, whether retrospective publication dates were confused with event dates, whether raw sufficiency was conflated with selection validity, and whether A4.3 history was preserved. The reviewer recommended `NO POLICY CHANGE YET`: expanding from 180 to 270 days is a 50% increase based on one 182-day case; nine months additionally makes Stripe hinge on a one-to-two-day boundary while relying on retrospective evidence; and neither policy repairs the frozen selected sets. This changed the draft recommendation from a nine-calendar-month fallback to no policy change.
