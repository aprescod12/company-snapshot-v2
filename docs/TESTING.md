# Company Snapshot V2 — Testing & Verification

## Status

This document has two purposes:

1. define the approved V2 viability benchmark before architecture commitment;
2. become the factual record of verification actually performed later.

**Do not mark a test as passed unless it was actually run and inspected.**

---

# 1. Phase A representative benchmark

Separate ordinary active companies from edge cases so intentional ambiguity/sparsity does not distort the main coverage metric.

Run this cohort only after the NVIDIA A1 smoke test establishes model access, an unbilled/free-path request, actual Google Search execution, usable grounding/citation metadata, direct assessment-style output, and a workable temporary display of the Grounded Result with its associated Search Suggestions. A hard A1 failure stops Gemini immediately.

## Ordinary cohort

| Input | Purpose |
| --- | --- |
| `NVIDIA` | large public company; company-name input |
| `Stripe` | private technology company |
| `PostHog` | smaller technology company |
| `Canva` | second private active company; reduces V1-specific bias |
| `notion.so` | domain-input behavior |

## Edge cohort

| Input | Purpose |
| --- | --- |
| `Mercury` | ambiguous name / entity-resolution risk |
| `Craigslist` | limited recent corporate activity |

Why Mercury matters: V1 encountered an apparent Mercury result that actually belonged to unrelated `shipmercury.com`. V2 must not regress into silent entity mismatch.

---

# 2. What to record for every run

| Measure | Required observation |
| --- | --- |
| Input | exact submitted name/domain |
| Intended company | human reference target |
| Resolved company | provider/application result |
| Official domain | independently/defensibly identified domain |
| Resolution correct? | yes/no/ambiguous |
| Candidate events found | `N/A` for Gemini unless genuinely provider-exposed |
| Final signals | 0–3 |
| Signal dates | dates or explicit unknown |
| Distinct events? | yes/no |
| Search queries | count when directly exposed |
| Citations/sources | count when directly exposed |
| Sources support claims? | manually checked yes/no per signal |
| Source provenance | tied to actual provider/search result? |
| Recency | ≤90d / ≤180d / older fallback / unknown |
| Latency | end-to-end milliseconds/seconds |
| Failure classification | if applicable |
| Notes | blocked pages, ambiguity, duplicates, weak evidence, provider issue |

For Gemini, source links may be clicked/opened manually from the transient provider-rendered result during the benchmark, but the persistent record must not contain Google's returned URLs or link collections. Do not programmatically crawl or dereference the links. Do not persist complete Grounded Results, Search Suggestions HTML, citation-URL datasets, provider-returned link collections, or raw API-response dumps. Persist only the evaluation findings above.

The primary Gemini experiment evaluates the Grounded Result itself. Gemini must directly produce the company identity, 2–3 sentence description, and exactly three concise recent signals. No second model call, extraction-to-synthesis architecture, or arbitrary rewrite is allowed.

---

# 3. Phase A hard GO criteria

A provider earns production only when all applicable hard gates pass.

## 3.1 Free-path gate
- Actual account/key can execute the required workflow without paid API usage or paid keys.
- Do not attach billing merely to make the candidate pass.
- Record relevant quota/rate-limit behavior observed.

For Gemini specifically:
- verify `gemini-2.5-flash` access;
- verify Google Search grounding executes;
- verify the required Grounded Result/Search Suggestions presentation can be implemented consistently with current provider terms;
- use the smallest temporary local display diagnostic needed to render the full Grounded Result with `google_search_result.result[].search_suggestions` as returned, require matched successful Search call/result steps with at least one non-empty query overall, tolerate additional empty string queries, and require valid inline `url_citation` URLs and byte spans while treating citation titles as optional;
- verify the direct result is close enough to the assessment layout without a second model call or prohibited transformation.

For Exa specifically:
- verify current free/no-payment eligibility against the actual account before benchmark calls;
- verify the free allowance is sufficient for benchmark + reviewer usage.

## 3.2 Clear-company resolution
**5/5 ordinary cases** must resolve to the intended company.

A wrong clear-company resolution is a hard failure.

## 3.3 Ordinary-company coverage
At least **4/5 ordinary cases** must return a usable result with:
- 2–3 sentence company description;
- exactly three useful recent signals;
- sources.

## 3.4 Source integrity
- Zero fabricated displayed URLs.
- Every displayed URL must originate from actual provider/search/grounding output.

## 3.5 Manual grounding
For every signal in every successful benchmark snapshot:
- open the linked source;
- confirm it materially supports the claim;
- record failures rather than rationalizing them.

## 3.6 Distinctness
- Exactly three separate events/signals.
- Multiple articles about one underlying event count as one signal.

## 3.7 Ambiguity safety
`Mercury` must:
- resolve with defensible identity evidence; **or**
- return clarification/ambiguity.

It must not silently choose an unrelated company.

## 3.8 Sparse-company honesty
`Craigslist` does not need to fabricate three signals to pass.

