# Phase A4.4 Architecture Freeze

## Decision

**Architecture direction frozen; Phase A exit remains pending A4.5.**

The rejected shape is:

```text
one generic Exa search → selector → final three
```

It is not reliable enough to guarantee three defensible signals: A4.3 and A4.3R1 each left Stripe with two qualifying events, and source-blind selection can promote plausible but unsupported candidates.

The approved complexity ceiling is:

```text
user input
  → company resolution
  → one broad Exa discovery request
  → candidate prioritization / light dedupe
  → verify candidates in order
  → retain valid distinct signals
  → if fewer than three: one conditional official-domain fallback
  → verify/backfill missing slots only
  → three valid signals or honest insufficient evidence
  → grounded synthesis → snapshot response
```

This decision does not claim that the fallback works, approve production implementation, or execute A4.5.

## Evidence chronology

| Phase | Evidence | Decision carried forward |
| --- | --- | --- |
| Gemini A1 | Tested project could not access Gemini 2.5 Flash with Search grounding | Gemini hypothesis `NO-GO` |
| Exa A3 | One-shot structured response worked technically but its signals were weak, stale, trivial, or unsupported | One-shot final-snapshot shape `NO-GO` |
| A4.1 | Raw signal-oriented Exa discovery retrieved three strong recent NVIDIA events | Exa is useful for discovery |
| A4.2 | Metadata-only selector chose three valid NVIDIA candidates, but missed semantic duplicate groups | Useful as a prioritizer/deduper, not source approval |
| A4.3 | Stripe and PostHog each had only two qualifying raw events | One broad request is not reliably sufficient |
| A4.3R0 | Wider recency risked reverse-fitting and did not repair selected sets | Retain ≤90 / 91–180 policy |
| A4.3R1 | Fixed source-quality instruction left Stripe at two qualifying events | Do not adopt the prompt repair |

Historical outcomes remain unchanged: A4.3 is `A4.3 SIGNAL BENCHMARK FAIL`; A4.3R0 is `NO POLICY CHANGE YET`; A4.3R1 is `RETRIEVAL REPAIR FAIL`.

## Provider role and request ceiling

Exa remains the primary discovery provider. The evidence supports a narrower conclusion: **Exa is useful for discovery, but one broad request cannot guarantee three defensible signals.**

The production direction permits one broad discovery request and, only when fewer than three verified distinct signals survive, one official-domain/first-party-focused Exa fallback. The hard ceiling is **two discovery requests per company**. There is no third call, provider waterfall, automatic retry, or permanent alternate retrieval lane.

The fallback preserves already verified signals and supplies candidates only for the missing slots. A company whose broad pass already yields three valid signals does not use it.

## Selector, verification, and recency roles

The existing selector is conceptually reframed as **candidate prioritization / lightweight deduplication**. Its current recency ordering, first-party awareness, basic lexical dedupe, and deterministic ordering may be reused or simplified later, but it is not final evidence approval. Exact-source verification determines whether a candidate survives.

The frozen principle is to inspect prioritized sources until three valid distinct signals survive, stopping early when that happens. This is bounded verification/backfill, not an evidence graph or a new qualification engine.

Recency remains unchanged:

- ≤90 days preferred;
- 91–180 days fallback;
- >180 days normally ineligible.

If the broad pass and one fallback cannot yield three recent, defensible, distinct signals, the product must return an honest insufficient-evidence state. It must not manufacture, stretch, or silently substitute weak or old evidence.

## Anti-V1 complexity ceiling

The approved direction excludes custom or recursive crawling, sitemap/RSS systems, multiple permanent retrieval lanes, a third or fourth search, Tavily fallback, provider waterfalls, embeddings, vector databases, databases, source-reputation engines, elaborate event taxonomies, LangChain, LangGraph, runtime multi-agent systems, complex scoring, evidence graphs, arbitrary retries, and unbounded backfill.

Guiding rule: **one primary search, one conditional fallback, bounded verification, then stop.** Any addition beyond this ceiling requires later observed production evidence and separate approval.

## A4.5 final feasibility contract

A4.5 is the remaining Phase A exit test. It is not authorized or executed by A4.4.

Likely fixture: Stripe, because its broad path repeatedly produced two qualifying events. Goal: determine whether one official-domain-focused Exa fallback can produce at least one additional valid distinct ≤180-day Stripe signal without changing the broad-first architecture.

The future A4.5 authorization must permit at most **one new Exa request**, define the exact fallback request contract before credentials load, preserve the two-search ceiling, inspect exact returned destinations, and retain the current recency policy. If it succeeds, Phase A can be frozen for implementation planning; if it fails, return for architecture reassessment without adding layers.

## Unresolved implementation questions

These remain deliberately unimplemented:

1. Company resolution behavior for a name or domain input.
2. Exact bounded verification/backfill mechanics and presentation-safe source handling.
3. Exact official-domain fallback request contract and its A4.5 evidence gate.
4. Grounded description/synthesis contract.
5. Endpoint, UI, deployment, Mercury ambiguity, and Craigslist sparse-company behavior.

## Scope, counts, and interpretation

A4.4 made no provider or source request and changed no executable code, selector behavior, recency policy, or historical phase record. Exa counts remain A3 1, A4.1 1, A4.2 1, A4.3 2, A4.3R1 1: **6 cumulative**.

This is an evidence-bounded design decision, not a full provider/product GO. It defines the smallest next test and the maximum architecture permitted if that test succeeds.
