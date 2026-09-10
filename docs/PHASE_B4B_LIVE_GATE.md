# Phase B4B Live Gate

Date: 2026-09-10

## Authorized scope

The gate authorized exactly two owner-run production-path B4B Contents requests: one for `NVIDIA` and one for `stripe.com`, using the two fixed already-confirmed identities in `scripts/phase-b4b-live-smoke.mjs`. Each case is capped at one Exa Contents request with no retry. No Exa Search request is made by B4B; B1/B2/B3 identity resolution is not invoked by the harness.

## Owner-run results

| Measure | NVIDIA | Stripe |
| --- | --- | --- |
| Submitted case | `NVIDIA` | `stripe.com` |
| Resolved identity | `NVIDIA Corporation` / `nvidia.com` | `Stripe` / `stripe.com` |
| Result | `state: "described"` | `state: "described"` |
| Source URL | `https://nvidia.com/` | `https://stripe.com/` |
| Sentence count | 3 | 3 |
| Provider latency | 2783 ms | 2115 ms |
| Estimated cost | $0.001 | $0.001 |
| Retries | 0 | 0 |

Manual review against current official NVIDIA and Stripe materials confirmed, for both descriptions: factual accuracy; a stable core-business focus (not current events); compliance with the 2–3 sentence requirement; clarity of company/product/use-case for an unfamiliar reader; absence of recent-announcement/funding/leadership/stock content; grounding to the official homepage; and no material unsupported specificity. The generated description text itself is not duplicated here or in other living documents — this record preserves the auditable facts (state, source, sentence count, provider metadata, and the review checklist outcome) without treating live generated prose as a new source of truth.

## Provider accounting

| Accounting | Count |
| --- | ---: |
| Cumulative Exa Search requests (unchanged) | 22 |
| B4B Contents requests | 2 |
| B4B Search requests | 0 |
| Retries | 0 |

Search and Contents counts are tracked separately and are not combined into one ambiguous total.

## Outcome

**`B4B ISOLATED GROUNDED COMPANY DESCRIPTION — APPROVED`**

The approval rests on: the previously reviewed zero-network implementation and its 30 focused unit tests plus 7 harness tests; the frozen B1–B4A compatibility boundary (unmodified by B4B or by this gate); the one-Contents-request-per-company, no-retry, summary-only-homepage design; and these two live passes with manual official-source review.

Two authorized cases demonstrate the mechanism works for a large public company and a private/well-documented company; they do not establish reliability across arbitrary companies. Broader end-to-end validation — smaller, private, ambiguous-name, or low-web-activity companies — remains a later, separately authorized concern and has not been run. No B4B prompt, request shape, validation logic, retry policy, or B1–B4A behavior was changed by this gate or its approval. B5 (endpoint/UI) and Phase C (frontend) remain unstarted.