Acceptable:
- three legitimate signals if they genuinely exist; or
- an honest limited-evidence result.

Unacceptable:
- evergreen pages disguised as current events;
- unrelated entity results;
- duplicated events;
- invented activity.

## 3.9 Performance
Target:
- median ordinary-company end-to-end latency ≤20 seconds;
- no normal case routinely exceeds ~45 seconds.

Performance is a usability gate, not a reason to weaken grounding.

## 3.10 Repeatability sanity check

Only if the representative Gemini benchmark otherwise passes, rerun:

- NVIDIA; and
- Stripe or PostHog.

Check provider availability, resolution, three-signal coverage, obvious citation/source integrity, major output-shape instability, and latency. This is not a new formal coverage threshold, but material repeatability failure affects the `GO` recommendation.

---

# 4. Immediate NO-GO triggers

Reject or stop the candidate if any of these is material/systemic:

- required workflow needs paid usage;
- model/tool unavailable to the actual account;
- clear companies resolve incorrectly;
- ordinary coverage is below 4/5;
- accepted URLs are fabricated or cannot be tied to provider results;
- source pages materially fail to support claims;
- duplicate events repeatedly survive;
- provider output cannot be rendered legally/contractually within the required product;
- response shape is too unstable for a small reliable parser;
- provider availability/rate limits make review-call reliability implausible.

If one isolated formatting defect occurs, diagnose it.

If a failure pattern is systemic, reject the architecture rather than building a large corrective framework.

---

# 5. Failure classifications

Use concise factual categories where helpful:

- `provider_auth`
- `provider_unavailable`
- `provider_quota`
- `provider_paid_required`
- `provider_terms_mismatch`
- `model_unavailable`
- `search_not_executed`
- `citation_missing`
- `targeting`
- `ambiguous`
- `description`
- `signal_count`
- `signal_recency`
- `signal_duplication`
- `source_support`
- `source_quality`
- `formatting`
- `latency`
- `unknown`

Do not turn classification into another complex state machine.

---

# 6. Later production test matrix

Before submission, test at least:

- large public company;
- private technology company;
- smaller company;
- company-name input;
- domain input;
- ambiguous name;
- malformed/empty input;
- limited recent activity;
- provider/source weakness or blocked source behavior;
- duplicate coverage of one event;
- at least one fresh company tested only after deployment.

For each, check:
- resolution;
- description accuracy;
- factual accuracy;
- recency;
- signal diversity/distinctness;
- source validity/support;
- response time;
- loading behavior;
- error/limited-evidence behavior.

---

# 7. Production verification checklist

After deployment:

- [ ] live URL loads
- [ ] environment variables are configured
- [ ] no secret is exposed client-side
- [ ] actual provider calls work from production
- [ ] a fresh company succeeds through the deployed app
- [ ] domain input works in production
- [ ] source links open to the intended pages
- [ ] loading state appears during real work
- [ ] limited-evidence state is honest
- [ ] error state is usable
- [ ] mobile/responsive layout is readable
- [ ] no mock/hardcoded company facts exist in production
- [ ] no paid provider dependency was introduced

---

# 8. Verification record

Populate this section only with work actually performed.

## Phase A

### Gemini A1 — NVIDIA smoke

Verification date: 2026-09-08

| Measure | Observed result |
| --- | --- |
| Input | `NVIDIA` |
| Intended company | NVIDIA Corporation |
| Provider request | Exactly one request made; provider returned `model_unavailable` before grounded output |
| Model access | Failed; provider reported `gemini-2.5-flash` is no longer available to new users |
| Resolved company / official domain | Not observed |
| Resolution correct? | Not evaluated |
| Candidate events | `N/A` |
| Final signals / dates / recency / distinctness | Not observed |
| Search queries / citations / sources | Not observed |
| Source provenance / manual support | Not evaluated; no provider links were returned |
| Latency | Approximately 5.0 seconds command wall time; provider latency metric was not emitted on the HTTP error path |
| Failure classification | `model_unavailable` |
| Free-path/account behavior | The unbilled request reached the API without a paid-access error, but the required workflow could not execute because the approved model was unavailable |
| Terms/display diagnostic | Not reached; no Grounded Result or Search Suggestions were returned |

Result: **`NO-GO`** for the approved `gemini-2.5-flash` hypothesis. After the initial credential blocker was resolved, the one authorized request produced a model-specific unavailability error rather than an authentication, quota, or paid-access error. Because model access is an A1 hard gate, the smoke stopped without a retry or model substitution. The provider's suggestion to use a different model was not acted on because that would change the approved hypothesis and require a second request.

Per the hard-stop rule, the ordinary cohort, edge cohort, manual source inspections, and repeatability checks were not run. No raw provider response, Grounded Result, Search Suggestions HTML, provider-returned link collection, citation URL, or temporary display artifact was created or persisted. Exa and all later-phase work were not started.

## Phase B
_Not yet run._

## Phase C
_Not yet run._

## Phase D / production
_Not yet run._

## Final skeptical review
_Not yet run._
