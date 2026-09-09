# Phase A4.3 Representative Signal-Pipeline Benchmark

## Scope and decision

Phase A4.3 tested only whether the fixed A4.1 signal-oriented Exa discovery request followed by the corrected A4.2 deterministic selector generalized across the approved ordinary-company cohort. It did not test descriptions, production company resolution, ambiguity handling, a production source-verification layer, endpoint/UI behavior, deployment, or full product viability.

The benchmark validly early-stopped with **`A4.3 SIGNAL BENCHMARK FAIL`**. The completed NVIDIA A4.2 `SELECTOR PASS` was reused without another request. Stripe and PostHog each returned only two qualifying distinct events, so both were `DISCOVERY INSUFFICIENT`. After those two failures, even passes for both remaining cases could produce only `3/5`, below the required `4/5`; Canva and `notion.so` therefore were not run.

Baseline was `9d9cdc850de8b21b85ae1733ee2ea516664c1885` on `main`, matching `origin/main`, with a clean worktree and index before implementation or provider access.

## Frozen contract and execution boundary

The ordinary cohort and fixed order were:

| Order | Input | Intended company | Evaluation domain | Execution |
| --- | --- | --- | --- | --- |
| Reused | `NVIDIA` | NVIDIA Corporation | Existing A4.2 fixture | A4.2 result reused; no request |
| 1 | `Stripe` | Stripe | `stripe.com` | Run |
| 2 | `PostHog` | PostHog | `posthog.com` | Run |
| 3 | `Canva` | Canva | `canva.com` | Not run; mathematical-failure stop |
| 4 | `notion.so` | Notion | `notion.so` | Not run; mathematical-failure stop |

The evaluation domains are human-approved benchmark fixtures, not production company-resolution behavior. In particular, the harness preserves `notion.so` as the discovery-query input and would pass `Notion` plus `notion.so` only to the selector.

Each eligible invocation reuses `requestCandidates()` for exactly one A4.1 request and passes the candidates directly in memory to `selectSignals()`. The request remains `POST https://api.exa.ai/search`, `type: "auto"`, `numResults: 10`, `contents.highlights: true`, and the generic signal-oriented query with only the company input changed. There is no schema, final synthesis, date filter, company-specific ranking, retry, polling, batch path, alternate mode/provider, second model, direct source fetch in the harness, or response persistence.

At most four new Exa requests were authorized. Two were transmitted sequentially, with zero retries: A4.3 request 1 for Stripe and request 2 for PostHog. Cumulative Exa requests moved from 3 to 5. No NVIDIA, Canva, `notion.so`, Mercury, or Craigslist request was made in A4.3.

## Pre-live gate

Before credentials were loaded, five applicable syntax checks passed. Focused tests passed: discovery 13/13, selector 24/24, A4.2 smoke harness 5/5, and A4.3 harness 6/6. The combined focused total was 48/48, the full suite passed 76/76, and `git diff --check` passed. The original discovery implementation, selector implementation, and A4.2 harness remained byte-for-byte unchanged.

Independent pre-live review found no blocker. It confirmed the exact four-case allowlist and order, exact A4.1 body reuse, one request per invocation, direct in-memory selector handoff, no retry/polling/persistence/second model, no disallowed-company path, and correct early-stop arithmetic. The harness is intentionally stateless: cross-process order and rerun avoidance remain operator controls, which preserves the no-persistence boundary.

## Stripe — A4.3 request 1

| Measure | Observed value |
| --- | --- |
| Input / intended company / evaluation domain | `Stripe` / Stripe / `stripe.com` |
| Request transmitted / retries | Yes / 0 |
| A4.3 / cumulative Exa request | 1 / 4 |
| Latency / provider-reported cost | 2,314 ms / $0.007 total |
| Raw / provider-dated / highlighted results | 10 / 10 / 10 |
| Unique domains | 4 |
| Selector time | `2026-09-09T00:28:43.400Z` |
| Selected ranks | `2,1,4` |
| Selector duplicate clusters | None |
| Qualifying distinct events | 2 total: 1 within 90 days; 1 in the 91–180-day fallback window |
| Outcome | **`DISCOVERY INSUFFICIENT`** |

Only the exact returned destinations were inspected, allowing normal redirects. No replacement-source search was used. `Source date` is destination-derived when the page established one; otherwise it is explicitly not established.

