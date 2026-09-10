# Phase D2 — Production Validation + Evidence Gate

## Status

**D2 PRODUCTION VALIDATION — PASSED**

Date: 2026-09-10

Production URL: `https://company-snapshot-v2.vercel.app`
Vercel project: `amiri-prescods-projects/company-snapshot-v2`
Deployed source SHA (unchanged from D1, confirmed still the single live deployment before D2 began): `8f2d13ceb0e9ddbf13b6750f7163faf78ad6ca78`

## Purpose

D1 deployed the application publicly and confirmed the HTTP boundary, static assets, and security posture, but neither of its two authorized companies (NVIDIA, stripe.com) reached `snapshot`. D2 exists to establish at least one successful, evidence-reviewed production snapshot before the full final assessment testing matrix begins.

## Production precheck

- Homepage reachable: `HTTP 200` in ~0.26s.
- `EXA_API_KEY` confirmed present via `vercel env ls`: Production scope, type Secret, value `Hidden` — never printed or exposed.
- Deployment health: `vercel ls`/`vercel inspect` showed a single `Ready` production deployment (`dpl_4QfczFWZKXJ659VAPw8B6sqsgVwp`), unchanged since D1 — no redeploy occurred before or during D2.
- Git/Vercel connection: the project owner stated the Vercel project is now connected to `aprescod12/company-snapshot-v2` on GitHub. This could not be independently confirmed via a read-only CLI command (the installed Vercel CLI exposes only `vercel git connect`/`disconnect`, no `ls`/status subcommand, and the Vercel MCP tools returned `403 Forbidden` for this project — a different, unauthenticated integration than the CLI session). The absence of any new auto-triggered deployment is consistent with either no connection or no new push since connecting; it does not contradict the owner's statement.
- Exa quota: no safe read-only quota-check endpoint exists in this codebase or was used. Proceeded within budget per explicit owner authorization; all five D2-era live requests below completed with real multi-second round trips reaching deep pipeline stages (B3/B4B), which is strong positive evidence the account is functioning normally. The successful D2 requests reduce concern that D1's fast `stripe.com` failure reflected a persistent deployment or account-capacity problem; the exact cause of that D1 public `provider_unavailable` result remains unknown.

## Authorized company results

All four originally authorized D2 inputs were submitted via `curl` directly against the production `/api/snapshot` endpoint (no browser available to this agent), each exactly once, in the specified order, with no retries.

### 1. notion.so (domain input)

| Field | Value |
| --- | --- |
| State | `snapshot` |
| HTTP status / time | 200 / 10.43s |
| Resolved company | Notion Labs, Inc. / notion.com |
| Description | 2 sentences, correct core business (AI-enabled workspace platform), no URL embedded, no hype |
| Signal 1 | "Introducing Notion's Developer Platform" — 2026-05-13T16:30:00.000Z — FALLBACK — `https://www.notion.com/blog/introducing-developer-platform` |
| Signal 2 | "Control which AI models your agents can use" — 2026-09-09T00:00:00.000Z — RECENT — `https://www.notion.com/en-gb/releases/2026-09-09` |
| Signal 3 | "Share Notion Workers across your team" — 2026-07-09T00:00:00.000Z — RECENT — `https://www.notion.com/releases/2026-07-09` |
| Retry | none |

### 2. PostHog (name input)

| Field | Value |
| --- | --- |
| State | `snapshot` |
| HTTP status / time | 200 / 6.52s |
| Resolved company | PostHog / posthog.com |
| Description | 2 sentences, correct core business (product/web analytics platform), no URL embedded, no hype |
| Signal 1 | "PostHog + Expo Integration Connects Analytics in One Command" — 2026-09-09T15:33:18.178Z — RECENT — `https://www.createwith.com/tool/posthog/updates/posthog-expo-integration-connects-analytics-in-one-command` |
| Signal 2 | "PostHog Ships Autoresearch Mode to Automate Code Optimization With AI Agents" — 2026-07-10T16:29:43.308Z — RECENT — `https://www.createwith.com/tool/posthog/updates/posthog-ships-autoresearch-mode-to-automate-code-optimization-with-ai-agents` |
| Signal 3 | "We're partnering with Stripe to solve the most annoying problem for product builders" — 2026-03-26T00:00:00.000Z — FALLBACK — `https://posthog.com/blog/stripe-projects` |
| Retry | none |

### 3. Datadog (name input)

