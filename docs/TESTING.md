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

### Exa A4.1 — raw signal-discovery decomposition

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
| Provider requests | Before live execution: A4.1: 0; cumulative Exa: 1 |

Future outcome definitions:

- **`DISCOVERY SUFFICIENT`** — at least three distinct, useful, materially supported NVIDIA company-level events within 180 days; record the subset within 90 days.
- **`DISCOVERY INSUFFICIENT`** — inspectable raw results contain fewer than three qualifying distinct events within 180 days.
- **`BLOCKED`** — request contract, credential/environment, network, or response shape prevents meaningful inspection.

Live verification date: 2026-09-08

| Measure | Observed result |
| --- | --- |
| Provider request | Exactly one raw `auto` Search request for NVIDIA; no retry or follow-up provider call |
| Account path | Previously verified Free Tier account with available free credits, no payment method, and no paid billing/automatic top-up path |
| Latency / returned cost | 4,065 ms / $0.007 total |
| Aggregate raw set | 10 results; 8 dated results; 10 highlight-bearing results; 8 unique domains |
| Manual inspection | All 10 cards inspected; 10 event-bearing candidates classified; exact returned destinations opened only as needed; no replacement-source search |
| Qualifying events | 3 distinct events within 180 days |
| Recency | 3 within `≤90d`; 0 within `91–180d` |
| Qualifying ranks | 1: Hugging Face acquisition agreement — `FIRST_PARTY`, `SUPPORTED`; 3: IFA PAIR/RTX Spark launch — `FIRST_PARTY`, `SUPPORTED`; 4: MediaTek partnership/investment — `FIRST_PARTY`, `SUPPORTED` |
| Duplicate clusters | Hugging Face acquisition at ranks 1/2/8; PAIR/RTX Spark at ranks 3/6; Q2/outlook overlap at ranks 9/10 did not qualify |
| Other candidates | Rank 5 was a material first-party AWS item but inaccessible; ranks 7 and 9 were partial, weak-secondary/SEO-style repackaging; rank 10 was weak-secondary and inaccessible |
| Inaccessible exact destinations | Ranks 2, 5, and 10 returned HTTP 403 during authorized direct retrieval |
| Request totals | A4.1: 1; cumulative Exa: 2 |

Result: **`DISCOVERY SUFFICIENT`**. A4.1 demonstrated that a dedicated signal-oriented raw-discovery query can retrieve enough strong recent candidates for NVIDIA, supporting a decomposed discovery → selection direction. Because the A4.1 query differed from A3's final-snapshot query, the experiment does not isolate whether A3 failed solely in downstream selection versus retrieval-query formulation. The A3 final-snapshot hypothesis remains `NO-GO`. This result does not authorize or freeze a selection/ranking architecture.

No raw response, full result set, highlight collection, source-page content, credential, or transient display artifact was persisted. `deep-lite`, another company, the representative benchmark, Tavily, Gemini, Groq, Phase B, UI, and deployment were not started.

### Exa A4.2 — lightweight signal selector pre-live

Implementation date: 2026-09-08

| Measure | Verified pre-live state |
| --- | --- |
| Input/output | Generic raw-candidate input; at most three selected candidates plus per-input deterministic diagnostics |
| Structural validity | Rejects only invalid positive-integer rank, empty title, or non-exact/non-HTTP(S) URL |
| Recency | `RECENT` ≤90d; `FALLBACK` 91–180d; `UNKNOWN` absent/malformed/future; `OLD` >180d; unknown/old remain eligible |
| Provider-date validation | Accepts only calendar-valid `YYYY-MM-DD` or a bounded timezone-explicit ISO date-time; repository Exa fixtures use UTC `.sssZ`; impossible dates, invalid offsets, and trailing garbage are rejected before recency ordering |
| Provenance | Parsed hostname equals official domain or is a true subdomain → `FIRST_PARTY`; all else → `OTHER` |
| Duplicate title rule | After simple plural and silent-e past-tense normalization, ≥3 shared distinctive tokens, overlap coefficient ≥0.72, and Jaccard ≥0.70; short near-identical title rule is separately bounded |
| Sparse-title fallback | Only opaque/metadata-like titles may add the first 48 highlight tokens; requires ≥4 shared tokens, overlap ≥0.68, and Jaccard ≥0.32 |
| Cluster representative | Same lexicographic preference as selection: recency, first-party status, original Exa rank |
| Selection | First three unique representatives; returns fewer honestly if fewer remain |
| Determinism/safety | Stable tie-breaking, copied candidate/highlight values, no mutation, provider/network/filesystem/persistence path, or company-specific logic |
| Toolchain | No `package.json`, TypeScript configuration, or `npm run typecheck`; native Node ESM/JSDoc used without a new dependency |
| Provider activity | A4.2 Exa requests: 0; cumulative Exa requests: 2; no live candidate set or source page observed |
| Local verification | Selector/test syntax checks passed; focused selector tests 24/24; full suite 65/65; `git diff --check` passed |

Focused synthetic tests cover exact recency boundaries; malformed/future dates; impossible calendar dates; trailing garbage; leap-year behavior; valid repository-observed timestamps; positive, negative, and invalid timezone offsets; unknown-date eligibility; root/subdomain/deceptive-domain behavior; obvious, morphological, and metadata-title duplicates; same-template headlines with different counterpart organizations or locations; distinct related events; generic-language safety; representative selection; ordering; exact/insufficient counts; diagnostics; stability; immutability; and static absence of provider/network/persistence/company-specific selector logic.

Pre-live independent review found that the original selector used permissive `Date.parse` behavior despite the documented malformed-date contract. Local reproduction classified `2026-02-30` as `OLD` and `2026-09-08junk` as `FALLBACK`. The parser was corrected and both values now classify as `UNKNOWN`; no provider request was made during review or correction.

Result: **`A4.2 PRE-LIVE READY`**. This is local selector viability only. NVIDIA behavior, source support, factual event dates, live variability, and representative-company coverage remain untested. No source verification, synthesis, `deep-lite`, benchmark, Tavily, Phase B, UI, or deployment work occurred.

