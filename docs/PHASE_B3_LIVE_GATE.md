# Phase B3 Live Gate

Date: 2026-09-09

## Authorized scope

The gate authorized one production-path B3 smoke for `NVIDIA` and then one for `Stripe`, with at most two Exa requests per company, zero retries, and no third company. It required the existing Free Starter/no-paid-path confirmation and an `EXA_API_KEY` available to the process. Publisher GETs were permitted only through B3's bounded source-verification path.

## Harness and local verification

At the original gate, `scripts/phase-b3-live-smoke.mjs` was a minimal adapter over production discovery and verification. It accepts only exact `NVIDIA` or `Stripe` input with `--confirmed-free-starter`; it has no persistence, raw provider-response dump, credential/header output, retry, polling, or implementation duplicate. The later B3R1 diagnostic-only revision uses the shared `discoverCompanyForSmoke(...)` and `verifyCompanyDiscoveryForSmoke(...)` observers to add sanitized B2 identity diagnostics and per-candidate B3 trace data without changing production decisions.

Before live activity, the harness tests passed 7/7; B3 verification tests passed 16/16; relevant B1/B2/selector regressions passed 53/53; and `node --test test/*.test.mjs` passed 154/154. Syntax checks and `git diff --check` passed.

## Preflight stop

The process did not have `EXA_API_KEY` available. The key contents and existing ignored `.env` were not read. The harness stopped before `discoverCompany(...)`, so no Exa request or publisher GET occurred. No retry, alternative credential loader, response persistence, source inspection, NVIDIA run, Stripe run, B4, or later work occurred.

| Accounting | Count |
| --- | ---: |
| Starting cumulative Exa requests | 14 |
| NVIDIA Exa requests | 0 |
| Stripe Exa requests | 0 |
| B3 gate Exa requests | 0 |
| Ending cumulative Exa requests | 14 |
| Retries | 0 |
| Publisher requests | 0 |

## Outcome

**`B3 LIVE GATE PRE-FLIGHT BLOCKED — CREDENTIAL/ENVIRONMENT UNAVAILABLE`**

This is an environment/preflight stop, not a provider-side authentication result and not an evidence-quality outcome. It remains historical fact.

## Owner-run continuation (authoritative correction)

After the owner loaded the existing ignored environment configuration into the shell, the already-authorized production-path commands ran with no retry. NVIDIA reached B2 `ready_for_verification` as `NVIDIA Corporation` / `nvidia.com`, made one broad and one conditional official-domain fallback Exa request, and ended B3 `insufficient_evidence` with two accepted first-party records: `NVIDIA to Acquire Hugging Face` and `Sparks Fly: NVIDIA Accelerates Local AI at IFA 2026`, both dated 2026-09-03 / `RECENT`. The first accepted snippet was header-like: `NVIDIA to Acquire Hugging Face September 3, 2026 ... Share...`.

Stripe made one broad Exa request but stopped at B2 `clarification_needed` / `insufficient_identity_evidence`; B3 did not run. A separate authorized B2 diagnostic request for the same `Stripe` input then resolved `Stripe, Inc.` / `stripe.com` / `ambiguous:true`, with B1 `resolved` and three first-party `stripe.com` grounding URLs for each identity field. Since the original clarification response was not retained, the differing provider identity output cannot be attributed to a particular field difference.

| Accounting | Count |
| --- | ---: |
| Starting cumulative Exa requests | 14 |
| NVIDIA broad / fallback | 1 / 1 |
| Stripe broad / B2 diagnostic | 1 / 1 |
| Owner-run Exa requests | 4 |
| Retries | 0 |
| Ending cumulative Exa requests | 18 |

The preflight block is superseded for live-gate evaluation by this owner-run continuation, but is not erased. No policy correction follows from these results. B3 remains not production-approved pending diagnostic root-cause review and project-owner decision; B4 and later work remain unstarted.

## B3R1 Stage A — diagnostic-only observability

The owner-run outcomes earned observability, not a change to B1/B2/B3 policy. The current smoke harness makes the same one B2 and one B3 execution, now through B2's existing sanitized `discoverCompanyForSmoke(...)` observer and a shared B3 verification observer. It exposes safe B2 identity diagnostics on both resolution and clarification, and for each B3 candidate actually evaluated it records the real post-dedupe decision, broad/fallback origin, safe parsed-source metadata where available, fallback counts, and final accepted count. It adds no retry, persistence, raw provider/publisher artifact, third search, or second verifier; normal production return contracts and decisions remain unchanged.

Syntax checks, focused B3/B3-smoke diagnostics (27/27), the full zero-network suite (158/158), and `git diff --check` passed. Stage A made 0 Exa requests and 0 publisher requests, so cumulative Exa remains 18. B3R1 live replay is separately limited to the two already-authorized production-path commands when the executing process has the key; B3 remains not production-approved.
