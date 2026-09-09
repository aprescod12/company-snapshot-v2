# Phase A4.3R1 Bounded Retrieval Repair Spike

## Scope and decision

Phase A4.3R1 tested one retrieval-only hypothesis for the two ordinary-company cases that were historically discovery-insufficient in A4.3: could one fixed, generic source-quality/novelty instruction make the raw ten-result set contain at least three defensible, distinct company events within the unchanged 180-day policy? It did not alter the selector, recency policy, query, result count, provider mode, or any production architecture.

**Outcome: `RETRIEVAL REPAIR FAIL`.** Stripe was the fixed first case. Its repaired raw set contained only two qualifying distinct events, so the required early stop applied: PostHog was not requested. This one sample weakens the fixed-instruction repair hypothesis; provider output can vary over time, so it does not establish strict causality.

The historical A4.3 `FAIL` and A4.3R0 `NO POLICY CHANGE YET` remain unchanged.

## Baseline, hypothesis, and bounded request contract

Before implementation or provider access, local `main` and `origin/main` both matched `176a9e6b94e7bd31123a5cdf9c3306eae553d8fc`, and the worktree/index were clean. Historical request counts were A3 1, A4.1 1, A4.2 1, A4.3 2: **5 cumulative Exa requests**.

The sole A4.3R1 retrieval change was this exact top-level `systemPrompt`:

> Prefer first-party company announcements and reputable independent reporting. Return distinct company-level events. Avoid SEO/affiliate pages, generic roundups, evergreen content, rumors, and duplicate coverage.

The harness otherwise reused the A4.1 request unchanged: `POST https://api.exa.ai/search`, generic signal query, `type: "auto"`, `numResults: 10`, and `contents.highlights: true`, with no filters, schema, category, domain constraints, synthesis, second model, persistence, polling, or retry. It passed the returned candidates directly to the frozen A4.2 selector. Only Stripe and conditional PostHog were allowed; each invocation has one request maximum. The actual budget was at most two requests; one was transmitted.

## Pre-live gate

The dedicated stateless repair harness and tests make the single changed parameter, fixed order, PostHog gate, one-request limit, and no-persistence boundary explicit. Independent pre-live review found no blocker: it confirmed the exact prompt, otherwise identical A4.1 body, direct selector handoff, zero retry, and unchanged historical code.

Before credentials were loaded, syntax checks passed for the discovery script, selector, repair harness, and repair tests; focused discovery/selector/repair tests passed 42/42; the full suite passed 81/81; and `git diff --check` passed. On resumption, the intact repair files again passed syntax and focused discovery/repair tests 18/18 before the request.

## Stripe — A4.3R1 request 1

| Measure | Observed value |
| --- | --- |
| Input / intended company / evaluation domain | `Stripe` / Stripe / `stripe.com` |
| Request transmitted / retries | Yes / 0 |
| A4.3R1 / cumulative Exa request | 1 / 6 |
| Latency / provider-reported cost | 1,498 ms / $0.007 total |
| Raw / provider-dated / highlighted results | 10 / 10 / 10 |
| Unique domains | 4 |
| Selector time | `2026-09-09T05:06:20.440Z` |
| Selected ranks / selector clusters | `2,1,3` / none |
| Historical A4.3 qualifying count | 2 distinct events |
| A4.3R1 qualifying count | 2 distinct events: rank 2 ≤90 days; rank 6 in the 91–180-day fallback |
| Raw sufficiency / selector validity | `RAW INSUFFICIENT` / not valid: selected ranks 1 and 3 are rejected |
| Case outcome | **`RETRIEVAL REPAIR INSUFFICIENT`** |

All ten exact returned destinations were reviewed without a replacement-source search. The in-app browser had no connected instance; the approved bounded read-only exact-URL retrieval path was used instead. An exact destination that could not expose adequate evidence was rejected rather than replaced. Provider dates are metadata only; source/event dates below are destination-derived where established.

