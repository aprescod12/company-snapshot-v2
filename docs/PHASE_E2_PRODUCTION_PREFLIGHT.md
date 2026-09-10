# Phase E2 — Production Preflight

Date: 2026-09-10

## Scope

Verify the deployed production artifact aligns with reviewed `main`, confirm static/production health, perform exactly one authorized live company submission (`Adobe`, name input), and review its result. No runtime/backend change is authorized in this phase.

## Repository/deployment alignment

- Local HEAD: `d90f497651f62c9de3eaa2e701f459bb1b26efe3` (`docs: close D3 production replay`)
- Remote `origin/main` HEAD (`git ls-remote origin main`): `d90f497651f62c9de3eaa2e701f459bb1b26efe3` — **matches local exactly, directly verified**
- D3 runtime repair `1de14141aff8462dcbbf5e08e3706625b014d6b7` confirmed present in local history (`git log`) as the direct parent of HEAD
- Vercel deployment metadata: **not independently observable**. No `vercel` CLI is installed in this environment; the Vercel MCP tools (`get_project`, `list_projects`) returned `403 Forbidden` for this project, and `list_teams` returned no teams — the same unauthenticated-integration gap already recorded in `docs/PHASE_D2_PRODUCTION_VALIDATION.md`. No tool available in this session can read the deployed commit SHA.
- Static-asset byte comparison: `public/app.js`, `public/styles.css`, and `public/index.html` fetched live from `https://company-snapshot-v2.vercel.app/` are **byte-for-byte identical** to the local working tree. This confirms the frontend build in production matches the current repo, but the frontend was unchanged by D3 (a backend-only fix in `src/verification/verifyCompany.mjs`), so this check provides **no independent evidence about backend/D3 inclusion**.
- D3 inclusion conclusion: **not independently re-verified in E2**. Reliance is placed on the already-approved D3 closure record (`docs/PLAN.md`, `docs/TESTING.md` "Final Assessment Validation — Production Round"), which documents a live `linear.app` production replay performed at deployment time that confirmed the duplicate no longer appeared. The Adobe submission below does **not** provide positive or negative evidence on D3 inclusion — precise code-level tracing (below) shows the D3 conditions for this specific Adobe pair are not met regardless of whether D3 is deployed.

## Static production preflight

