# Phase B5 Live Gate

Date: 2026-09-10

## Authorized scope

The gate authorized exactly one CLI live-gate attempt for `NVIDIA` (name input), through the reviewed, pushed, remotely confirmed `createCompanySnapshot()` orchestration at commit `4ea2bceb022043fb03c9c7fbe1a6f3a609fe36a5`. No second company and no retry were authorized. Provider-request observation was performed through thin counting wrappers registered via B5's existing `services` injection seam; the wrappers delegate entirely to the real `discoverCompany`, `verifyCompanyDiscovery`, `requestCompanyDescription`, and `assembleSnapshot` production exports and alter no return value or business decision.

## Harness

`scripts/phase-b5-live-smoke.mjs` requires the exact mode `b5-live-smoke`, restricts `--company` to `NVIDIA` only, requires `--confirmed-free-starter`, and requires `EXA_API_KEY` to be present in the process environment before any network activity. It never reads `.env` directly; the key must already be present in `process.env`. On an unexpected failure after real counted network activity, it preserves a sanitized diagnostic (stage reached, provider counts, captured identity/verification/description state including the exact B4B rejection `reason`) rather than collapsing to only an error string; it also asserts that a completed B3 result (`verified` or `insufficient_evidence`) implies exactly one Exa Contents request. Before the first live attempt, its (then) 15 zero-network tests passed, including two full fake-network exercises of the real production pipeline end-to-end. After the first network-backed attempt revealed the harness dropped B4B's rejection `reason` (see "Network-backed attempt" below), 4 further zero-network regressions were added confirming the exact reason is retained in both a normal summary and a failure diagnostic, that a successful `described` summary exposes no `reason` key, and that redaction still strips the API key when a reason is present. The full zero-network suite currently passes 243/243 (224 pre-existing + 19 in `test/phase-b5-live-smoke.test.mjs`); syntax checks and `git diff --check` passed.

## Preflight stop

The process running this task did not have `EXA_API_KEY` set. Per the harness's own `validateOptions()` gate and the task's explicit constraint against reading or sourcing `.env` or any file containing secrets, the one authorized command was run exactly once:

```
node scripts/phase-b5-live-smoke.mjs b5-live-smoke --company NVIDIA --confirmed-free-starter
```

It failed immediately with `EXA_API_KEY is not set.`, before `discoverCompany`, `verifyCompanyDiscovery`, `requestCompanyDescription`, or any network call executed.

| Accounting | Count |
| --- | ---: |
| Starting cumulative Exa Search requests | 22 |
| Starting cumulative Exa Contents requests | 2 |
| CLI live-gate attempts | 1 |
| Network-backed B5 executions | 0 |
| Exa Search requests made | 0 |
| Exa Contents requests made | 0 |
| Publisher requests made | 0 |
| Retries | 0 |
| Ending cumulative Exa Search requests | 22 (unchanged) |
| Ending cumulative Exa Contents requests | 2 (unchanged) |

## Outcome (first attempt — preflight blocked)

**`B5 LIVE GATE PRE-FLIGHT BLOCKED — CREDENTIAL/ENVIRONMENT UNAVAILABLE`**

This is an environment/credential-availability stop, not a provider-side authentication result and not an evidence-quality or integration-correctness outcome. It is historical fact for this run. No second live attempt, no Stripe run, and no retry occurred, consistent with the one-attempt authorization. The reviewed `createCompanySnapshot()` orchestration and all B1–B4B production files remain exactly as pushed at `4ea2bceb022043fb03c9c7fbe1a6f3a609fe36a5`; nothing under `src/` changed as part of this gate.

**No conclusion is drawn about B5's integration correctness from this attempt** — it never reached the pipeline. The zero-network fake-network integration tests (`7a`/`7b` in `test/phase-b5-live-smoke.test.mjs`) are the only evidence currently available that the reviewed orchestration composes B1–B4B correctly end-to-end; they are not a substitute for a live pass and are not claimed as one.

This first CLI attempt occurred, but credential preflight stopped it before the pipeline or network began; therefore it produced zero network-backed B5 executions. That preflight-blocked outcome remains historical fact and is not erased by the network-backed attempt recorded below.

## Network-backed attempt (first actual execution)

A second CLI attempt — the same authorized command, run with `EXA_API_KEY` present via `--env-file=.env` — reached the real pipeline and made real provider requests:

```
node --env-file=.env scripts/phase-b5-live-smoke.mjs b5-live-smoke --company NVIDIA --confirmed-free-starter
```

| Measure | Observed result |
| --- | --- |
| Submitted input | `NVIDIA` |
| Resolved identity | `NVIDIA Corporation` / `nvidia.com` |
| B3 state | `verified`; evidence count 3; fallback used: `false` |
| B3 Exa Search count | 1 |
| Exa Contents count | 1 |
| Publisher requests | 6 |
| Total latency | 6378 ms |
| B4B captured state | `description_unavailable` |
| B4B captured reason | **Not captured — harness gap (see below)** |
| Final B5 result | `{ state: "unavailable", reason: "description_unavailable" }` |

| Accounting | Count |
| --- | ---: |
| Starting cumulative Exa Search requests | 22 |
| Starting cumulative Exa Contents requests | 2 |
| Exa Search requests made | 1 |
| Exa Contents requests made | 1 |
| Publisher requests made | 6 |
| Retries | 0 |
| Ending cumulative Exa Search requests | 23 |
| Ending cumulative Exa Contents requests | 3 |

### Harness gap discovered

