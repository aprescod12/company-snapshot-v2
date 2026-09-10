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

### B4B Stage A — isolated Exa Contents description candidate (unapproved)

| Measure | Observed result |
| --- | --- |
| Scope | `src/description/exaCompanyDescription.mjs` accepts an already-confirmed `{ companyName, officialDomain }` and makes one Exa **Contents** request (never Search) against the exact HTTPS root homepage, requesting `summary` only. It does not import or invoke B1, B2, B3, or B4A; those source files are unmodified. |
| Request shape | `buildContentsRequestBody` sends exactly `{ urls: [homepage], summary: { query } }` — no `text`, `highlights`, `subpages`, `livecrawl`, or Search fields. `buildHomepageUrl` accepts only a bare confirmed hostname and rejects one carrying a path, query, or credentials. |
| Instruction | `buildDescriptionQuery` asks for exactly 2–3 factual sentences on the stable core business, principal products/services, and principal use case, grounded only in the supplied page, and explicitly excludes recent announcements, funding, acquisitions, partnerships, earnings, leadership changes, stock performance, and promotional language. |
| Acceptance | Requires per-URL Contents `status: "success"` **with `statuses[0].id` and `results[0].id` both exactly equal to the requested homepage URL** (array cardinality alone does not prove provider-response association), a non-empty summary, exactly 2–3 sentences (`Intl.Segmenter` sentence granularity, not `split(".")`), a bounded maximum length, no embedded HTTP(S) URL, and a `result.url` on the confirmed official domain or a subdomain (suffix-safe hostname comparison) — `result.url` need not equal the requested homepage and may be a legitimate same-domain canonical/redirected page; an unrelated/redirected domain is never silently accepted. |
| Failure handling | Any acceptance check failing returns `{ state: "description_unavailable", reason }` from a small fixed reason vocabulary — never a thrown error. Only a genuine contract-shape violation (missing/malformed `statuses`/`results`, or a `statuses[].id`/`results[].id` that does not match the exact requested homepage) throws `CompanyDescriptionError` with `code: "provider_format"`; auth/payment-required/quota/unavailable/timeout conditions classify the same way B2's discovery error boundary already does, with no retry. |
| Focused tests | `node --test test/exa-company-description.test.mjs` — 30/30 passed (includes matching-ID acceptance, mismatched/missing/malformed `status.id`/`result.id` rejection, and a matching-ID case with a same-domain canonical `result.url` still passing while an off-domain canonical `result.url` still fails the existing domain gate). `node --test test/phase-b4b-live-smoke.test.mjs` — 7/7 passed (harness restriction to the two fixed cases, confirmation-flag/key gating, single-call contract, no-retry, sanitized output, no B1/B2/B3 import). |
| Full zero-network suite | `node --test test/*.test.mjs` — 213/213 passed (176 pre-existing + 30 + 7 new). |
| Syntax / diff checks | `node --check` on `src/description/exaCompanyDescription.mjs`, `scripts/phase-b4b-live-smoke.mjs`, and both new test files; `git diff --check` passed. |
| Provider accounting | Stage A Exa Search requests: 0; Exa Contents requests: 0; other network requests: 0. Cumulative Exa Search requests remain 22 (unchanged); Contents requests are tracked separately from Search and remain 0. |
| Protected-path audit | `git diff --name-only` confirmed no file under `src/targeting/`, `src/discovery/`, `src/selection/`, `src/verification/`, or `src/snapshot/` was modified. |

B4B is an isolated, unapproved production candidate: it does not extend B2's `outputSchema` and does not touch the approved Search/identity/signal-retrieval path. The future live gate (`scripts/phase-b4b-live-smoke.mjs`) is restricted to two fixed already-confirmed cases (`NVIDIA` → `nvidia.com`; `stripe.com` → `stripe.com`), requires an explicit free-Starter confirmation flag, makes exactly one Contents request per invocation with no retry, and **was not executed** in Stage A. Live description validation has not happened. Endpoint/UI integration (B5) and Phase C have not begun.

### B4B — owner-run live gate (approved)

| Measure | Observed result |
| --- | --- |
| NVIDIA | Submitted `NVIDIA` → resolved `NVIDIA Corporation` / `nvidia.com`. One Contents request, no retry. `state: "described"`; `sourceUrl: "https://nvidia.com/"`; exactly three sentences; provider latency 2783 ms; estimated cost $0.001. Manual review against current official NVIDIA materials passed: factual accuracy, stable core-business focus, sentence-count compliance, clarity, no recent-news contamination, official-domain grounding, no unsupported specificity. |
| Stripe | Submitted `stripe.com` → resolved `Stripe` / `stripe.com`. One Contents request, no retry. `state: "described"`; `sourceUrl: "https://stripe.com/"`; exactly three sentences; provider latency 2115 ms; estimated cost $0.001. Same manual-review checks passed. |
| Provider accounting | B4B Contents requests: 2; B4B Search requests: 0; retries: 0. Cumulative Exa Search accounting remains 22 (unchanged, tracked separately from Contents). |
| Scope of evidence | Two owner-authorized cases only; this does not establish universal reliability across arbitrary companies. Broader end-to-end coverage — smaller, private, ambiguous, or low-activity companies — remains a later validation concern and has not been run. |

The project owner approved **`B4B ISOLATED GROUNDED COMPANY DESCRIPTION — APPROVED`** on this basis. No B4B prompt, request shape, validation logic, retry policy, or B1–B4A behavior changed as part of this approval. Endpoint/UI integration (B5) and Phase C remain unstarted.

### B5 Stage A — bounded production orchestration boundary (implemented, not live-gate approved)

| Measure | Observed result |
| --- | --- |
| Scope | `src/orchestration/createCompanySnapshot.mjs` composes the existing approved production exports — `discoverCompany`, `verifyCompanyDiscovery`, `requestCompanyDescription`, `assembleSnapshot` — into `createCompanySnapshot(rawInput, apiKey, options)`. It performs no retrieval, verification, selection, or synthesis itself; B1–B4B source files are unmodified. |
| Execution order | B2 `clarification_needed` stops immediately (no B3/B4B/B4A call). Otherwise `verifyCompanyDiscovery` runs once; B3 alone owns its conditional official-domain fallback. Both `verified` and `insufficient_evidence` proceed to `requestCompanyDescription` using the confirmed `verification.company.companyName`/`officialDomain` (never raw input). `assembleSnapshot` runs only after B4B `state: "described"`; its `snapshot`/`insufficient_evidence` result is returned unchanged, with no padding. |
| Public contract | `clarification_needed` (`invalid_input` or `company_ambiguous`, collapsing the full B1/B2 reason vocabulary), `snapshot`, `insufficient_evidence`, `unavailable` (`description_unavailable` or `provider_unavailable`). No API key, provider message, HTTP body, tag, or stack trace is exposed. |
| Error handling | A caught `BroadDiscoveryError` (discovery or B3 fallback) or `CompanyDescriptionError` (B4B) maps to `unavailable`/`provider_unavailable`. Any other error — an unexpected programming/contract defect — is rethrown unchanged; there is no blanket `catch`. |
| Testability | One narrow internal `services` dependency-injection object, defaulting to the real B1–B4B exports; no mocking library, framework, or B1–B4B change. A caller-supplied `now` propagates to discovery and verification. |
| Focused tests | `node --test test/create-company-snapshot.test.mjs` — 11/11 passed: invalid-input and ambiguous clarification stopping before later stages; full verified-success ordering/exact-once counts with confirmed-identity pass-through; insufficient-evidence at 0 and 2 records still describing/assembling without padding; `description_unavailable` skipping assembly; discovery/B3/B4B provider failures each mapping to `unavailable` and stopping later stages; an unexpected `TypeError` rethrown unchanged; the real (non-faked) discovery path correctly handling zero-network invalid input. |
| Full zero-network suite | `node --test test/*.test.mjs` — 224/224 passed (213 pre-existing + 11 new). |
| Syntax / diff checks | `node --check` on `src/orchestration/createCompanySnapshot.mjs` and `test/create-company-snapshot.test.mjs`; `git diff --check` passed. |
| Provider accounting | B5 Stage A Exa Search requests: 0; Exa Contents requests: 0; publisher requests: 0; other network requests: 0. Cumulative accounting remains Search 22 / Contents 2 / B4B retries 0. |
| Protected-path audit | `git status --short` / `git diff --name-only` confirmed no file under `src/targeting/`, `src/discovery/`, `src/selection/`, `src/verification/`, `src/description/`, or `src/snapshot/` was modified. |

B5 Stage A is **implemented and zero-network tested but not live-gate approved** — mocked-dependency tests passing is not a live-gate pass or phase approval. No HTTP endpoint, frontend, or deployment exists. Phase C and deployment remain unstarted.

### B5 — integrated live gate (preflight blocked)

| Measure | Observed result |
| --- | --- |
| Harness | `scripts/phase-b5-live-smoke.mjs` calls the real, reviewed `createCompanySnapshot()` (commit `4ea2bceb022043fb03c9c7fbe1a6f3a609fe36a5`) exactly once, restricted to `--company NVIDIA` with `--confirmed-free-starter` required. Provider counting uses thin wrappers registered through B5's existing `services` seam; each wrapper delegates entirely to the real `discoverCompany`/`verifyCompanyDiscovery`/`requestCompanyDescription`/`assembleSnapshot` and alters no return value or decision. |
| Zero-network harness tests (at first attempt) | `node --test test/phase-b5-live-smoke.test.mjs` — 15/15 passed: NVIDIA-only restriction, confirmation-flag/key/mode gating, unknown/extra-argument rejection, zero-network `--help`, API-key redaction, a full fake-network no-fallback run and a full fake-network one-fallback run each driving the real production pipeline end-to-end with correct wrapper call counts and a correct final `snapshot` shape, provider-budget-ceiling rejection (missing/duplicated broad Search, >2 total Search, >1 Contents, a completed B3 result with zero Contents requests), a fake-network exercise proving a throw after real counted broad/publisher/Contents activity is captured as a stage-and-count-rich diagnostic rather than collapsing to an error string, a direct unit test of the diagnostic builder, the formatted summary never containing the API key, and non-mutation of the captured production results. |
| Full zero-network suite (at first attempt) | `node --test test/*.test.mjs` — 239/239 passed (224 pre-existing + 15 new). |
| CLI live-gate attempt | `node scripts/phase-b5-live-smoke.mjs b5-live-smoke --company NVIDIA --confirmed-free-starter` — run exactly once. `EXA_API_KEY` was unavailable to the process (not read/sourced from `.env`); the harness's own `validateOptions()` gate stopped it before any network call. CLI live-gate attempts: 1; network-backed B5 executions: 0. |
| Provider accounting | Live Exa Search: 0; live Exa Contents: 0; live publisher requests: 0; retries: 0. Cumulative Exa Search remains 22 (unchanged); cumulative Exa Contents remains 2 (unchanged). |
| Outcome | **`B5 LIVE GATE PRE-FLIGHT BLOCKED — CREDENTIAL/ENVIRONMENT UNAVAILABLE`** — an environment/credential stop, not a provider-side authentication result and not an integration-correctness outcome. |

