# Phase A4.2 Lightweight Signal Selector

## Scope and status

Phase A4.2 implements and tests the smallest deterministic selector needed for the decomposed signal-oriented discovery → selection direction supported by A4.1. It accepts already-retrieved raw candidates and selects at most three for later evidence verification.

The bounded NVIDIA live smoke is complete with outcome **`SELECTOR PASS`**. A4.2 made exactly **1** Exa request with no retry; cumulative Exa request count is **3**. The selector itself remains local and deterministic: it does not fetch sources, prove event dates, assess claim support, generate snapshot prose, or freeze a production architecture.

The repository has no `package.json`, TypeScript configuration, or existing TypeScript module convention. The selector therefore uses the repository's dependency-free Node ESM convention at `src/selection/selectSignals.mjs`, with JSDoc input contracts rather than introducing a TypeScript toolchain solely for this diagnostic.

## Input, validity, and diagnostics

`selectSignals(candidates, context)` accepts candidate rank, title, exact URL, optional provider date/author, and highlights plus a company name, official domain, and fixed current date.

Only structurally unusable candidates are rejected:

- rank is not a positive integer;
- title is empty;
- URL is not an exact HTTP(S) URL.

Missing highlights do not make a titled candidate invalid. Every input receives deterministic development diagnostics containing its recency bucket, source class, duplicate-cluster identifier, selected flag, and one of four reasons: `SELECTED`, `DUPLICATE`, `INVALID`, or `LOWER_PRIORITY`.

## Recency and provenance

Provider `publishedDate` is selection metadata only:

- `RECENT`: age ≤90 days;
- `FALLBACK`: age >90 and ≤180 days;
- `OLD`: age >180 days;
- `UNKNOWN`: absent, blank, unparseable, or future-dated.

Future dates are never silently treated as recent. A missing, malformed, or future provider date does not make an otherwise usable candidate ineligible; `UNKNOWN` sorts below `FALLBACK` and above `OLD`.

Accepted provider-date syntax is deliberately limited to a calendar-valid `YYYY-MM-DD` or the bounded timezone-explicit ISO form `YYYY-MM-DDTHH:mm:ss[.fraction](Z|±HH:mm)`, with one to three fractional-second digits. Repository Exa fixtures use the UTC `.sssZ` form; offset support is a bounded syntax allowance rather than a claim that an offset value was observed. A pre-live independent review found that the original implementation's permissive `Date.parse` call normalized impossible dates and accepted trailing garbage, allowing malformed metadata to receive valid recency priority. Before any live A4.2 request, it was replaced with explicit syntax, calendar, clock, and offset validation; impossible dates and partial-prefix parses now remain `UNKNOWN`.

Source classification is deliberately binary. A URL is `FIRST_PARTY` only when its parsed hostname equals the normalized official domain or ends with `.` plus that domain. Matching is case-insensitive, handles ports through URL parsing, strips one trailing hostname dot, and rejects deceptive prefix/suffix domains. Every other source is `OTHER`; there is no publisher allowlist.

## Bounded lexical duplicate rule

Duplicate comparison normalizes Unicode, case, punctuation, whitespace, simple plural suffixes, simple silent-e past-tense forms, company-name tokens, and a small generic stopword set. Ordinary semantic titles cluster only when they share at least three tokens with overlap coefficient ≥0.72 and Jaccard similarity ≥0.70. Very short near-identical titles may also cluster when they share at least two tokens, overlap is ≥0.80, and Jaccard similarity is ≥0.67.

First-highlight tokens are consulted only when at least one title is structurally opaque or metadata-like, such as a filing identifier. That fallback is capped at the first 48 normalized highlight tokens and requires at least four shared tokens, overlap coefficient ≥0.68, and Jaccard similarity ≥0.32. This preserves the ability to link an opaque filing title to obvious duplicate coverage without allowing generic highlight language to merge otherwise distinct semantic titles.

Pairwise matches form deterministic lexical clusters. The rule is intentionally conservative and not a semantic event classifier. It can miss paraphrases with little shared vocabulary or over-merge a transitive chain of highly overlapping pages; those behaviors remain live-review risks rather than justification for embeddings, an LLM, or a larger rule system.

## Representative and selection ordering

Each duplicate cluster keeps one representative using the same explicit preference hierarchy as final selection:

1. `RECENT` → `FALLBACK` → `UNKNOWN` → `OLD`;
2. `FIRST_PARTY` → `OTHER`;
3. lower original Exa rank;
4. URL and title as deterministic tie-breakers only when the approved keys are equal.

Representatives are ordered by that hierarchy and the first three are returned. If fewer than three unique usable candidates remain, the selector returns fewer than three without relaxing validity/duplicate rules or triggering another search. Candidate objects and highlight arrays are copied rather than mutated.

## NVIDIA live selector smoke

Baseline SHA: `8abd43110dbd968b35f95245f3c504f2064db145` (`fix: validate selector provider dates strictly`).