`requestCompanyDescription()`'s `description_unavailable` result always carries a specific `reason` (one of `unsuccessful_status`, `empty_summary`, `invalid_sentence_count`, `too_long`, `embedded_url`, `invalid_source_url`, `untrusted_source_domain`), but the smoke harness's `deriveObserved()` omitted that field from both the normal summary and the failure diagnostic. As a result, this run proved B4B rejected the description but the harness could not say why. **The exact underlying B4B rejection reason for this specific run was not captured and cannot be honestly reconstructed after the fact; it is recorded here as unknown, not guessed.** The harness has since been corrected to preserve `captured.description.reason` going forward (see the AI failure log), but that correction does not retroactively recover the reason for this already-completed run.

### Outcome

**`B5 INTEGRATED LIVE GATE — NOT PASSED (B4B DESCRIPTION REJECTED; UNDERLYING REASON UNKNOWN DUE TO A HARNESS DIAGNOSTIC GAP, NOW FIXED)`**

B1→B3 integrated successfully through the real B5 orchestration: identity resolved correctly, three distinct pieces of evidence were verified with no fallback needed, and exactly one broad Exa Search plus six publisher GETs occurred, all within budget. B5 also correctly mapped B4B's normal content-quality rejection to the public `unavailable`/`description_unavailable` contract, with no leaked diagnostics and no retry. The gate did not pass only because the final description stage was rejected by B4B for a reason this run cannot identify. No conclusion is drawn that B5's orchestration logic is broken — the observed integration behavior (ordering, identity propagation, budget, error mapping) was entirely correct. Whether the underlying B4B rejection reflects a fixable content issue, a boundary condition in B4B's validation, or something else remains unknown pending a future authorized attempt with the corrected harness.

No second network-backed NVIDIA execution had occurred as of this record. A further live attempt — to observe the actual rejection reason under the corrected harness — required fresh project-owner authorization. Broader Phase B validation, Phase C, endpoint/UI, and deployment remained unstarted and unauthorized by this task. (That further attempt is recorded below.)

## Second network-backed attempt (passed)

The project owner subsequently authorized exactly one further network-backed execution, using the corrected harness, to capture the now-preserved B4B reason and determine whether the integrated path currently succeeds:

```
node --env-file=.env scripts/phase-b5-live-smoke.mjs b5-live-smoke --company NVIDIA --confirmed-free-starter
```

| Measure | Observed result |
| --- | --- |
| Submitted input | `NVIDIA` |
| Resolved identity | `NVIDIA Corporation` / `nvidia.com` |
| B3 state | `verified`; evidence count 3; fallback used: `false` |
| B3 Exa Search count | 1 (broad only; no fallback) |
| Exa Contents count | 1 |
| Publisher requests | 6 |
| B4B result | `state: "described"`; `sourceUrl: "https://nvidia.com/"`; provider latency 1870 ms; estimated cost $0.001 |
| Final B5 result | `state: "snapshot"` |
| Total latency | 5533 ms |

**Final company:**

- `name`: `NVIDIA Corporation`
- `domain`: `nvidia.com`
- `description`: "NVIDIA's core business centers on accelerated computing technologies for artificial intelligence, including hardware and software platforms for AI workloads, high-performance computing, and simulations. Its principal products and platforms include AI-focused GPUs and related software/SDKs (e.g., RTX, HPC tools, Omniverse, Jetson, Isaac) used by developers, manufacturers, data centers, and enterprises to build, train, and deploy AI, simulation, and autonomous/edge applications."

**Final 3 signals (matching the 3 verified evidence records):**

| Title | Published | Recency | Source class | Source URL |
| --- | --- | --- | --- | --- |
| NVIDIA to Acquire Hugging Face | 2026-09-03T11:56:49.000Z | `RECENT` | `FIRST_PARTY` | `https://blogs.nvidia.com/blog/nvidia-to-acquire-hugging-face/` |
| Sparks Fly: NVIDIA Accelerates Local AI at IFA 2026 | 2026-09-03T16:00:59.000Z | `RECENT` | `FIRST_PARTY` | `https://blogs.nvidia.com/blog/local-ai-ifa-next-gen-agents-nv-pair-rtx-spark/` |
| NVIDIA Expands AI Infrastructure Capacity in Partnership With Australia's Data Center Ecosystem | 2026-09-10T00:00:00.000Z | `RECENT` | `OTHER` | `https://www.globenewswire.com/news-release/2026/09/10/3359139/0/en/nvidia-expands-ai-infrastructure-capacity-in-partnership-with-australia-s-data-center-ecosystem.html` |

| Accounting | Count |
| --- | ---: |
| Starting cumulative Exa Search requests | 23 |
| Starting cumulative Exa Contents requests | 3 |
| Exa Search requests made | 1 |
| Exa Contents requests made | 1 |
| Publisher requests made | 6 |
| Retries | 0 |
| Ending cumulative Exa Search requests | 24 |
| Ending cumulative Exa Contents requests | 4 |

### Outcome

**`B5 INTEGRATED LIVE GATE — PASSED FOR ONE KNOWN-GOOD COMPANY (NVIDIA)`**

The full integrated B5 path — B1 identity → B2 broad discovery → B3 verification (no fallback) → B4B description → B4A assembly — succeeded end-to-end for NVIDIA, staying within the frozen provider budget (1 Search, 1 Contents, 0 retries) with the harness's now-preserved diagnostics confirming every stage. This establishes that the integrated B5 path **can** succeed for the one authorized known-good company. It does not establish broad reliability across arbitrary companies, and it does not retroactively explain the first attempt's `description_unavailable` rejection (that reason remains permanently unknown, per the historical record above) — normal content-quality variability across two separate live Contents calls to the same page is a plausible and unremarkable explanation, but it is not confirmed.

No second NVIDIA execution occurred after this one. No Stripe or other company was run. No production `src/` file changed. Broader Phase B validation (additional/edge-case companies), Phase C, endpoint/UI, and deployment remain unstarted and unauthorized by this task.
