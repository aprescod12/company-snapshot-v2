# Phase B1 Live Identity Gate

## Outcome

**`B1 LIVE IDENTITY GATE SAFE AMBIGUITY`** on 2026-09-09, after the first authorized Mercury request stopped on a format blocker and a separately authorized one-request parser correction/rerun completed.

This bounded experiment tested whether the same broad Exa Search request already approved for signal discovery could also return provider-grounded B1 company identity evidence when the only request-body addition was a minimal identity `outputSchema`. It was not B2 and did not change production targeting, discovery, verification, synthesis, endpoint, UI, deployment, or provider strategy.

## Contract and limits

The Mercury request was the first and only new request. It used `POST https://api.exa.ai/search` with the existing A4.1 generic signal-discovery query for Mercury, `type: "auto"`, `numResults: 10`, `contents: { highlights: true }`, `stream: false`, and only this additional schema:

```js
{
  type: "object",
  required: ["resolvedCompanyName", "officialDomain", "ambiguous"],
  properties: {
    resolvedCompanyName: { type: "string" },
    officialDomain: { type: "string" },
    ambiguous: { type: "boolean" },
  },
}
```

There was no system prompt, category, domain filter, date filter, extra query/context, summary/full-text/livecrawl request, second model/query, alternate type, retry, polling, source-page fetch, or response persistence. The repository-local `.env` was confirmed ignored, untracked, and unstaged before the process ran; its contents were not printed or staged. The operator supplied the required Free Starter attestation flag.

## First Mercury live result — format blocker

The one native request returned a response, but the normal result at index 9 did not contain a non-empty `title`. The raw-result parser therefore stopped with:

```text
formatting: results[9].title was not a non-empty string.
```

No retry was made. Because the process intentionally does not persist raw responses and stopped before output parsing, this experiment did not inspect or retain `output.content`, `output.grounding`, candidate highlights/URLs, response cost, latency, or source destinations. It consequently cannot establish either a safe Mercury resolution or a safe ambiguity clarification.

Stripe was not requested: Mercury did not meet its safety gate, and the harness also requires an explicit post-Mercury safety attestation before it accepts Stripe. The first live attempt made Mercury 1, Stripe 0, total 1; cumulative Exa experimental requests: 8.

## Parser-contract reassessment and correction

The real provider response established that result `title` is optional presentation metadata. Current official Exa TypeScript SDK documentation models `SearchResult.title` as `string | null`. The shared A4.1 parser was therefore corrected narrowly: valid result objects still require a non-empty exact HTTP(S) `url`, while absent, null, empty, or whitespace-only titles normalize to local `null`. A UI-only `Untitled source` fallback does not replace the stored title or use the URL as a title. Non-string non-null titles, malformed URLs, unsupported protocols, and all identity/grounding gates remain rejected.

This correction changed no request, query, schema, targeting behavior, retry policy, persistence boundary, or architecture. Regressions cover absent/null/empty/normal titles, strict URL failures, and an untitled result that continues through raw discovery, identity grounding, and B1 handoff.

## Second Mercury live result — safe ambiguity

The separately authorized rerun made exactly one Mercury request with the identical frozen body and schema. It returned:

| Field | Provider result |
| --- | --- |
| `resolvedCompanyName` | `Mercury (Fintech) and Mercury Systems (Aerospace/Defense)` |
| `officialDomain` | `mercury.com` |
| `ambiguous` | `true` |
| B1 result | `clarification_needed` / `insufficient_identity_evidence` |
| Latency / returned cost | 3,083 ms / $0.007 |
| Raw result aggregate | 10 results; 10 dated; 10 highlighted; 8 unique domains |

Exact name grounding was `https://mercury.com/blog/exclusive-treasury-funds` and `https://finance.yahoo.com/markets/stocks/articles/mercury-systems-reports-fourth-quarter-200100522.html`. Exact official-domain grounding was `https://mercury.com/blog/exclusive-treasury-funds`, `https://mercury.com/blog/introducing-mercury-spend`, and `https://mercury.com/blog/introducing-mercury-command`.

