# Company Snapshot V2 — AI-Assisted Development Workflow

## Status

This is a governing workflow document for Company Snapshot V2.

The product requirements are controlled by `docs/ASSESSMENT_BRIEF.md`. This document controls **how the work is performed**. `docs/PLAN.md` records the currently approved V2 technical and product decisions.

## Source-of-truth hierarchy

1. `docs/ASSESSMENT_BRIEF.md` — authoritative product requirements.
2. `docs/WORKFLOW.md` — authoritative development procedure.
3. `docs/PLAN.md` — current approved V2 decisions and architecture hypotheses.
4. `docs/TESTING.md` — approved benchmarks and the factual record of verification actually performed.
5. Phase reports / experiment records — historical evidence; they do not silently override the living plan.
6. Chat transcript — decision history showing planning, pushback, failures, corrections, and approvals.

If two sources conflict, stop and surface the conflict rather than silently choosing one.

## AI tooling roster

As of 2026-09-09, ChatGPT continues to handle planning, technical critique, phase/scope decisions, review, and prompt construction. Claude Code has joined the previously used coding agents (including Codex) as an implementation/review coding agent for repository work. This entry records current tooling only; it does not reinterpret or reassign which agent performed any historical phase recorded elsewhere in this repository.

---

# 1. Core principle

The work is **prompt-first**.

The human role is not to click around an IDE and hope the coding agent figures the project out. The human role is to define the product, provide complete context, structure the task, review the diff, diagnose failure, verify behavior, and keep the agent moving toward a clear definition of done.

**Key rule: context is the job.**

---

# 2. Standard working loop

For every meaningful task:

1. Start from a **full-context, self-contained brief every time**.
   - Never send a bare “continue.”
   - Never rely on prior chat state or repo-document references alone.
   - Restate what the product is.
   - Restate what has already been tried.
   - Restate what failed or remains unresolved.
   - Restate what done looks like.
   - Then state the specific bounded task being authorized.
   - Include the current phase, frozen decisions, and any constraints needed to execute correctly.

   The prompt itself must be sufficient for a fresh coding-agent session to understand the work without reconstructing missing history. Repo documents are additional sources of truth and reconciliation, not substitutes for this prompt context.

2. Plan before implementation.
   - Discuss the phase/task before coding.
   - Challenge weak assumptions.
   - Define success and failure criteria.
   - Keep the task bounded.

3. Use one bounded task per workspace/session.
   - Do not mix unrelated phases.
   - Use isolated workspaces/worktrees where useful.
   - Do not begin later-phase work without explicit approval.

4. Preserve context when sessions change.
   - Never send only “continue.”
   - Carry forward the full relevant state: objective, source of truth, decisions, failures, current repo state, verification, and unresolved issues.
   - Do not restart from a thin summary that forces the agent to invent missing details.

5. Treat the agent like a teammate when stuck.
   - Ask it to diagnose the failure.
   - Ask for bounded alternatives.
   - Preserve what failed and why.
   - Do not remain in a broken retry loop.

6. Verify rather than trust.
   - Review actual diffs.
   - Run the relevant commands.
   - Test live behavior when external systems are involved.
   - Open real sources.
   - Never accept “done,” “it works,” or “tests pass” without evidence.

---

# 3. Prompt contract

Every substantive planning, implementation, correction, or review prompt must be written as a **self-contained work brief**. It must not assume the agent remembers a previous session. At minimum, the prompt must explicitly cover:

- what the product is;
- what has already been tried;
- what failed or remains unresolved;
- what done looks like;
- the specific bounded task to execute.

The sections below operationalize that rule.

## 3.1 Phase and objective
Name the current phase/task and state exactly what outcome is authorized.

## 3.2 Full context and source of truth
Restate the full product and project context needed to make the prompt stand on its own, including:
- what the product is and the authoritative requirements;
- relevant work already attempted;
- relevant failures, rejected approaches, blockers, and unresolved issues;
- currently frozen decisions and current repo/phase state;
- what success means for this task.

Do **not** replace this context with “read the docs” or “continue.” Reference the governing repo documents as additional sources of truth that the agent must read and reconcile against the self-contained brief.

## 3.3 Scope and deliverables
List the concrete implementation, investigation, diagnostic, test, or documentation outputs required.

## 3.4 Constraints and non-goals
State what must not change or be introduced:
- no later-phase work;
- no paid APIs or paid keys;
- no unnecessary dependencies;
- no architecture expansion without evidence;
- no weakening of an approved correctness gate merely to make a benchmark pass.

## 3.5 Existing interfaces and affected files
Identify relevant files, contracts, scripts, tests, and living documents to inspect or preserve.

## 3.6 Implementation requirements
Describe the approved behavior, important edge cases, failure behavior, and any empirical decision gates.

## 3.7 Development-time sub-agents
The coding agent is the orchestrator. It should use bounded sub-agents where they materially help with:
- investigation;
- implementation;
- testing;
- independent review.

Only agents that actually ran should be reported. Development-time sub-agents do **not** authorize runtime multi-agent architecture.

## 3.8 Verification requirements
Specify the exact automated commands, live/manual cases, source checks, or production checks that must actually be run.

