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

### Exa A3 — NVIDIA smoke preflight, architecture correction, and live result

Preflight/correction date: 2026-09-08

| Measure | Verified pre-request state |
| --- | --- |
| Endpoint / auth | `POST https://api.exa.ai/search`; `x-api-key` header (Bearer is also documented) |
| Selected mode | `auto`, Exa's recommended balanced default; `outputSchema` is documented for every Search type |
| Request shape | One non-streamed request, 10 results, minimal object `outputSchema`, strict application-side shape/count checks, `output.grounding`, no separate contents or second model |
| Structured response | `output.content` holds identity/domain/description/signals only; `output.grounding` holds field-level citations and confidence metadata |
| URL integrity | Displayed links must be exact HTTP(S) URLs from relevant `output.grounding` citations; no result-set equality assumption, normalization, rewriting, or substitution |
| Free public offering | Starter: free; $20 signup + $10 monthly credits; no payment method required; all endpoints; 10 Search QPS |
| Selected-mode list price | $0.007 per request for up to 10 results, deducted from available credits on the API-key path |
| Actual-account gate | Project owner verified Free Tier, 10 Search QPS, $20 available balance, no payment method, and no configured paid billing/automatic top-up path before the live request |
| Credential state | Key remained in ignored/untracked `.env`, was loaded only into the isolated smoke command process, and was never printed, persisted, staged, or committed |
| Local verification | Native Node syntax and focused mocked tests passed before the live request |

Pre-live review changed the untested first hypothesis from `deep-lite` to `auto`, removed source URLs from the synthesized schema, and made `output.grounding` the only displayed-link source. `contents.highlights` remains omitted because `output.content` plus `output.grounding` already supplies what this bounded smoke needs; avoiding optional content retrieval keeps the experiment smaller without relying on unnecessary content behavior. `deep-lite` remains untested and can be considered only under separate authorization after a material `auto` failure. Source support and true event distinctness remain manual inspection gates after a successful request.

Live verification date: 2026-09-08

| Measure | Observed result |
| --- | --- |
| Provider request | Exactly one `auto` Search request for `NVIDIA`; no retry or follow-up provider call |
| Free-path/account behavior | Request worked against the project-owner-verified Free Tier account without a payment method or paid billing/automatic top-up path |
| Latency / returned cost | 4,732 ms / $0.007 total |
| Results / grounding | 10 provider results; 12 grounding entries; 7 distinct grounding sources; 3 signal source mappings; grounding integrity passed |
| Identity / domain | `NVIDIA Corporation` / `nvidia.com`; correct |
| Description | Accurate, directly displayable, two sentences; passed |
| Signal 1 | 2026-06-12 (88 days): TensorRT-LLM stale AutoDeploy fallback-test removal — `SUPPORTED` by a first-party repository page, but too minor to be a useful company-level signal |
| Signal 2 | 2026-01-12 (239 days): DLSS 4.5 Super Resolution update — `SUPPORTED`, explicitly labeled `Older fallback`, but outside 180 days and backed by a weak secondary source |
| Signal 3 | 2026-09-08 (0 days): reported Hugging Face acquisition discussions — `INACCESSIBLE` and not materially supported; the generic Yahoo Finance homepage destination returned a rate-limit response, its displayed title described a company profile, and the event date was not defensible; the summary's `Older fallback` label contradicted its same-day date |
| Distinctness | Three different underlying topics; no duplicate-event failure |
| Manual gate | Failed: fewer than three useful, recent, materially supported signals |

Result: **`NO-GO`** for the tested Exa `auto + outputSchema + output.grounding` hypothesis. The free account path and provider contract worked, but the successful response did not meet the product's evidence-quality bar. The deterministic grounding check proved field mapping and URL integrity only; manual inspection correctly caught assessment-trivial evidence, stale/weak evidence, and an inaccessible generic destination that did not substantiate the displayed claim.

No raw response, result set, grounding-link collection, source-page content, credential, or transient display artifact was persisted. No representative benchmark, alternate Exa mode, `deep-lite`, Tavily, Phase B, UI, or deployment work occurred.

### Exa A4.1 — raw signal-discovery decomposition pre-live

Pre-live implementation date: 2026-09-08

| Measure | Verified pre-live state |
| --- | --- |
| Experiment question | Does raw Exa discovery contain at least three strong recent NVIDIA events that one-shot A3 synthesis failed to select? |
| Future endpoint / mode | `POST https://api.exa.ai/search`; raw `auto` Search; 10 results; non-streamed |
| Requested contents | `contents.highlights: true`; no summary or full text |
| Synthesis exclusions | No `outputSchema`, synthesis `systemPrompt`, final description/signals, ranking layer, or second model |
| Retrieval exclusions | No `startPublishedDate`, other date filter, category, `additionalQueries`, forced livecrawl, or alternate Search mode |
| Query integrity | Includes `NVIDIA`, current-date context, significant company-level categories, preferred source quality, and exclusions for routine code maintenance/profiles/stock commentary/evergreen/duplicates; seeds no expected event |
| Candidate display | Rank, escaped title, exact HTTP(S) URL, provider date or `unknown`, optional author, and escaped returned highlights; transient localhost only with no-store/no-cache headers |
| Date semantics | Provider `publishedDate` is estimated discovery metadata only; future manual source inspection must establish supported event dates |
| Aggregate diagnostics | Endpoint, type, body-inclusive latency, result/date/highlight/domain counts, and provider-returned total cost only |
| Safety | One fetch maximum, no retry/polling, minimized/redacted errors, no candidate console logging, no filesystem persistence |
| Provider requests | A4.1: 0; cumulative Exa: 1 |

Future outcome definitions:

- **`DISCOVERY SUFFICIENT`** — at least three distinct, useful, materially supported NVIDIA company-level events within 180 days; record the subset within 90 days.
- **`DISCOVERY INSUFFICIENT`** — inspectable raw results contain fewer than three qualifying distinct events within 180 days.
- **`BLOCKED`** — request contract, credential/environment, network, or response shape prevents meaningful inspection.

No raw candidate set or new source page has been observed. The A3 final-snapshot hypothesis remains `NO-GO`; `deep-lite` remains untested; no benchmark or production architecture is authorized.

## Phase B
_Not yet run._

## Phase C
_Not yet run._

## Phase D / production
_Not yet run._

## Final skeptical review
_Not yet run._
