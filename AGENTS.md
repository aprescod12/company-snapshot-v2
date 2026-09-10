# AGENTS.md — Company Snapshot V2

## Required reading before any work

Read these files in order:

1. `docs/ASSESSMENT_BRIEF.md`
2. `docs/WORKFLOW.md`
3. `docs/PLAN.md`
4. `docs/TESTING.md`
5. `docs/AI_FAILURE_LOG.md` when reviewing failures or preparing phase reports

## Source-of-truth order

- Assessment brief controls product requirements.
- Workflow controls development procedure.
- PLAN controls currently approved V2 decisions.
- TESTING controls approved benchmark/verification gates.
- Historical reports do not silently override living documents.

If instructions conflict, stop and surface the conflict.

## Prompt completeness requirement

Every substantive coding-agent request must arrive as a **full-context, self-contained brief**.

The prompt must explicitly state:
- what the product is;
- what has already been tried;
- what failed or remains unresolved;
- what done looks like;
- the specific bounded task being authorized.

Never treat a bare “continue,” “read the docs and proceed,” or a repo-document reference alone as sufficient task context. The repository documents supplement and verify the prompt; they do not replace it.

If a prompt appears to omit material history or contradict the governing documents, surface the discrepancy before making architecture-expanding changes. Do not silently invent the missing context.

## Operating rules

- Work only on the explicitly authorized phase/task.
- Do not begin later-phase work without project-owner approval.
- Plan/investigate first when the prompt is planning-only.
- Do not silently expand scope.
- No paid APIs or paid keys.
- Do not attach billing to make a provider candidate work.
- Do not add auth, accounts, dashboards, persistence, or a database unless explicitly approved after a concrete need is demonstrated.
- Do not add LangChain, LangGraph, or runtime multi-agent architecture without explicit approval.
- Development-time sub-agents are encouraged when useful for bounded investigation, implementation, testing, or independent review.
- Never fabricate company facts, source URLs, dates, test results, live checks, or provider behavior.
- Every new layer/dependency must solve an observed problem.
- Review V1 only as historical evidence when explicitly relevant; do not import V1 architecture by default.

## Completion

Every meaningful implementation/correction task must:

1. perform the exact verification required by the authorized prompt;
2. review the diff and `git status`;
3. ensure no credentials, `.env`, temporary outputs, or unintended files are staged;
4. update only living docs materially affected by actual work;
5. provide the required Phase Completion Report from `docs/WORKFLOW.md`;
6. create one focused **local commit only — do not push**;
7. report commit SHA, message, branch, verification performed, and explicit confirmation that the commit has not been pushed;
8. stop without beginning later-phase work until: the pre-push review gate clears (the actual local diff reviewed, any required correction applied and re-verified, and push explicitly authorized), and the agent then completes the remaining `docs/WORKFLOW.md` §4 phase-exit workflow — pushing, confirming the remote branch, and reaching formal phase approval.

Implementation complete locally, reviewed and authorized to push, pushed and remotely confirmed, and phase formally approved are four distinct states (`docs/WORKFLOW.md` §4). A completion report or passing tests establish only the first.
