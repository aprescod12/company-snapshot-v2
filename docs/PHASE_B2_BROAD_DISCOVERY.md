# Phase B2 — Production Broad Discovery

Date: 2026-09-09

## Authorized contract

B2 implements only this bounded production path:

```text
prepared B1 target
→ one broad Exa Search
→ grounded identity confirmation
→ normalized raw candidates
→ lightweight prioritization/deduplication
→ ordered verification queue
→ stop
```

`src/discovery/exaBroadDiscovery.mjs` owns the small production Exa contract. It duplicates the proven A4.1/B1 request shape rather than importing historical `scripts/` code: a signal-oriented query, `type: "auto"`, ten results, highlights, the exact three-field identity schema, and `stream: false`. It has no retry, polling, fallback, persistence, or second Search path. `src/discovery/discoverCompany.mjs` prepares the B1 target, makes that one request, passes exact field-specific provider grounding through B1 identity confirmation, and only calls the selector after identity resolves.

The selector now exposes its complete ordered valid representative queue as `prioritized`; the existing `selected` output remains exactly `prioritized.slice(0, 3)`. Ranking, recency, source, and light-dedup rules were not changed. Nullable provider titles remain parseable but remain ineligible under the existing selector rules.

No source verification, final-signal selection, official-domain fallback, description generation, endpoint, UI, deployment, B3, or later work was implemented.

## Verification before provider access

Syntax checks passed for the two production discovery modules, the modified selector, and the B2 smoke harness. Focused B2 tests passed (38 total across broad-discovery, production orchestration, smoke, and selector suites); targeting, Phase A discovery, and B1 gate compatibility suites passed. The complete `node --test test/*.test.mjs` suite passed 123/123, and `git diff --check` passed. Independent pre-live review found two correctable contract issues: unambiguous identity needed field-specific grounding for both schema fields, and the permitted missing-ambiguity case needed to quarantine as clarification. Both were fixed and regression-tested before provider access.

`.env` was confirmed ignored, untracked, and unstaged without reading or printing it. The Free Starter attestation was supplied to the bounded smoke harness.

## Live validation and stop

Starting cumulative Exa count was 10. The only authorized B2 provider call was:

| Input | Requests | Retries | Result | Queue / aggregates | Latency / cost |
| --- | ---: | ---: | --- | --- | --- |
| `Stripe` | 1 | 0 | `clarification_needed`: `insufficient_identity_evidence` | Not exposed because B1 identity did not resolve; raw, prioritized, selected, dated, highlight, and domain aggregates are therefore unavailable | Not exposed by the safe clarification contract |

The required name-case positive gate did not pass: the returned production state did not resolve Stripe/`stripe.com` and did not produce a verification queue. The hard stop was applied. `stripe.com` was not requested, no exact grounding page was opened because the safe clarification result did not expose or retain grounding for review, and no raw candidates were retained, dumped, source-verified, or used. No provider root cause is inferred from this deliberately quarantined result; no patch or retry is authorized.

The B2 request count is 1; cumulative Exa count is 11. The maximum remains 12, but the unused second request is not authorization to continue.

## Independent review and decision

Independent pre-live review confirmed production does not import `scripts/`, request parity and the exact schema are preserved, an invocation has one request with no retries, ambiguity cannot leak a queue, domain anchoring is retained, grounding is exact, nullable titles are safe, and selector behavior remains unchanged. The post-live review classified the result **`B2 LIVE VALIDATION FAIL — SAFE CLARIFICATION`**: the safe quarantine and no-domain-request hard stop passed, but the required Stripe name positive gate failed. It is not `B2 PARTIAL / REASSESS`, which applies only when the name passes and the domain case fails.

## Decision and limitations

**`B2 FAIL`**. The implementation and automated verification are retained, but B2 production broad discovery is not approved because its only authorized name live case safely clarified instead of resolving a queue. Raw discovery candidates are not verified signals; provider dates remain discovery metadata; selector priority is not final evidence approval; no one-shot result proves universal provider behavior. Source verification/backfill belongs to B3 only if separately authorized; endpoint, description, UI, and deployment also remain later work.

## B2R0 — zero-provider-call diagnostic audit