| Field | Value |
| --- | --- |
| State | `unavailable`, reason `description_unavailable` |
| HTTP status / time | 200 / 9.14s |
| Resolved identity | not exposed by the sanitized public contract for this state |
| Signals | none (never reached B4A assembly with a usable description) |
| Retry | none |

### 4. Mercury (name input)

| Field | Value |
| --- | --- |
| State | `snapshot` |
| HTTP status / time | 200 / 6.96s |
| Resolved company | Mercury Technologies, Inc. / mercury.com |
| Description | 3 sentences, correct core business (business banking/financial software), no URL embedded, no hype |
| Signal 1 | "Introducing Mercury Treasury exclusive mutual fund products" — 2026-08-18T19:52:30.000Z — RECENT — `https://mercury.com/blog/exclusive-treasury-funds` |
| Signal 2 | "Introducing Mercury Command" — 2026-06-16T14:01:20.000Z — RECENT — `https://mercury.com/blog/introducing-mercury-command` |
| Signal 3 | "The future of banking*" — 2026-05-20T00:00:00.000Z — FALLBACK — `https://mercury.com/blog/series-d-announcement` |
| Retry | none |

Historically, Mercury had produced a safe ambiguous/clarification result in earlier validation; per §7/§12 of the D2 brief, ambiguity was an acceptable outcome and a snapshot was not required. This run instead resolved cleanly to a full snapshot — an example of the same documented provider-response variability already recorded for Mercury/Canva elsewhere in this project, not a contradiction.

### 5. notion.so re-submission — owner-approved browser confirmation (beyond the original 4-company cohort)

The D2 brief required owner browser validation of a rendered snapshot, but doing so necessarily means submitting a company through the real UI — a live Exa call beyond the four already authorized. This tradeoff was surfaced explicitly to the project owner, who approved one additional live submission for this purpose only.

The owner submitted `notion.so` through the production browser UI and confirmed, with a screenshot:
- the description and heading rendered correctly (`Notion Labs, Inc.` / `notion.com`);
- a freshly generated 3-sentence description (differs in wording from submission 1's 2-sentence description — expected, since B4B's description generation is not deterministic wording-for-wording across independent live calls; the underlying facts and tone are consistent);
- all 3 signals rendered with correct titles, dates, and clickable source links, exactly matching submission 1's signal set (title/date-for-title/date);
- the "Older fallback" badge rendered correctly on the appropriate signal;
- clean one-page layout matching the approved C2 design (dark theme, serif heading, orange accent, no layout defects visible);
- **a loading state appeared** before the snapshot rendered (owner-confirmed explicitly);
- no duplicate submission was reported during the owner browser run; exact-once stress behavior was not separately re-tested during D2 (this was already established as historical evidence during Phase C3).

The ~375px narrow-viewport check was requested but **not confirmed** by the owner as of this record — recorded honestly as not performed, not assumed.

## Evidence review (required for every snapshot)

All 9 signal source URLs across the 3 snapshots were fetched directly (`curl -L`, browser user-agent) and manually inspected for support, date consistency, and identity. All returned `HTTP 200` and were fully accessible — no source was inaccessible or blocked.

### notion.so

| # | Source | Support | Date | Identity | Event |
| --- | --- | --- | --- | --- | --- |
| 1 | notion.com/blog/introducing-developer-platform | PASS — `<title>` and JSON-LD `datePublished` exactly match | PASS — `2026-05-13T09:30-07:00` = `16:30:00.000Z`, exact match | PASS — first-party notion.com | PASS |
| 2 | notion.com/en-gb/releases/2026-09-09 | PASS — page `<title>` is "9 September 2026 – Control which AI models your agents can use", exact match | PASS — exact | PASS — first-party | PASS |
| 3 | notion.com/releases/2026-07-09 | PASS — page `<title>` is "July 9, 2026 – Share Notion Workers across your team", exact match | PASS — exact | PASS — first-party | PASS |

**Distinctness: DISTINCT.** Three unrelated product changes (developer platform launch, AI-model-access control feature, worker-sharing feature) on three different dates.

### PostHog

