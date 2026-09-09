# Phase B1 Live Identity Gate

## Outcome

**`B1 LIVE IDENTITY GATE PASS`** on 2026-09-09. The complete chronology is: a first Mercury format blocker; a narrow parser correction; a second Mercury request that safely clarified genuine ambiguity; then one separately authorized Stripe positive-control request that positively resolved a clear name.

This bounded experiment tested whether the same broad Exa Search request already approved for signal discovery could also return provider-grounded B1 company identity evidence when the only request-body addition was a minimal identity `outputSchema`. It was not B2 and did not change production targeting, discovery, verification, synthesis, endpoint, UI, deployment, or provider strategy.

## Contract and limits

Each B1 request used `POST https://api.exa.ai/search` with the existing A4.1 generic signal-discovery query for its approved company, `type: "auto"`, `numResults: 10`, `contents: { highlights: true }`, `stream: false`, and only this additional schema:

```js
{
  type: "object",
  required: ["resolvedCompanyName", "officialDomain", "ambiguous"],
  properties: {
    resolvedCompanyName: { type: "string" },
    officialDomain: { type: "string" },
    ambiguous: { type: "boolean" },
  },
}
```

There was no system prompt, category, domain filter, date filter, extra query/context, summary/full-text/livecrawl request, second model/query, alternate type, retry, polling, source-page fetch, or response persistence. The repository-local `.env` was confirmed ignored, untracked, and unstaged before the process ran; its contents were not printed or staged. The operator supplied the required Free Starter attestation flag.

## First Mercury live result — format blocker

The one native request returned a response, but the normal result at index 9 did not contain a non-empty `title`. The raw-result parser therefore stopped with:

```text
formatting: results[9].title was not a non-empty string.
```

No retry was made. Because the process intentionally does not persist raw responses and stopped before output parsing, this experiment did not inspect or retain `output.content`, `output.grounding`, candidate highlights/URLs, response cost, latency, or source destinations. It consequently cannot establish either a safe Mercury resolution or a safe ambiguity clarification.

Stripe was not requested: Mercury did not meet its safety gate, and the harness also requires an explicit post-Mercury safety attestation before it accepts Stripe. The first live attempt made Mercury 1, Stripe 0, total 1; cumulative Exa experimental requests: 8.

## Parser-contract reassessment and correction

The real provider response established that result `title` is optional presentation metadata. Current official Exa TypeScript SDK documentation models `SearchResult.title` as `string | null`. The shared A4.1 parser was therefore corrected narrowly: valid result objects still require a non-empty exact HTTP(S) `url`, while absent, null, empty, or whitespace-only titles normalize to local `null`. A UI-only `Untitled source` fallback does not replace the stored title or use the URL as a title. Non-string non-null titles, malformed URLs, unsupported protocols, and all identity/grounding gates remain rejected.

This correction changed no request, query, schema, targeting behavior, retry policy, persistence boundary, or architecture. Regressions cover absent/null/empty/normal titles, strict URL failures, and an untitled result that continues through raw discovery, identity grounding, and B1 handoff.

## Second Mercury live result — safe ambiguity

The separately authorized rerun made exactly one Mercury request with the identical frozen body and schema. It returned:

| Field | Provider result |
| --- | --- |
| `resolvedCompanyName` | `Mercury (Fintech) and Mercury Systems (Aerospace/Defense)` |
| `officialDomain` | `mercury.com` |
| `ambiguous` | `true` |
| B1 result | `clarification_needed` / `insufficient_identity_evidence` |
| Latency / returned cost | 3,083 ms / $0.007 |
| Raw result aggregate | 10 results; 10 dated; 10 highlighted; 8 unique domains |

Exact name grounding was `https://mercury.com/blog/exclusive-treasury-funds` and `https://finance.yahoo.com/markets/stocks/articles/mercury-systems-reports-fourth-quarter-200100522.html`. Exact official-domain grounding was `https://mercury.com/blog/exclusive-treasury-funds`, `https://mercury.com/blog/introducing-mercury-spend`, and `https://mercury.com/blog/introducing-mercury-command`.

Manual review opened only those returned destinations. The three `mercury.com` pages identify the fintech/product platform. The exact Yahoo Mercury Systems destination returned HTTP 429 during direct review, while the provider-returned candidate material identified Mercury Systems as the aerospace/defense entity. That unavailable alternate destination does not weaken the safe outcome: the provider itself declared both entities and `ambiguous: true`, and B1 did not accept either one. The broad raw set remained signal-oriented (first-party fintech product developments plus independent coverage); this gate did not assess final signal qualification. The exact number of missing titles was not retained as a separate aggregate in the transient rerun output; the successful parse confirms no title blocked identity evaluation.

Stripe was not requested. Mercury requests across B1 live work: 2; Stripe: 0; retries: 0; new Exa requests in the rerun task: 1; cumulative Exa experimental requests: 9.

## Stripe positive control — positive resolution

The final separately authorized B1 request used the identical frozen body and schema for `Stripe`, with both the Free Starter and prior-Mercury-safe attestations. It returned:

| Field | Provider result |
| --- | --- |
| `resolvedCompanyName` | `Stripe` |
| `officialDomain` | `stripe.com` |
| `ambiguous` | `false` |
| B1 result | `resolved` / no reason |
| Latency / returned cost | 3,409 ms / $0.007 |
| Raw result aggregate | 10 results; 9 dated; 10 highlighted; 4 unique domains |

