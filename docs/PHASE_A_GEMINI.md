# Phase A Gemini Viability Record

Verification date: 2026-09-07
Status updated: 2026-09-08

## Scope and outcome

Phase A tested the preconditions for the smallest candidate architecture:

```text
company input
→ Gemini 2.5 Flash with Google Search grounding
→ directly displayable Grounded Result, Search steps, and URL citations
```

Phase A is **`BLOCKED` at pre-live-test review**. `GEMINI_API_KEY` was absent from the process environment during the initial preflight, so the diagnostic failed closed before network access. An untracked `.env` appeared later, but it was not sourced or used, and a flawed secret scan exposed its assignment in local command output. That credential has now been revoked/rotated and replaced. The replacement AI Studio project is shown as Free Tier with billing not set up, but the replacement key remains unused. No claim about actual Gemini model access, free-path account behavior, Search execution, output quality, grounding, citations, Search Suggestions, source support, or latency is supported by this record.

## Current official-provider verification

Official Google documentation was rechecked on 2026-09-08:

- [`gemini-2.5-flash` model](https://ai.google.dev/gemini-api/docs/models/gemini-2.5-flash) and [Search grounding](https://ai.google.dev/gemini-api/docs/google-search) list Gemini 2.5 Flash and Google Search grounding support.
- [Pricing](https://ai.google.dev/gemini-api/docs/pricing) lists Standard Free Tier input/output as free and Google Search grounding as free for up to 500 grounded prompts/day, shared with Flash-Lite.
- The [Interactions overview](https://ai.google.dev/gemini-api/docs/interactions-overview) identifies Interactions as the recommended API and documents `store: false`; the [Interactions Search guide](https://ai.google.dev/gemini-api/docs/google-search) and [API reference](https://ai.google.dev/api/interactions-api) document `google_search_call`, matched `google_search_result` arrays with `search_suggestions`, and final `model_output` text with `url_citation` annotations.
- The exact documented Gemini 2.5 Flash Search contract is exposed through `/v1beta/interactions`; the [current OpenAPI description](https://ai.google.dev/static/api/interactions.openapi.json) is authoritative for the array-shaped Search result, while the [breaking-changes notice](https://ai.google.dev/gemini-api/docs/interactions-breaking-changes-may-2026) reinforces the need to treat the beta response contract as changeable.
- [Additional Terms](https://ai.google.dev/gemini-api/terms) require displaying Grounded Results with associated Search Suggestions and materially restrict modification, extraction, collection, storage, and tracking of Grounded Results, Suggestions, and Links.

The terms call Grounding with Google Search via Gemini API a Paid Service while the pricing page advertises a Free Tier grounding allowance. A successful unbilled call is the approved practical Phase A gate but would not legally resolve that wording. The terms also create a future regional availability risk for an unbilled public application serving end users in the EEA, Switzerland, or the UK. `store: false` disables Interaction storage but does not override the separate provider-side retention Google documents for grounding queries and results; the diagnostic's no-persistence guarantee is limited to local/application handling.

## Diagnostic implemented

`scripts/gemini-phase-a.mjs` uses Node's native `fetch` and HTTP server, with no package or SDK dependency. It:

- makes at most one synchronous, non-background Interactions API request per invocation, with `store: false` and no polling;
- requires explicit unbilled-project confirmation;
- gates benchmark and repeat modes on prior results;
- sends the key only through `x-goog-api-key` and redacts key-shaped errors;
- asks Gemini for the complete direct-display snapshot without model-authored URLs or a second rewrite call;
- hard-fails unless the interaction is completed and contains matched successful Search call/result steps with at least one non-empty query overall, array-shaped provider Search Suggestions, exactly one final model output, and valid inline URL citations; additional empty string queries are tolerated, and missing citation titles use the neutral transient label `Source`;
- prints only aggregate metadata counts and booleans;
- serves the unchanged full Grounded Result, provider-returned Search Suggestions, and transient citation-span-to-source mappings only from memory on `127.0.0.1` with no-store headers;
- performs no source fetching, crawling, access logging, click tracking, response dumping, or provider-material persistence.

The original local diagnostic selected the legacy Generate Content surface on the assumption that its `groundingMetadata` fields were necessary. Pre-push review of current official documentation showed that Interactions supplies the required behavioral contract through Search steps, `search_suggestions`, and `url_citation` annotations. The diagnostic and mocked contract tests were migrated before any provider request or push; Phase A therefore remains blocked and no runtime architecture is frozen.

## A1 factual record

| Measure | Result |
| --- | --- |
| Input | `NVIDIA` |
| Intended company | NVIDIA Corporation |
| Provider request | Not made |
| Resolved company / official domain | Not observed |
| Final signals / signal dates / recency / distinctness | Not observed |
| Search-query / citation / source counts | Not observed |
| Source provenance / manual support | Not evaluated |
| Latency | Not observed |
| Failure classification | Initial `provider_auth` preflight (missing local credential; provider did not reject a request) |
| Display diagnostic | Implemented but not run with provider material |

## Decision

Gemini recommendation: **`BLOCKED`**.

The exposed credential has been revoked/rotated and replaced, and the replacement AI Studio project is shown as Free Tier with billing not set up. To resume A1, the corrected local commit must receive human approval and push approval, then the project owner must separately authorize the single NVIDIA smoke command. A2 must not begin unless that smoke passes every hard gate.

Exa, production implementation, deployment, and all later phases were not started.