| # | Source | Support | Date | Identity | Event |
| --- | --- | --- | --- | --- | --- |
| 1 | createwith.com/.../posthog-expo-integration-... | PASS — dedicated article, exact title match, byline "Create With Editorial Team," substantive first paragraph accurately describing the integration, has a "View source" link back to the origin | PASS — JSON-LD `datePublished` `2026-09-09T15:33:18.178+00:00` matches exactly | PASS — third-party but specifically about PostHog | PASS |
| 2 | createwith.com/.../posthog-ships-autoresearch-mode-... | PASS — same site, dedicated article, exact title match | PASS — exact | PASS | PASS |
| 3 | posthog.com/blog/stripe-projects | PASS — first-party blog post, exact title match ("We're partnering with Stripe...", byline "Joe Martin," dated "Mar 26, 2026" in the rendered page) | PASS — exact | PASS — first-party | PASS |

**Distinctness: DISTINCT.** Three unrelated events (Expo integration, Autoresearch Mode feature, Stripe partnership) on three different dates.

**Source-diversity observation (not a defect):** 2 of 3 signals come from the same secondary site, `createwith.com` — a legitimate tool-tracking/community editorial site (confirmed via its own site metadata: `og:site_name: "Create With"`, editorial byline, dedicated per-update pages, "View source" links), not a spam/SEO aggregator. This is not a duplicate-event issue (the two articles cover different, unrelated PostHog features on different dates) but is worth noting: only 1 of 3 signals is first-party. This does not meet any documented D2 stop condition and is recorded as an observation, not a defect.

### Mercury

| # | Source | Support | Date | Identity | Event |
| --- | --- | --- | --- | --- | --- |
| 1 | mercury.com/blog/exclusive-treasury-funds | PASS — exact title match, first-party | PASS — JSON-LD `2026-08-18T20:52:30+01:00` = `19:52:30.000Z`, exact match | PASS | PASS |
| 2 | mercury.com/blog/introducing-mercury-command | PASS — exact title match | PASS — `2026-06-16T15:01:20+01:00` = `14:01:20.000Z`, exact match | PASS | PASS |
| 3 | mercury.com/blog/series-d-announcement | PASS — the page's `<title>` is "Announcing Mercury's Series D \| Mercury" (SEO title) but its actual on-page `<h1>` headline is exactly "The future of banking*", matching the displayed signal title verbatim; the article is Mercury's Series D funding announcement | PASS — JSON-LD `datePublished: "2026-05-20"`, exact match | PASS | PASS |

**Distinctness: DISTINCT.** Three unrelated events (Treasury/mutual-fund product launch, "Mercury Command" product launch, Series D funding announcement) on three different dates.

## Recency review

Validation date: 2026-09-10.

| Company | Signal | Date | Age | Bucket | Consistent with ≤90d RECENT / 91–180d FALLBACK policy? |
| --- | --- | --- | --- | --- | --- |
| notion.so | 1 | 2026-05-13 | 120d | FALLBACK | Yes |
| notion.so | 2 | 2026-09-09 | 1d | RECENT | Yes |
| notion.so | 3 | 2026-07-09 | 63d | RECENT | Yes |
| PostHog | 1 | 2026-09-09 | 1d | RECENT | Yes |
| PostHog | 2 | 2026-07-10 | 62d | RECENT | Yes |
| PostHog | 3 | 2026-03-26 | 168d | FALLBACK | Yes |
| Mercury | 1 | 2026-08-18 | 23d | RECENT | Yes |
| Mercury | 2 | 2026-06-16 | 86d | RECENT | Yes (borderline but within 90d) |
| Mercury | 3 | 2026-05-20 | 113d | FALLBACK | Yes |

No impossible, inconsistent, or clearly-misclassified date found. No case of a FALLBACK signal used despite visibly stronger recent evidence in the same result (no visibility into the full candidate set from outside, so this could not be fully assessed beyond what the system returned). Two signals are boundary-adjacent (correctly bucketed today, would flip on a later recheck): PostHog's Stripe-partnership signal at 168/180 days, and Mercury's "Mercury Command" signal at 86/90 days. This is an observation about natural bucket drift over time, not a defect.

## Description review

| Company | Sentences | Core business correct? | Stable (not news-summary) style? | Hype/unsupported claims? | Verdict |
| --- | --- | --- | --- | --- | --- |
| notion.so | 2 | Yes | Yes | None | PASS |
| PostHog | 2 | Yes | Yes | None | PASS |
| Mercury | 3 | Yes | Yes | None | PASS |

## Safe-failure review

