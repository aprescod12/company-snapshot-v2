# Phase B1 Live Identity Gate

## Outcome

**`B1 LIVE IDENTITY GATE FAIL — FORMAT BLOCKER`** on 2026-09-09.

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

## Mercury live result

The one native request returned a response, but the normal result at index 9 did not contain a non-empty `title`. The raw-result parser therefore stopped with:

```text
formatting: results[9].title was not a non-empty string.
```

No retry was made. Because the process intentionally does not persist raw responses and stopped before output parsing, this experiment did not inspect or retain `output.content`, `output.grounding`, candidate highlights/URLs, response cost, latency, or source destinations. It consequently cannot establish either a safe Mercury resolution or a safe ambiguity clarification.

Stripe was not requested: Mercury did not meet its safety gate, and the harness also requires an explicit post-Mercury safety attestation before it accepts Stripe. New Exa requests: Mercury 1, Stripe 0, total 1; cumulative Exa experimental requests: 8.

## Decision and limits

The decision is **FAIL — format blocker**. This is a safe stop, not evidence of an incorrect Mercury resolution and not an endorsement of a parser/retrieval redesign. Any change to raw-result validation, rerun, additional company, or B2 work requires a new full-context authorization.

## Verification

Pre- and post-live checks actually run:

- `node --check scripts/exa-phase-b1-identity-gate.mjs`
- `node --check test/exa-phase-b1-identity-gate.test.mjs`
- `node --check src/targeting/companyTarget.mjs`
- `node --test test/exa-phase-b1-identity-gate.test.mjs` — 11/11 passed
- `node --test test/company-target.test.mjs` — 10/10 passed
- `node --test test/*.test.mjs` — 107/107 passed
- `git diff --check` — passed

The mocked gate tests cover the exact frozen body plus only the schema, allowlist and account attestation, Stripe post-Mercury attestation, one fetch/no retry, malformed grounding failures, relevant-field grounding extraction/deduplication, B1 handoff, and no persistence/polling/source retrieval.

## Phase Completion Report

1. **Work / non-goals.** Added the B1-only identity-gate harness and tests; made one Mercury request and stopped on the format error. Stripe, B2, selector changes, targeting changes, source retrieval, and all later-phase work were not started.
2. **Files.** The harness performs the bounded request and safe parsing; its focused test file locks the contract and stop conditions; this report records the real experiment; PLAN, TESTING, and README now reflect the material request count and failure state.
3. **Sub-agents.** One bounded investigator verified the exact A4.1 body and reusable parser boundaries. One independent reviewer identified the missing Stripe ordering control and malformed-grounding gap; the Stripe confirmation flag and strict grounding validation were added. The reviewer also proposed adding identity instructions, which was not adopted because the approved request allowed only `outputSchema` beyond A4.1.
4. **Decisions / deviations.** The request contract was preserved exactly. A Stripe-only post-Mercury attestation was added as a stricter local stop control. No production targeting code changed.
5. **Independent review.** The Stripe ordering and grounding fixes were made and retested. The suggested query-instruction change was rejected as inconsistent with the frozen experiment contract.
6. **Verification.** The commands and passing results are listed above; final diff, status, and credential hygiene inspection were performed before phase exit.
7. **Live/manual validation.** Mercury made one request; normal result index 9 was malformed for the raw parser. No output/grounding/source review was possible or claimed. Stripe was not run.
8. **Limitations / deferred work.** The experiment cannot answer the identity question because response parsing stopped before identity evaluation. Any remedy, rerun, or later phase needs new authorization.
9. **AI failure-log candidates.** None. The live provider-response format stop is factual external evidence; no additional material AI mistake was established.
10. **Exit status.** The bounded experiment exited safely with a format-blocker failure. Its requested stop condition was met; no later-phase work began.