| Rank | Selector metadata | Title and exact returned URL | Entity / event / material | Access, support, and source date | Human group | Classification |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Selected; `RECENT`; `OTHER`; provider `2026-09-05T02:30:10Z`; cluster none | [Stablecoin settlement](https://onlinestorenews.com/stripes-new-stablecoin-settlement-is-rewriting-cross-border-checkout/) | Stripe / not adequately established / material only if true | Exact destination did not expose reviewable support in the bounded retrieval; date not established | Stablecoin settlement | Reject: inaccessible evidence cannot support the claimed event |
| 2 | Selected; `RECENT`; `FIRST_PARTY`; provider `2026-08-17T04:00:00Z`; cluster none | [New currency capabilities for global businesses to cut FX costs](https://stripe.com/blog/reduce-fx-costs-with-stripe) | Yes / yes / yes | First-party announcement supports expanded multicurrency settlement and instant conversion; **2026-08-17** | FX / multicurrency settlement | **Qualifies; ≤90 days** |
| 3 | Selected; `RECENT`; `OTHER`; provider `2026-09-04T01:21:57Z`; cluster none | [Adaptive Pricing Engine](https://onlinestorenews.com/stripes-new-adaptive-pricing-engine-is-rewriting-cross-border-checkout-in-2026/) | Stripe / not adequately established / material only if true | Exact destination did not expose reviewable support; date not established | Checkout optimization | Reject: inaccessible SEO-style claim |
| 4 | Unselected; `RECENT`; `OTHER`; provider `2026-09-07T00:44:08Z`; cluster none | [Adaptive Checkout](https://onlinestorenews.com/stripes-new-adaptive-checkout-is-quietly-reshuffling-the-payment-stack-3/) | Stripe / no clean discrete event / no | Exact destination did not expose reviewable support; date not established | Checkout optimization | Reject: inaccessible/generic product commentary |
| 5 | Unselected; `RECENT`; `OTHER`; provider `2026-09-01T00:00:00Z`; cluster none | [DBS and Stripe team up](https://www.merchantseye.com/news/dbs-and-stripe-partner-to-accelerate-the-digital-and-ai-powered-economy-in-asia-9b7cec69) | Not established / not established / not established | Exact destination did not expose supporting content; date not established | Purported DBS partnership | Reject: inaccessible evidence |
| 6 | Unselected; `FALLBACK`; `FIRST_PARTY`; provider `2026-06-09T08:00:00Z`; cluster none | [Stripe powers Lloyds' new suite of payment tools](https://stripe.com/newsroom/news/lloyds-and-stripe) | Yes / yes / yes | First-party announcement supports the Lloyds Accept partnership and payment-tools launch; **2026-06-09** | Lloyds payment suite | **Qualifies; 91–180 days** |
| 7 | Unselected; `RECENT`; `OTHER`; provider `2026-09-08T01:54:12Z`; cluster none | [Optimized Checkout Suite](https://onlinestorenews.com/stripes-optimized-checkout-suite-is-reshaping-how-merchants-think-about-payment-stacks-in-2026/) | Stripe / no clean discrete event / no | Exact destination did not expose reviewable support; date not established | Checkout optimization | Reject: inaccessible/generic product commentary |
| 8 | Unselected; `RECENT`; `OTHER`; provider `2026-09-07T18:37:07Z`; cluster none | [Startup discount program rumor](https://onlinestorenews.com/is-stripe-quietly-killing-its-startup-discount-program-to-force-teams-onto-optimized-checkout/) | Stripe / no / no | Exact destination did not expose reviewable support; date not established | Startup discount rumor | Reject: rumor/inaccessible evidence |
| 9 | Unselected; `OLD`; `FIRST_PARTY`; provider `2025-12-11T08:00:00Z`; cluster none | [Introducing the Agentic Commerce Suite](https://stripe.com/blog/agentic-commerce-suite) | Yes / yes / yes | First-party announcement establishes the event on **2025-12-11** | Agentic Commerce Suite | Reject: event older than 180 days |
| 10 | Unselected; `RECENT`; `OTHER`; provider `2026-09-05T04:25:09Z`; cluster none | [Agentic Commerce Suite, Explained](https://nextaipress.com/stripe-agentic-commerce-suite-explained/) | Yes / historical event only / no current event | Accessible retrospective explainer; underlying announcement **2025-12-11** | Agentic Commerce Suite | Reject: evergreen/retrospective explanation of an event older than 180 days |

Human duplicate groups were checkout-optimization commentary `3/4/7` and Agentic Commerce Suite coverage `9/10`; all other groups were distinct. The frozen selector assigned no clusters, so both semantic groups were missed. No multiple members of a human duplicate group were selected, but rank 3 was a weak selected candidate while valid rank 6 remained unselected. More fundamentally, there were only two qualifying raw events; that is a retrieval insufficiency before selector ranking can pass.

## Stop, interpretation, and limits

The contract required `RETRIEVAL REPAIR INSUFFICIENT` and an immediate stop when Stripe had fewer than three qualifying distinct events. PostHog was therefore not requested. A4.3R1 used **1** Exa request with zero retries; cumulative Exa requests are **6**, below the maximum possible 7.

The failed repaired set still contained SEO-style, inaccessible, generic, rumor, evergreen, and duplicate-prone material despite the fixed instruction. That is evidence against adopting this one-change repair from this sample, not evidence that a new recency policy or selector modification is justified. No Canva holdout, source-backfill architecture, alternate provider/mode, query rewrite, second model, synthesis, endpoint, frontend, deployment, or later phase began.