No B1–B4B or B5 production file changed as part of this first attempt. No second company and no retry occurred. This first CLI attempt produced zero network-backed B5 executions; that remains historical fact.

### B5 — first network-backed execution (not passed; harness diagnostic gap found and fixed)

| Measure | Observed result |
| --- | --- |
| CLI command | `node --env-file=.env scripts/phase-b5-live-smoke.mjs b5-live-smoke --company NVIDIA --confirmed-free-starter` — run exactly once, reached the real pipeline. |
| Resolved identity | `NVIDIA Corporation` / `nvidia.com` |
| B3 result | `verified`; evidence count 3; fallback used: `false`; broad Search: 1; publisher requests: 6 |
| B4B result | `description_unavailable`; underlying `reason` **not captured** at the time of this run (harness gap, described below) |
| Final B5 result | `{ state: "unavailable", reason: "description_unavailable" }` |
| Total latency | 6378 ms |
| Provider accounting | Exa Search made: 1; Exa Contents made: 1; publisher requests: 6; retries: 0. Cumulative Exa Search: 22 → 23. Cumulative Exa Contents: 2 → 3. |
| Harness gap | `deriveObserved()` omitted `captured.description.reason`, so a `description_unavailable` result's specific cause (one of `unsuccessful_status`, `empty_summary`, `invalid_sentence_count`, `too_long`, `embedded_url`, `invalid_source_url`, `untrusted_source_domain`) was dropped from both the normal summary and the failure diagnostic. Corrected: `reason` is now preserved in both. |
| Corrective regressions | `node --test test/phase-b5-live-smoke.test.mjs` — 19/19 passed (15 prior + 4 new): a captured `description_unavailable` reason is retained in a normal summary; the same reason is retained in a failure diagnostic; a successful `described` summary exposes no `reason` key; redaction still strips the API key when a reason is present. |
| Full zero-network suite (after correction) | `node --test test/*.test.mjs` — 243/243 passed (224 pre-existing + 19). |
| Outcome | **`B5 INTEGRATED LIVE GATE — NOT PASSED (B4B DESCRIPTION REJECTED; UNDERLYING REASON UNKNOWN DUE TO A HARNESS DIAGNOSTIC GAP, NOW FIXED)`** |

B1–B3 integration through the real B5 orchestration was observed to work correctly: identity resolution, evidence verification, provider budget, and no retry all behaved as designed. B5's error-mapping was also correct — a normal B4B content-quality rejection was mapped to the public `unavailable`/`description_unavailable` contract with no leaked diagnostics. The gate did not pass only because B4B rejected the description, for a reason this specific run cannot identify; that reason is recorded as unknown, not guessed. No conclusion is drawn that B5's orchestration logic is broken. As of this record no second network-backed NVIDIA execution had occurred; no production `src/` file changed. A further live attempt, to observe the actual rejection reason under the corrected harness, required fresh project-owner authorization. See `docs/PHASE_B5_LIVE_GATE.md` and `docs/AI_FAILURE_LOG.md`. (That further attempt is recorded below.)

### B5 — second network-backed execution (passed)

| Measure | Observed result |
| --- | --- |
| CLI command | `node --env-file=.env scripts/phase-b5-live-smoke.mjs b5-live-smoke --company NVIDIA --confirmed-free-starter` — run exactly once, with the corrected (reason-preserving) harness. |
| Resolved identity | `NVIDIA Corporation` / `nvidia.com` |
| B3 result | `verified`; evidence count 3; fallback used: `false`; broad Search: 1; publisher requests: 6 |
| B4B result | `state: "described"`; `sourceUrl: "https://nvidia.com/"`; provider latency 1870 ms; estimated cost $0.001 |
| Final B5 result | `state: "snapshot"`; company `NVIDIA Corporation` / `nvidia.com`; 3 signals matching the 3 verified evidence records (2 `FIRST_PARTY` `blogs.nvidia.com`, 1 `OTHER` `globenewswire.com`, all `RECENT`) |
| Total latency | 5533 ms |
| Provider accounting | Exa Search made: 1; Exa Contents made: 1; publisher requests: 6; retries: 0. Cumulative Exa Search: 23 → 24. Cumulative Exa Contents: 3 → 4. |
| Outcome | **`B5 INTEGRATED LIVE GATE — PASSED FOR ONE KNOWN-GOOD COMPANY (NVIDIA)`** |

The full B1→B4A path succeeded end-to-end within the frozen provider budget, confirming the integrated path can succeed for the one authorized case. It does not establish broad reliability across arbitrary companies, and it does not retroactively explain the prior attempt's `description_unavailable` rejection — that reason remains permanently unknown; ordinary content-quality variability across two separate live Contents calls to the same page is a plausible but unconfirmed explanation. No second NVIDIA execution occurred after this one; no other company was run; no production `src/` file changed. See `docs/PHASE_B5_LIVE_GATE.md`. Broader Phase B validation (additional/edge-case companies) is recorded below.

### Phase B validation — representative cohort (complete)

| Measure | Observed result |
| --- | --- |
| Harness | `scripts/phase-b-validation.mjs` calls the real `createCompanySnapshot()` once per case for the fixed six-case cohort (`Stripe`, `PostHog`, `Canva`, `notion.so`, `Mercury`, `Craigslist`), in fixed order, with no argument to select a different company — reuses `scripts/phase-b5-live-smoke.mjs`'s generic budget/diagnostic helpers directly. |
| Zero-network harness tests | `node --test test/phase-b-validation.test.mjs` — 11/11 passed: exact fixed allowlist (no NVIDIA, no duplicates), confirmation-flag/key/mode gating, unknown-argument rejection, zero-network `--help`, API-key redaction, three full fake-network exercises of the real pipeline reaching `snapshot`/`clarification_needed`/`insufficient_evidence` respectively, and run/stop-on-failure sequencing (runs every case in order when all succeed; stops immediately and skips later cases when one fails). |
| Full zero-network suite | `node --test test/*.test.mjs` — 254/254 passed (243 pre-existing + 11 new). |
| Live execution | `node --env-file=.env scripts/phase-b-validation.mjs b-validation --confirmed-free-starter` — run exactly once; all six cases executed; none threw; no budget violation; no retry. |
| Results | `Stripe` → `snapshot` (3/3 verified, no fallback, 1 Search, 1 Contents, 3 publisher, 4884 ms). `PostHog` → `snapshot` (3/3 verified, no fallback, 1 Search, 1 Contents, 8 publisher, 9978 ms). `Canva` → `snapshot` (3/3 verified, no fallback, 1 Search, 1 Contents, 5 publisher, 13856 ms). `notion.so` → `clarification_needed`/`company_ambiguous` (1 Search, 0 Contents, 0 publisher, 2103 ms). `Mercury` → `clarification_needed`/`company_ambiguous` (1 Search, 0 Contents, 0 publisher, 2355 ms). `Craigslist` → `clarification_needed`/`company_ambiguous` (1 Search, 0 Contents, 0 publisher, 1904 ms). |
| Manual source inspection | Stripe: all 3 signals first-party (`stripe.com`), snippets substantively support their titles. PostHog: 2/3 first-party; 1 signal's captured snippet is extremely thin ("Copy page The clues were there all along."), a snippet-quality concern similar in kind to the previously-documented NVIDIA noisy-snippet limitation. Canva: 0/3 first-party; signals 2 and 3 have near-identical titles and appear to be syndicated coverage of the same underlying announcement that the existing lexical-dedup heuristic did not catch. |
| Provider accounting | This run: Search 6 (1/case), Contents 3 (Stripe/PostHog/Canva only), publisher 16, retries 0. Cumulative: Search 24 → 30; Contents 4 → 7. |
| Outcome | **`PHASE B VALIDATION — COMPLETE; NO SAFETY OR FABRICATION FAILURE OBSERVED; TWO FINDINGS FLAGGED FOR PROJECT-OWNER REVIEW BEFORE BROADER RELIABILITY IS CLAIMED`** |

No recency, dedupe, source, targeting, or description rule was loosened during this gate, and no B1–B5 production `src/` file changed. Mercury's clarification is the intended safety outcome for that edge case. `notion.so`'s and Craigslist's clarifications are honest, non-fabricated outcomes but were not the specifically anticipated result for those cases and are flagged, not explained, here. Canva's no-first-party-source and likely-duplicate-coverage pattern is recorded for project-owner review, not repaired. See `docs/PHASE_B_VALIDATION.md` for the full matrix and per-case detail. Endpoint/UI integration (B5→B application layer), Phase C, and deployment remain unstarted.

### Phase B validation — project-owner review correction

| Measure | Observed result |
| --- | --- |
| Trigger | Project-owner review found the "COMPLETE; two findings flagged" framing above understated the actual gate status against §3, and that the six-case run's public `company_ambiguous` reason hid the real underlying B1/B2 discovery reason. |
| Manual grounding continuation (0 Exa calls) | Of the 9 signals across the three `snapshot` cases, 5 exact URLs were reconstructed with high confidence from already-recorded exact-title/exact-date matches elsewhere in this repository's history and opened; all 5 materially supported their displayed claim with a matching date. The remaining 4 (1 PostHog, all 3 Canva) had no recoverable full URL anywhere in the record — only a truncated domain fragment — and were not guessed or fetched. |
| Canva duplicate-event question | Not confirmed by page inspection, because neither exact Canva URL was recoverable. Title/metadata evidence (near-identical titles, six days apart, two different secondary/syndication domains) remains suggestive but unproven; no dedupe-logic change was made or implied. |
| Harness fix (validation-harness-only, 0 `src/` changes) | `scripts/phase-b5-live-smoke.mjs`'s `deriveObserved()` now surfaces `discovery: { state, reason }` from the captured B1/B2 result, alongside the existing `verification`/`description` fields — preserving the real underlying discovery reason that the public B5 contract collapses to `company_ambiguous`. 3 new regression tests added (18–20); an existing Mercury-fixture test extended with a `discovery.reason` assertion. Full suite: 257/257 (254 + 3). |
| Diagnostic reruns (2 Exa Search, 0 retries) | `notion.so`: 1 Search, `clarification_needed` / public `company_ambiguous` / **underlying `contradictory_identity`**. `Craigslist`: 1 Search, `clarification_needed` / public `company_ambiguous` / **underlying `insufficient_identity_evidence`**. No fallback, no Contents, no budget violation, no exception in either case. |
| Provider accounting | Cumulative Exa Search: 30 → **32**. Cumulative Exa Contents: unchanged at **7**. Retries: unchanged at **0**. |
| Revised gate status | §3.2 (5/5 ordinary resolution) **fails** (`notion.so` did not resolve). §3.5 (manual grounding) **partially satisfied** (5/9 opened; 4/9 unrecoverable). §3.6 (distinctness) **unconfirmed** for Canva. §3.8 (Craigslist sparse-company honesty) **not clearly satisfied** — its outcome was an identity-evidence gap, not the sparse-evidence result §3.8 was written to accept. §3.3, §3.4, §3.7, §3.9 remain passed. |
| Outcome | **`PHASE B VALIDATION — NOT APPROVED / REQUIRES PROJECT-OWNER DECISION`**, superseding the earlier "COMPLETE" framing. No safety or fabrication failure is newly found; B1/B2 production behavior is not repaired here. See `docs/PHASE_B_VALIDATION.md`'s "Project-owner review correction (2026-09-10)" section for the full per-signal matrix and gate-by-gate rationale. |