The later B2R0 audit made **0** provider requests; cumulative Exa experimental requests remain **11**. With a fixed target/date, the B2 request builder structurally equals the B1 positive-control builder: identical query, `auto`, ten results, highlights, exact three-field schema, `stream: false`, no provider-visible extras, and one-call/no-retry behavior. Complete structured identity parsing, field-specific exact HTTP(S) grounding extraction, combined B1 evidence handoff, B1 name/domain corroboration, nullable-title handling, and selector behavior also match the proven path.

One deliberate B2 safety-policy difference remains: a response missing only `ambiguous` is normalized as `ambiguous: undefined` and B1 returns `clarification_needed` / `insufficient_identity_evidence`; B1's historical diagnostic parser format-fails that malformed schema. This safe B2 quarantine was explicitly required in the original B2 contract. It could explain the prior terse live result, but the response was deliberately not retained, so the audit cannot establish that it occurred or identify another provider cause. B2R0 therefore concludes **`AUDIT INCONCLUSIVE`**, not provider variability proven and not a B2 production approval.

The smoke harness now calls the explicit smoke-only discovery path, which shares the one production execution but returns a transient sanitized diagnostic summary only to that harness. On a future separately authorized call, it will report parsed identity fields (including missing `ambiguous` as `null`), exact per-field grounding URLs and counts, B1 confirmation state/reason, raw-result aggregates, latency, and provider-reported cost or `null`. It never persists or dumps a raw provider response, key, highlights, or unresolved candidate queue. The production-facing `discoverCompany()` API has no diagnostic observer and its clarification remains exactly `{ state, reason }`.

## B2R1 — single Stripe-name diagnostic rerun

The separately authorized B2R1 rerun made exactly one Stripe-name Exa request and zero retries. The sanitized response was:

| Measure | Observed result |
| --- | --- |
| B2 decision | `clarification_needed` / `insufficient_identity_evidence` |
| Resolved company name | `Stripe, Inc.` |
| Official domain | `stripe.com` |
| Ambiguous | `true` |
| Resolved-name grounding count | 3 |
| Resolved-name grounding URLs | `https://stripe.com/newsroom/news/stripe-helps-meta-muse-shop-with-link`; `https://www.rte.ie/news/business/2026/0909/1590856-bank-of-ireland-grows-partnership-deal-with-stripe/`; `https://onlinestorenews.com/stripes-optimized-checkout-suite-is-reshaping-how-merchants-think-about-payment-stacks-in-2026/` |
| Official-domain grounding count | 5 |
| Official-domain grounding URLs | `https://stripe.com/newsroom/news/stripe-helps-meta-muse-shop-with-link`; `https://www.rte.ie/news/business/2026/0909/1590856-bank-of-ireland-grows-partnership-deal-with-stripe/`; `https://onlinestorenews.com/stripes-new-stablecoin-settlement-is-rewriting-cross-border-checkout/`; `https://stripe.com/blog/reduce-fx-costs-with-stripe`; `https://onlinestorenews.com/stripes-optimized-checkout-suite-is-reshaping-how-merchants-think-about-payment-stacks-in-2026/` |
| B1 decision | `clarification_needed` / `insufficient_identity_evidence` |
| Discovery aggregates | 10 raw results; 9 dated; 10 highlight-bearing; 5 unique domains |
| Latency / returned cost | 3,638 ms / $0.007 |
| Queue counts | Not applicable because identity did not resolve |

The classification is **`B2R1 REPEAT SAFE FAILURE — CAUSE OBSERVED`**. The immediate cause is the provider-returned `ambiguous: true`: identity fields and their field-specific grounding were present, but B1 correctly refused to resolve an explicitly ambiguous result. This does not prove deterministic integration success, approve B2, or decide whether occasional safe clarification is acceptable production UX.

Starting cumulative Exa requests were 11; B2R1 used 1 request with 0 retries; ending cumulative requests are 12. After the response, provider activity stopped. No `stripe.com` request, other company, official-domain fallback, source verification, code patch, B3, or later work occurred. No raw provider JSON, full highlights, credentials, or temporary response dump was persisted.

## B2R2 — narrow deterministic ambiguity correction

B2R2 made **0 provider requests**. It changes only the existing B1 identity boundary and its existing parsed-evidence handoff; no Exa request body, schema, selector, retry behavior, fallback, source verification, endpoint, UI, or B3 code changed.

For a name target with `ambiguous: false`, the previous behavior is unchanged: B1 uses the existing compatible-name rule, including its established conservative prefix allowance, and requires combined evidence to corroborate the proposed official domain. Missing or undefined ambiguity still returns `clarification_needed`.

