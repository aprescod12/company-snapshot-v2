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

The smoke harness now supplies an optional, transient sanitized diagnostic callback only for its invocation. On a future separately authorized call, it will report parsed identity fields (including missing `ambiguous` as `null`), exact per-field grounding URLs and counts, B1 confirmation state/reason, raw-result aggregates, latency, and provider-reported cost or `null`. It never persists or dumps a raw provider response, key, highlights, or unresolved candidate queue. Default production clarification remains exactly `{ state, reason }`.
