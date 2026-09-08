# Phase A4.1 Exa Raw-Discovery Decomposition

## Scope and current status

Phase A4.1 tests a bounded strategy related to the unresolved A3 signal-quality failure:

> Can a dedicated signal-oriented raw-discovery query retrieve enough strong recent NVIDIA events to support a decomposed discovery → selection direction?

The bounded diagnostic was executed exactly once against Exa on 2026-09-08 after the reviewed baseline and local checks passed. A4.1 provider-request count is **1**, cumulative Exa provider-request count is **2**, and the outcome is **`DISCOVERY SUFFICIENT`**. The prior A3 `auto + outputSchema + output.grounding` final-snapshot result remains **`NO-GO`**, and no production architecture is frozen.

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
- Search is listed at $7 per 1,000 requests for up to 10 results, while webpage contents are separately listed at $1 per 1,000 pages per content type. The live diagnostic returned a $0.007 total. Starter remains advertised as free with signup/monthly credits and no payment method required. The project owner explicitly attested to the previously verified Free Tier/no-payment account state before authorizing A4.1.

Sources:

- https://exa.ai/docs/reference/search-api-guide-for-coding-agents
- https://exa.ai/docs/reference/search
- https://exa.ai/docs/exa-spec.json
- https://exa.ai/pricing?tab=api

No provider contract discrepancy was found. The ignored/untracked `.env` was loaded only into the isolated live command process; the key was not printed, inspected, copied, persisted, staged, or committed.

## Executed request contract

`scripts/exa-phase-a-discovery.mjs` permits only:

```bash
node scripts/exa-phase-a-discovery.mjs discovery --company NVIDIA --confirmed-free-starter
```

The one authorized invocation made one native `fetch` call with no retry or polling:

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

## Live aggregate result

The transient display was inspected for all 10 returned cards. Exact returned destinations were opened only as needed for plausible candidates; when the in-app browser was unavailable, the authorized read-only direct-retrieval fallback was used. No replacement-source search occurred.

| Measure | Observed result |
| --- | --- |
| Provider requests | A4.1: 1; cumulative Exa: 2; no retry or follow-up provider call |
| Endpoint / mode | `POST https://api.exa.ai/search`; raw `auto` Search |
| Latency / returned cost | 4,065 ms / $0.007 total |
| Results | 10 returned; 8 with provider dates; 10 with highlights; 8 unique domains |
| Candidates inspected | All 10 returned cards; all 10 event-bearing candidates received a concise classification |
| Qualifying distinct events | 3 |
| Recency | 3 within `≤90d`; 0 within `91–180d` |
| Inaccessible exact destinations | Ranks 2, 5, and 10 returned HTTP 403 during authorized direct retrieval |

## Candidate evidence record

Provider `publishedDate` was treated only as discovery metadata. Dates below were accepted from the returned destination or, for rejected/inaccessible rows, are explicitly limited to what the returned content asserted. No raw excerpts, full result set, bulk URL collection, or source-page text was persisted.

| Rank | Short event label | Supported date / recency | Source quality | Support | Materiality | Duplicate cluster / decision |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | NVIDIA agreement to acquire Hugging Face | 2026-09-03 / `≤90d` | `FIRST_PARTY` | `SUPPORTED` | Material acquisition | Hugging Face cluster; **qualifies** |
| 2 | NVIDIA–Hugging Face definitive agreement filing | 2026-09-02 / `≤90d` | `FIRST_PARTY` | `INACCESSIBLE` | Material acquisition | Hugging Face cluster; reject as duplicate; exact SEC destination returned 403 |
| 3 | IFA local-AI launch: PAIR and RTX Spark PCs | 2026-09-03 / `≤90d` | `FIRST_PARTY` | `SUPPORTED` | Material product/platform launch | PAIR/RTX Spark cluster; **qualifies** |
| 4 | Expanded NVIDIA–MediaTek partnership and investment | 2026-08-31 / `≤90d` | `FIRST_PARTY` | `SUPPORTED` | Material partnership/investment | Distinct; **qualifies** |
| 5 | AWS agreement for additional NVIDIA infrastructure | 2026-08-26 / `≤90d` | `FIRST_PARTY` | `INACCESSIBLE` | Material customer/partnership event | Distinct but rejected because the exact destination returned 403 |
| 6 | PAIR release coverage | 2026-09-07 / `≤90d` | `WEAK_SECONDARY` | `SUPPORTED` | Material product launch | PAIR/RTX Spark cluster; reject as weaker duplicate of rank 3 |
| 7 | Groq rack manufacturing/deployment report | 2026-09-08 / `≤90d` | `WEAK_SECONDARY` | `PARTIAL` | Potentially material capacity/product event | Distinct but rejected as SEO-style repackaging without direct event evidence |
| 8 | Hugging Face acquisition coverage | 2026-09-02 / `≤90d` | `REPUTABLE_SECONDARY` | `SUPPORTED` | Material acquisition | Hugging Face cluster; reject as duplicate of rank 1 |
| 9 | FY2028 year-ahead forecast coverage | 2026-08-26 / `≤90d` | `WEAK_SECONDARY` | `PARTIAL` | Material financial outlook | Q2/outlook cluster; reject as SEO-style repackaging rather than defensible direct evidence |
| 10 | AGI and Q2 earnings-call claims | `UNKNOWN` | `WEAK_SECONDARY` | `INACCESSIBLE` | Mixed claims; material if true | Q2/outlook cluster; reject because the exact destination returned 403 and no event date was defensible |

Duplicate review found two clear repeated-event clusters: Hugging Face acquisition coverage at ranks 1, 2, and 8, and PAIR/RTX Spark coverage at ranks 3 and 6. Ranks 9 and 10 also overlapped on the Q2/outlook topic, but neither qualified. Duplicate pages were never counted as separate events.

## Manual decision gate

A candidate qualifies only if it is about NVIDIA, represents a real and useful company-level event, has a manually supported date within 180 days, is materially supported by the returned source, and is distinct from other qualifying candidates.

The observed outcome is:

**`DISCOVERY SUFFICIENT`** — the raw set contains three distinct, useful, first-party, materially supported NVIDIA events, all within 90 days: the Hugging Face acquisition agreement, the IFA local-AI/PAIR and RTX Spark launch, and the expanded MediaTek partnership/investment.

Interpretation: A4.1 demonstrated that a dedicated signal-oriented raw-discovery query can retrieve enough strong recent candidates for NVIDIA, supporting a decomposed discovery → selection direction. Because the A4.1 query differed from A3's final-snapshot query, the experiment does not isolate whether A3 failed solely in downstream selection versus retrieval-query formulation. This finding does not authorize or freeze a ranking architecture. `deep-lite` remains untested and is not an automatic fallback.

## Pre-live verification

Mocked checks cover the CLI/account gate, one-call/no-retry behavior, exact raw request shape, unseeded query requirements, optional candidate metadata, URL safety/preservation, HTML escaping, absent-highlight display, aggregate-only diagnostics, body-inclusive latency, minimized/redacted errors, localhost no-cache display, and absence of filesystem persistence.

The required syntax check and 13 focused mocked tests passed both before the live request and after documentation updates. The full local suite also passed after execution. The transient localhost display was stopped after inspection, and no raw result, highlight collection, source content, credential, or temporary display artifact was persisted.

Exit status: **`DISCOVERY SUFFICIENT`**. Exactly one A4.1 request occurred and no retry was made. The representative benchmark, `deep-lite`, another company, Tavily, Gemini, Groq, Phase B, production UI, and deployment remain unstarted and unauthorized.