The minimal smoke harness reused the A4.1 request implementation without changing its query or body: `POST https://api.exa.ai/search`, `type: "auto"`, `numResults: 10`, and `contents: { highlights: true }` for NVIDIA. It made one non-streamed request, passed the returned candidates directly to `selectSignals` in memory, and printed only aggregate metrics and compact per-candidate review metadata. It added no `outputSchema`, synthesis, date filter, alternate query/mode/provider, retry, polling, second model, or persistence.

| Measure | Observed result |
| --- | --- |
| Request / retries | 1 / 0 |
| Latency / provider-reported cost | 1,839 ms / $0.007 |
| Raw candidates | 10 |
| Aggregate metadata | 8 dated; 10 highlight-bearing; 9 unique domains |
| Selector time | `2026-09-08T22:14:07.900Z` |
| Selected ranks | `1,3,5` |
| Selector duplicate clusters | None; every `duplicateClusterId` was `null` |
| Request totals | A3: 1; A4.1: 1; A4.2: 1; cumulative Exa: 3 |

### Complete candidate and destination review

Only the exact Exa-returned URLs below were inspected, with normal redirects allowed. All ten returned HTTP 200 at the time of the bounded direct retrieval; rank 7 exposed only a paywalled excerpt. No replacement-source search was used. Provider dates are selector inputs; source dates are dates established from the exact destination during manual review.

