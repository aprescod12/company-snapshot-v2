# Phase B3 Live Gate

Date: 2026-09-09

## Authorized scope

The gate authorized one production-path B3 smoke for `NVIDIA` and then one for `Stripe`, with at most two Exa requests per company, zero retries, and no third company. It required the existing Free Starter/no-paid-path confirmation and an `EXA_API_KEY` available to the process. Publisher GETs were permitted only through B3's bounded source-verification path.

## Harness and local verification

`scripts/phase-b3-live-smoke.mjs` is a minimal diagnostic adapter over production `discoverCompany(...)` followed by `verifyCompanyDiscovery(...)`. It accepts only exact `NVIDIA` or `Stripe` input with `--confirmed-free-starter`; it has no persistence, raw provider-response dump, credential/header output, retry, polling, or implementation duplicate. Its output is limited to B2 resolution/provider metadata, B3 request accounting/state, and the final accepted publisher-derived evidence records.

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

This is an environment/preflight stop, not a provider-side authentication result and not an evidence-quality outcome. B3 is not production-approved. Any later live execution requires its own authorized continuation and project-owner source review after a successful run.