### Exa A4.2 — NVIDIA live selector smoke

Live verification date: 2026-09-08

| Measure | Observed result |
| --- | --- |
| Baseline | `8abd43110dbd968b35f95245f3c504f2064db145` |
| Request contract | Exact A4.1 NVIDIA request: `POST /search`, `auto`, 10 results, `contents.highlights: true`; no schema, synthesis, date filter, alternate query/mode/provider, or second model |
| Request / retries | 1 / 0 |
| Latency / returned cost | 1,839 ms / $0.007 total |
| Aggregate raw set | 10 results; 8 dated; 10 highlight-bearing; 9 unique domains |
| Selector result | Exactly 3: ranks `1,3,5` |
| Selector metadata | Rank 1 `RECENT/FIRST_PARTY`; rank 3 `RECENT/FIRST_PARTY`; rank 5 `RECENT/FIRST_PARTY`; no selector duplicate clusters |
| Pre-live verification | Six syntax checks passed; discovery 13/13; selector 24/24; smoke harness 5/5; full suite 70/70; `git diff --check` passed |
| Post-live verification | Same syntax, focused, full-suite, and diff checks passed without a provider request |
| Request totals | A3: 1; A4.1: 1; A4.2: 1; cumulative Exa: 3 |

All ten exact returned destinations were reviewed without substitute-source search. Manual classifications were:

| Rank | Human result | Event group / disposition |
| --- | --- | --- |
| 1 | `SUPPORTED`, material first-party event dated 2026-09-03 | Hugging Face acquisition; qualifies; selected |
| 2 | `SUPPORTED` SEC filing dated 2026-09-02 | Hugging Face acquisition; duplicate of rank 1 |
| 3 | `SUPPORTED`, material first-party event dated 2026-09-03 | PAIR / RTX Spark; qualifies; selected |
| 4 | `SUPPORTED`, material first-party event dated 2026-08-26 | AWS expansion; qualifies; unselected |
| 5 | `SUPPORTED`, material first-party event dated 2026-08-31 | MediaTek partnership/investment; qualifies; selected |
| 6 | `SUPPORTED` secondary coverage dated 2026-09-07 | PAIR / RTX Spark; weaker duplicate of rank 3 |
| 7 | `PARTIAL` paywalled excerpt dated 2026-09-08 | Acquisition-related antitrust analysis, not a separately established regulatory event; reject |
| 8 | `PARTIAL` derivative/repackaged page dated 2026-09-08 | Groq deployment; reject |
| 9 | `PARTIAL` weak mixed-topic derivative page dated 2026-09-08 | AGI / Q2; reject |
| 10 | `SUPPORTED` material secondary page dated 2026-07-28 | Amkor packaging partnership; qualifies; unselected |

Five distinct events qualified at ranks `1,3,4,5,10`; all were within 90 days. Rank 4's captured provider date was absent, so the selector classified it `UNKNOWN/FIRST_PARTY`; rank 5 was `RECENT/FIRST_PARTY`. The frozen recency-first comparator therefore placed rank 5 ahead of rank 4 before original Exa rank was considered. Rank 4 remained structurally valid and distinct. Its August 26 page date was learned only during manual review and is intentionally outside the selector's source-blind input contract.

Independent post-live review agreed that ranks `1,3,5` were correct-entity, real, material, supported by their exact first-party destinations, within 90 days, and distinct. It also confirmed that rank 4 was not obviously stronger than rank 5 and that rank 10 appropriately lost on source class. The reviewer identified one non-blocking limitation: human duplicate groups `1/2` and `3/6` received no selector cluster IDs. That did not change this selected set because the lower-priority duplicate pages were not selected.

Result: **`SELECTOR PASS`**. This is one-company evidence only. Representative-company coverage, semantic duplicate recall, source-verification architecture, synthesis, the endpoint, frontend, deployment, and production architecture remain untested. No additional provider request was made during post-live review or verification, and representative testing did not begin.

### Exa A4.3 — representative signal-pipeline benchmark

Implementation and live verification date: 2026-09-08

| Measure | Contract and observed result |
| --- | --- |
| Baseline | `9d9cdc850de8b21b85ae1733ee2ea516664c1885` on `main`, matching `origin/main`; clean worktree/index before changes or provider access |
| Ordinary cohort | NVIDIA, Stripe, PostHog, Canva, `notion.so`; NVIDIA's completed A4.2 `SELECTOR PASS` reused without a request |
| New-case order | Stripe → PostHog → Canva → `notion.so`; human-approved domains used only as evaluation fixtures |
| Request contract | Exact A4.1 `POST /search`, generic signal query, `auto`, 10 results, highlights enabled; only the exact company input changes |
| Harness boundary | One case per invocation; one `requestCandidates()` call; direct in-memory `selectSignals()` handoff; compact metadata only; no retry, persistence, batch/parallel path, direct source fetch, second model, or disallowed company |
| Coverage gate | At least 4/5 cohort passes including reused NVIDIA; `SELECTOR FAIL` and `DISCOVERY INSUFFICIENT` count as signal-path failures; any `BLOCKED` stops for review |
| Early-stop gate | Stop after two new failures/insufficiencies because maximum possible coverage becomes 3/5 |
| Pre-live checks | Five syntax checks passed; discovery 13/13; selector 24/24; A4.2 harness 5/5; A4.3 harness 6/6; focused total 48/48; full suite 76/76; `git diff --check` passed |
| Requests | Stripe 1, PostHog 1, Canva 0, `notion.so` 0, NVIDIA 0; A4.3 total 2; retries 0; cumulative Exa total 5 |

Actual live results:

