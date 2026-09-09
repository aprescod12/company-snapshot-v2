# Phase A4.5 Final Official-Domain Fallback Feasibility

## Decision

**`FALLBACK FEASIBLE` — `PHASE A ARCHITECTURE APPROVED FOR IMPLEMENTATION`.**

In this bounded Stripe case, one official-domain-constrained Exa fallback produced additional valid, recent, first-party events beyond the two broad-pass signals already established. This supports the A4.4 two-search direction as a small implementation direction; it does not prove arbitrary-company reliability, production company resolution, final verification implementation, synthesis, endpoint/UI behavior, or deployment.

## Baseline and architecture tested

Baseline was `233528ea45691b0c63de8d9edcb62e4afba371e3` on `main`, matching `origin/main`, with a clean worktree/index. Exa counts before A4.5 were A3 1, A4.1 1, A4.2 1, A4.3 2, A4.3R1 1: **6 cumulative**.

A4.5 tested only the conditional branch frozen in A4.4:

```text
already verified broad-pass signals A and B
  → one official-domain fallback
  → verify candidates and fill the missing third slot only
```

The existing broad-pass signals were preserved, not rerun:

| Signal | Exact source | Destination date | Status |
| --- | --- | --- | --- |
| A — FX/currency capabilities | [Stripe blog](https://stripe.com/blog/reduce-fx-costs-with-stripe) | 2026-08-17 | Qualifying; ≤90 days |
| B — Lloyds payment tools | [Stripe newsroom](https://stripe.com/newsroom/news/lloyds-and-stripe) | 2026-06-09 | Qualifying; 91–180 days |

## Exact request contract

One Stripe-only request was transmitted with zero retries. It reused the A4.1 raw Search semantics—`POST https://api.exa.ai/search`, generic Stripe query, `type: "auto"`, `numResults: 10`, `contents.highlights: true`, and no date/category/schema/system prompt/second model/synthesis—plus only:

```js
includeDomains: ["stripe.com", "*.stripe.com"]
```

There was no broad Stripe rerun, selector change, source replacement search, response persistence, polling, or further retrieval. The fallback harness is [exa-phase-a-fallback-feasibility.mjs](../scripts/exa-phase-a-fallback-feasibility.mjs).

## Live aggregate result

| Measure | Observed value |
| --- | --- |
| Request transmitted / retries | Yes / 0 |
| A4.5 / cumulative Exa requests | 1 / 7 |
| Latency / provider-reported cost | 2,088 ms / $0.007 total |
| Raw / provider-dated / highlighted results | 10 / 10 / 10 |
| Unique domains | 1 (`stripe.com`) |
| Additional qualifying events | 4 (ranks 1, 2, 5, and 6) |
| Outcome | **`FALLBACK FEASIBLE`** |

Only exact Exa-returned destinations were reviewed, with normal redirects allowed. The in-app browser had no connected instance, so approved read-only exact-URL retrieval was used. Provider dates are metadata only; dates below are destination-derived where established.

| Rank | Title and exact returned URL | Provider date | Accessibility / destination evidence | Human event group | Duplicate of A/B? | Final classification |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | [Stripe agrees to acquire OpenRouter](https://stripe.com/newsroom/news/stripe-agrees-to-acquire-openrouter) | 2026-08-19 | Accessible first-party announcement; supports the agreed OpenRouter acquisition; source date 2026-08-19 | OpenRouter acquisition | No | **Qualifies; ≤90 days; material distinct third-signal candidate** |
| 2 | [Singapore infrastructure expansion](https://stripe.com/newsroom/news/stripe-celebrates-10-years-in-singapore-by-expanding-its-infrastructure-for-global-businesses) | 2026-08-25 | Accessible after normal `en-sg` redirect; supports new expansion tools, payment methods, and managed payments; source date 2026-08-25 | Singapore global-infrastructure expansion | No | **Qualifies; ≤90 days** |
| 3 | [Lloyds payment tools](https://stripe.com/newsroom/news/lloyds-and-stripe) | 2026-06-09 | Accessible first-party announcement; source date 2026-06-09 | Lloyds payment suite | Yes — B | Reject: duplicate of existing broad-pass signal B |
| 4 | [Treasury launches in Australia](https://stripe.com/en-ca/newsroom/news/tour-sydney-2026) | 2026-08-19 | Exact destination did not expose reviewable content through the bounded retrieval; date not established | Purported Australia Treasury launch | No | Reject: inaccessible evidence cannot support the event |
| 5 | [Sessions 2026 launches / Google partnership](https://stripe.com/ae/newsroom/news/sessions-2026) | 2026-04-29 | Accessible first-party announcement of 288 launches, including Google partnership and agent-wallet release; source date 2026-04-29 | Sessions 2026 launches | No | **Qualifies; 91–180 days** |
| 6 | [German global-selling tools](https://stripe.com/newsroom/news/stripe-tour-berlin-2026) | 2026-06-30 | Accessible first-party announcement of Germany tools, Managed Payments GA, and platform financial tools; source date 2026-06-30 | Germany product/global-selling expansion | No | **Qualifies; ≤90 days** |
| 7 | [Microsoft Copilot checkout](https://stripe.com/en-gi/newsroom/news/microsoft-copilot-and-stripe) | 2026-01-08 | Accessible first-party announcement; source date 2026-01-08 | Copilot checkout | No | Reject: older than 180 days |
| 8 | [FX/currency capabilities](https://stripe.com/blog/reduce-fx-costs-with-stripe) | 2026-08-17 | Accessible first-party announcement; source date 2026-08-17 | FX / multicurrency settlement | Yes — A | Reject: duplicate of existing broad-pass signal A |
| 9 | [Global-demand revenue tools](https://stripe.com/blog/new-ways-to-turn-global-demand-into-revenue) | 2026-06-04 | Accessible first-party explanatory post referring back to Sessions; it does not establish a clean additional singular event beyond the Sessions launch bundle | Sessions 2026 launches | No | Reject: retrospective/overlapping product explanation |
| 10 | [Link wallet for agents](https://stripe.com/blog/giving-agents-the-ability-to-pay) | 2026-04-29 | Accessible first-party announcement; source date 2026-04-29; one of the Sessions launch bundle reported at rank 5 | Sessions 2026 launches | No | Reject: overlapping component of rank 5's Sessions launch bundle |

Human duplicate groups are existing signal B/rank 3, existing signal A/rank 8, and Sessions 2026 coverage/ranks 5/9/10. The fallback did not run the old selector because A4.5 evaluates verification/backfill rather than source-blind final selection.

## Bounded interpretation and Phase A exit

Rank 1 alone proves the needed feasibility point: Stripe's first-party OpenRouter acquisition is a distinct, material, supported event dated 2026-08-19, beyond existing FX and Lloyds signals. Ranks 2, 5, and 6 provide additional corroborating feasibility evidence without relaxing recency, support, materiality, or duplicate requirements.

Phase A is therefore **`PHASE A ARCHITECTURE APPROVED FOR IMPLEMENTATION`**. The approved direction remains one broad search, prioritized verification, and at most one official-domain fallback; this result does not license a third search, crawler, provider waterfall, or unbounded backfill. No A4.6 or implementation phase began during A4.5.
