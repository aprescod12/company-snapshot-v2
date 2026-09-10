# Phase B5 Live Gate

Date: 2026-09-10

## Authorized scope

The gate authorized exactly one CLI live-gate attempt for `NVIDIA` (name input), through the reviewed, pushed, remotely confirmed `createCompanySnapshot()` orchestration at commit `4ea2bceb022043fb03c9c7fbe1a6f3a609fe36a5`. No second company and no retry were authorized. Provider-request observation was performed through thin counting wrappers registered via B5's existing `services` injection seam; the wrappers delegate entirely to the real `discoverCompany`, `verifyCompanyDiscovery`, `requestCompanyDescription`, and `assembleSnapshot` production exports and alter no return value or business decision.

## Harness

`scripts/phase-b5-live-smoke.mjs` requires the exact mode `b5-live-smoke`, restricts `--company` to `NVIDIA` only, requires `--confirmed-free-starter`, and requires `EXA_API_KEY` to be present in the process environment before any network activity. It never reads `.env` directly; the key must already be present in `process.env`. On an unexpected failure after real counted network activity, it preserves a sanitized diagnostic (stage reached, provider counts, captured identity/verification/description state) rather than collapsing to only an error string; it also asserts that a completed B3 result (`verified` or `insufficient_evidence`) implies exactly one Exa Contents request. Before live execution, its 15 zero-network tests (`test/phase-b5-live-smoke.test.mjs`) passed, including two full fake-network exercises of the real production pipeline end-to-end (one without a B3 fallback, one with) that independently confirmed correct wrapper call-counting, correct identity propagation, and a correct final `snapshot` result shape, plus a fake-network exercise proving the failure-diagnostic path genuinely reaches the assembly stage after real counted broad/publisher/Contents activity. The full zero-network suite passed 239/239 (224 pre-existing + 15 new); syntax checks and `git diff --check` passed.

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

## Outcome

**`B5 LIVE GATE PRE-FLIGHT BLOCKED — CREDENTIAL/ENVIRONMENT UNAVAILABLE`**

This is an environment/credential-availability stop, not a provider-side authentication result and not an evidence-quality or integration-correctness outcome. It is historical fact for this run. No second live attempt, no Stripe run, and no retry occurred, consistent with the one-attempt authorization. The reviewed `createCompanySnapshot()` orchestration and all B1–B4B production files remain exactly as pushed at `4ea2bceb022043fb03c9c7fbe1a6f3a609fe36a5`; nothing under `src/` changed as part of this gate.

**No conclusion is drawn about B5's integration correctness from this attempt** — it never reached the pipeline. The zero-network fake-network integration tests (`7a`/`7b` in `test/phase-b5-live-smoke.test.mjs`) are the only evidence currently available that the reviewed orchestration composes B1–B4B correctly end-to-end; they are not a substitute for a live pass and are not claimed as one.

One live-gate CLI attempt occurred, but credential preflight stopped it before the pipeline or network began; therefore zero network-backed B5 executions occurred. A future NVIDIA live execution requires fresh project-owner authorization after `EXA_API_KEY` is available. Broader Phase B validation, Phase C, endpoint/UI, and deployment remain unstarted and unauthorized by this task.