| Company | Raw-set and selector result | Manual qualifying count | Outcome |
| --- | --- | --- | --- |
| NVIDIA | Reused A4.2 result; selected `1,3,5`; no A4.3 request | 5 qualifying distinct events, all ≤90 days | `SELECTOR PASS` |
| Stripe | 2,314 ms; $0.007; 10 raw, 10 dated, 10 highlighted, 4 domains; selected `2,1,4`; no selector clusters | 2 total: rank 2 ≤90 days and rank 3 in 91–180-day fallback | `DISCOVERY INSUFFICIENT` |
| PostHog | 2,769 ms; $0.007; 10 raw, 7 dated, 10 highlighted, 6 domains; selected `3,2,7`; no selector clusters | 2 total: ranks 2 and 3, both ≤90 days | `DISCOVERY INSUFFICIENT` |
| Canva | Not run after mathematical-failure stop | Not evaluated | Not evaluated |
| notion.so | Not run after mathematical-failure stop | Not evaluated | Not evaluated |

All returned Stripe and PostHog candidates were inspected at their exact destinations without replacement-source search. Complete per-rank entity, event, materiality, accessibility, support, destination-date, duplicate-group, and qualification classifications are recorded in `docs/PHASE_A_SIGNAL_BENCHMARK.md`.

Human review grouped Stripe ranks `4/5/8` as checkout-optimization overlap and PostHog ranks `1/5` as aggregate product-update overlap; the selector assigned no clusters in either set. No missed group placed multiple duplicate members in a selected three, so the misses were nonconsequential for these captures. Independent per-company and final reviews agreed with the classifications, duplicate findings, insufficiency labels, coverage arithmetic, and early stop.

Result: **`A4.3 SIGNAL BENCHMARK FAIL`**. There was 1 confirmed pass among 3 evaluated companies and 1 confirmed pass across the fixed 5-company cohort. After two new insufficiencies, the maximum achievable coverage was **3/5**, below the required **4/5**, so stopping before Canva and `notion.so` was mandatory. This is evidence against representative coverage for the fixed discovery → selector signal path; it is not evidence of a selector failure, company-resolution behavior, description quality, edge behavior, production source verification, endpoint/UI readiness, deployment readiness, or full provider/product GO.

### Exa A4.3R1 — bounded retrieval repair spike

Implementation and live verification date: 2026-09-09

| Measure | Contract and observed result |
| --- | --- |
| Baseline | `176a9e6b94e7bd31123a5cdf9c3306eae553d8fc` on `main`, matching `origin/main`; clean worktree/index before changes or provider access |
| Objective | Test whether one fixed generic source-quality/novelty instruction can make the previously insufficient raw set contain ≥3 qualifying distinct ≤180-day events |
| One-variable change | Exact top-level `systemPrompt`: `Prefer first-party company announcements and reputable independent reporting. Return distinct company-level events. Avoid SEO/affiliate pages, generic roundups, evergreen content, rumors, and duplicate coverage.` |
| Preserved request/selection contract | A4.1 `POST /search`, generic signal query, `auto`, 10 results, highlights enabled, no filters/schema/category/domains/second model/synthesis/retry; direct unchanged A4.2 selector handoff |
| Order and stop rule | Stripe first; PostHog only after Stripe raw sufficiency; stop immediately on fewer than 3 Stripe events |
| Pre-live checks | Syntax checks passed; discovery/selector/repair focused tests 42/42; full suite 81/81; `git diff --check` passed; independent contract review found no blocker |
| Requests | Stripe 1, PostHog 0; A4.3R1 total 1; retries 0; cumulative Exa total 6 |

| Company | Raw-set and selector result | Manual qualifying count | Outcome |
| --- | --- | --- | --- |
| Stripe | 1,498 ms; $0.007; 10 raw/dated/highlighted, 4 domains; selected `2,1,3`; no selector clusters | 2 distinct: rank 2 ≤90 days and rank 6 in 91–180-day fallback | `RETRIEVAL REPAIR INSUFFICIENT` |
| PostHog | Not requested: Stripe early-stop gate | Not evaluated | Not evaluated |

All ten exact Stripe destinations were reviewed without a replacement-source search. Two first-party destinations supported qualifying events; inaccessible SEO-style claims, inaccessible purported partnership coverage, generic commentary, a rumor, and old/retrospective Agentic Commerce coverage did not. Human duplicate groups were checkout commentary `3/4/7` and Agentic Commerce coverage `9/10`; the selector assigned no clusters. The selected three were not all valid because ranks 1 and 3 were rejected, but the antecedent raw set had only two qualifying events.

Result: **`RETRIEVAL REPAIR FAIL`**. The fixed instruction did not repair Stripe raw retrieval sufficiency in this bounded fresh sample, so PostHog was prohibited and no further provider request occurred. This does not change historical A4.3 or A4.3R0, prove a selector-only defect, approve a recency-policy change, or authorize further retrieval/architecture work. Complete per-rank evidence is in `docs/PHASE_A_RETRIEVAL_REPAIR.md`.

### A4.4 — Phase A architecture freeze

Documentation verification date: 2026-09-09

| Measure | Observed result |
| --- | --- |
| Scope | Zero-provider architecture decision; no executable code or tests changed |
| Baseline | `76016d6094cafb1e1bbb5c9f6ab7fe5cfacea817` on `main`, matching `origin/main`; clean worktree/index before edits |
| Exa counts | A3 1; A4.1 1; A4.2 1; A4.3 2; A4.3R1 1; cumulative 6 |
| Rejected shape | One broad Exa search → source-blind selector → final three |
| Frozen direction | One broad request → prioritization/light dedupe → bounded source verification → optional one official-domain fallback only for missing slots → three valid signals or honest insufficient evidence |
| Request ceiling | Two planned discovery requests per company; A4.4 itself used 0 |
| Selector role | Candidate prioritization/light dedupe, not final evidence approval |
| Recency | Unchanged: ≤90 days preferred; 91–180 fallback; >180 normally ineligible |
| Required next test | A4.5: at most one Stripe official-domain fallback request; not authorized or run |

Result: **architecture direction frozen, Phase A exit pending A4.5.** A4.4 makes no provider/product GO claim. It preserves A4.3 `FAIL`, A4.3R0 `NO POLICY CHANGE YET`, and A4.3R1 `RETRIEVAL REPAIR FAIL`; it prohibits a crawler, provider waterfall, third search, unbounded backfill, or V1-like evidence architecture without separate evidence and approval. See `docs/PHASE_A_ARCHITECTURE_FREEZE.md`.