For `ambiguous: true`, B1 now accepts only this strict same-entity exception:

1. submitted and resolved names are equal after the existing conservative normalization and legal-suffix removal;
2. the proposed official domain is valid under the existing hostname rules;
3. `resolvedCompanyName` and `officialDomain` each have their own grounding array; and
4. each array contains an exact HTTP(S) root/subdomain URL corroborating that proposed domain, with no contradiction flag.

This path never uses the existing prefix rule. It has no aliases, fuzzy matching, scoring, provider-specific branch, or company-specific behavior. Domain-input anchoring is unchanged.

The local B2R1 fixture (`Stripe` → `Stripe, Inc.` / `stripe.com` / `ambiguous: true` with field-specific `stripe.com` grounding) now resolves. The historical Mercury response (`Mercury` → `Mercury (Fintech) and Mercury Systems (Aerospace/Defense)` / `mercury.com` / `ambiguous: true`) remains clarification-needed because the normalized names are not equal. Additional regressions prove safe clarification for loose prefix-only matches, missing either field grounding, non-corroborating/contradictory domain evidence, and missing ambiguity.

Zero-network verification passed: syntax checks; 42/42 focused B1/B2 tests; and the complete `node --test test/*.test.mjs` suite at 130/130. An independent reviewer found no safety defect, provider access, hardcoding, abstraction creep, or domain-anchor regression. It caught two fixture-coverage gaps—an outdated Mercury input selection and missing strict-path contradictory-domain coverage—which were fixed before the final run.

B2R2 does not approve B2 or authorize another live request. Cumulative Exa experimental requests remain **12**. B3 and all later work remain unstarted.

## B2R2.1 — strict legal-suffix ambiguity exception

B2R2.1 made **0 provider requests**. It replaces B2R2's overly broad normalized-name equality rule for `ambiguous: true` with a strict legal-suffix expansion: submitted tokens must be an exact prefix of resolved tokens, the resolved value must add at least one token, and every added trailing token must be one of the existing ordinary legal suffixes. No suffix-looking token is removed from the submitted name or from an internal resolved-name position.

Thus `Stripe` → `Stripe, Inc.` resolves with the existing valid field-specific `stripe.com` grounding, while `Mercury` → `Mercury`, `Stripe` → `Stripe Payments, Inc.`, and the historical combined Mercury response clarify. The existing `ambiguous: false` compatibility/prefix behavior, missing-ambiguity clarification, field-specific grounding/domain requirements, contradiction check, and domain-input anchoring are unchanged.

Syntax checks, focused B1/B2 tests (40/40), and the full zero-network suite (131/131) passed. No provider access, query/schema change, retry, selector change, fallback, B3, or later work occurred. B2 remains unapproved; cumulative Exa experimental requests remain **12**.

## B2R3 — corrected production broad-discovery live gate

The required preflight passed: `main`, `HEAD`, and `origin/main` were all `635ba5214e5e485219801880dfc811867726ad8d`; the tree was clean; and `.env` was ignored, untracked, and unstaged without its contents being inspected. Static inspection confirmed that the smoke harness imports `discoverCompanyForSmoke` and invokes it once, while the underlying B2 path has one `fetch` and no retry, polling, provider loop, fallback, or source-page request.

The authorized Stripe-name command was then invoked once with the required Free Starter attestation. It stopped locally before any provider access with the sanitized error `EXA_API_KEY is not set.` No HTTP request reached Exa, so there is no provider identity, grounding, aggregate, queue, latency, cost, or candidate-review observation to record. The required conditional domain request was not authorized because the name case did not reach `ready_for_verification`, and it was not run.

The operational status is **`B2R3 PRE-FLIGHT BLOCKED — CREDENTIAL/ENVIRONMENT UNAVAILABLE`**. The required classification is **`B2R3 NAME GATE FAIL`**. This is specifically a pre-provider execution blocker, not evidence about Exa, B1 identity resolution, or B2 discovery behavior. Starting cumulative Exa requests were 12; Stripe-name Exa requests were 0; Stripe-domain Exa requests were 0; retries were 0; and ending cumulative Exa requests remain **12**. No alternate key-loading route, retry, provider request, source verification, fallback, production/test-code patch, B3, endpoint, UI, deployment, or later work occurred. No raw response, highlights, credential, authorization header, or temporary provider artifact was created or persisted. B2 remains pending project-owner review.
