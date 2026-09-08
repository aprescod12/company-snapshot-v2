# Company Snapshot V2 — AI Failure Log

## Purpose

Record only **genuine V2 AI mistakes, dead ends, incorrect assumptions, or implementation failures** that materially affect the work.

Do not manufacture failures for the final reflection.

V1 failures may be referenced in `docs/PLAN.md` as historical lessons, but they do not belong here as if they occurred in V2.

## Format

| Problem | AI mistake | How detected | What changed | Lesson learned |
| --- | --- | --- | --- | --- |

## V2 entries

| Problem | AI mistake | How detected | What changed | Lesson learned |
| --- | --- | --- | --- | --- |
| An untracked local credential was exposed in diagnostic command output. | The orchestrator ran a repository-wide secret-search command that printed matching lines. An untracked `.env` had appeared after the initial clean preflight, so its assignment was emitted even though the scan was intended only to verify hygiene. | The command output visibly contained the `.env` assignment. No provider request had been made. | The credential was not used and was later revoked/rotated and replaced; `.env`/`.env.*` are now ignored; the diagnostic redacts both recognized key formats plus the active key; remaining scans are limited to staged/tracked content and report only pass/fail, never matching lines. | A secret-hygiene check must never print candidate matches. Check known paths and staged/tracked blobs silently, especially because workspace state can change during a task. |
| The first Phase A diagnostic chose the legacy Generate Content API even though the recommended Interactions API met the required contract. | The implementation treated familiar `groundingMetadata` and `searchEntryPoint` field names as necessary, rather than checking whether the required Search execution, Suggestions display, direct result, and citation mapping behavior existed on the recommended surface. | Project-owner pre-push review prompted a fresh check of the current official Interactions overview, Search guide, API reference, and OpenAPI contract. | Before any provider request or push, the diagnostic was migrated to one Interactions call with `store: false`, matched Search call/result validation, array-shaped Suggestions handling, and inline URL-citation byte-span validation; mocked contract checks were expanded. | Select provider APIs by the required behavior and verify the recommended surface first; do not mistake one response schema's familiar fields for the product contract. |
| Phase A was designed around Gemini 2.5 Flash, but the new project could not access it. | During planning, AI verified capability/pricing documentation but did not identify the new-project model-access restriction before provider-specific diagnostic work was built. | The first real NVIDIA smoke returned `model_unavailable`; provider research then confirmed that documented model capability did not imply availability to the new project. | Gemini 2.5 Flash was rejected before A2, and account-level model availability is now treated as something that must be established as early as possible. | Provider capability/pricing documentation is not sufficient evidence of account-level availability. Prove the actual account/model path with the smallest possible smoke before investing in provider-specific architecture. |
| Human pre-push review challenged a correctly verified Exa Starter rate limit. | ChatGPT stated that current Exa pricing showed Starter at 5 Search QPS and Developer at 10, and instructed Codex to overwrite the repository's verified 10-QPS Starter value. | Codex rechecked the canonical Exa pricing page before making changes, found Starter at 10 Search QPS and Developer at up to 25, and stopped rather than following the conflicting instruction. | The erroneous correction was withdrawn. The repository retains the current canonical 10-QPS Starter value, and provider-source verification takes precedence over unsupported AI review claims. | A review instruction is not authoritative merely because it comes later. When it conflicts with a current canonical provider source, stop and verify rather than blindly applying the requested change. |

## Candidate-entry rule

Add an entry only when all of these are true:

1. a real problem occurred;
2. AI materially contributed to the wrong assumption, implementation, diagnosis, or recommendation;
3. the problem was detected through review, testing, source inspection, deployment, or another concrete check;
4. a correction or decision followed;
5. there is a useful lesson for the final reflection.

Examples that would qualify if they actually occur:
- hallucinated provider capability;
- incorrect free-tier assumption;
- wrong company resolution;
- fabricated/unsupported source;
- duplicate event selection;
- unnecessary dependency;
- broken deployment recommendation;
- provider rate-limit assumption;
- incorrect bug diagnosis;
- code that fails required TypeScript/build verification.

Do not log ordinary iteration that did not constitute a meaningful mistake.