| Check | Result |
| --- | --- |
| `GET /` | `200`, ~0.13s |
| `GET /app.js` | `200`, `content-type: application/javascript`, 8368 bytes, matches local |
| `GET /styles.css` | `200`, `content-type: text/css`, 10367 bytes, matches local |
| `GET /api/snapshot` | `405`, `Allow: POST`, `Cache-Control: no-store` — confirms the endpoint exists and rejects non-POST **before** touching the provider path (verified against `api/snapshot.mjs`'s method check, which runs before body parsing or `EXA_API_KEY` access) |
| `EXA_API_KEY` name-presence in Production | Not directly observable (no Vercel CLI/API access this session — see above). Indirectly confirmed by the Adobe submission below: it returned `200` with a fully-formed company description and signals, which is only reachable if `EXA_API_KEY` is present and valid (a missing key short-circuits to `503`/`unavailable` before any provider call, per `api/snapshot.mjs:47-50`) |
| Secret values printed | None — only header/status metadata and JSON response bodies were inspected |

No company input was sent to `/api/snapshot` during this static preflight; the GET request above cannot reach the provider path.

## Responsive/browser validation

**Not independently performed with a real browser in this session.** No browser-automation, screenshot, or viewport-emulation tool is available in this environment (confirmed via tool search — only a text-only `WebFetch`, which converts HTML to markdown with no visual rendering, is available). This mirrors the same limitation already recorded in `docs/PHASE_D2_PRODUCTION_VALIDATION.md` for non-browser checks.

What can be honestly reported: static CSS inspection (already performed in Phase E1, re-confirmed unchanged here via the byte-identical `styles.css` fetch above) shows `@media (max-width: 40rem)` responsive rules, `min-width: 320px` on the body, `aria-live="polite"`/`aria-atomic="true"` on the result panel, and `prefers-reduced-motion` handling. This is static evidence only, not a live visual confirmation at ~375px. **The ~375px live visual check remains unperformed** and is deferred to the project owner's own browser check or a future session with browser tooling.

## Adobe production submission

- Exact input: `Adobe` (name input)
- Method: single `curl` POST directly to `https://company-snapshot-v2.vercel.app/api/snapshot` with body `{"input":"Adobe"}`. **No browser-automation tool is available in this session**, so this could not be performed through the actual browser UI as preferred; this is disclosed honestly rather than fabricated, consistent with the same methodology and disclosure already used for D1/D2's curl-based submissions.
- Number of production submissions made: **exactly 1**
- Loading state: **not observable** — a `curl` request cannot show the browser loading UI. (The loading state itself was already independently confirmed live in a browser during D2, for a different company; this is not re-claimed here.)
- HTTP result: `200`, 16.42s total
- Final public state: `insufficient_evidence`
- Resolved company: `Adobe Inc.` / `adobe.com`
- Description: 3 sentences, correct core business (Creative Cloud/creative software, AI-enhanced content tools, Acrobat/document workflows), no embedded URL, no hype
- Number of displayed signals: **2** (not 3 — consistent with the honest `insufficient_evidence` contract, no padding)

| # | Title | Displayed date | Source hostname | Recency label |
| --- | --- | --- | --- | --- |
| 1 | "Adobe reports solid Q3, tops 1 billion monthly active users" | 2026-09-10T00:00:00.000Z | constellationr.com | RECENT |
| 2 | "Adobe Q3 2026: AI revenue surge and a CEO change signal a new era" | 2026-09-10T20:06:14.000Z | 247wallst.com | RECENT |

## Source verification

Both source links were opened (a read-only fetch to a third-party publisher; not another `/api/snapshot` submission and not counted against the one-submission budget).

| # | Accessible | About Adobe | Supports displayed claim | Date consistent | Material |
| --- | --- | --- | --- | --- | --- |
| 1 | Yes (HTTP 200) | Yes | Yes — reports Q3 earnings beat, $6.76B revenue, 1B MAU milestone | Yes — page states "September 10, 2026", consistent with the date-only displayed value | Yes |
| 2 | Yes (HTTP 200) | Yes | Yes — reports the same Q3 earnings beat, $6.76B revenue, CEO transition | Yes — exact match: page's embedded `"occurredAt":"2026-09-10T20:06:14.000Z"` equals the displayed date to the second | Yes |

**Distinctness finding: the two signals are NOT distinct events.** Both articles report on the identical underlying corporate event — Adobe's Q3 FY2026 earnings release, announced 2026-09-10 — and share the same core facts: revenue $6.76 billion, EPS $6.13 (non-GAAP) / $4.62 (GAAP), the 1-billion-monthly-active-users milestone, 150% AI-ARR growth, and the Shantanu Narayen → Anil Chakravarthy CEO transition. This is directly analogous to the pre-D3 Linear defect (two publishers, one underlying event), and is a real violation of `docs/TESTING.md` §3.6 ("Multiple articles about one underlying event count as one signal.").

### Root-cause trace (code-level, not speculative)

The exact D3 duplicate-detection code (`collectQuantityAnchors`, `shareStrongEventQuantityAnchors` in `src/verification/verifyCompany.mjs`) was run locally, read-only, against the actual raw HTML of both live articles (zero-network — the HTML was already fetched for the checks above; only local Node execution, no repo file was modified):

- Article 1 (constellationr.com) extracted `eventQuantityAnchors`: `1:billion:count`, `150:percent`, `1.83:billion:currency`, `6.76:billion:currency`, `13:percent`, `6.7:billion:currency`. `titleQuantityAnchors`: `1:billion:count`.
- Article 2 (247wallst.com) extracted `eventQuantityAnchors`: **only `150:percent`**. `titleQuantityAnchors`: none.
- **Shared anchors: `{150:percent}` — only 1, below the required minimum of 2.** The dedupe rule correctly does not merge them under its own stated logic.

Why article 2 only yields one anchor despite containing the same $6.76B figure: this publisher's page (a "24/7 Wall St. Cards" auto-generated finance page) embeds a large block of raw stock-price time-series JSON *inside* the `<article>`/`<main>` container, ahead of the actual prose. The extractor's 2,000-character lede-scan window is consumed by this embedded JSON before it reaches the article's actual sentence containing the revenue figure, and that figure is rendered on-page as the abbreviated `"$6.76B"` — a notation the `QUANTITY_ANCHOR_PATTERN` regex (which only matches literal `million|billion|thousand|percent|%`) does not match at all, independent of position.

**This is not a bug in the D3 merge logic** — the AND-conditions (≥2 shared anchors, headline corroboration) are correctly evaluated and correctly return "not a duplicate" given the anchors actually extracted. It is a **new, previously undocumented failure mode** distinct from the two limitations already disclosed in the D3 record (recycled-boilerplate-metrics false-positive risk; "neither headline states the shared figure" false-negative risk): a publisher embedding non-editorial structured/JSON data ahead of article prose can starve the lede-scan window and/or use abbreviated numeral notation the anchor regex doesn't recognize, both independently preventing genuine same-event detection.

**Per Phase E2 §14, this is documented and NOT repaired.** No runtime file was changed.

## Provider accounting

- Pre-E2 baseline: Search 55–64 / Contents 17 / retries 0
- Adobe submission: reached a description (the response includes a well-formed 3-sentence description), so exactly **+1 Contents** is defensible. Search: at least +1 broad Search is certain; whether an official-domain fallback Search also fired is not externally observable from the response, so **+1–2 Search** is the defensible range. Retries: **+0** (single request, single clean response, no evidence of retry).
- **New cumulative: Search 56–66 / Contents 18 / retries 0**

## Findings

1. **Repository/remote alignment: directly verified.** Local and remote `main` both at `d90f497...`.
2. **Vercel deployment metadata: not independently observable** in this session (no CLI, MCP 403). D3 inclusion relies on the prior approved closure record, not re-verified here.
3. **Static production health: PASS.** Homepage, `app.js`, `styles.css` all `200` and byte-identical to the reviewed repo; `/api/snapshot` behaves exactly as the reviewed contract specifies for a non-POST request.
4. **~375px responsive check: not performed** — no browser tool available in this session; genuinely unperformed, not assumed, consistent with the project's established honesty pattern.
5. **Adobe submission: safe state (`insufficient_evidence`), but a real content-level duplicate-event finding.** The state itself is not a defect (§14 explicitly exempts safe failure states). The two displayed signals covering one underlying event is a genuine, code-traced, new finding.

## Exit decision

**E2 BLOCKED — PROJECT-OWNER DECISION REQUIRED**

A new, concrete, evidence-traced duplicate-event finding was discovered during the single authorized Adobe submission. Per Phase E2 §14, this was not repaired, no other company was submitted, and no deployment occurred. The finding is documented above with an exact code-level root cause. The orchestrator's own assessment (not a decision) is that this is best understood as a new, previously undocumented manifestation of the already-accepted "conservative dedupe can miss some same-event pairs" limitation — driven by a specific publisher's embedded-JSON page structure and abbreviated numeral notation — rather than a logic error in the existing merge rule; a project-owner review of the actual evidence and a decision on disposition (accept as an extension of the known limitation vs. authorize a future narrow, separately-scoped repair) is required before E2 can be considered further.

## E2R1 addendum (2026-09-10)

A follow-up phase (E2R1) re-traced this finding through executable evidence and found the true root cause was more precise than the "embedded-JSON/abbreviated-notation" hypothesis above: a nested `<article>` tag silently truncating one publisher's extracted body (a generic HTML-matching bug), combined with a numeral-vs-spelled-out-word mismatch independently blocking headline corroboration. A narrow, generic repair was implemented and zero-network tested (368/368), independently adversarially reviewed, and is pending project-owner patch review and separate authorization for any live replay. This entry is not a rewrite of the finding above — see `docs/TESTING.md`'s "Phase E2R1" section for the full record.