No B1–B5 production `src/` file changed; no recency, dedupe, source, targeting, or description rule changed. Phase C, endpoint/UI, and deployment remain unstarted and unauthorized.

### Phase B validation — second-pass correction (harness hardening + documentation accuracy)

| Measure | Observed result |
| --- | --- |
| Trigger | Project-owner review of the correction above found: a stale `README.md`; `runValidationCase()` accepting non-cohort input (including `NVIDIA`) when imported directly, despite the CLI's own fixed cohort; no genuine pipeline-level test reaching `contradictory_identity`; and an internally inconsistent manual-grounding date claim for one PostHog signal. |
| README fix | Both status paragraphs corrected from stale `COMPLETE`/Search 30 to current `NOT APPROVED / REQUIRES PROJECT-OWNER DECISION`/Search 32, with the `contradictory_identity`/`insufficient_identity_evidence` reasons, the 5/9 grounding result, and Canva's unconfirmed (not established) duplicate status. |
| Fixed-cohort enforcement (0 `src/` changes) | `runValidationCase()` now rejects any input outside `ALLOWED_CASES` before any counter/service setup or fetch. `notion.so`/`Craigslist` remain callable (used exactly this way for the diagnostic reruns above); `NVIDIA` and an arbitrary seventh company are rejected pre-network. 2 new zero-network tests (12–13) prove rejection with zero fetch calls. |
| `contradictory_identity` pipeline regression | A new test (15) drives the real, unmodified `runValidationCase("notion.so", ...)` → `confirmCompanyIdentity()` domain-kind path with a fake-network fixture whose synthesized identity returns a genuinely different `officialDomain` than the submitted target, confirming the real production code reaches `discovery.reason === "contradictory_identity"` while the public result still collapses to `company_ambiguous`. This is an illustrative fixture reproducing the general mismatch mechanism, not a claim about Exa's actual live `notion.so` response, which was never retained. **(Superseded note, see B1R1 below: this test's original fixture used a same-brand `notion.com` proposal, which the subsequently approved B1R1 reconciliation rule now correctly accepts instead of rejecting; the fixture was updated to an unrelated brand to keep testing genuine mismatch, and a new test proves the same-brand shape now reconciles.)** |
| Manual-grounding wording fix | Signal 5 (`posthog.com/blog/stripe-projects`) previously claimed no dateline was found; re-inspecting the fetch-tool output already produced for that URL in the original Step 1 pass (no new fetch) shows it explicitly reported a March 26, 2026 date matching the record. That output was never persisted to a file — this basis rests on the AI session's own record, like every other "opened page" claim in this correction, not on a greppable repo artifact. The row is corrected; the aggregate "5/9 with matching dates" claim required no change. |
| Verification | `node --check` on both changed `.mjs` files; `test/phase-b-validation.test.mjs` 15/15; `test/phase-b5-live-smoke.test.mjs` 22/22 (unchanged by this pass); full suite `node --test test/*.test.mjs` 261/261 (257 + 4 new: tests 12–15); `git diff --check` passed. 0 Exa Search, 0 Contents, 0 publisher requests, 0 retries. |
| Outcome | No change to gate status or provider accounting (Search 32 / Contents 7 / retries 0 unchanged). `PHASE B VALIDATION — NOT APPROVED / REQUIRES PROJECT-OWNER DECISION` stands. See `docs/PHASE_B_VALIDATION.md`'s "Second-pass correction" section for full detail. |

No B1–B5 production `src/` file changed; no production behavior, recency, dedupe, source, targeting, or description rule changed. Phase C, endpoint/UI, and deployment remain unstarted and unauthorized.

### B1R1 — conservative cross-TLD canonical-domain reconciliation