### Exa A4.5 — final official-domain fallback feasibility

Implementation and live verification date: 2026-09-09

| Measure | Contract and observed result |
| --- | --- |
| Baseline | `233528ea45691b0c63de8d9edcb62e4afba371e3` on `main`, matching `origin/main`; clean worktree/index before changes or provider access |
| Fixture / existing signals | Stripe / preserved A: FX 2026-08-17; B: Lloyds 2026-06-09 |
| Sole retrieval change | `includeDomains: ["stripe.com", "*.stripe.com"]` added to the otherwise identical A4.1 raw request |
| Preserved contract | `POST /search`, generic Stripe query, `auto`, 10 results, highlights; no date/category/schema/system prompt/second model/synthesis/retry |
| Requests | A4.5 1; retries 0; broad Stripe reruns 0; cumulative Exa 7 |
| Result | 2,088 ms; $0.007; 10 raw/dated/highlighted results, all from `stripe.com` |
| Qualifying fallback events | OpenRouter acquisition (2026-08-19), Singapore expansion (2026-08-25), Sessions/Google partnership (2026-04-29), Germany tools (2026-06-30) |

The exact returned destinations were inspected without replacement-source search. Rank 3 duplicated existing Lloyds signal B; rank 8 duplicated existing FX signal A; ranks 5/9/10 overlapped on the Sessions 2026 launch bundle; rank 4 was inaccessible; and rank 7 was older than 180 days. Rank 1's supported August 19 OpenRouter acquisition independently filled the missing slot.

Result: **`FALLBACK FEASIBLE`; `PHASE A ARCHITECTURE APPROVED FOR IMPLEMENTATION`.** This validates only the small bounded fallback direction in one Stripe case. It does not prove production company resolution, verification implementation, universal fallback reliability, synthesis, endpoint/UI behavior, or deployment. See `docs/PHASE_A_FALLBACK_FEASIBILITY.md`.

## Phase B

### B1 — provider-independent company targeting / identity safety

Implementation and verification date: 2026-09-09

| Measure | Observed result |
| --- | --- |
| Scope | Dependency-free local ESM module and focused tests only; no selector changes |
| Input preparation | Name input is trimmed/normalized without domain guessing; ordinary whitespace-containing punctuated names remain names; common URL/domain forms normalize to a lowercase hostname anchor; malformed, credential-bearing, unsupported-protocol, bare-host, localhost, and IP inputs require clarification |
| Name identity | Requires non-empty compatible name, valid non-local proposed domain, an exact-root/subdomain corroborating HTTP(S) evidence URL, and explicit `ambiguous: false`; no lexical name/domain similarity rule applies |
| Domain identity | Retains the submitted hostname; supplied identity evidence must corroborate that same root/subdomain or clarification is returned |
| Deceptive domains | Exact-root/subdomain comparison rejects prefix and suffix impostors such as `stripe.com.example.test` and `notstripe.com` |
| Mercury regression | `Mercury` plus ambiguous or non-explicitly-unambiguous `shipmercury.com` evidence returns `clarification_needed`; no company-specific production branch exists; semantic resolution remains pending the live gate |
| Provider activity | Exa 3 (Mercury live identity gate: first format blocker, then one approved rerun; Stripe positive control: one request); Gemini 0; Tavily 0; Groq 0; other external API requests 0; cumulative Exa experimental requests are 10 |
| Parser correction | Shared raw Search parser now treats absent/null/empty title as `null`; valid non-empty exact HTTP(S) URL remains mandatory. UI uses `Untitled source` only as a presentation fallback. |
| Live validation | Mercury rerun: 10 results, all dated/highlighted, 8 unique domains, 3,083 ms, $0.007. Provider named the fintech and Mercury Systems entities, set `ambiguous: true`, and B1 returned `clarification_needed`; exact Mercury fintech sources were opened, while the exact Yahoo Mercury Systems destination was rate-limited. Stripe positive control: 10 results, 9 dated, 10 highlighted, 4 unique domains, 3,409 ms, $0.007; provider returned `Stripe` / `stripe.com` / `ambiguous: false`, and B1 returned `resolved`. Exact first-party `stripe.com` grounding supported identity/domain; inaccessible secondary exact pages were not replaced. |
| Gate decision | `B1 LIVE IDENTITY GATE PASS`; Mercury safely clarified and Stripe positively resolved without a separate identity search |
| Local verification | Parser tests 14/14; gate tests 12/12; targeting tests 10/10; full `node --test test/*.test.mjs` 109/109; `git diff --check` passed |

Result: **`B1 DETERMINISTIC IMPLEMENTATION COMPLETE`; `B1 LIVE IDENTITY GATE PASS`; `B1 COMPANY TARGETING / RESOLUTION APPROVED FOR PRODUCTION INTEGRATION`**. The first live Mercury response exposed the narrow title-parser defect; the approved rerun retained all request/schema/identity boundaries and safely clarified the two disclosed Mercury entities. The one authorized Stripe request then positively resolved a clear name with exact first-party grounding, no separate identity search, and preserved raw discovery. B2 broad discovery, verification/backfill, synthesis, endpoint/UI, deployment, and all later-phase work remain unstarted. See `docs/PHASE_B1_IDENTITY_GATE.md`.

### B2 — production broad discovery

Implementation and live-validation date: 2026-09-09

