# Phase A3 Exa Viability Record

## Scope and current status

Phase A3 tests the smallest plausible Exa architecture after the approved Gemini 2.5 Flash hypothesis failed its account-level model-access gate:

```text
company input
→ one Exa Search request using auto
→ structured output.content
→ provider-returned output.grounding
→ tiny deterministic integrity checks
→ transient manual review
```

Exa Plan B and one bounded NVIDIA smoke are authorized. The pre-live architecture correction is complete, but the first Exa smoke has not occurred: provider request count remains **0**. The project owner reports that `EXA_API_KEY` now exists in the repository-local ignored `.env`; this correction did not read, load, print, inspect, or use it. Actual-account free-path behavior therefore remains untested. The representative benchmark is not authorized, and no runtime architecture is frozen.

## Official contract and free-path findings

Verified against current official Exa material on 2026-09-08:

- Starter is advertised as free, with $20 in signup credits, $10 in monthly credits, no payment method required, all endpoints, and 10 Search QPS.
- The Search endpoint is `POST https://api.exa.ai/search`; the OpenAPI schema permits either `x-api-key` or Bearer authentication.
- Current Search types are `instant`, `fast`, `auto`, `deep-lite`, `deep`, and `deep-reasoning`; `auto` is the recommended balanced default for most applications.
- `outputSchema` works with every Search type. The non-streamed response includes `results[]`; with synthesis it also includes `output.content` and required field-level `output.grounding`.
- Exa explicitly says not to put citation fields in `outputSchema`; each grounding entry contains a field path, citation `{url, title}` objects, and a confidence label.
- The public guide and OpenAPI describe grounding citation URLs independently from `results[].url`; they do not guarantee equality between them.
- Standard Search is listed at $0.007 per request for up to 10 results. Current Exa surfaces describe Search as supporting webpage highlights and also publish separate Contents endpoint pricing; this diagnostic does not depend on how those pricing descriptions interact.
- Public documents establish that a no-payment free path exists but cannot prove the account state behind the local key.

Sources:

- https://exa.ai/pricing?tab=api
- https://exa.ai/docs/reference/billing
- https://exa.ai/docs/reference/search
- https://exa.ai/docs/reference/search-api-guide-for-coding-agents
- https://exa.ai/docs/reference/pricing
- https://exa.ai/docs/reference/rate-limits
- https://exa.ai/docs/reference/openapi-spec
- https://exa.ai/docs/exa-spec.json

The OpenAPI specification is the response-schema authority. No authenticated dashboard or provider call was used during this correction.

## Mode and contents decisions

The active first hypothesis is `type: "auto"`, not `deep-lite`. Current official guidance recommends `auto` for most applications and confirms that `outputSchema` synthesis works with every Search type. `deep-lite` was never called or empirically rejected. It is only a possible later, separately authorized fallback if `auto` materially fails; there is no automatic fallback.

The generated setup selected `contents.highlights`, but this diagnostic omits it because `output.content` already provides the bounded snapshot and `output.grounding` already provides its field-level evidence links. Omitting optional content retrieval keeps the first hypothesis smaller and avoids depending on content behavior the experiment does not need. No text, summary, multiple content modes, or forced livecrawl is requested.

## Bounded diagnostic

`scripts/exa-phase-a.mjs`:

- allows only `smoke --company NVIDIA`;
- requires `--confirmed-free-starter` as the operator's actual-account attestation;
- makes at most one native `fetch` call and has no retry or polling path;
- requests only `resolvedCompanyName`, `officialDomain`, `description`, and exactly three signals containing `title`, `date`, and `summary`;
- keeps the provider-facing schema minimal by omitting `additionalProperties`, `minItems`, and `maxItems`, while retaining exact-key and exactly-three checks after the response;
- contains no source URL, citation, or confidence field in the synthesized output schema;
- does not seed `NVIDIA Corporation` or `nvidia.com` into the provider request;
- accepts only an exact NVIDIA Corporation / `nvidia.com` identity after the provider responds;
- enforces a 2–3 sentence description and exactly three dated signals;
- requires older-than-180-day material to be labeled `Older fallback`;
- validates the documented grounding entry/citation shape and requires relevant grounding for identity, domain, description, and every indexed signal;
- accepts only whitespace-clean HTTP(S) grounding citation URLs and preserves each accepted destination byte-for-byte; a blank provider title receives the neutral transient label `Source`;
- never compares grounding URLs to `results[].url`, normalizes destinations, or substitutes result URLs;
- rejects duplicate normalized signal titles;
- logs only aggregate diagnostics and provider status/tag plus numeric latency on error;
- redacts the active key and Exa-shaped credentials from errors;
- serves the validated snapshot and exact provider-grounding links only in memory on localhost for manual inspection.

Grounding supports an indexed signal when the provider grounds the signal object itself, such as `signals[0]`, or grounds all three displayed children: `title`, `date`, and `summary`. A lone child citation or aggregate `signals` grounding is not enough to assign evidence to the full displayed signal. Manual review still decides whether each citation materially supports its claim, whether the source is credible, and whether the three signals represent distinct underlying events.

## Verification to date

The focused mocked checks cover pre-request authorization, one-call/no-retry behavior, `auto` request shape, schema exclusions, body-inclusive latency, minimized/redacted errors, strict output shape, identity/domain, sentence and signal counts, date/older-fallback handling, duplicate-title rejection, required grounding, malformed/unsupported grounding URLs, grounding-derived display links, aggregate-only logging, absence of seeded NVIDIA facts, and absence of a filesystem persistence path.

No Exa request was made by these offline checks.

## Live/manual record

The previous credential preflight stopped before a request. Since then, the project owner reports that a replacement/current `EXA_API_KEY` exists in ignored local `.env`; this task deliberately did not access it. Exa request count remains zero.

Endpoint/mode access, actual-account behavior, provider latency, NVIDIA identity/domain, description quality, signal count/recency/distinctness, grounding/source counts, manual source support, and blocked-source behavior have not been evaluated. No raw provider response, result set, grounding-link collection, or temporary display artifact was created or persisted.

Exit status: **`BLOCKED` pending human review/push before the already-authorized NVIDIA smoke can run in a separate execution task**. Representative benchmarking, Tavily, Phase B, production UI, and deployment have not started.