| Rank | Selector metadata | Title and exact returned URL | Entity / real event / material | Access and support | Source date | Human event group | Final classification |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Selected; `RECENT`; `OTHER`; provider `2026-09-05T02:30:10.000Z`; cluster none | [Stripe’s New Stablecoin Settlement Is Rewriting Cross-Border Checkout](https://onlinestorenews.com/stripes-new-stablecoin-settlement-is-rewriting-cross-border-checkout/) | Yes / No, not adequately established / Yes if true | Accessible; `PARTIAL`; the SEO-style page asserted a late-August rollout, 47-country reach, unsupported metrics, and an unsupported quote | 2026-09-04 | Stablecoin settlement | Reject: exact destination did not defensibly establish the claimed event |
| 2 | Selected; `RECENT`; `FIRST_PARTY`; provider `2026-08-17T04:00:00.000Z`; cluster none | [New currency capabilities for global businesses to cut FX costs](https://stripe.com/blog/reduce-fx-costs-with-stripe) | Yes / Yes / Yes | Accessible first-party page; `SUPPORTED` | 2026-08-17 | FX / multicurrency settlement | **Qualifies; ≤90 days** |
| 3 | Unselected; `FALLBACK`; `FIRST_PARTY`; provider `2026-06-09T08:00:00.000Z`; cluster none | [Stripe powers Lloyds' new suite of payment tools for UK small businesses](https://stripe.com/newsroom/news/lloyds-and-stripe) | Yes / Yes / Yes | Accessible first-party page; `SUPPORTED` | 2026-06-09 | Lloyds payment suite | **Qualifies; 91–180 days** |
| 4 | Selected; `RECENT`; `OTHER`; provider `2026-09-04T01:21:57.000Z`; cluster none | [Stripe’s New Adaptive Pricing Engine Is Rewriting Cross-Border Checkout in 2026](https://onlinestorenews.com/stripes-new-adaptive-pricing-engine-is-rewriting-cross-border-checkout-in-2026/) | Yes / No, not adequately established / Yes if true | Accessible; `PARTIAL`; broad-availability and performance claims relied on unsupported metrics | 2026-09-03 | Checkout optimization | Reject: claimed launch was not defensibly established |
| 5 | Unselected; `RECENT`; `OTHER`; provider `2026-09-07T00:44:08.000Z`; cluster none | [Stripe’s New Adaptive Checkout Is Quietly Reshuffling the Payment Stack](https://onlinestorenews.com/stripes-new-adaptive-checkout-is-quietly-reshuffling-the-payment-stack-3/) | Yes / No distinct event / No | Accessible; `PARTIAL`; product-review framing and unsupported metrics did not establish a discrete event | Not established | Checkout optimization | Reject: no clean, material current event |
| 6 | Unselected; `RECENT`; `OTHER`; provider `2026-09-07T18:37:07.000Z`; cluster none | [Is Stripe Quietly Killing Its Startup Discount Program to Force Teams onto Optimized Checkout?](https://onlinestorenews.com/is-stripe-quietly-killing-its-startup-discount-program-to-force-teams-onto-optimized-checkout/) | Yes / No / Yes if true | Accessible; `UNSUPPORTED`; the page described its own anonymous claim as unconfirmed and speculative | Not established | Startup discount rumor | Reject: unconfirmed rumor |
| 7 | Unselected; `RECENT`; `OTHER`; provider `2026-09-01T00:00:00.000Z`; cluster none | [DBS and Stripe Team Up to Accelerate Agentic Commerce and Cross-Border Payments in Asia](https://www.merchantseye.com/news/dbs-and-stripe-partner-to-accelerate-the-digital-and-ai-powered-economy-in-asia-9b7cec69) | No, not established from destination / No / No | HTTP destination exposed only a short JavaScript shell and generic FF News title; `INACCESSIBLE` for evidence review | Not established | DBS partnership | Reject: exact destination did not expose supporting content |
| 8 | Unselected; `RECENT`; `OTHER`; provider `2026-09-08T01:54:12.000Z`; cluster none | [Stripe’s Optimized Checkout Suite Is Reshaping How Merchants Think About Payment Stacks in 2026](https://onlinestorenews.com/stripes-optimized-checkout-suite-is-reshaping-how-merchants-think-about-payment-stacks-in-2026/) | Yes / No distinct current event / No | Accessible; `PARTIAL`; vague early-2026 expansion and unsupported metrics | Not established | Checkout optimization | Reject: no clean, material current event |
| 9 | Unselected; `RECENT`; `OTHER`; provider `2026-09-05T04:25:09.000Z`; cluster none | [Stripe's Agentic Commerce Suite, Explained (2026)](https://nextaipress.com/stripe-agentic-commerce-suite-explained/) | Yes / Yes / Yes | Accessible retrospective; `SUPPORTED` for the historical announcement | 2025-12-11 event; page 2026-09-05 | Agentic commerce | Reject: event older than 180 days |
| 10 | Unselected; `RECENT`; `OTHER`; provider `2026-09-08T11:07:46.000Z`; cluster none | [Stripe’s Link in 2026: The Honest Checkout Network Review](https://onlinestorenews.com/stripes-link-in-2026-the-honest-checkout-network-review/) | Yes / No current event / No | Accessible; `PARTIAL`; underlying rebrand was from 2022 and the current review did not establish a new event | Not established | Link product review | Reject: evergreen product review, not a current signal |

Human review grouped ranks `4/5/8` as overlapping checkout-optimization coverage; all other rows were separate event/topic groups. The selector assigned no duplicate clusters. That recall miss did not corrupt the selected three because only rank 4 from the group was selected. The raw set contained only ranks 2 and 3 as qualifying distinct events. Although selected rank 1 and rank 4 were rejected and rank 3 was unselected, the raw count below three requires `DISCOVERY INSUFFICIENT`, not `SELECTOR FAIL`.

After Stripe, NVIDIA remained the only pass. With three cases left, maximum possible coverage was still `4/5`, so continuing to PostHog was correct.

## PostHog — A4.3 request 2

| Measure | Observed value |
| --- | --- |
| Input / intended company / evaluation domain | `PostHog` / PostHog / `posthog.com` |
| Request transmitted / retries | Yes / 0 |
| A4.3 / cumulative Exa request | 2 / 5 |
| Latency / provider-reported cost | 2,769 ms / $0.007 total |
| Raw / provider-dated / highlighted results | 10 / 7 / 10 |
| Unique domains | 6 |
| Selector time | `2026-09-09T00:35:21.856Z` |
| Selected ranks | `3,2,7` |
| Selector duplicate clusters | None |
| Qualifying distinct events | 2 total: both within 90 days; none in the 91–180-day fallback window |
| Outcome | **`DISCOVERY INSUFFICIENT`** |

| Rank | Selector metadata | Title and exact returned URL | Entity / real event / material | Access and support | Source date | Human event group | Final classification |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Unselected; `UNKNOWN`; `FIRST_PARTY`; provider date absent; cluster none | [Changelog](https://posthog.com/changelog) | Yes / No singular event / No as one candidate | Accessible first-party multi-update index; `PARTIAL` at the candidate-event level | No singular date | Product-update aggregate | Reject: aggregate page did not define one material event |
| 2 | Selected; `RECENT`; `OTHER`; provider `2026-08-30T20:34:29.000Z`; cluster none | [PostHog scouts Bring Scheduled, Learning Agents to Product Analytics](https://www.createwith.com/tool/posthog/updates/posthog-scouts-bring-scheduled-learning-agents-to-product-analytics) | Yes / Yes, as preview / Yes | Accessible; `SUPPORTED` for the scheduled Scouts/global-scratchpad preview; page explicitly did not establish GA, pricing, or documentation | 2026-08-30 | Scheduled Scouts preview | **Qualifies narrowly; ≤90 days** |
| 3 | Selected; `RECENT`; `FIRST_PARTY`; provider `2026-06-24T00:00:00.000Z`; cluster none | [How we're spending our marketing budget in 2026 (with actual $ figures)](https://posthog.com/founders/actual-marketing-budget-2026) | Yes / Yes / Yes | Accessible first-party page; `SUPPORTED` for the $1.2m monthly budget, organizational changes, positioning, and H2 shifts | 2026-06-24 | Marketing budget / positioning | **Qualifies; ≤90 days** |
| 4 | Unselected; `UNKNOWN`; `OTHER`; provider date absent; cluster none | [PostHog revenue, valuation & funding — Sacra](https://sacra.com/) | No / No / No | Accessible generic Sacra root with no PostHog evidence; `UNSUPPORTED` | Not established | Funding data | Reject: exact destination did not support the candidate |
| 5 | Unselected; `UNKNOWN`; `OTHER`; provider date absent; cluster none | [PostHog: 10 product updates in September 2026](https://spyingbee.com/updates/posthog/2026-09) | Yes / No singular event / No as one candidate | Accessible roundup of mostly routine warehouse, SDK, and export updates; `SUPPORTED` for the roundup but not a singular material event | September 2026 roundup; no singular date | Product-update aggregate | Reject: aggregate/routine changes did not define one material event |
| 6 | Unselected; `FALLBACK`; `FIRST_PARTY`; provider `2026-03-24T00:00:00.000Z`; cluster none | [What we wish we knew about building AI agents](https://posthog.com/newsletter/building-ai-agents) | Yes / No discrete event / No | Accessible first-party thought-leadership page; `SUPPORTED` for its content | 2026-03-24 | AI-agent architecture guidance | Reject: no discrete company event |
| 7 | Selected; `RECENT`; `OTHER`; provider `2026-08-09T19:27:52.000Z`; cluster none | [PostHog News — August 2026 (STARTUP EDITION)](https://blog.mean.ceo/posthog-news-august-2026-2/) | Yes / No discrete event / No | Accessible SEO/general product overview; `PARTIAL` at the event level | 2026-08-09 | Product overview | Reject: commentary did not establish a material event |
| 8 | Unselected; `OLD`; `FIRST_PARTY`; provider `2025-06-09T00:00:00.000Z`; cluster none | [PostHog raises a series D (and a small C)](https://posthog.com/blog/series-d) | Yes / Yes / Yes | Accessible first-party page; `SUPPORTED` | 2025-06-09 | Series D / C funding | Reject: older than 180 days |
| 9 | Unselected; `OLD`; `FIRST_PARTY`; provider `2026-03-11T00:00:00.000Z`; cluster none | [How we built automatic clustering for LLM traces](https://posthog.com/blog/llm-analytics-clustering-how-it-works) | Yes / Yes / Yes | Accessible first-party page; `SUPPORTED` | 2026-03-11 | LLM trace clustering | Reject: older than the 180-day window |
| 10 | Unselected; `RECENT`; `OTHER`; provider `2026-07-09T00:00:00.000Z`; cluster none | [PostHog Goes Open Source, Revolutionizing Product Analytics For Developers](https://techscoopcanada.com/posthog-goes-open-source-revolutionizing-product-analytics-for-developers/) | No, not established from destination / No / No | Exact destination could not be retrieved; `INACCESSIBLE` | Not established | Purported open-source change | Reject: inaccessible and title did not establish a current event |

Human review grouped ranks `1/5` as overlapping aggregate product-update coverage; the remaining rows were separate event/topic groups. The selector assigned no duplicate clusters. Neither aggregate page was selected, so this recall miss did not affect the selected three. Only ranks 2 and 3 qualified, and both were selected; selected rank 7 could not supply the required third event. The correct result is therefore `DISCOVERY INSUFFICIENT`.

## Coverage, independent review, and final outcome

| Cohort company | Result | Coverage contribution |
| --- | --- | --- |
| NVIDIA | Reused A4.2 `SELECTOR PASS`; no A4.3 request | Pass |
| Stripe | `DISCOVERY INSUFFICIENT` | Failure to provide three-signal coverage |
| PostHog | `DISCOVERY INSUFFICIENT` | Failure to provide three-signal coverage |
| Canva | Not run after mandatory stop | Undetermined |
| notion.so | Not run after mandatory stop | Undetermined |

The benchmark has 1 confirmed pass among 3 evaluated companies and 1 confirmed pass across the 5-company cohort. More importantly for the contract, after the two completed new failures the maximum achievable ordinary coverage was **`3/5`**, below the required **`4/5`**. This made the final outcome **`A4.3 SIGNAL BENCHMARK FAIL`** and required an immediate stop before Canva and `notion.so`.

Independent per-company reviewers agreed with the Stripe and PostHog candidate classifications and outcomes. A final independent reviewer confirmed the selected-versus-unselected decisions, duplicate groups, coverage arithmetic, early stop, and bounded interpretation. The reviewer noted that Stripe rank 1 could qualify only if its uncorroborated SEO-style claims were accepted; under the benchmark's correctness/evidence bar it remains rejected. PostHog rank 2 qualifies narrowly as a product preview; rejecting it would lower the raw count but would not change the insufficiency outcome.

Semantic duplicate recall remains a recurring limitation across NVIDIA (`1/2`, `3/6`), Stripe (`4/5/8`), and PostHog (`1/5`). It did not corrupt any observed selected three, but the current fixed discovery → selector signal path still failed representative coverage because both new raw sets contained fewer than three qualifying distinct events.

This result does not establish a selector failure: neither raw set met the prerequisite of three qualifying distinct events. It also does not establish full provider/product GO, production company resolution, description quality, a source-verification architecture, synthesis, edge behavior, endpoint/UI readiness, or deployment readiness. The evidence returns to the project owner for reassessment; no architecture patch or later-phase work was begun.