| Measure | Observed result |
| --- | --- |
| Production scope | `src/discovery/exaBroadDiscovery.mjs` owns the one-search raw-discovery contract; `src/discovery/discoverCompany.mjs` prepares B1 input, performs one request, confirms identity, then exposes a selector queue only when resolved. No production module imports historical `scripts/`. |
| Request / identity contract | Signal-oriented A4.1/B1 query, `auto`, 10 results, highlights, exact three-field identity schema, `stream: false`; no filters, prompt, fallback, retry, polling, or second Search. Unambiguous output requires exact field-specific grounding for both identity fields. |
| Selector extension | Full valid ordered representatives are returned as `prioritized`; `selected` remains exactly `prioritized.slice(0, 3)`. Existing rank, recency, provenance, and dedup rules are unchanged. Untitled raw candidates parse but remain ineligible. |
| Pre-live local verification | Syntax checks passed. B2-focused suites passed 38/38; targeting 10/10; selector 25/25; Phase A discovery 14/14; B1 gate 12/12; complete suite 123/123; `git diff --check` passed. |
| Live authorization / hygiene | `.env` was confirmed ignored, untracked, and unstaged without inspection. Free Starter attestation was supplied. Starting cumulative Exa count: 10; maximum B2 requests: 2; retries: 0. |
| Live Stripe name | Exactly 1 request, 0 retries. Returned `clarification_needed` / `insufficient_identity_evidence`. Because identity did not resolve, no raw candidates, grounding, prioritized/selected queue, aggregates, latency, or cost were exposed or retained. |
| Stop / accounting | The required name positive gate failed, so `stripe.com` was not requested, no source was opened, no retry or patch/replay occurred, and no provider root cause is inferred. B2 requests: 1; cumulative Exa requests: 11. |
| Independent review | Pre-live review found and corrected missing field-specific unambiguous grounding enforcement and the safe missing-ambiguity clarification path. Post-live review confirmed safe quarantine/no candidate leak and classified the result as a name-case failure rather than `B2 PARTIAL / REASSESS`. |

Result: **`B2 FAIL`**. The automated implementation is retained, but B2 production broad discovery is not approved because its sole authorized Stripe-name call did not resolve identity or produce a queue. No B3 verification/backfill, endpoint, UI, deployment, or later work began. See `docs/PHASE_B2_BROAD_DISCOVERY.md`.

### B2R0 — zero-provider-call diagnostic audit

| Measure | Observed result |
| --- | --- |
| Provider activity | Exa 0; other providers 0; retries 0; cumulative Exa experimental requests remain 11. |
| Request/schema parity | Fixed-date B2 body structurally equals the B1 Stripe positive-control body: exact query, `auto`, 10, highlights, exact three-field schema, `stream: false`, and no provider-visible extras. |
| Parsing/grounding/handoff | Complete-schema identity parsing and field-specific citation extraction match B1; exact per-field URLs are combined without rewrite before the same B1 confirmation function. Missing-only `ambiguous` is an explicit B2 safe-clarification policy difference: B1's historical parser format-fails it. |
| Diagnostic observability | Local smoke fixture tests verify transient identity fields, per-field grounding URLs/counts, B1 state/reason, raw-result aggregates, latency, and provider-reported cost/null. Default production clarification remains queue-free and the diagnostic summary contains no candidates/highlights/raw payload. |
| Result | `AUDIT INCONCLUSIVE`: the original response was intentionally not retained, so no local check can prove whether missing ambiguity, ambiguity, invalid identity data, grounding/corroboration, or provider variability caused the live clarification. |

No B2 approval, rerun, B3, source verification, fallback, endpoint, UI, deployment, or later work is authorized by B2R0.

### B2R1 — single Stripe-name diagnostic rerun

Live verification date: 2026-09-09

| Measure | Observed result |
| --- | --- |
| Provider accounting | Starting cumulative Exa requests: 11; B2R1 requests: 1; retries: 0; ending cumulative requests: 12 |
| B2 decision | `clarification_needed` / `insufficient_identity_evidence` |
| Structured identity | `Stripe, Inc.` / `stripe.com` / `ambiguous: true` |
| Resolved-name grounding | 3 exact URLs |
| Official-domain grounding | 5 exact URLs |
| B1 decision | `clarification_needed` / `insufficient_identity_evidence` |
| Discovery aggregates | 10 raw results; 9 dated; 10 highlight-bearing; 5 unique domains |
| Latency / returned cost | 3,638 ms / $0.007 |
| Queue counts | Not applicable because identity did not resolve |
| Classification | `B2R1 REPEAT SAFE FAILURE — CAUSE OBSERVED` |

The observed immediate cause was `ambiguous: true`, not missing identity fields or missing field-specific grounding. The B1 boundary therefore safely refused to resolve the company. No retry, `stripe.com` request, other company, fallback, source verification, code patch, B3, or later work occurred. This single result does not approve B2 or decide whether occasional safe clarification is acceptable production UX.

### B2R2 — narrow deterministic ambiguity correction

Implementation and verification date: 2026-09-09

| Measure | Observed result |
| --- | --- |
| Provider activity | Exa 0; other providers 0; retries 0; cumulative Exa experimental requests remain 12 |
| `ambiguous: false` path | Unchanged: compatible name plus combined domain-corroborating evidence resolves |
| `ambiguous: true` path | Requires strict normalized-name equality and a domain-corroborating exact HTTP(S) URL in each field-specific grounding array |
| B2R1 Stripe fixture | `Stripe` / `Stripe, Inc.` / `stripe.com` with valid field-specific `stripe.com` grounding resolves |
| Mercury fixture | `Mercury` / `Mercury (Fintech) and Mercury Systems (Aerospace/Defense)` remains `clarification_needed` |
| Negative cases | Loose prefix, missing resolved-name grounding, missing official-domain grounding, non-corroborating grounding, contradictory evidence, and missing ambiguity clarify |
| Domain input | Existing submitted-domain anchoring and retargeting rejection remain unchanged |
| Focused verification | 42/42 relevant tests passed; syntax checks passed |
| Full verification | `node --test test/*.test.mjs` — 130/130 passed |

Independent review found no safety defect or provider-access addition. It identified two test-coverage gaps—the Mercury orchestration fixture was no longer invoked with `Mercury`, and strict-path contradictory-domain coverage was absent—which were corrected before final verification. This correction does not approve B2, authorize a new live request, or begin B3.

### B2R2.1 — strict legal-suffix ambiguity exception