| Measure | Observed result |
| --- | --- |
| Root cause repaired | `notion.so`'s `contradictory_identity`: Exa's discovery response named `notion.com` as the unambiguous (`ambiguous:false`), strongly-grounded official domain for a `notion.so` input; the pre-existing rule only accepted the submitted domain or its subdomains. |
| Approved rule (`src/targeting/companyTarget.mjs`) | A domain input may accept a different provider-proposed domain only when ALL hold: (A) `ambiguous === false` exactly; (B) both hostnames have exactly two labels; (C) their leftmost labels are exactly, non-fuzzily equal; (D) the resolved name is consistent with that shared label via the existing `namesAreConsistent()`; (E) resolved-name grounding directly corroborates the proposed domain; (F) **every** official-domain grounding citation (not just one) is on the proposed domain; (G) combined evidence URLs also corroborate it. Any failure preserves `contradictory_identity` unchanged. No company/domain hardcoding, new dependency, network call, or retry. |
| Sub-agent reviews | Investigation pass: no exploitable false positive found (empty labels, multi-label hosts, IDN homographs all correctly excluded); documented one by-design residual risk — short/generic shared brand labels (e.g. `x.co`/`x.com`) can't be distinguished from unrelated companies by this rule alone, inherent to domain-only input with no independent submitted name. Independent diff review against 16 safety/scope criteria: no issues found. |
| Focused zero-network tests | `test/company-target.test.mjs` 30/30 (17 new: successful reconciliation, legal-suffix name variants, same-domain/subdomain unaffected, different-brand rejection, `ambiguous:true`/missing rejection, name-inconsistency rejection, missing/empty/mixed/malformed grounding rejection, multi-label exclusion, deceptive-hostname rejection, case-insensitivity, IDN-homograph rejection, short-label documented limitation). `test/discover-company.test.mjs` 10/10 (2 new: pipeline-level reconciliation success, unrelated-domain pipeline-level rejection). `test/phase-b-validation.test.mjs` 16/16 (existing test 15's fixture updated from a same-brand shape — now legitimately reconciling — to an unrelated brand to keep testing genuine mismatch; new test 16 proves the original same-brand shape now reconciles through the real harness pipeline). |
| Full zero-network suite | `node --test test/*.test.mjs` — **281/281** passed (261 pre-existing + 20 net new: 17 in `company-target.test.mjs`, 2 in `discover-company.test.mjs`, 1 net new in `phase-b-validation.test.mjs` — test 15 was modified in place and test 16 added). `node --check` on all changed files and `git diff --check` passed. `git diff --stat -- src/` shows exactly one file, `src/targeting/companyTarget.mjs` (+63/-1). |
| Live confirmation (1 authorized run, 0 retries) | `runValidationCase("notion.so", apiKey, {})`: discovery `ready_for_verification`, resolved `Notion Labs, Inc.` / `notion.com` (no longer `clarification_needed`). B3 verification then reached `insufficient_evidence` (0 accepted records) despite 1 broad + 1 naturally-triggered fallback Search and 20 publisher fetch attempts; B4B produced a grounded description from `https://notion.com/`. Final public state: `insufficient_evidence`, 0 signals. Total latency 14,755 ms. |
| Provider accounting | Broad Search 1; fallback Search 1; total Search 2; Contents 1; publisher 20; retries 0. Cumulative: Search 33 → **35**; Contents 7 → **8**. |
| Stop rule applied | Per pre-authorization, the run was recorded and not repeated or investigated further once B3 reached a non-snapshot state — this is a new, distinct downstream finding, not a B1R1 regression, and is not repaired here. No signal URLs exist to record since 0 evidence was accepted and no snapshot was produced. |
| Gate impact | The `notion.so` identity-resolution defect behind the original §3.2 failure is fixed and confirmed live, but this does not formally re-certify §3.2's "5/5" cohort metric (an authorized full six-case re-run would be required) and §3.3 (usable coverage) remains unsatisfied for `notion.so` since it still does not reach a snapshot. No other §3 gate is affected; Craigslist, Canva, and the manual-grounding URL-persistence gap remain exactly as previously recorded. |
| Outcome | **`PHASE B VALIDATION — NOT APPROVED / REQUIRES PROJECT-OWNER DECISION`** still stands. See `docs/PHASE_B1R1_RECONCILIATION.md` for the full record. |

No B2–B5 production `src/` file changed; B1 changed only via this one approved, generic reconciliation rule. No recency, dedupe, source, or description rule changed. Craigslist and Canva are untouched. Phase C, endpoint/UI, and deployment remain unstarted and unauthorized.

### B3R0 — Notion evidence-rejection diagnostic

| Measure | Observed result |
| --- | --- |
| Purpose | Determine why B1R1-resolved `notion.so` (`Notion Labs, Inc.` / `notion.com`) reached B3 `insufficient_evidence` with 0 accepted evidence. |
| Method | Real, unmodified `discoverCompanyForSmoke()` → `verifyCompanyDiscoveryForSmoke()` smoke observers; no `createCompanySnapshot()`, no Contents, no B4A/B4B. |
| Result | 10 broad + 10 fallback candidates attempted; 19 rejected `unsupported_claim`, 1 accepted. All 19 rejections had a populated `sourceClass` (structural extraction gate passed) and `recencyBucket: null` (rejected before recency was ever evaluated) — by elimination against the exact `verifyCandidate()` decision order, this isolates the failure to the `matchesCompany()` gate specifically. |
| Representative deep inspection (3 URLs, unmodified `fetchHtmlSource`/`extractArticleEvidence`) | `notion.com/blog/building-shared-memory-for-ai-agents-in-notion`, `notion.com/en-gb/releases/2026-09-09`, `notion.com/blog/introducing-developer-platform` — all fetched successfully, real article containers, substantial bodies (451–9,613 chars), valid extracted dates; all contained "notion"; none contained "labs". |
| Sub-agent review | An adversarial reviewer confirmed the elimination logic is airtight (`fetchHtmlSource()` can never itself return `unsupported_claim`; `classifyRecency()` never returns null), and flagged two honest limits: the mechanism was directly confirmed for only 3 of 19 candidates, and the one accepted candidate's own content was never fetched to confirm why it passed. |
| Root cause | `matchesCompany()` requires every non-legal-suffix token of the resolved company name to appear in text; `"Notion Labs, Inc."` → tokens `["notion","labs"]` after stripping "inc"; ordinary first-party Notion content says "Notion" but not "Labs" (a formal corporate-entity word, not brand usage). |
| Provider accounting | This diagnostic: broad Search 1, fallback Search 1, Contents 0, publisher 20 (smoke) + 3 (deep inspection) = 23, retries 0. Cumulative: Search 35 → **37**; Contents unchanged at **8**. |
| Outcome | Diagnostic only — no `src/` change, no repair. See `docs/PHASE_B3R3_FIRST_PARTY_COMPANY_MATCHING.md` for the repair this diagnosis led to. |

### B3R3 — first-party brand-aware company matching

| Measure | Observed result |
| --- | --- |
| Rejected approaches | Adding "labs" to `LEGAL_NAME_SUFFIXES` (not a true legal suffix; a targeted carve-out); a generic corporate-word ignore list (`group`, `technologies`, `systems`, `holdings`, ...) (weakens matching globally, including secondary sources); switching `matchesCompany` from "all tokens" to "any token" globally (removes the actual safety property). |
| Approved rule (`src/verification/verifyCompany.mjs`) | The existing strict `matchesCompany()` is byte-for-byte unchanged and runs first for every source class. A second path, `matchesFirstPartyBrand()`, is consulted only when strict matching fails **and** `sourceClass === FIRST_PARTY` (against the B1/B1R1-confirmed official domain). It requires: a non-empty brand token from the official domain's leftmost label; that token represented in the resolved company name; that token literally present in the article text. Every later gate (triviality, date, recency, support-sentence matching, duplicate) is unaffected either way. |
| Sub-agent reviews | Safety/test-design reviewer: traced `officialDomain` provenance (never candidate-derived), confirmed the fallback is structurally unreachable for `OTHER` sources (short-circuit `&&`), confirmed `classifySource`'s leading-dot boundary correctly rejects impostor hosts, assessed the short-brand-label residual risk as pre-existing and bounded by prior B1/B1R1 confirmation — not new. Independent diff reviewer: checked 12 explicit non-goals (suffix list, ignore list, `matchesCompany` unchanged, `FIRST_PARTY`-only gating, no domain-alone acceptance, no hardcoded company/domain, later gates unmodified, single-file scope, no new dependency/network/retry, tests exercise real functions with specific-reason assertions) — no issues found. One recommended test (hyphenated multi-token brand) added. |
| Focused zero-network tests | 11 new/strengthened `B3R3:`-prefixed tests in `test/verification.test.mjs`: strict matching unaffected; first-party Notion brand-fallback acceptance; identical content on OTHER domain not receiving fallback; first-party page never mentioning the brand still rejected; first-party page with brand inconsistent with resolved name still rejected; strict match unaffected on OTHER source; deceptive impostor hostname classified OTHER and denied fallback; brand fallback not bypassing trivial/date/stale/duplicate rejection (duplicate case asserts the exact `"duplicate"` trace reason); brand fallback passing company matching but not bypassing support-sentence matching (a claimed event absent from the article body is still rejected `unsupported_claim`, confirmed via diagnostics to fail at that specific gate); hyphenated multi-token brand label; pipeline-level regression accepting 3 distinct first-party Notion candidates through the real `verifyCompanyDiscovery()` flow. |
| Full zero-network suite | `node --test test/*.test.mjs` — **292/292** passed (281 pre-existing + 11 net new). `node --check` and `git diff --check` passed. `git diff --stat -- src/` shows exactly one file, `src/verification/verifyCompany.mjs` (+35/-2). |
| Live confirmation (1 authorized run, 0 retries) | `runValidationCase("notion.so", apiKey, {})` reached `state: "snapshot"`. Company `Notion Labs, Inc.` / `notion.com`. Verification `verified`, 3/3 evidence, fallback used. Description `described` from `https://notion.com/`. Broad Search 1, fallback Search 1 (natural), Contents 1, publisher 12, retries 0, latency 9,651 ms. |
| Exact signals | 1. "Introducing Notion's Developer Platform" — 2026-05-13 — `FALLBACK` — `FIRST_PARTY` — `https://www.notion.com/blog/introducing-developer-platform`. 2. "Control which AI models your agents can use" — 2026-09-09 — `RECENT` — `FIRST_PARTY` — `https://www.notion.com/en-gb/releases/2026-09-09`. 3. "Share Notion Workers across your team" — 2026-07-09 — `RECENT` — `FIRST_PARTY` — `https://www.notion.com/releases/2026-07-09`. |
| Manual grounding | All 3 URLs opened directly (not snippet-only): all real, official Notion pages; all materially support their displayed claim; all dates page-confirmed; company identity correct in all 3. Distinct-event judgment: 3 distinct headlines/dates/feature scopes, not the same announcement republished; signals 1 and 3 noted as thematically related sequential Developer Platform features roughly two months apart — recorded transparently, not treated as a failure. |
| Provider accounting | Cumulative Exa Search: 37 → **39**. Cumulative Exa Contents: 8 → **9**. Retries: unchanged at **0**. |
| Gate impact | `notion.so` now reaches a genuine, manually-grounded `snapshot`, resolving the specific §3.3 blocker for this case. Does not formally re-certify §3.2/§3.3 cohort metrics (requires an authorized full six-case re-run). Craigslist, Canva, and the manual-grounding URL-persistence gap remain exactly as previously recorded. |
| Outcome | That was **`PHASE B VALIDATION — NOT APPROVED / REQUIRES PROJECT-OWNER DECISION`**. See `docs/PHASE_B3R3_FIRST_PARTY_COMPANY_MATCHING.md` for the full record. |

No B1/B2/B4A/B4B/B5 production `src/` file changed; B3 changed only via this one approved, narrow, `FIRST_PARTY`-only matching rule. No recency, dedupe, extraction, date, or triviality rule changed.

### Craigslist and Canva closing diagnostics, and the Phase B owner decision

| Measure | Observed result |
| --- | --- |
| Craigslist diagnostic | One `discoverCompanyForSmoke("Craigslist", apiKey, {})` invocation ran the unmodified production discovery path exactly once and exposed the sanitized identity/grounding diagnostic used to reconstruct the B1 decision. It made 1 Exa broad Search, 0 fallback, 0 Contents, 0 publisher requests, and 0 retries; 0 additional Exa/provider calls followed. It reproduced `Craigslist, Inc.` / `craigslist.org` / `ambiguous:false`; name consistency passed; the failing predicate was `evidenceCorroboratesDomain` — all 5 combined-grounding URLs were third-party commentary sites, none on `craigslist.org`. One separately authorized non-Exa direct-domain HTTP HEAD redirect chain confirmed `craigslist.org` is genuinely live. The independent Identity-evidence reviewer confirmed the reconstruction with no error. |
| Craigslist classification | **Safe provider-evidence limitation / known limitation — no repair authorized.** Whether the lack of first-party corroboration is a persistent structural pattern or an artifact of this single provider sample remains unknown. |
| Canva diagnostics (3 live attempts total across this and prior tasks) | (1) Original six-case Phase B cohort run: resolved, reached `snapshot`, unconfirmed Visual Suite duplicate-event question, 0 first-party signals. (2) Later Canva evidence-quality production run through `runValidationCase`: failed identity, `insufficient_identity_evidence`; it used no sub-agent and did not retain raw grounding detail, so its exact B1 predicate path was not independently reconstructed. (3) Fresh raw Canva identity-evidence diagnostic through `requestExaBroadDiscovery` plus local B1 reconstruction: resolved cleanly — `Canva` / `canva.com` / `ambiguous:false`, one `canva.com` grounding citation matching 1 of 10 raw candidates; one read-only B1 evidence-policy reviewer independently confirmed that successful B1 reconstruction. Across the observed runs, no deterministic B1 defect has been established. |
| Canva classification | **Provider-response variability at the identity-grounding layer — no repair; no deterministic bug established.** The historical Visual Suite duplicate-event concern remains **UNRESOLVED** (the two later runs never reached signal selection, so it was neither confirmed nor refuted). A candidate-URL-as-domain-corroboration idea was explicitly not implemented — the one failed Canva run never retained its raw candidate list, so there is no direct evidence it would have helped. |
| Provider accounting | Post-B3R3 chronology: Craigslist diagnostic Search 39 → 40; Canva evidence-quality production run 40 → 41; Canva raw identity-evidence diagnostic 41 → 42. Total: 3 Searches; 0 Contents; 0 retries. Cumulative: Search 39 → **42**; Contents unchanged at **9**; retries unchanged at **0**. |
| Owner decision | **`PHASE B — APPROVED FOR FRONTEND INTEGRATION WITH KNOWN LIMITATIONS`.** §3.2 (5/5 ordinary resolution) is explicitly **not** marked passed — preserved as an accepted, documented internal-benchmark shortfall, not a corrected defect, because the observed Canva behavior is safe variability rather than wrong-entity resolution or fabrication, further Search repetitions would only sample stochastic behavior, and speculative fallback logic would add complexity without direct supporting evidence. §3.3–§3.9 statuses are unchanged from their prior recorded values. |
| Backend freeze | B1–B5 (targeting, discovery, identity policy, Exa query/schema, selector, verification, recency, date extraction, dedupe, source matching, description, orchestration, provider limits, retries) frozen for Phase C, reopened only on a concrete correctness/security defect found in later end-to-end testing. |
| Phase C | Authorized to begin after this closure record is reviewed and its closure commit is pushed; not begun by this record. |

No B1–B5 production `src/` file changed by either diagnostic or by this closure. See `docs/PHASE_B_OWNER_DECISION.md` for the complete record.

## Phase C

### C1 — server-side HTTP boundary

| Measure | Observed result |
| --- | --- |
| Scope | Added one dependency-free native Vercel Web handler at `api/snapshot.mjs`; no frontend, local server, deployment, or frozen B1–B5 behavior changed. |
| Request contract | `POST` JSON `{ "input": string }`; only nonblank strings proceed, and the original string is passed unchanged to `createCompanySnapshot(input, apiKey)` exactly once. Unsupported methods return 405 plus `Allow: POST`; malformed/missing/non-string/blank input returns 400. |
| Public response contract | Valid B5 `snapshot`, `clarification_needed`, `insufficient_evidence`, and `unavailable` objects pass through unchanged with HTTP 200. Invalid requests reuse `clarification_needed` / `invalid_input`; missing server configuration and unexpected failures reuse sanitized `unavailable` / `provider_unavailable` with HTTP 503 and 500 respectively. No new public state/reason was introduced. |
| Security | Production reads `EXA_API_KEY` only from `process.env`, never a body or URL. Error handling returns no exception message, stack, provider body/tag/diagnostic, or key. Responses use JSON and `Cache-Control: no-store`; source URLs are not rewritten. |
| Focused zero-network tests | `node --test test/snapshot-api.test.mjs` — **9/9 passed**. Covers the Vercel `{ fetch }` entry point; a full 3-signal snapshot and exact source URLs; all non-snapshot B5 states with exact-once calls; partial 0/1/2-signal insufficient results; missing/non-string/blank input; malformed JSON; unsupported methods; missing/blank API-key configuration; untrimmed valid input/key pass-through; sanitized unexpected backend errors; no retry; JSON/cache/method headers; and key non-disclosure. |
| Full zero-network suite | `node --test test/*.test.mjs` — **301/301 passed** (292 pre-existing + 9 C1). |
| Syntax checks | `node --check api/snapshot.mjs` and `node --check test/snapshot-api.test.mjs` passed. |
| Provider/deployment activity | C1 made 0 Exa Search, 0 Exa Contents, 0 publisher/company, and 0 deployment-validation requests; no live provider or endpoint validation occurred. Cumulative accounting remains Search **42** / Contents **9** / retries **0**. |
| Protected-path audit | No file under `src/targeting/`, `src/discovery/`, `src/selection/`, `src/verification/`, `src/description/`, `src/snapshot/`, or `src/orchestration/` changed. No dependency or framework was added. |

Result at C1 completion: **`C1 IMPLEMENTED LOCALLY AND ZERO-NETWORK TESTED`**. The subsequent required actual-diff review passed; C1 was pushed, remotely confirmed, and formally approved at `e6ce58e91cf7806c6096ca904762218855e63c1c`. This establishes the thin HTTP adapter behavior only; it is not deployment validation or broad provider reliability evidence.

### C2 — one-page frontend

| Measure | Observed result |
| --- | --- |
| Scope | Added only `public/index.html`, `public/styles.css`, `public/app.js`, and browser-free native-node coverage in `test/app.test.mjs`; no endpoint, backend, dependency, provider, deployment, or frozen B1–B5 change. |
| Browser request contract | One intentional submission makes one `POST /api/snapshot` request with exactly JSON `{ input }`. Blank input remains local clarification; a synchronous in-flight guard ignores duplicate submits; the UI disables while loading and restores controls in `finally`. |
| Public states | Tests cover valid `snapshot` (exactly 3 signals), `clarification_needed` (`invalid_input` and `company_ambiguous`), `insufficient_evidence` (0–2 signals), and sanitized `unavailable`, plus malformed and unknown result rejection. |
| Presentation and safety | Dynamic text uses DOM nodes and `textContent`, with no `innerHTML`. Safe sources preserve the exact URL, display only the hostname, open with `_blank`/`noopener noreferrer`, and reject `javascript:`, `data:`, `file:`, malformed, and empty URLs. |
| Visual-polish correction | CSS-only sunset/faceted-shard treatment, a substantially opaque shell refinement, and idle-height rebalance. Decorative markup is `aria-hidden`; decorative CSS cannot receive pointers, is reduced on narrow screens, and respects reduced motion. No functional or backend behavior changed. |
| Focused zero-network tests | `node --test test/app.test.mjs` — **36/36 passed** after the visual-polish correction. Covers public-result validation, all four rendered public states, date/source fallbacks, request body and endpoint, no-request blank input, update lifecycle, duplicate-submit guard, malformed/JSON/transport failures, source rendering, hostile text rendering, and static dependency/network-scope checks. |
| Full zero-network suite | `node --test test/*.test.mjs` — **337/337 passed** after the visual-polish correction (301 pre-existing + 36 C2). |
| Provider/deployment activity | C2 made 0 Exa Search, 0 Exa Contents, 0 publisher/company, 0 live endpoint, and 0 deployment-validation requests. Cumulative accounting remains Search **42** / Contents **9** / retries **0**. |

Result: **`C2 IMPLEMENTED LOCALLY AND ZERO-NETWORK TESTED`**, and was subsequently reviewed, pushed, remotely confirmed, and formally approved at `8a31ad18824b54a1b0a7c59d5e0e5a785ae93f10` (`PHASE C2 — APPROVED AND CLOSED`). It is not deployment validation, production endpoint validation, or broad provider reliability evidence.

### C3 — zero-provider-network integration harness

| Measure | Observed result |
| --- | --- |
| Scope | Added `scripts/c3-local-ui-harness.mjs` (dependency-free, native-Node development/test-only tool) and `test/c3-local-ui-harness.test.mjs`; no endpoint, backend, dependency, provider, deployment, `public/`, or frozen B1–B5 change. |
| Purpose | C1 validated the HTTP boundary in isolation; C2 validated frontend logic in isolation against a fake DOM and fake `fetchImpl`. Neither exercised the real unmodified `public/` frontend against a real HTTP server over a real `fetch()` round trip. The harness closes exactly that gap with zero provider network. |
| Harness design | Native `node:http` static file server for `public/` plus a synthetic-fixture `POST /api/snapshot` route. Binds to `127.0.0.1` only. Static serving decodes the request path and rejects anything whose resolved path falls outside the public directory root (defends against literal and percent-encoded traversal, e.g. `%2e%2e`, `..%2f`). Never imports `api/snapshot.mjs` or any `src/**` module; never reads `EXA_API_KEY`, provider credentials, or production configuration (the standalone development CLI may read `C3_HARNESS_PORT` solely to select its localhost port); makes no network request. |
| Fixture triggers | `c3:snapshot` (exactly 3 signals, 1 `FALLBACK`, 3 distinct source URLs, one long title, fictitious `Example Company` / `example.test`); `c3:insufficient-0/1/2`; `c3:clarification-ambiguous`; `c3:clarification-invalid`; `c3:unavailable`; `c3:transport-error` (HTTP 200 with a non-JSON body); `c3:delay:<ms>` (artificial delay, development-only). Any other non-blank input returns the snapshot fixture so ad hoc manual input is always safe; blank input returns the same `clarification_needed`/`invalid_input` shape the real contract uses. No `public/app.js` change was needed — fixture selection reads the same `input` string the real UI already sends, so the code under browser test is byte-for-byte the approved C2 code. |
| Focused zero-network tests | `node --test test/c3-local-ui-harness.test.mjs` — **15/15 passed**. Covers: serving the real `index.html`/`app.js`/`styles.css` with correct content types; localhost-only binding; encoded path-traversal rejection; each fixture state (validated via the existing `isValidPublicResult()` frontend contract checker) including exact 0/1/2/3 signal counts; the non-JSON transport-failure and artificial-delay triggers; safe handling of blank input, malformed JSON, and unsupported HTTP methods; a static source-scan proving the harness never imports `api/`/`src/` and never reads `EXA_API_KEY`; and a reverse check that the real production `createSnapshotHandler` treats a `c3:` trigger string as ordinary opaque input with no special-casing, proving no synthetic fixture is reachable through the real endpoint. |
| Full zero-network suite | `node --test test/*.test.mjs` — **352/352 passed** (337 pre-existing + 15 new). |
| Syntax checks | `node --check scripts/c3-local-ui-harness.mjs`, `node --check test/c3-local-ui-harness.test.mjs`, `node --check api/snapshot.mjs`, and `node --check public/app.js` all passed. |
| `git diff --check` | Passed. |
| Provider/deployment activity | C3 made 0 Exa Search, 0 Exa Contents, 0 publisher/company, 0 live endpoint, and 0 deployment-validation requests. Cumulative accounting remains Search **42** / Contents **9** / retries **0**. |
| Protected-path audit | No file under `src/targeting/`, `src/discovery/`, `src/selection/`, `src/verification/`, `src/description/`, `src/snapshot/`, or `src/orchestration/` changed. `public/index.html`, `public/styles.css`, and `public/app.js` are unchanged. `api/snapshot.mjs` is unchanged. No dependency, framework, or `package.json` was added. |
| Manual browser validation | Not performed in this environment — no browser/computer-use tool was available to this agent. Code/static integration review was performed instead (above), and exact owner-side commands are recorded in the C3 Phase Completion Report so the project owner can run `node scripts/c3-local-ui-harness.mjs` and visually inspect every state, viewport, and long-content case. |

Result: **`C3 IMPLEMENTED LOCALLY AND ZERO-NETWORK TESTED`**. It is not deployment validation, production endpoint validation, live provider validation, a push, or formal C3 approval. Manual browser validation of the harness output remains owner-side.

## Phase D / production

### D1 — production deployment + bounded live smoke

| Measure | Observed result |
| --- | --- |
| Scope | Deployed the exact approved commit `8f2d13ceb0e9ddbf13b6750f7163faf78ad6ca78` to Vercel production; no source/config file changed. |
| Deployment method | Vercel CLI (`npx vercel@latest`), deployed from a clean disposable `git worktree` checked out at the exact approved SHA — guaranteeing no untracked artifact (`.claude/`, review `.patch` files, `.env`) could reach the deployment. The Vercel MCP integration returned zero teams for this account and was abandoned in favor of CLI per owner instruction. |
| Configuration | Zero-config auto-detection: no framework, `public` as static output directory, one function built at `api/snapshot` (27.17KB). No `vercel.json`, no build command, no dependency added. |
| Production URL | `https://company-snapshot-v2.vercel.app` (project `amiri-prescods-projects/company-snapshot-v2`) |
| `EXA_API_KEY` | Added as a Production-only Secret by piping directly from the local `.env` file into `vercel env add --sensitive`; value never printed, logged, or exposed client-side; confirmed via `vercel env ls` (Production/Secret/Hidden). |
| Static/HTTP preflight | Homepage/`app.js`/`styles.css` all correct status/content-type; malformed JSON, blank input, missing-field POSTs all returned sanitized `400`/`clarification_needed`/`invalid_input`; `GET /api/snapshot` returned `405`/`Allow: POST`; `/scripts/`, `/src/`, `/.env` all returned `404`. |
| Live submission 1 | `NVIDIA` (name) → `clarification_needed`/`company_ambiguous`, HTTP 200, 4.29s, no retry. |
| Live submission 2 | `stripe.com` (domain) → `unavailable`/`provider_unavailable`, HTTP 200, 0.28s, no retry. |
| Classification | Both are valid, documented B5 public-contract states returned via HTTP 200 (not the distinct HTTP 503 missing-configuration path); Vercel runtime logs showed a single clean `info`-level line each, no platform-level error. Two independent sub-agent reviews (deployment/security; live-result classification) each concluded these are safe application/provider outcomes, not deployment defects. |
| Sub-agents | Deployment/security reviewer (PASS on all 5 checked items: no secret leakage, no C3-harness reachability, minimal correct config, zero repo changes); live-smoke-result reviewer (both results classified as safe outcomes, not deployment failures). |
| Provider/deployment activity | 1–2 additional Exa Search (1 confirmed for NVIDIA; 0–1 uncertain for stripe.com's fast failure); 0 Contents. Cumulative: Search **43–44** (defensible range) / Contents **9** / retries **0**. |
| Protected-path audit | No file under `src/targeting/`, `src/discovery/`, `src/selection/`, `src/verification/`, `src/description/`, `src/snapshot/`, or `src/orchestration/` changed. `api/snapshot.mjs`, `public/**` unchanged. |

Result: **`D1 DEPLOYMENT + LIVE SMOKE PASSED`**. Neither authorized company reached `snapshot`; this establishes deployment/runtime health only, not evidence-quality validation — that is D2's purpose.

### D2 — production validation + evidence gate

| Measure | Observed result |
| --- | --- |
| Scope | Bounded live validation cohort against the unchanged D1 production deployment. Production/runtime code unchanged; documentation-only changes added the D2 validation record and reconciled README.md/docs/PLAN.md/docs/TESTING.md. |
| Cohort | `notion.so` (domain), `PostHog` (name), `Datadog` (name), `Mercury` (name) — each submitted exactly once, no retries, in the specified order. |
| notion.so | `snapshot` — `Notion Labs, Inc.` / `notion.com`, 2-sentence description, exactly 3 signals, 10.43s. |
| PostHog | `snapshot` — `PostHog` / `posthog.com`, 2-sentence description, exactly 3 signals, 6.52s. |
| Datadog | `unavailable`/`description_unavailable`, 9.14s — safe B5 contract outcome (B1–B3 progressed far enough to invoke B4B, which returned `description_unavailable`; the exact internal B4B reason is intentionally not exposed by the public contract). |
| Mercury | `snapshot` — `Mercury Technologies, Inc.` / `mercury.com`, 3-sentence description, exactly 3 signals, 6.96s (a clean resolution, differing from Mercury's historically-documented ambiguous outcome — accepted as provider-response variability, not a defect). |
| Additional submission | One owner-approved re-submission of `notion.so` through the real production browser (beyond the 4-company cohort limit), made solely for owner visual confirmation since this agent has no browser tool. Explicitly recorded as a deviation, not silently absorbed. |
| Evidence review | All 9 signal source URLs across the 3 snapshots fetched directly and manually reviewed for support/date/identity — all 9 PASS on material event support, source-derived date consistency (via JSON-LD/meta/byline), and company identity; displayed signal wording was supported by the relevant publisher headline/content (not necessarily an exact HTML `<title>` match). Independently re-verified by a dedicated evidence-review sub-agent: 9/9 PASS confirmed, no disagreement. |
| Distinctness/recency | A second sub-agent independently confirmed all three signal sets are genuinely distinct events (no duplicate-event coverage) and recomputed every recency-bucket assignment as correct; two signals flagged as boundary-adjacent (168/180 days; 86/90 days) but correctly bucketed as of the validation date. |
| Description review | All three descriptions: 2–3 sentences, correct core business, no embedded URL, no hype — PASS. |
| Owner browser validation | Performed for the `notion.so` re-submission: owner confirmed correct rendering (heading, fresh description, all 3 signals with correct titles/dates/clickable sources, "Older fallback" badge, clean layout matching approved C2 design) and that a loading state appeared. The ~375px narrow-viewport check was requested but not confirmed by the owner — recorded as not performed, not assumed. |
| Sub-agents | Evidence reviewer (9/9 PASS, independently fetched and verified); distinctness/recency reviewer (all DISTINCT, all recency buckets correct); final validation reviewer (no overclaim, exactly one new file in the diff, zero frozen-backend/production changes, provider-accounting arithmetic correct, no scope creep). |
| Full zero-network suite | `node --test test/*.test.mjs` — **352/352 passed** (unchanged from pre-D1/D2 baseline, since D1/D2 made no source-code change). |
| `git diff --check` | Passed. |
| Provider/deployment activity | 5 live submissions total; high-confidence 5 Exa Contents (all 5 reached B4B). D2 Search: 5–10 — minimum 5 because each of the 5 submissions necessarily made one broad Search; maximum 10 under the approved ceiling of at most one additional official-domain fallback Search per submission; actual fallback usage is not externally observable. 0 retries. Cumulative: Search **48–54** (defensible range) / Contents **14** / retries **0**. |
| Protected-path audit | No file under `src/targeting/`, `src/discovery/`, `src/selection/`, `src/verification/`, `src/description/`, `src/snapshot/`, or `src/orchestration/` changed. `api/snapshot.mjs`, `public/**` unchanged. No dependency, framework, or `package.json` added. |

Result: **`D2 PRODUCTION VALIDATION — PASSED`**. At least one evidence-reviewed successful production snapshot was established (in fact three), with no deterministic correctness defect found and no repair made. Full detail: `docs/PHASE_D2_PRODUCTION_VALIDATION.md`. This is not the full final assessment testing matrix and does not establish universal reliability across arbitrary reviewer-entered companies.

## Final skeptical review
_Partially run — see "Final Assessment Validation — Production Round" below. The full final assessment testing matrix (§6 above) is not yet fully covered by unique companies; several cases legitimately reuse prior approved production evidence per the mapping in that section._

---

# Final Assessment Validation — Production Round

## A. Environment

- Date: 2026-09-10
- Production URL: `https://company-snapshot-v2.vercel.app`
- Starting source SHA (deployed at the time of these observations): `a8d23f789ac5366d7e90768a1bb8cbc7a081f8de`
- Method: real production browser, used directly by the project owner (not this agent — no browser tool available in this environment)
- No mocks, no hardcoded data — every observation below is real live public-web output from the deployed application

## B. Matrix

| Input | Category | Result | Resolution | Signals | Distinctness | Evidence | UX | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `Microsoft` | large public company, name input | `clarification_needed`/`company_ambiguous` | none asserted | n/a | n/a | n/a | safe UI guidance ("Try entering its website instead.") | SAFE FAILURE / RELIABILITY LIMITATION |
| `Anthropic` | private technology company, name input | `snapshot` | Anthropic / anthropic.com | 3 | topically distinct across the 3 signals; exact-href verification incomplete (see below) | domain attribution visible; exact hrefs not preserved in the owner's record | clean rendering | PASS (with a recorded evidence-record limitation, not a product defect) |
| `linear.app` | smaller company, domain input | `insufficient_evidence`/"limited recent evidence" | Linear / linear.app | 2 (before repair) | **FAIL — same event ($99M tender / $2.5B valuation) presented as two signals** | first-party (linear.app) + secondary (pulse2.com); both materially about the same event | safe honest limited-evidence UI, but with the underlying distinctness defect | **DISTINCTNESS DEFECT — D3 repair target** |
| `Craigslist` | ambiguous/sparse-evidence company, name input | `clarification_needed`/`company_ambiguous` | none asserted | n/a | n/a | n/a | safe UI guidance | SAFE FAILURE, consistent with known Craigslist provider-evidence limitation (no repair) |
| `craigslist.org` | domain input | `clarification_needed`/`company_ambiguous` | none asserted | n/a | n/a | n/a | safe UI guidance | SAFE FAILURE, consistent with known Craigslist provider-evidence limitation (no repair) |
| `Mercury` | ambiguous name | `clarification_needed`/`company_ambiguous` | none asserted | n/a | n/a | n/a | safe UI guidance | PASS for ambiguity safety — no silent wrong-entity resolution |
| `https://` | malformed/empty input | `clarification_needed` (invalid-input presentation) | none | n/a | n/a | n/a | "Enter a company name or website to continue." | PASS — rejected before provider access (confirmed by code inspection below) |

Exact response timings were not recorded by the owner during this manual round and are not fabricated here.

## C. Detailed findings

- **Anthropic (`snapshot`, PASS):** Resolved to `Anthropic` / `anthropic.com`. Description: 2 sentences, correctly describes the company's AI model/tooling business. Exactly 3 signals were rendered, covering three visibly different topics (a T. Rowe Price partnership announcement, a reported AI-hacking-incident disclosure, and a first-party "Enterprise Frontier Safeguards" post), each with a recent date and an attributed source domain (prnewswire.com, aljazeera.com, anthropic.com respectively). **Evidence-record limitation:** the exact final `href` values were not preserved in the owner's screenshots for this record, so this D3 record cannot claim 3/3 exact-source manual verification the way the D2 record could for its three snapshots — this is a record-keeping gap, not a product defect, since the deployed UI itself renders real clickable links (confirmed structurally by the unchanged, already-tested `public/app.js` source-link rendering, `test/app.test.mjs`).
- **Microsoft (safe failure / reliability limitation):** A large, clearly identifiable public company returned `clarification_needed`/`company_ambiguous` rather than a snapshot. No wrong company was asserted — this is safe behavior — but a well-known large company failing name resolution is a genuine reliability gap worth recording honestly. One observed run does not establish a deterministic B1 defect (see §12/Microsoft analysis below); this is recorded as an accepted, unrepaired reliability limitation, not a passing case for ordinary name resolution.
- **Linear (duplicate-event failure, the D3 repair target):** The two displayed signals — a first-party `linear.app` post ("Sharing Linear's growth with the people building it") and a secondary-source article ("Linear Completes $99 Million Tender At $2.5 Billion Valuation As ARR Tops $100 Million And Net Retention Hits 177%") — are **not merely similar in subject matter**. Both report the identical underlying corporate event: Linear's $99 million tender offer completed at a $2.5 billion valuation. The system correctly refused to pad to 3 signals when only 2 sources survived verification, but it still overstated the number of *distinct* signals by presenting one event as two. This is the concrete distinctness defect that triggered the D3 repair below.
- **Craigslist / craigslist.org (safe limitation):** Both name and domain inputs produced safe `clarification_needed` presentations with no wrong-entity assertion, consistent with the previously accepted Craigslist provider-evidence limitation (`docs/PHASE_B_OWNER_DECISION.md`). Not repaired, per that prior decision and per D3's explicit instruction not to reopen it.
- **Mercury (ambiguity pass):** Produced a safe `clarification_needed` presentation rather than silently resolving to an unrelated Mercury entity — exactly the intended safety behavior this case exists to test.
- **Malformed input (`https://`, pass):** Produced the invalid-input UI presentation. Source inspection confirms this is rejected entirely before any provider access: `discoverCompany()` calls `prepareCompanyTarget()` first, and `parseDomainInput("https://")` fails to produce a hostname (the input looks like a website but yields no valid domain), so `prepareCompanyTarget()` returns `clarification("invalid_input")` immediately — `requestExaBroadDiscovery()` is never reached. Therefore Search 0 / Contents 0 / retries 0 for this case, confirmed by code path rather than by a live request.
- **Blocked-source / weak-source behavior:** No new production case was fabricated for this. Existing zero-network regression coverage already explicitly proves the required behavior: `test/verification.test.mjs`'s `"source fetch fail-closes redirect overflow, status failures, timeout, oversize, and non-HTML"` test proves an inaccessible/failed fetch is rejected (`{ok: false, reason: "inaccessible"}`) before ever becoming a candidate signal; its `"B3 smoke diagnostics trace each evaluated broad candidate without changing the production result"` test includes an explicitly inaccessible candidate (its `sourceFetchImpl` throws) that is traced as `"inaccessible"`/`"rejected"` and excluded from the final accepted set; and `"fallback duplicate evidence is rejected and exhausted evidence returns insufficient"` proves the system returns honest `insufficient_evidence` rather than padding when too few sources survive.

## D. Linear defect

Two publisher pages covering the **same** $99 million tender offer / $2.5 billion valuation event survived verification and were displayed as two separate signals. This is not lexical similarity or overlapping subject matter — it is duplicate coverage of one underlying corporate event, discovered through two dissimilarly-headlined pages. This violates the product's distinct-event requirement (`docs/TESTING.md` §3.6 / the assessment brief's "duplicate coverage of one event" requirement) and is the concrete correctness defect that triggered the D3 narrow repair below.

## E. Repair verification

**Reproduction:** A focused zero-network regression (`test/verification.test.mjs`, `"D3: two dissimilar-headline pages covering the same $99M tender / $2.5B valuation event are recognized as duplicate coverage"`) was added first, using synthetic fixture pages that mirror the real observation's exact facts ($99 million tender, $2.5 billion valuation) with genuinely dissimilar headlines. Run against the pre-repair code, it failed exactly as expected — both pages were accepted as distinct (`["accepted", "accepted"]` instead of `["accepted", "duplicate"]`) — reproducing the reported bug with zero provider network.

**Root cause:** `src/selection/selectSignals.mjs`'s `areDuplicateCandidates()` compares only distinctive title tokens (falling back to combined title+highlight tokens only for sparse/metadata-like titles). Two publishers describing the same event with substantially different headline styles — an editorial-style first-party post versus a data-heavy financial headline — share no title vocabulary at all, so the check returns `false` without ever consulting the verified evidence text.

**First-pass repair (`src/verification/verifyCompany.mjs` only):** At verification time, each accepted candidate's full verified article text (title + a bounded 2,000-character prefix of the body — not the possibly-truncated `evidenceSnippet`, since the existing sentence-selector truncates at embedded decimal points like "$2.5") was scanned for "quantity anchors": normalized (value, unit) pairs from patterns such as "$99 million" and "2.5 billion" (unit intended to include percent/%/million/billion/thousand — bare unscaled numbers are never anchors). This was stored as a new internal-only `eventQuantityAnchors` field on the evidence record. `isDuplicateEvidence()` treated two accepted records as duplicates if they shared **at least 2** exact anchors — a single shared figure deliberately insufficient. The 2,000-character bound existed because an independent review pass identified a realistic false-positive: many press releases end with a recycled "About [Company]" boilerplate paragraph restating the same evergreen stats verbatim across every release, and two genuinely unrelated announcements sharing that boilerplate footer must not merge just because the footer (not the actual event) supplies matching anchors.

**Anti-overdedupe regression coverage from the first pass (all pass):**
- (A) two funding rounds with different amounts ($50M vs $120M) and generic overlapping "growth" language, each with its own real (non-overlapping) quantity anchor — stay distinct.
- (B) a financing event and an unrelated product launch with no quantity mentions at all — stay distinct.
- (C) two product announcements sharing generic words (AI, enterprise, platform, customers, launch), each with its own real, non-overlapping percentage figure — stay distinct.
- (D) two unrelated events (a security report and a performance-release announcement) that each happen to mention "50 percent" for unrelated reasons — stay distinct, proving a single shared anchor is not enough.
- (E) two unrelated events (a lab opening and a CTO hire) whose articles share an identical recycled "About the company" boilerplate footer (with 2 matching quantity anchors) placed well past the 2,000-character scan bound — stay distinct, proving the bound alone excludes trailing-footer boilerplate.

A dedupe-design sub-agent review before this first pass was committed surfaced the boilerplate false-positive risk that led to the 2,000-character scan bound above; a regression-coverage sub-agent review found that anti-overdedupe cases (A)–(C) as originally written would have passed identically even with the new code deleted, so (A) and (C) were strengthened with real, non-overlapping quantity figures before commit.

**Post-commit hardening correction (before push authorization):** An independent actual-diff review of the committed first-pass patch — performed before any push — found two further genuine weaknesses that the above regression coverage did not catch:

1. **The quantity regex never actually matched `%`.** It ended in a `\b` word-boundary assertion after an alternation that included `%`; because `%` is itself a non-word character, `\b` can never match immediately after it (both the character before and after the boundary position are non-word), so `"177%"` silently produced zero matches despite percent support being an intended, documented part of the design. This was reproduced with a new red-before-green regression (`"D3-correction: a same-event pair requiring both a monetary anchor and a percent-symbol anchor dedupes"`) — a same-event pair needing both a `$20 million` and a `50%`/`50 percent` anchor to reach the threshold, confirmed failing against the pre-correction code with `["accepted","accepted"]` (only the monetary anchor was ever detected) before the fix, and passing afterward.
2. **Shared quantity anchors alone, without any requirement that the figure be central to either story, were not sufficient evidence of same-event coverage** — the first pass's 2,000-character scan bound only ever protected against boilerplate placed *past* that bound (a trailing "About the company" footer); it did nothing to stop two genuinely different events from sharing the *same* recycled evergreen metric stated *early* in both articles' lede (e.g. "used by 50 million customers, growing 20 percent year over year" as a habitual opening qualifier before two unrelated announcements). This was reproduced with a new red-before-green regression (`"D3-correction: two distinct events (a research lab opening and a CTO hire) sharing recycled early evergreen metrics must NOT be deduped"`), confirmed incorrectly collapsing to 1 evidence record under the pre-correction code before the fix, and correctly staying at 2 afterward.

**Correction (`src/verification/verifyCompany.mjs` only, same file, same commit):**
- The regex now uses a `(?!\w)` negative lookahead instead of a trailing `\b`, which correctly rejects a following word character (e.g. "millionaire") regardless of whether the preceding alternative itself ends in a word or non-word character — fixing `%` without weakening the existing protection against partial-word matches.
- Money-scaled anchors (million/billion/thousand) are now tagged `:currency` (a literal `$` preceded the figure) or `:count` (it did not), so "$50 million" and "50 million users" are never conflated into the same anchor key. Percent anchors are unaffected by this distinction, since a percentage has no currency/count ambiguity.
- **Merging now requires two conditions, not one**: (a) at least 2 shared exact anchors within the existing 2,000-character lede bound, **and** (b) at least one of those *specific* shared anchors must also appear in one side's own extracted article headline (`sourceTitle`) alone — a new `titleQuantityAnchors` field, computed the same way but scoped only to the title. Requiring at least one shared figure to appear in either publisher-derived headline provides conservative evidence that the quantity is central to the represented event rather than merely repeated background context, not proof of event identity by itself (Linear's tender article states "$99 Million"/"$2.5 Billion" directly in its headline, satisfying this for the true positive). This intentionally favors precision over recall and may miss same-event pairs where neither publisher places a shared figure in its own headline — a known, accepted residual limitation, not a claim that recycled metrics can never appear in headlines or that every important event figure does.

Both `eventQuantityAnchors` and `titleQuantityAnchors` remain internal-only: `assembleSnapshot()`'s `assembleSignal()` reads only specific named fields and never spreads the evidence object, so neither can reach the public snapshot contract. `src/selection/selectSignals.mjs` remained untouched by this correction, as it was by the first pass. No company-specific code, dependency, or model was added.

**Additional regression coverage added by this correction (all pass):**
- The two red-before-green regressions above (percent normalization; early recycled-metric false-positive).
- (G) a currency quantity ($50 million funding) and an unrelated operational quantity of the same bare number (50 million users) are not conflated — without the `:currency`/`:count` tag, this pair would share 2 anchors (50 million + a shared 30 percent figure present in both evidence bodies and corroborated by the funding headline) and wrongly merge; with the tag, only 1 anchor is shared, correctly below threshold.
- The original Linear reproduction and all five prior anti-overdedupe cases (A)–(E) continue to pass with the corrected two-condition rule (Linear's tender headline already contains both shared anchors directly, so headline corroboration is trivially satisfied for the true positive).
- All pre-existing duplicate and non-duplicate fixtures in `test/verification.test.mjs` and `test/select-signals.test.mjs` continue to pass unchanged.

Two further independent bounded sub-agent reviews were used for this correction. A false-positive reviewer confirmed the regex fix and currency/count split are correctly implemented, and identified two narrow, disclosed residual limitations that were deliberately not engineered around further (to keep the repair bounded, per this phase's explicit scope): a publisher that habitually repeats the identical recycled metric in literally every headline it writes (not just body text) could still evade the headline-corroboration check, and a genuine same-event pair where neither publisher states any figure in its own headline (only in body text) will no longer be deduped by this mechanism — an accepted, intentional precision-over-recall tradeoff given the assessment's stated priority on correctness. A regression-coverage reviewer independently re-derived the exact anchor math for every new and existing test, confirmed the `%` and early-metric regressions genuinely exercise the specific fixes claimed (not some other mechanism), and confirmed the currency/count split has real, non-tautological test coverage.

**Focused test result:** `node --test test/verification.test.mjs` — 42/42 passed (33 pre-existing + 9 total D3-related tests: the original Linear reproduction, anti-overdedupe A–E and G, and the two correction regressions).
**Full suite result:** `node --test test/*.test.mjs` — 361/361 passed (352 pre-D3 baseline + 9 D3-related).
**Production replay:** **PASS** — after actual-diff approval, commit `1de14141aff8462dcbbf5e08e3706625b014d6b7` was pushed to `main` and Vercel reported a successful deployment for that exact commit. The project owner then submitted `linear.app` exactly once in the production browser. The app resolved `Linear` / `linear.app` and returned honest `insufficient_evidence` with one displayed signal: `Sharing Linear's growth with the people building it` (Aug 26, 2026; visible source domain `linear.app`). The previously duplicated Pulse2 article covering the same $99 million tender / $2.5 billion valuation event did not appear as a second signal. This passes the specific D3 production defect check: one underlying event is no longer represented as two signals. No retry was performed.

## F. Provider accounting

- Starting after D2: Search 48–54 / Contents 14 / retries 0
- Final-assessment manual production additions (Microsoft, Anthropic, linear.app, Craigslist, craigslist.org, Mercury, `https://`): Search 6–8 / Contents 2 / retries 0
- Cumulative before the post-repair replay: **Search 54–62 / Contents 16 / retries 0**
- D3 implementation/testing activity: **Search 0 / Contents 0 / retries 0** — no live provider call was made during D3 implementation
- One authorized post-repair `linear.app` production replay: **Search +1–2 / Contents +1 / retries 0**
- Current cumulative after the replay: **Search 55–64 / Contents 17 / retries 0**

## G. Readiness status

**FINAL ASSESSMENT VALIDATION — D3 DISTINCTNESS DEFECT CLOSED / FINAL SKEPTICAL REVIEW PENDING**

The deterministic repair passed its full zero-network regression suite, was independently actual-diff reviewed, pushed, successfully deployed, and then validated with exactly one production `linear.app` replay. The duplicate-event failure that triggered D3 did not recur: only one instance of the tender/valuation event survived into the displayed signal set. D3 is therefore closed. Final submission readiness is not yet declared because the remaining final skeptical review/submission checks still need to be completed.

---

# Phase E2 — Production Preflight

Date: 2026-09-10. Full detail: `docs/PHASE_E2_PRODUCTION_PREFLIGHT.md`.

E1 (`PHASE E1` read-only audit) found no runtime blocker and recommended `NO RUNTIME REPAIR JUSTIFIED`. E2 verified repository/deployment alignment (local and remote `main` both at `d90f497651f62c9de3eaa2e701f459bb1b26efe3`, directly confirmed via `git ls-remote`; Vercel deployment metadata not independently observable — no CLI installed, Vercel MCP tools return `403 Forbidden` for this project), confirmed static production health (`/`, `/app.js`, `/styles.css` all `200` and byte-identical to the reviewed repo; `/api/snapshot` returns `405`/`Allow: POST` for a non-POST request without touching the provider path), and made the one authorized live company submission (`Adobe`, name input, exactly 1 production POST via `curl` — no browser-automation tool is available in this session, disclosed honestly rather than fabricated).

The Adobe submission returned `insufficient_evidence` with 2 signals (`Adobe Inc.` / `adobe.com`, correct 3-sentence description). Manual source review of both signals (authorized as read-only third-party fetches, not additional provider submissions) found they report the **same** underlying event — Adobe's Q3 FY2026 earnings release (2026-09-10) — sharing the same revenue/EPS/MAU-milestone/CEO-transition facts, directly analogous to the pre-D3 Linear defect. Running the actual `collectQuantityAnchors`/`shareStrongEventQuantityAnchors` code locally (read-only, zero-network) against the real captured HTML showed only 1 shared quantity anchor (`150:percent`) was detected, below the rule's 2-anchor minimum, so the D3 merge logic correctly did not fire under its own stated conditions — this is not a logic bug in the existing rule. The root cause traced precisely to a new, previously undocumented failure mode: one publisher's page embeds a large block of stock-price time-series JSON inside the extracted `<article>` container ahead of the real prose, consuming the 2,000-character lede-scan window before it reaches the shared revenue figure, which is also rendered in abbreviated `"$6.76B"` notation that the anchor regex (which only matches spelled-out `million|billion|thousand|percent|%`) does not match regardless of position.

Per E2's explicit protocol, this was **documented, not repaired** — no runtime/production file was changed. The ~375px responsive check could not be independently performed live (no browser tool available in this session; the gap is disclosed, not assumed away). Result: **E2 BLOCKED — PROJECT-OWNER DECISION REQUIRED**. Provider accounting: pre-E2 baseline Search 55–64 / Contents 17 / retries 0; Adobe submission +1–2 Search / +1 Contents / +0 retries (a description was returned, confirming B4B was reached); new cumulative **Search 56–66 / Contents 18 / retries 0**.

---

# Phase E2R1 — Bounded Verified-Evidence Duplicate Repair

Date: 2026-09-10. Zero-network throughout; no live provider/company request occurred. Full detail in the E2R1 orchestrator report; this section is the factual TESTING record.

## Reproduction

The E2 finding's original hypothesis (abbreviated notation like `$6.76B`) was investigated but proved not to be the true blocking mechanism once traced through the actual code. The real root cause, established by running the actual extraction/anchor functions (copied verbatim from `src/verification/verifyCompany.mjs`, not a hand-rewritten approximation — an initial hand-rewritten reproduction had briefly produced a wrong conclusion until this was caught) against the real captured Adobe article HTML:

1. **Nested `<article>` tags break non-greedy regex matching.** One real publisher page nested an `<article>` widget (an embedded stock-card component) inside the true outer `<article>`. The old `preferredArticleBodyHtml()` regex stopped at the widget's own closing tag, truncating the extracted body before the real story prose — which independently stated the shared milestone as a spelled-out word ("one billion") where the *other* article's own headline used a numeral ("1 million"/"1 billion"). This is a generic HTML-matching bug (not Adobe-specific): any page with a nested same-named tag structure is affected.
2. Fixing extraction alone was not sufficient — the word-form vs. numeral mismatch independently blocked headline corroboration. Both fixes were proven jointly necessary (neither alone reproduces the fix) against the real captured HTML before any test was written.

## Repair

Two narrow, generic, company-agnostic corrections in `src/verification/verifyCompany.mjs`:
1. `balancedTagBodyHtml()` — a tag-depth-counting scan replacing the naive non-greedy `<article>`/`<main>` regex, correctly pairing the first opening tag with its true matching close regardless of nesting.
2. A bounded `NUMBER_WORDS` dictionary (spelled-out cardinals "one"–"twenty") added to `collectQuantityAnchors()`, so "one billion" and "1 billion" normalize to the same anchor key.

*(The claim that word-form anchors were tagged `:count` only, never `:currency`, was corrected by project-owner review — see "Project-owner review corrections" below.)*

**Independent review before commit found two real safety gaps in the first version**, both corrected:
- The tag-depth scanner had no awareness of `<script>`/`<style>`/HTML-comment regions, so a literal unbalanced `<article`-shaped substring inside an embedded JSON/hydration payload could make the scanner overrun past the true closing tag into unrelated sibling content (a risk the old regex could never produce, since it could only truncate early, never overrun). Fixed by treating `<script>...</script>`, `<style>...</style>`, and `<!-- -->` as atomic skipped tokens during the depth scan itself.
- The word-number pattern lacked a preceding-character guard, so a compound word like "twenty-one billion" was misread as "one billion" (value 1). Fixed with a `(?<![\w-])` lookbehind.

`MINIMUM_SHARED_QUANTITY_ANCHORS` (2) and the headline-corroboration requirement were **not** changed. `src/selection/selectSignals.mjs`, B1, B2, orchestration, the endpoint, and the frontend were **not** touched.

## Regressions added (7 new, 368/368 total)

- Unit-level: `extractArticleEvidence` reaches real prose past a nested `<article>` widget.
- Pipeline-level red-before-green: two dissimilar-headline pages (one behind a nested widget, numeral-vs-word-form milestone) now dedupe. Confirmed genuinely red pre-fix (the widget-truncated candidate was rejected `unsupported_claim`, not merely "not deduped").
- Anti-overdedupe (H, strengthened after review found the first version tautological — one side had zero anchors, short-circuiting the comparison before it ran): both sides now carry real, non-overlapping anchors, proving the comparison genuinely executes and correctly stays distinct.
- Anti-overdedupe (I): a single shared word-form anchor alone does not trigger dedupe — the same 2-anchor-plus-corroboration rule governs word forms.
- Anti-overrun (pipeline + unit-level): an unbalanced `<article`-shaped substring inside an embedded script payload does not make the scanner walk past the true close into an unrelated sibling section.
- Compound-number guard: "twenty-one billion" is not misread as "one billion".

Full suite (at this point): `node --test test/*.test.mjs` → **368/368 passed**. `node --check src/verification/verifyCompany.mjs` → clean.

## Independent review

Two development-time sub-agents ran: an adversarial precision reviewer (constructed and ran actual reproducing fixtures through the real pipeline; found the script/style-unaware overrun risk and the tautological test H) and an independent diff reviewer (found the compound-number gap; confirmed diff scope limited to the two intended files, no public-contract change, no dead code). Both findings were corrected before commit; the full suite was re-verified green after each correction.

## Project-owner review corrections (2026-09-10)

Project-owner actual-diff review of local commit `4f623ca9461500951d8e49e7704e2d3e858c5411` found two further concrete, real gaps, both corrected in a follow-up local commit above it.

**Finding 1 — initial-opener exclusion gap.** `balancedTagBodyHtml()`'s script/style/comment exclusion only applied once the depth-counting scan began, but the scan started AFTER a separate, unaware initial `openTagPattern.exec(html)` search that could itself select a fake `<tagName...>`-shaped string sitting inside a `<script>` block earlier in the document as the "opening" tag. Reproduced directly against commit `4f623ca` with a minimized fixture (a fake opener inside a `<script>` before the real `<article>`, with unrelated numeric sibling content after it): the extracted body wrongly included the sibling `<aside>` content. **Corrected** by rewriting `balancedTagBodyHtml()` as a single unified pass with no separate initial search — `<script>`/`<style>`/comment regions are treated as atomic skipped tokens from the very start of the scan, and `contentStart` is only established at the first genuine structural opening token found outside those regions. This also corrects the prior documentation claim that such content "can never be mistaken for a real nested open/close tag" — that guarantee did not actually hold for the initial opener in the first version; it does now, since there is no longer a separate, unaware initial search at all.

**Finding 2 — spelled-out currency misclassified as a count.** Word-form anchors were unconditionally tagged `:count`, on the assumption that a spelled-out currency figure would keep a literal `"$"` ("$one billion") — not how publisher prose actually writes it (the realistic form is "one billion dollars"). This meant "one billion dollars" (currency) and "one billion users" (an unrelated count) could wrongly share an anchor. Reproduced against commit `4f623ca` with two genuinely different articles (a funding event stating "one billion dollars" plus a headline-stated "50 percent"; an unrelated user-milestone event stating "one billion users" and separately restating "50 percent") — the pair wrongly merged (`evidence.length` came back `1`, not `2`). **Corrected** by capturing an optional trailing `dollar`/`dollars` suffix in `NUMBER_WORD_PATTERN` and tagging the anchor `:currency` when present, `:count` otherwise — narrow and evidenced (this one common English currency suffix only, no other currency words, no general NLP), and normalizing to the exact same anchor key as the existing numeral currency form. A further compatibility regression confirms "one billion dollars" correctly still shares an anchor with the equivalent numeral form "$1 billion" for a genuine same-event pair.

Both findings were independently reproduced by the orchestrator directly against the real captured Adobe HTML (see the causal diagnostic below) before being accepted as real, and both are covered by new red-before-green zero-network regressions confirmed failing against `4f623ca` for exactly the stated reasons and passing after correction. Full suite after both corrections: **372/372** (368 + 4 new). `node --check src/verification/verifyCompany.mjs` → clean.

### Captured-Adobe causal diagnostic (zero-network, no new fetch)

Using the exact locally captured Adobe publisher HTML from E2 (no network access), the real `extractArticleEvidence` from the pre-E2R1 commit (`69194e1`) and the current corrected code were each run against both articles, with each version's own `collectQuantityAnchors` logic applied identically to compute the pair's duplicate decision:

| | OLD (pre-E2R1, `69194e1`) | CORRECTED (current) |
| --- | --- | --- |
| Article 1 title | "Adobe reports solid Q3, tops 1 billion monthly active users" | (same) |
| Article 1 extracted body length | 1417 | 7592 (same underlying page; nesting-aware extraction reaches more of the surrounding document, but the anchors used for the decision are computed from the first 2,000 characters either way) |
| Article 1 eventQuantityAnchors | `1:billion:count, 150:percent, 1.83:billion:currency, 6.76:billion:currency, 13:percent, 6.7:billion:currency` | (identical — article 1's page has no nested-tag/word-form issue) |
| Article 2 title | "Adobe Q3 2026: AI revenue surge and a CEO change signal a new era" | (same) |
| Article 2 extracted body length | 607 | 2270 |
| Article 2 eventQuantityAnchors | `0.7:percent, 0.9:percent, 150:percent` | `0.7:percent, 0.9:percent, 150:percent, 6.76:billion:currency, 26.58:billion:currency, 26.63:billion:currency, 1:billion:count` |
| Shared anchors | `150:percent` (1) | `1:billion:count, 150:percent, 6.76:billion:currency` (3) |
| Pair duplicate decision | **false** — matches the real original production observation (both signals displayed as `accepted`, not deduped) | **true** — article 2 correctly recognized as duplicate coverage of article 1 |

This confirms, on the exact real captured material, the OLD/CORRECTED behavior pattern requested: OLD leaves both pages as individually-qualifying, non-duplicate evidence; CORRECTED recognizes article 2 as duplicate coverage. The corrected article 2 anchor set includes `1:billion:count` (not `:currency`) for its "one billion monthly active users" mention — confirming Finding 2's fix does not mis-tag this genuine count, only the currency case it was built for. No network request was made to produce this diagnostic; the HTML was already present locally from the original E2 investigation.

## Remaining limitations

This repair closes the specific demonstrated failure mode (nested-tag truncation + numeral/word-form mismatch). It does **not** make same-event deduplication universal:
- A same-event pair where neither publisher's headline states any shared figure (in any form) remains outside the rule by design (the pre-existing, disclosed precision-over-recall boundary).
- A raw, unescaped `<tagName`-shaped substring inside another tag's *attribute value* (as opposed to inside `<script>`/`<style>`/a comment) remains a theoretical residual gap — true HTML parsing would be needed to close it fully; not pursued as disproportionate for this bounded repair.
- Compound spelled-out numbers beyond simple cardinals ("twenty-one", "a hundred", decimals-in-words) are not parsed at all (by design, not a gap — they simply produce no anchor, which is the safe/conservative direction).

## Live replay status

**No live provider/company validation occurred in E2R1.** The repair is implemented and zero-network tested only. A production `Adobe` (or any other) replay requires separate, explicit project-owner authorization and has not been requested or performed. Provider accounting is unchanged from E2: **Search 56–66 / Contents 18 / retries 0**.