Manual review opened only those returned destinations. The three `mercury.com` pages identify the fintech/product platform. The exact Yahoo Mercury Systems destination returned HTTP 429 during direct review, while the provider-returned candidate material identified Mercury Systems as the aerospace/defense entity. That unavailable alternate destination does not weaken the safe outcome: the provider itself declared both entities and `ambiguous: true`, and B1 did not accept either one. The broad raw set remained signal-oriented (first-party fintech product developments plus independent coverage); this gate did not assess final signal qualification. The exact number of missing titles was not retained as a separate aggregate in the transient rerun output; the successful parse confirms no title blocked identity evaluation.

Stripe was not requested. Mercury requests across B1 live work: 2; Stripe: 0; retries: 0; new Exa requests in the rerun task: 1; cumulative Exa experimental requests: 9.

## Decision and limits

The final decision is **SAFE AMBIGUITY**. The first attempt remains a factual format-blocker failure; the second demonstrates that, under the frozen one-broad-request identity gate, B1 safely clarifies a genuinely ambiguous Mercury result. It is not evidence that a clear-company identity can be resolved universally, a parser/retrieval redesign is warranted, or Stripe/B2 should begin. Stripe remains separately gated and requires project-owner review/authorization.

## Verification

Pre- and post-live checks actually run:

- `node --check scripts/exa-phase-b1-identity-gate.mjs`
- `node --check test/exa-phase-b1-identity-gate.test.mjs`
- `node --check src/targeting/companyTarget.mjs`
- `node --test test/exa-phase-a-discovery.test.mjs` — 14/14 passed
- `node --test test/exa-phase-b1-identity-gate.test.mjs` — 12/12 passed
- `node --test test/company-target.test.mjs` — 10/10 passed
- `node --test test/*.test.mjs` — 109/109 passed
- `git diff --check` — passed

The mocked tests cover the exact frozen body plus only the schema, allowlist and account attestation, Stripe post-Mercury attestation, one fetch/no retry, title optionality with strict URLs, malformed grounding failures, relevant-field grounding extraction/deduplication, B1 handoff, and no persistence/polling/source retrieval.

## Phase Completion Report

1. **Work / non-goals.** Preserved the first format blocker, corrected only title parsing, then made one authorized Mercury rerun. Stripe, B2, selector/targeting changes, and all later-phase work were not started.
2. **Files.** The shared parser/test now accommodate optional titles; the B1 integration test proves handoff; this report and living records retain the two-request chronology.
3. **Sub-agents.** A parser investigator identified the existing optional-string helper as the smallest correction. A pre-live reviewer approved strict URL preservation and frozen request/schema. A post-live reviewer approved SAFE AMBIGUITY and no architecture change.
4. **Decisions / deviations.** Only title metadata became optional. The request/schema and B1 contract stayed frozen; no special Mercury behavior was added.
5. **Independent review.** Reviewers found no blocking issue before the rerun and confirmed the rerun's B1 clarification matched the grounded ambiguity.
6. **Verification.** The commands and passing results are listed above; final diff, status, and credential hygiene inspection were performed before phase exit.
7. **Live/manual validation.** First Mercury request format-blocked; second Mercury request safely clarified. Exact returned grounding sources only were reviewed; Yahoo was rate-limited. Stripe was not run.
8. **Limitations / deferred work.** This proves only a safe ambiguity outcome for this Mercury sample. Stripe remains separately gated; no production-resolution conclusion follows.
9. **AI failure-log candidates.** The inherited mandatory-title parser is a genuine corrected AI failure and is recorded in `docs/AI_FAILURE_LOG.md`.
10. **Exit status.** The bounded correction/rerun exited SAFE AMBIGUITY with no later-phase work.