| Measure | Observed result |
| --- | --- |
| Provider activity | Exa 0; cumulative Exa experimental requests remain 12 |
| `ambiguous: true` name rule | Resolved name must add one or more trailing tokens, all recognized legal suffixes, after the exact submitted-token prefix |
| Stripe fixture | `Stripe` → `Stripe, Inc.` resolves with valid field-specific `stripe.com` grounding |
| Exact-name Mercury | `Mercury` → `Mercury` clarifies despite valid first-party grounding |
| Other negatives | Historical Mercury, `Stripe Payments, Inc.`, missing ambiguity/grounding, contradictory or deceptive evidence clarify |
| Existing behavior | `ambiguous: false` prefix behavior and domain anchoring unchanged |
| Verification | Syntax checks passed; focused tests 40/40; `node --test test/*.test.mjs` 131/131 |

No live provider request occurred. B2 remains unapproved and B3 remains unstarted.

### B2R3 — corrected production broad-discovery live gate

| Measure | Observed result |
| --- | --- |
| Preflight | `main`, local `HEAD`, and `origin/main` were `635ba5214e5e485219801880dfc811867726ad8d`; clean tree; `.env` ignored, untracked, and unstaged without inspection. Static inspection found one smoke discovery invocation and one underlying provider `fetch`, with no retry, polling, provider loop, fallback, or source-page request. |
| Initial environment block | The initial command stopped locally with sanitized error `EXA_API_KEY is not set.` before discovery or `fetch`; it reached Exa 0 times and remains a credential/environment preflight block, not a provider-side auth response or live name-gate failure. |
| Stripe-name live result | Owner-run authorized command: `ready_for_verification`; name input; `Stripe` / `stripe.com`; provider identity `Stripe` / `stripe.com` / `ambiguous: false`; B1 `resolved`; 1 resolved-name and 1 official-domain grounding; 10 raw, 9 dated, 10 highlight-bearing, 4 unique-domain; 10 prioritized, 3 selected, 0 invalid, 0 duplicate; 3,591 ms; $0.007. |
| Stripe-domain live result | Owner-run conditional authorized command: `ready_for_verification`; domain input; `Stripe` / `stripe.com`; provider identity `Stripe` / `stripe.com` / `ambiguous: false`; B1 `resolved`; 3 resolved-name and 2 official-domain groundings; 10 raw, 9 dated, 10 highlight-bearing, 4 unique-domain; 10 prioritized, 3 selected, 0 invalid, 0 duplicate; 4,024 ms; $0.007. |
| Grounding / queue detail | Exact grounding URLs and bounded candidate-review lines were not included in the owner-provided result summary; they are not reconstructed here. No candidate page was opened. |
| Provider accounting | Starting cumulative Exa: 12; initial environment-blocked attempts reaching Exa: 0; Stripe-name requests: 1; Stripe-domain requests: 1; B2R3 actual provider requests: 2; retries: 0; ending cumulative Exa: 14. |
| Outcome | Initial operational status: `B2R3 PRE-FLIGHT BLOCKED — CREDENTIAL/ENVIRONMENT UNAVAILABLE`; superseding live-gate classification: `B2R3 LIVE GATE PASS`. |

No retry, fallback, source verification, candidate-page opening, implementation patch, B3, endpoint, UI, deployment, or later-phase work occurred. No raw provider response, credential, authorization header, or temporary provider artifact was persisted. Provider dates remain discovery metadata and candidates remain unverified. B2 remains pending project-owner post-run review; B3 remains not started.

### B3 — source verification and bounded fallback implementation

| Measure | Observed result |
| --- | --- |
| B2 status | Project owner approved `B2 PRODUCTION BROAD DISCOVERY — APPROVED` after B2R3; this implementation uses B2's full ordered `prioritized` queue. |
| Source boundary | Native injected `fetch`; GET only; manual redirects capped at 5; one 5-second deadline spans redirects, headers, and body; 2 MiB cap; HTML/XHTML only; no auth, cookies, browser execution, retries, recursive crawling, or persistence. Credential-bearing and literal-IP targets, blocked/challenge/status failures, non-HTML, timeouts, and oversized responses fail closed. |
| Evidence gates | Publisher HTML must provide substantive article evidence, company/event support, a source-derived publication date, and non-trivial material. Provider `publishedDate` cannot prove eligibility. Date priority: JSON-LD `datePublished`, article metadata, then article `<time datetime>`; unknown/future/old dates reject. |
| Verification / dedupe | Sequential B2 order; stops after 3 accepted distinct records. Duplicate source/final URLs and selector-style lexical overlap over publisher-derived evidence reject duplicates, including FX and Sessions-style overlap fixtures. |
| Company support | Exact normalized company tokens are required; B1's approved legal suffixes (`co`, `company`, `corp`, `corporation`, `inc`, `ltd`, `llc`, `plc`) are ignored for that support check only. |
| Fallback | Only after the full broad queue is exhausted below 3; exactly one A4.5-role raw Exa request querying the resolved company name, constrained to the official-domain root plus wildcard subdomain, with `auto`, 10 results, highlights, and `stream:false`. It sends no B2 identity `outputSchema`, requires no identity grounding, fills only missing slots, and dedupes against accepted broad evidence. Known provider failures propagate; successful exhaustion is insufficient evidence. |
| Focused zero-network tests | `node --test test/verification.test.mjs` — 16/16 passed. Covers HTML/redirect/failure bounds including a header-first stalled body, legal-suffix support, dates, provider-date exclusion, support/triviality, duplicate cases, early stop, raw fallback contract, provider-error propagation, and insufficient evidence. |
| Full zero-network suite | `node --test test/*.test.mjs` — 147/147 passed. |
| Provider accounting | B3 implementation Exa requests: 0; live publisher requests: 0; retries: 0; cumulative Exa experimental requests remain 14. |

No B3 live validation, source-page smoke, synthesis, endpoint, UI, deployment, B4, or later-phase work occurred. B3 implementation is pending project-owner/ChatGPT review and is not production-approved.

### B3 live-gate preflight