## 3.9 Documentation reconciliation
Update only living documents materially affected by the completed work. Preserve historical experiment/phase reports rather than rewriting history.

## 3.10 Phase Completion Report
Every meaningful implementation or correction prompt must require a concise report with:

1. Work completed and explicit non-goals.
2. Files changed and purpose of meaningful changes.
3. Sub-agents actually used:
   - role;
   - what they inspected/implemented;
   - important findings;
   - resulting corrections/decisions.
4. Key technical decisions and deviations from the approved plan, with reasons.
5. Independent review findings and fixes; if none, explicitly say so.
6. Verification actually performed, with exact commands/results where useful.
7. Live/manual validation cases when real web data, APIs, external systems, or deployment are involved.
8. Known limitations, unresolved risks, assumptions, and deferred work.
9. Genuine AI failure-log candidates only:

   `Problem | AI mistake | How detected | What changed | Lesson learned`

10. Phase exit status (see §4 for the full state model):
   - exit criteria met or not;
   - blockers;
   - local commit SHA and message;
   - branch;
   - explicit confirmation that the commit has not been pushed (or, once push is separately authorized, that it has been pushed and the remote branch confirmed);
   - confirmation that no later-phase work began without approval.

---

# 4. Mandatory phase-exit review-then-push workflow

Phase exit passes through four distinct states. Do not use them interchangeably, and do not treat a coding agent saying "done" or reporting passing tests as more than the first:

1. **Implementation complete locally** — the authorized work is done, verified, and captured in one local commit. Nothing has been reviewed against the actual diff, and nothing has been pushed.
2. **Reviewed and authorized to push** — ChatGPT/the project owner has reviewed the **actual local diff**, not merely the Phase Completion Report; any required correction has been applied and re-verified; push has been explicitly authorized.
3. **Pushed and remotely confirmed** — the reviewed commit has been pushed and the remote branch has been confirmed to point at it.
4. **Phase formally approved** — the project owner has separately approved the phase as complete. Only after this state may a later phase begin.

## Procedure

Before completing each implementation or correction phase:

1. Perform only the authorized work.
2. Run the required verification.
3. Perform bounded independent review where required or useful (§3.7).
4. Inspect `git diff` and `git status`.
5. Confirm no `.env`, credentials, scratch files, temporary outputs, or unintended files are staged.
6. Create one focused **local commit only. Do not push.**
7. Return the required Phase Completion Report (§3.10), including the local commit SHA, commit message, branch, verification performed, and explicit confirmation that the commit has not been pushed. This reaches **implementation complete locally**.
8. ChatGPT/the project owner reviews the actual local diff.
9. If review finds an issue: apply only the authorized correction, rerun the relevant verification, amend the existing local commit (or add one further focused local commit) rather than opening an unrelated new phase commit, and return the corrected local SHA. The phase remains unpushed until review passes.
10. Once actual-diff review passes, ChatGPT/the project owner explicitly authorizes the push. This reaches **reviewed and authorized to push**.
11. Push the reviewed commit and confirm that the remote branch points to it. This reaches **pushed and remotely confirmed**.
12. The project owner formally approves/closes the phase. This reaches **phase formally approved**.
13. Do not begin a later phase until the current phase reaches **phase formally approved**.

This pre-push actual-diff review gate is part of the normal phase-exit workflow, not an optional courtesy.

---

# 5. V2-specific operating principles

- **The smallest architecture that works wins.**
- Working required product comes before technical sophistication.
- Correctness is evaluated together with **coverage**.
- A system that never hallucinates because it never returns three signals does not satisfy the assessment.
- Every new layer must earn its existence through a failure actually observed.
- Provider/tool choices are hypotheses until they pass the approved live benchmark.
- Do not run open-ended provider bakeoffs.
- Do not manufacture AI failures.
- Keep the transcript showing planning, challenge, empirical testing, mistakes, corrections, verification, and human approval.

---

# 6. Documentation procedure

The repo should keep a small set of living documents:

- `docs/ASSESSMENT_BRIEF.md` — original assessment, unchanged.
- `docs/PLAN.md` — current approved V2 plan and decisions.
- `docs/WORKFLOW.md` — this procedure.
- `docs/TESTING.md` — benchmark design and verification record.
- `docs/AI_FAILURE_LOG.md` — genuine V2 failures only.
- `README.md` — setup, architecture summary, environment variables, deployment, known limitations, and submission-facing overview.

Meeting/chat transcripts remain part of the project record. When a new coding-agent session begins, provide a **full-context, self-contained prompt** that restates the product, prior attempts, failures/unresolved state, definition of done, and the specific task. Also direct the agent to the relevant repo docs for source-of-truth reconciliation. Never use repo-document references as a substitute for the full brief.

---

# 7. Before starting any task

Ask:

- Do I have the full brief?
- Do I have the latest approved plan?
- Do I know what has already been tried and failed?
- Am I in the correct repo/workspace?
- Is this one bounded task?
- Is “done” explicit?
- Are pass/fail gates explicit if this is an experiment?

Before finishing:

- Did I inspect the diff?
- Did I run the required verification?
- Did I test real behavior where necessary?
- Did I preserve the transcript?
- Did I document genuine AI failures/corrections?
- Did I identify remaining human review?
- Did I follow the git-exit workflow?