| Rank | Selector result | Exact returned destination and manual classification | Human event group | Final decision |
| --- | --- | --- | --- | --- |
| 1 | Selected; `RECENT`; `FIRST_PARTY`; provider date `2026-09-03T11:56:49Z`; no cluster | [NVIDIA to Acquire Hugging Face](https://blogs.nvidia.com/blog/nvidia-to-acquire-hugging-face/) — correct NVIDIA entity; real and material $12.93B acquisition agreement; accessible first-party page; `SUPPORTED`; source date 2026-09-03 | Hugging Face acquisition | Qualifies |
| 2 | Unselected; `UNKNOWN`; `OTHER`; provider date absent; no cluster | [NVIDIA 8-K](https://www.sec.gov/Archives/edgar/data/1045810/000104581026000078/nvda-20260902.htm) — correct entity; real and material acquisition agreement; accessible SEC filing; `SUPPORTED`; filing/event date 2026-09-02 | Hugging Face acquisition | Reject as duplicate of rank 1 |
| 3 | Selected; `RECENT`; `FIRST_PARTY`; provider date `2026-09-03T00:00:00Z`; no cluster | [Sparks Fly: NVIDIA Accelerates Local AI at IFA 2026](https://blogs.nvidia.com/blog/local-ai-ifa-next-gen-agents-nv-pair-rtx-spark/) — correct entity; real and material PAIR/RTX Spark announcements; accessible first-party page; `SUPPORTED`; source date 2026-09-03 | PAIR / RTX Spark | Qualifies |
| 4 | Unselected; `UNKNOWN`; `FIRST_PARTY`; provider date absent; no cluster | [AWS and NVIDIA to Deliver 2 Million Additional GPUs](https://investor.nvidia.com/news/press-release-details/2026/AWS-and-NVIDIA-to-Deliver-2-Million-Additional-GPUs-and-Next-Generation-Infrastructure-for-Agentic-and-Physical-AI/default.aspx) — correct entity; real and material strategic expansion; accessible first-party page; `SUPPORTED`; source date 2026-08-26 | AWS expansion | Qualifies |
| 5 | Selected; `RECENT`; `FIRST_PARTY`; provider date `2026-08-31T00:00:00Z`; no cluster | [NVIDIA and MediaTek Deepen Long-Standing Partnership](https://nvidianews.nvidia.com/news/nvidia-and-mediatek-deepen-long-standing-partnership-to-build-ai-edge-to-cloud-computing-platforms) — correct entity; real and material partnership, NVLink Fusion adoption, and $3.5B investment; accessible first-party page; `SUPPORTED`; source date 2026-08-31 | MediaTek | Qualifies |
| 6 | Unselected; `RECENT`; `OTHER`; provider date `2026-09-07T00:00:00Z`; no cluster | [NVIDIA releases free PAIR software](https://gcn.com/nvidia-releases-pair-software-local-ai/21442/) — correct entity and real event; accessible secondary page; `SUPPORTED`; source date 2026-09-07 | PAIR / RTX Spark | Reject as weaker secondary duplicate of rank 3 |
| 7 | Unselected; `RECENT`; `OTHER`; provider date `2026-09-08T00:00:00Z`; no cluster | [Nvidia's Hugging Face openness pledge](https://www.mlexwatch.com/ftcwatch/articles/2521533/nvidia-s-hugging-face-openness-pledge-identifies-us-eu-antitrust-fault-line) — correct entity, but only a paywalled excerpt analyzing anticipated antitrust review rather than establishing a separate regulatory event; `PARTIAL`; source date 2026-09-08 | Hugging Face acquisition context | Reject |
| 8 | Unselected; `RECENT`; `OTHER`; provider date `2026-09-08T01:38:29Z`; no cluster | [NVIDIA's $20 Billion Groq Bet Goes Live This Year](https://narrative-news.com/nvidia-nvdas-20-billion-groq-bet-goes-live-this-year-with-new-ai-racks/) — correct entity and potentially material deployment claim, but the accessible page is derivative/repackaged and does not independently establish it strongly; `PARTIAL`; source date 2026-09-08 | Groq | Reject |
| 9 | Unselected; `RECENT`; `OTHER`; provider date `2026-09-08T03:19:44Z`; no cluster | [Jensen Huang Takes a Cautious Tone on Q2 Earnings Call](https://www.gate.com/news/detail/NVDA/jensen-huang-strikes-a-cautious-tone-on-q2-earnings-call-announces-that-the-24099583) — correct entity, but mixed AGI/earnings claims from a weak AI/crypto-hosted derivative page; `PARTIAL`; publication date 2026-09-08 | Mixed AGI / Q2 | Reject |
| 10 | Unselected; `RECENT`; `OTHER`; provider date `2026-07-28T00:00:00Z`; no cluster | [Amkor and NVIDIA Form Multi-Year Partnership](https://semiconleadersasia.com/news/63/1441/amkor-and-nvidia-form-multi-year-partnership-to-expand-advanced-ai-chip-packaging-in-the-u-s-.html) — correct entity; real and material US advanced-packaging partnership; accessible secondary page; `SUPPORTED`; source date 2026-07-28 | Amkor | Qualifies |

Manual review therefore found five qualifying distinct events at ranks `1,3,4,5,10`, all within 90 days and none in the 91–180-day fallback window. The human event groups were acquisition context at ranks `1/2/7`, PAIR/RTX Spark at `3/6`, and singleton topics at `4`, `5`, `8`, `9`, and `10`. Ranks 8 and 9 were singleton topics but did not meet the support-quality gate.

### Why rank 5 outranked rank 4

Rank 4 was neither invalid nor deduplicated. Its captured provider `publishedDate` was `null`, so the frozen selector assigned `UNKNOWN/FIRST_PARTY`. Rank 5 carried `2026-08-31T00:00:00Z`, so it was `RECENT/FIRST_PARTY`. Because the comparator orders recency before source class and original Exa rank, rank 5 legitimately preceded rank 4. The August 26 date was established only by later manual destination inspection; the deliberately source-blind selector does not fetch a page or replace missing provider metadata with a manually observed date.

Rank 4 is comparable in materiality to rank 5, not obviously stronger, and its displacement is consistent with the approved contract. Rank 10 was qualifying but `OTHER`, so it appropriately lost to the recent first-party selections. Ranks `1,3,5` are all correct-entity, real, material, first-party, `SUPPORTED`, demonstrably within 90 days, and mutually distinct.

### Independent review and outcome

Independent post-live review agreed with the ten-result classification, event grouping, rank-4 explanation, and outcome. The reviewer explicitly retained ranks 7–9 as rejects because their exact returned destinations did not provide sufficiently clean, material support; no substitute source may repair them. The reviewer retained rank 10 as qualifying because its accessible exact destination substantively supported the partnership.

Outcome: **`SELECTOR PASS`**.

The non-blocking live limitation is duplicate recall: the conservative lexical rule assigned no clusters even though human review grouped ranks `1/2` and `3/6`. That miss did not corrupt this selection because the duplicate pages were lower-priority and none was selected, but another result order could expose it. This is evidence to carry into representative testing, not a selector change in this bounded task.

This single NVIDIA capture shows that the A4.1 request strategy returned enough qualifying candidates and that the frozen selector chose three valid signals. It does not establish representative-company coverage, robust semantic deduplication, source-verification architecture, synthesis quality, endpoint/UI/deployment readiness, or production architecture viability.

## Local verification

Synthetic tests cover recency boundaries; strict provider-date syntax; impossible calendar dates, including leap-year behavior; trailing garbage; malformed/future metadata; root/subdomain and deceptive-domain cases; obvious, morphological, sparse-title, and nonduplicate lexical comparisons, including same-template headlines with different counterpart organizations or locations; representative choice; lexicographic ordering; exact/insufficient selection counts; diagnostics; deterministic stability; input immutability; and static absence of provider, network, filesystem, or company-specific selector logic. The smoke-harness tests additionally verify the exact shared A4.1 body, one-request handoff, no retry, compact output, and absence of persistence/direct-fetch/second-model behavior.

The repository exposes no `npm run typecheck`. Before the request, applicable native Node syntax checks passed; focused discovery tests passed 13/13, selector tests 24/24, smoke-harness tests 5/5, the full suite 70/70, and `git diff --check` passed. Post-live verification repeated all six syntax checks, the same 13/13, 24/24, 5/5 focused suites, the 70/70 full suite, and diff hygiene without another provider request.

Exit status: **`A4.2 NVIDIA SELECTOR PASS`**. Exactly one A4.2 request occurred; cumulative Exa requests are 3. No `deep-lite`, alternate provider/mode, second model, representative-company benchmark, Phase B, synthesis, source-verification implementation, UI, or deployment work occurred. Work stops here for project-owner review.