| Measure | Observed result |
| --- | --- |
| Harness | `scripts/phase-b3-live-smoke.mjs` invokes the production `discoverCompany(...)` then `verifyCompanyDiscovery(...)` path once, only for `NVIDIA` or `Stripe`, with explicit Free Starter confirmation and no retry, persistence, raw-response dump, or publisher-page request outside B3 itself. |
| Zero-network harness tests | 7/7 passed: exact allowlist/preflight, actual B2→B3 broad-only path, conditional fallback ceiling, no retry, B2 clarification stop, output redaction, and no persistence. |
| Regression checks | B3 verification 16/16; B1/B2/selector 53/53; full suite 154/154; syntax and `git diff --check` passed. |
| Credential preflight | `EXA_API_KEY` was unavailable to the process. Its contents and the existing ignored `.env` were not inspected. |
| Provider/publisher activity | NVIDIA Exa 0; Stripe Exa 0; publisher GETs 0; retries 0. |
| Accounting / outcome | Starting cumulative Exa 14; B3 gate Exa 0; ending cumulative Exa 14. `B3 LIVE GATE PRE-FLIGHT BLOCKED — CREDENTIAL/ENVIRONMENT UNAVAILABLE`. |

The preflight stop is historical: it was local/environmental, reached Exa 0 times, and is not a provider-side authentication or live evidence-quality result.

### B3 live-gate owner-run continuation

| Measure | Observed result |
| --- | --- |
| Authority / historical relationship | The project owner supplied this correction as the authoritative current record. The preceding credential preflight remains historical fact but is superseded for live-gate evaluation by the owner-run results below. |
| NVIDIA B2 / request use | B2 `ready_for_verification`; `NVIDIA Corporation` / `nvidia.com`; broad Exa 1 and official-domain fallback Exa 1; retries 0. |
| NVIDIA B3 result | `insufficient_evidence`; 2 accepted first-party NVIDIA records: `NVIDIA to Acquire Hugging Face` and `Sparks Fly: NVIDIA Accelerates Local AI at IFA 2026`; both 2026-09-03 / `RECENT`. The first accepted snippet was header-like: `NVIDIA to Acquire Hugging Face September 3, 2026 ... Share...`. |
| Stripe production B3 run | Broad Exa 1; B2 `clarification_needed` / `insufficient_identity_evidence`; B3 not reached; retries 0. |
| Separate Stripe B2 diagnostic | Exa 1; `Stripe, Inc.` / `stripe.com` / `ambiguous:true`; B1 `resolved`; 3 first-party `stripe.com` grounding URLs for `resolvedCompanyName` and 3 for `officialDomain`. The original clarification response was not retained, so the exact difference is unknown. |
| Provider accounting | Starting cumulative Exa 14; NVIDIA broad 1; NVIDIA fallback 1; Stripe broad 1; Stripe B2 diagnostic 1; actual Exa requests 4; retries 0; ending cumulative Exa 18. |
| Decision | No production acceptance/retrieval policy change is inferred. B3 is not production-approved; diagnostic root-cause review and project-owner decision remain pending. |

No raw provider response, authorization header, source body, candidate output beyond the owner-provided facts, or temporary artifact is reconstructed or persisted. B4 and later work remain unstarted.

### B3R1 Stage A — diagnostic-only observability

| Measure | Observed result |
| --- | --- |
| Purpose | Diagnose the owner-run NVIDIA shortfall and Stripe B2 variability without changing B1/B2/B3 acceptance or retrieval policy. |
| B2 observer | The smoke harness reuses `discoverCompanyForSmoke(...)` once and exposes only its existing sanitized identity, field-specific grounding, confirmation, aggregate, latency, and cost diagnostic on both ready and clarification outcomes. |
| B3 observer | The shared verification execution records each actually evaluated candidate after its real decision: broad/fallback origin, rank, title, URL, accepted/rejected reason, and safe parsed-source metadata where available. Duplicate traces occur only after the existing production dedupe decision. Fallback records broad exhaustion, accepted count before fallback, candidate counts, its trace, and the final accepted count. |
| Production invariance | Normal `discoverCompany(...)`, `verifyCandidate(...)`, and `verifyCompanyDiscovery(...)` return contracts and decisions remain unchanged; no second verifier, retry, third search, persistence, raw provider response, publisher HTML, credential, or header storage was added. |
| Focused verification | Syntax checks; `node --test test/verification.test.mjs test/phase-b3-live-smoke.test.mjs` — 27/27 passed. Covers all seven rejection reasons, accepted trace, post-verification duplicate trace, origin, stop-at-three, fallback trace, B2 clarification diagnostics, real traced-output redaction, and normal B3-result equivalence. |
| Full regression | `node --test test/*.test.mjs` — 158/158 passed; `git diff --check` passed. |
| Stage A provider accounting | Starting cumulative Exa 18; Exa 0; publisher GETs 0; retries 0; ending cumulative Exa 18. |

No B3R1 live replay or production-policy correction has occurred in Stage A. B3 remains not production-approved pending root-cause review and project-owner decision.

### B3R1 Stage B — owner-run replay

| Measure | Observed result |
| --- | --- |
| NVIDIA | B2 `ready_for_verification` as `NVIDIA Corporation` / `nvidia.com`; broad Exa 1; fallback Exa 1; B3 `insufficient_evidence`; 2 accepted first-party recent records. Several legitimate `nvidianews.nvidia.com` pages reached a valid URL/title but failed the `<article>`/`<main>` structural gate as `unsupported_claim` before source classification or publisher-date extraction. |
| Stripe control | B2 `ready_for_verification` as `Stripe` / `stripe.com` / `ambiguous:false`; broad Exa 1; fallback 0; B3 `verified` with 3 distinct first-party recent publisher-derived records: Meta Muse / Link (2026-09-08), Singapore infrastructure expansion (2026-08-25), and FX/currency capabilities (2026-08-17). |
| Provider accounting | Starting cumulative Exa 18; NVIDIA broad 1; NVIDIA fallback 1; Stripe broad 1; B3R1 Stage B Exa 3; retries 0; ending cumulative Exa 21. |
| Decision | Stripe is a control that the existing pipeline can succeed. NVIDIA's observed failure is a static publisher-content compatibility boundary, not evidence for changing identity, discovery, recency, materiality, dedupe, or fallback policy. |