**Datadog — `unavailable` / `description_unavailable`:** Confirmed sanitized (exact body: `{"state":"unavailable","reason":"description_unavailable"}`), a documented approved reason, no raw provider detail, no stack trace, no internal diagnostic. Vercel runtime logs for this request show a single clean `info`-level line, ruling out a masked platform-level crash. The production code establishes only that B1–B3 progressed far enough to invoke B4B, and that B4B returned `description_unavailable`; B5 collapses B4B's internal reason to this public state without exposing it. The exact internal B4B reason is intentionally not exposed by the public contract and cannot be determined from this record — it could include an unsuccessful provider status, an empty summary, an invalid sentence count, excessive length, an embedded URL, an invalid source URL, or an untrusted source domain, among other documented B4B validation gates. No repair attempted or warranted under D2's no-repair policy for single-instance provider/description variability.

## Owner browser validation

Performed for `notion.so` (re-submission, owner-approved 5th live call). Confirmed by the project owner directly, with a screenshot: correct heading/domain, fresh 3-sentence description, all 3 signals rendered with correct titles/dates/clickable sources, "Older fallback" badge rendered, clean layout matching the approved C2 design, and a loading state appeared before rendering. The ~375px narrow-viewport check was requested but not confirmed by the owner — recorded as not performed.

## Provider accounting

Starting range (carried forward from D1): **Search 43–44 / Contents 9 / retries 0**.

D2 made 5 live company submissions total (the 4 originally authorized, plus 1 owner-approved additional browser-confirmation re-submission of notion.so — an explicit, documented deviation from the "at most 4" cohort limit, approved directly by the project owner mid-phase for browser-validation purposes only). Per-company production ceiling is ≤2 Search / ≤1 Contents / 0 retries; the absolute ceiling for 5 submissions is therefore ≤10 Search / ≤5 Contents.

All 5 submissions reached B4B. Four returned a usable description and reached `snapshot`; Datadog returned `description_unavailable`. This gives high confidence of **exactly 5 Contents calls** (1 per submission), while the exact internal Datadog reason remains intentionally unexposed. Every one of the 5 submissions necessarily made at least 1 broad Search; each could additionally make at most 1 official-domain fallback Search. Whether any given submission used its fallback is not externally observable from the public HTTP response or the available runtime logs, so no submission can be assumed to have skipped it. The defensible range is therefore **5–10 Search calls**, without treating either end as more likely than the other from outside evidence.

- D2 Search: 5–10 (defensible range; fallback usage per submission is not externally observable)
- D2 Contents: 5 (high confidence)
- D2 retries: 0 (confirmed — Vercel logs show exactly 5 clean `info`-level invocations for 5 submissions, no duplicates)

**New cumulative defensible range: Search 48–54 / Contents 14 / retries 0.**

## Deployment / log findings

Vercel runtime logs for all 5 D2-era requests (4 curl + 1 browser) show single clean `info`-level `POST /api/snapshot` lines each — no error/warning/fatal level entries, no timeout, no unhandled exception, no duplicate invocation for any single submission. No secret appeared in any log output.

## Known limitations / risks / deferred

- The full final assessment testing matrix (`docs/TESTING.md` §6) **has not begun** — D2 validates that a successful production path exists and is evidence-sound for 3 companies; it does not establish universal reliability across arbitrary reviewer-entered companies.
- Datadog's `description_unavailable` and the historical D1 `stripe.com`/`NVIDIA` outcomes remain safe, documented public-contract outcomes with no deployment/runtime defect observed; their exact underlying provider-side causes were not exposed and are not asserted here. D2's five consecutive successful multi-second round trips reduce concern about a persistent deployment or account-capacity failure, but this is an inference, not a proven cause for D1's specific results. None were repaired, per this phase's explicit no-repair policy for single-instance findings.
- PostHog's 2-of-3 secondary-source concentration on `createwith.com` is recorded as an observation for awareness, not a correctness defect requiring action.
- The ~375px narrow-viewport visual check was requested from the owner but not confirmed — genuinely unperformed, not assumed.
- Git/Vercel connection to `aprescod12/company-snapshot-v2` could not be independently verified via CLI (no read-only status subcommand available; Vercel MCP tools are unauthenticated for this project) — relies on the owner's direct statement.
- Exa account quota/capacity remains unmeasured directly (no safe read-only check exists); inferred healthy from 5 consecutive successful multi-second round trips in this session.

## Conclusion

D2 established that the deployed production application can and does produce successful, evidence-grounded snapshots for real reviewer-style company inputs (name and domain), with no deterministic correctness defect found, no source-code change required, and no repair to the frozen B1–B5 backend. **D2 PRODUCTION VALIDATION — PASSED.**
