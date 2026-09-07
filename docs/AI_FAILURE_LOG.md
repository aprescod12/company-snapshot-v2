# Company Snapshot V2 — AI Failure Log

## Purpose

Record only **genuine V2 AI mistakes, dead ends, incorrect assumptions, or implementation failures** that materially affect the work.

Do not manufacture failures for the final reflection.

V1 failures may be referenced in `docs/PLAN.md` as historical lessons, but they do not belong here as if they occurred in V2.

## Format

| Problem | AI mistake | How detected | What changed | Lesson learned |
| --- | --- | --- | --- | --- |

## V2 entries

_No V2 failures recorded yet._

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