### B3R2 — narrow publisher extraction/date-proof correction

| Measure | Observed result |
| --- | --- |
| Bounded correction | Keep `<article>` then `<main>` preferred; only otherwise use a small chrome-stripped `<body>` fallback. Existing non-root, title, substantive body, company support, triviality, recency, anchoring, and dedupe gates remain in force. |
| Date proof | JSON-LD `datePublished` → `article:published_time` → `<time datetime>` → one strict calendar-valid English month-name date in a bounded region after the content `<h1>` → unknown. Dates in the headline itself, footer, buried text, templates, or hidden/`aria-hidden` content cannot qualify. Provider dates remain discovery metadata, never publisher proof. |
| Regression fixtures | Synthetic NVIDIA-Newsroom-style no-`article`/no-`main` content accepts as first-party recent evidence; existing article/main and Stripe-style paths continue to pass. Homepage, thin chrome-only body, unrelated company, stale/future, invalid, footer, buried, headline, and inert-date cases fail closed. |
| Verification | Syntax checks; `node --test test/verification.test.mjs test/phase-b3-live-smoke.test.mjs` — 30/30 passed; `node --test test/*.test.mjs` — 161/161 passed; `git diff --check` passed. |
| Provider accounting | Starting cumulative Exa 21; B3R2 implementation Exa 0; publisher GETs 0; retries 0; ending cumulative Exa 21. |

The correction adds no dependency, publisher-specific adapter, retry, third search, or provider activity. B3R2 remains pending one authorized NVIDIA replay.

### B3R2 — owner-run NVIDIA replay

| Measure | Observed result |
| --- | --- |
| Run | The owner ran the one authorized B3R2 NVIDIA production-path replay; no retry. |
| Exa requests | One broad Exa request only; no fallback request. |
| B3 result | `verified`, with exactly three accepted evidence records. |
| Provider accounting | Starting cumulative Exa 21; B3R2 replay Exa 1; retries 0; ending cumulative Exa 22. |

This is the first NVIDIA production-path run to reach `verified`; the earlier owner-run continuation and B3R1 Stage B NVIDIA runs both ended `insufficient_evidence` on the pre-correction extraction path. B3 remains not production-approved pending project-owner review; B4 and later work remain unstarted.

### B3R2 — publisher-only MediaTek validation

| Measure | Observed result |
| --- | --- |
| Run | A subsequent publisher-only validation; 0 Exa requests. |
| Result | The exact `nvidianews.nvidia.com` page that previously failed the structural gate in B3R1 Stage B (rejected as `unsupported_claim` before source classification or publisher-date extraction) was accepted, with a publisher-derived date of `2026-08-31`, classified `RECENT` and `FIRST_PARTY`. |
| Provider accounting | Starting cumulative Exa 22; validation Exa 0; ending cumulative Exa 22. |

This directly validates B3R2's intended structural/date-extraction correction: the same static-content NVIDIA Newsroom page shape previously rejected at the `<article>`/`<main>` structural gate is now accepted through the chrome-stripped `<body>` fallback with strict date proof. It adds no discovery, Exa, or production-policy activity beyond the B3R2 implementation itself. B3 remains not production-approved; B4 and later work remain unstarted.

The project owner subsequently approved **`B3 PRODUCTION EVIDENCE VERIFICATION — APPROVED`** based on the owner-run NVIDIA replay and MediaTek validation above. That approval is a current decision and does not revise the historical B3/B3R1/B3R2 records above.

### B4A — pure deterministic snapshot assembly

| Measure | Observed result |
| --- | --- |
| Scope | `src/snapshot/assembleSnapshot.mjs` is a pure adapter consuming a completed B3 verification result and a caller-supplied description; it performs zero network/Exa/publisher/model activity and does not import or invoke B1, B2, or B3. B1–B3 source files are unmodified. |
| Verified mapping | Exactly three B3 evidence records map to exactly three signals, in B3's existing order. Each signal exposes only `title` (B3 `sourceTitle`), `publishedDate` (B3 `publishedDate`), `sourceUrl` (B3 `resolvedUrl`, not the original candidate/source URL), and `recencyBucket` (B3 `recencyBucket`); `evidenceSnippet`, `candidateTitle`, and `sourceClass` are never exposed. |
| Insufficient-evidence mapping | 0–2 B3 evidence records map to that same partial count with no padding or fabrication. |
| Validation | Fails fast (`TypeError`) on: unsupported verification state; `verified` with evidence.length !== 3; `insufficient_evidence` with evidence.length > 2; missing/empty company name or domain; missing/non-string description; a non-HTTP(S) resolved source URL; a missing evidence field. Neither the `verification` input nor its evidence array is mutated. |
| Focused tests | `node --test test/assemble-snapshot.test.mjs` — 15/15 passed: verified assembly/order, publisher title/date/URL precedence over raw candidate values, no provenance leakage, zero/one/two-record insufficient-evidence cases, all invalid-contract rejections (including a missing required evidence field), and non-mutation of the B3 fixture. |
| Full zero-network suite | `node --test test/*.test.mjs` — 176/176 passed (161 pre-existing + 15 new). |
| Syntax / diff checks | `node --check src/snapshot/assembleSnapshot.mjs` and `git diff --check` passed. |
| Provider accounting | B4A Exa requests: 0; publisher requests: 0; other network requests: 0; cumulative Exa experimental requests remain 22. |
| Protected-path audit | `git diff --name-only` confirmed no file under `src/targeting/`, `src/discovery/`, `src/selection/`, or `src/verification/` was modified. |

B4A accepts a future grounded description as an input only; generating that description is separately authorized future work as B4B, which has not begun. Endpoint/UI integration (B5) and Phase C have not begun. The noisy NVIDIA evidence-snippet issue recorded above remains an upstream known limitation; B4A does not expose `evidenceSnippet` and made no production-code change to address it.

## Phase C
_Not yet run._

## Phase D / production
_Not yet run._

## Final skeptical review
_Not yet run._