Exact name grounding was:

- `https://stripe.com/newsroom/news/stripe-helps-meta-muse-shop-with-link`
- `https://www.rte.ie/news/business/2026/0909/1590856-bank-of-ireland-grows-partnership-deal-with-stripe/`
- `https://stripe.com/blog/reduce-fx-costs-with-stripe`
- `https://onlinestorenews.com/stripes-new-stablecoin-settlement-is-rewriting-cross-border-checkout/`
- `https://stripe.com/newsroom/news/lloyds-and-stripe`
- `https://onlinestorenews.com/stripes-new-adaptive-checkout-is-quietly-reshuffling-the-payment-stack-3/`
- `https://onlinestorenews.com/stripes-new-adaptive-pricing-engine-is-rewriting-cross-border-checkout-in-2026/`
- `https://onlinestorenews.com/stripes-optimized-checkout-suite-is-reshaping-how-merchants-think-about-payment-stacks-in-2026/`
- `https://onlinestorenews.com/is-stripe-quietly-killing-its-startup-discount-program-to-force-teams-onto-optimized-checkout/`
- `https://www.merchantseye.com/news/dbs-and-stripe-partner-to-accelerate-the-digital-and-ai-powered-economy-in-asia-9b7cec69`

Exact official-domain grounding was the first Stripe newsroom URL, the RTE URL, the Stripe FX blog URL, and the Stripe Lloyds URL above. Manual review opened only those exact destinations: the accessible first-party `stripe.com` newsroom and blog pages identify Stripe and substantively describe its products and partnerships, directly corroborating both the company and `stripe.com`. The RTE, Online Store News, and Merchant's Eye pages were inaccessible through the review tool and were not replaced or supplemented. That access limitation does not undermine the identity result because exact first-party field grounding was accessible and sufficient.

The transient raw candidate set remained broadly signal-oriented: Stripe product/platform developments, partnerships, and independent company coverage rather than mostly generic company-profile pages. It was not treated as a final three-signal qualification or source-quality certification. No untitled results were observed in the transient review output.

## Final decision and limits

The final decision is **`B1 LIVE IDENTITY GATE PASS`** and **`B1 COMPANY TARGETING / RESOLUTION APPROVED FOR PRODUCTION INTEGRATION`**. Mercury demonstrates safe clarification for this genuinely ambiguous input; Stripe demonstrates positive clear-name resolution under the same one-broad-request identity shape. This does not prove universal company-name resolution, justify a parser/retrieval redesign, or begin B2. Mercury requests across B1 are 2, Stripe requests are 1, retries are 0, and cumulative Exa experimental requests are 10.

## Verification

Pre- and post-live checks actually run:

- `node --check scripts/exa-phase-b1-identity-gate.mjs`
- `node --check test/exa-phase-b1-identity-gate.test.mjs`
- `node --check src/targeting/companyTarget.mjs`
- `node --test test/exa-phase-a-discovery.test.mjs` — 14/14 passed
- `node --test test/exa-phase-b1-identity-gate.test.mjs` — 12/12 passed
- `node --test test/company-target.test.mjs` — 10/10 passed
- `node --test test/*.test.mjs` — 109/109 passed
- `git diff --check` — passed

The mocked tests cover the exact frozen body plus only the schema, allowlist and account attestation, Stripe post-Mercury attestation, one fetch/no retry, title optionality with strict URLs, malformed grounding failures, relevant-field grounding extraction/deduplication, B1 handoff, and no persistence/polling/source retrieval.

## Phase Completion Report

1. **Work / non-goals.** Made one authorized Stripe positive control after the approved Mercury SAFE AMBIGUITY gate. Mercury was not rerun; B2, selector/targeting changes, and all later-phase work were not started.
2. **Files.** This report plus `README.md`, `docs/PLAN.md`, and `docs/TESTING.md` record the final B1 result. No production code changed.
3. **Sub-agents.** A pre-live reviewer confirmed the baseline, frozen body/schema, strict URL parsing, title-only correction, attestation, no persistence/retry, no Stripe-specific targeting, and no B2 work. A post-live reviewer independently classified the result `POSITIVE CONTROL PASS`; neither edited files or used provider access.
4. **Decisions / deviations.** The request body and three-field schema stayed frozen. There was no deviation, special Stripe resolution behavior, or architecture addition.
5. **Independent review.** Pre-live review found no blocker. Post-live review confirmed one request/no retry, first-party exact grounding support, correct B1 resolution, signal-oriented raw discovery, and no new architecture need; no fix was required.
6. **Verification.** The prescribed Node checks and focused suites passed before the request (14/14 discovery, 12/12 gate, 10/10 targeting, 109/109 full suite); post-live verification is recorded below.
7. **Live/manual validation.** The complete Stripe identity, grounding, source-review, raw-discovery, latency, cost, and B1 handoff findings are recorded above. No replacement-source search occurred.
8. **Limitations / deferred work.** Two live fixtures do not prove universal resolution; future ambiguous brands may still require clarification. B2 remains unstarted, and production integration still requires B2 implementation/testing.
9. **AI failure-log candidates.** None; no new genuine AI failure occurred. The prior title-parser failure remains historical and is not duplicated.
10. **Exit status.** `B1 LIVE IDENTITY GATE PASS`; B1 targeting/resolution is approved for production integration, with no B2/later work begun.
