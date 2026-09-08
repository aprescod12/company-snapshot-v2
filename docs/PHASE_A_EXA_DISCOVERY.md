# Phase A4.1 Exa Raw-Discovery Decomposition

## Scope and current status

Phase A4.1 isolates the unresolved cause of the A3 signal-quality failure:

> Were strong recent NVIDIA events absent from Exa's raw Search results, or were they present but omitted by one-shot synthesis?

The bounded pre-live diagnostic is implemented and locally verified. It has **not** been run against Exa. A4.1 provider-request count is **0**, cumulative Exa provider-request count remains **1**, and the prior A3 `auto + outputSchema + output.grounding` final-snapshot result remains **`NO-GO`**. No production architecture is frozen.

This is a discovery decomposition experiment, not a new final Company Snapshot architecture. It does not produce a company description, choose three final signals, rank candidates, or invoke a second model.

## Current provider contract

Verified against Exa's current official material on 2026-09-08:

- Raw Search uses `POST https://api.exa.ai/search`.
- `auto` is the default balanced Search type and remains the selected mode.
- `numResults: 10` is within the documented 1–100 range and matches the default.
- `contents.highlights: true` requests default query-relevant excerpts per result.
- Raw results can expose `title`, `url`, estimated `publishedDate`, optional `author`, and `highlights` when requested.
- Exa describes `publishedDate` as an estimate derived from page content. The diagnostic displays it as discovery metadata only; manual source inspection must establish any supported event date.
- `startPublishedDate` is deliberately omitted so absent or imperfect provider date metadata does not hide otherwise useful candidates in this first decomposition.
- Search is listed at $7 per 1,000 requests for up to 10 results, while webpage contents are separately listed at $1 per 1,000 pages per content type. The future live experiment must record Exa's returned total rather than infer it. Starter remains advertised as free with signup/monthly credits and no payment method required. The actual account state was already verified before A3, but a new explicit operator attestation remains required before any future A4.1 request.

Sources:

- https://exa.ai/docs/reference/search-api-guide-for-coding-agents
- https://exa.ai/docs/reference/search
- https://exa.ai/docs/exa-spec.json
- https://exa.ai/pricing?tab=api

No provider contract discrepancy was found. No `.env` file or credential was read or loaded during this pre-live task.

## Future request contract

`scripts/exa-phase-a-discovery.mjs` permits only:

```bash
node scripts/exa-phase-a-discovery.mjs discovery --company NVIDIA --confirmed-free-starter
```

After separate live authorization, one invocation will make at most one native `fetch` call with no retry or polling:

```json
{
  "query": "<unseeded, signal-oriented NVIDIA query with current-date context>",
  "type": "auto",
  "numResults": 10,
  "contents": {
    "highlights": true
  },
  "stream": false
}
```

The request omits `outputSchema`, synthesis `systemPrompt`, `additionalQueries`, summaries, full text, date filters, category filters, and forced livecrawl. The query asks for significant company-level developments and explicitly excludes routine repository/code maintenance, generic profiles, stock-price commentary, evergreen pages, and duplicate coverage. It contains no expected NVIDIA event answer from A3 or elsewhere.

## Candidate handling and safety

The diagnostic projects only rank, title, exact HTTP(S) URL, provider `publishedDate` or `unknown`, optional author, and returned highlight excerpts. It:

- rejects non-HTTP(S), malformed, or whitespace-padded result URLs;
- preserves accepted provider destinations exactly in memory;
- HTML-escapes all candidate text and escaped link attributes;
- explicitly shows missing dates and highlights rather than fabricating them;
- serves the candidate set only on an ephemeral `127.0.0.1` page with no-store/no-cache headers;
- persists no raw response, result set, URL collection, highlight text, or source-page content;
- logs only endpoint, type, latency, result/date/highlight/domain counts, and returned total cost;
- excludes provider prose and candidate material from errors and redacts the active key plus Exa-shaped credentials.

## Future manual decision gate

The live experiment will inspect every returned card and open only returned URLs needed to assess plausible candidates. It will not search for replacement sources. A candidate qualifies only if it is about NVIDIA, represents a real and useful company-level event, has a manually supported date within 180 days, is materially supported by the returned source, and is distinct from other qualifying candidates.

Use exactly one future outcome:

- **`DISCOVERY SUFFICIENT`** — at least three qualifying distinct events within 180 days; also record how many are within 90 days.
- **`DISCOVERY INSUFFICIENT`** — the raw set is inspectable but contains fewer than three qualifying events within 180 days.
- **`BLOCKED`** — the request contract, environment, network, or provider response prevents meaningful candidate-set evaluation.

None of these outcomes has been observed yet. `deep-lite` remains untested and is not an automatic fallback.

## Pre-live verification

Mocked checks cover the CLI/account gate, one-call/no-retry behavior, exact raw request shape, unseeded query requirements, optional candidate metadata, URL safety/preservation, HTML escaping, absent-highlight display, aggregate-only diagnostics, body-inclusive latency, minimized/redacted errors, localhost no-cache display, and absence of filesystem persistence.

Exit status: **`A4.1 PRE-LIVE READY`**. Human review of the local commit is still required before any live authorization. Live raw discovery, the representative benchmark, `deep-lite`, Tavily, Phase B, production UI, and deployment remain unstarted and unauthorized.
