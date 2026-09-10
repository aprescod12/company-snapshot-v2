# B3R3 — First-Party Brand-Aware Company Matching

Date: 2026-09-10

## Why this exists

B1R1 fixed `notion.so`'s identity resolution: it now correctly resolves to `Notion Labs, Inc.` / `notion.com` (`docs/PHASE_B1R1_RECONCILIATION.md`). A subsequent B3R0 diagnostic (`docs/TESTING.md`) then ran the real B3 verification smoke observer against that resolved identity and found near-total evidence rejection: of 19 rejected candidates across the broad and fallback queues, **all 19** had reason `unsupported_claim`, **all 19** had a populated `sourceClass` (proving they passed B3's structural extraction gate), and **all 19** had `recencyBucket: null` (proving rejection happened before recency was ever evaluated). That signature isolates the rejection point to exactly one gate: `matchesCompany()`.

Three representative first-party `notion.com` pages were independently re-fetched with the unmodified production `fetchHtmlSource()` + `extractArticleEvidence()`: all three fetched successfully, had a real article container, a substantial body (451–9,613 characters), and a valid extracted date; all three contained the token "notion"; **none** contained the token "labs".

## Root cause

`matchesCompany(text, companyName)` tokenizes the resolved `company.companyName`, strips only recognized legal suffixes (`co, company, corp, corporation, inc, ltd, llc, plc`), and requires **every** remaining token to appear in the article text. For `"Notion Labs, Inc."`, that tokenizes to `["notion", "labs", "inc"]`; `"inc"` is stripped, but `"labs"` is not a recognized legal suffix, so the gate required both `"notion"` **and** `"labs"` to appear. Ordinary first-party Notion product/blog content uses the public brand `"Notion"` constantly but essentially never repeats the formal corporate-entity qualifier `"Labs"` — so every genuine, well-extracted, well-dated first-party article failed this check before ever reaching triviality, date, recency, or duplicate evaluation.

## Rejected repair approaches, and why

- **Adding `"labs"` to `LEGAL_NAME_SUFFIXES`** was rejected: that list is a small, deliberate, generic set of true legal-entity suffixes (`Inc`, `LLC`, `Corp`, ...) used elsewhere in the codebase (B1's `isLegalSuffixExpansion`); `"Labs"` is not a legal suffix in that sense, and adding company-specific corporate-naming words to a shared global list would be a targeted carve-out disguised as a generic rule.
- **Adding a global ignore-word list** (`"labs"`, `"group"`, `"technologies"`, `"systems"`, `"holdings"`, etc.) was rejected: this would silently weaken company matching for every company and every source class, including secondary/OTHER sources where strict full-name matching is the primary defense against wrong-company evidence.
- **Switching `matchesCompany` globally from "all tokens must match" to "any token must match"** was rejected: this is the actual safety property that prevents a secondary source about an unrelated "Notion-something" company, or an unrelated company that happens to share one word, from being accepted.

## The approved B3R3 rule

Implemented entirely in `src/verification/verifyCompany.mjs`. The existing `matchesCompany()` function is **unchanged** and still runs first for every candidate, on every source class. A second, narrower path (`matchesFirstPartyBrand`) is consulted **only** when the strict match fails **and** the candidate has already been classified `FIRST_PARTY` by the existing, unmodified `classifySource(fetched.resolvedUrl, company.officialDomain)` — i.e., its hostname is confirmed to be the same as, or a subdomain of, the company's already-B1/B1R1-confirmed `officialDomain`. This classification happens **before** the company-match gate runs, using only the already-confirmed identity — never anything derived from the candidate itself.

The fallback path requires, in order:

1. A brand token is derived from the leftmost label of the confirmed `company.officialDomain` (e.g. `notion.com` → `notion`), tokenized with the existing `tokens()` function. If that produces no usable token, the fallback is unavailable — matching stays strict.
2. That brand token must be represented in the resolved `company.companyName`'s own tokens (e.g. `"notion"` is present in `["notion", "labs", "inc"]`). This prevents an official domain unrelated to the resolved company name from ever being used as a brand anchor.
3. That brand token must literally appear in the article's title + body text. A first-party URL alone is never sufficient — textual brand evidence is still mandatory.

```js
const companyMatches =
  matchesCompany(fullText, company.companyName) ||
  (sourceClass === SOURCE_CLASS.FIRST_PARTY && matchesFirstPartyBrand(fullText, company));
```

Every later B3 gate — triviality, date presence, recency/staleness, support-sentence matching, duplicate detection — is completely unchanged and runs identically afterward regardless of which matching path produced `companyMatches`. Accepting via brand fallback does not itself accept the candidate; it only allows the candidate to continue through the same gates every other candidate passes through.

No company- or domain-specific branch exists anywhere in the implementation. No dependency, network call, or retry was added. Production diff is confined to one file: `src/verification/verifyCompany.mjs` (+35/-2 lines: the two-line change to the existing gate, plus two new pure helper functions).

## Sub-agent reviews (both read-only, no production change made by them)

1. **Safety/test-design reviewer** — traced `company.officialDomain`'s provenance back through `runCompanyVerification` to B1/B1R1's confirmed identity (never candidate-derived); confirmed the `&&` short-circuit means `matchesFirstPartyBrand` is structurally unreachable for `SOURCE_CLASS.OTHER`, not just logically gated; confirmed `classifySource`'s hostname comparison has the required leading-dot boundary (an impostor like `notion.com.example.test` correctly classifies `OTHER`); confirmed every later gate is reachable and unmodified for both matching paths; assessed the residual risk (a company whose official-domain brand happens to be a short/generic word) as a pre-existing class of risk in the original name-matching design, not a new one introduced here, and noted it is additionally bounded by this being reachable only after B1/B1R1 has already confirmed the hostname belongs to the resolved company. Recommended one additional test for a hyphenated/multi-token brand label — added.
2. **Independent diff reviewer** — checked all 12 specific non-goal/safety criteria (no suffix-list change, no global ignore-word list, `matchesCompany` byte-identical, fallback gated to `FIRST_PARTY` only, no domain-alone acceptance, no hardcoded company/domain string anywhere in `src/`, later gates unmodified, production diff confined to one file, no new dependency, no new network/retry code, tests exercise real production functions, negative tests assert specific reasons). Result: no issues found; one minor suggestion (assert the exact `"duplicate"` reason via the smoke trace rather than only the aggregate evidence count) — applied.

## Zero-network verification

11 new/strengthened focused tests added to `test/verification.test.mjs` (all named with a `B3R3:` prefix), covering: existing strict matching unaffected; a first-party Notion page passing via brand fallback; the identical content on an OTHER/secondary domain receiving no fallback; a first-party page never mentioning the brand remaining rejected; a first-party page whose domain brand is inconsistent with the resolved company name remaining rejected; an existing strict full-name match unaffected on an OTHER source; a deceptive impostor hostname classified `OTHER` and unable to use the fallback; brand fallback not bypassing triviality, date-unknown, staleness, or duplicate rejection (the duplicate case additionally asserts the exact `"duplicate"` trace reason); brand fallback passing company matching but not bypassing support-sentence matching (a candidate claiming an event the fetched article's body never actually discusses is still rejected `unsupported_claim`, confirmed via `sourceClass`/`recencyBucket` diagnostics to fail specifically at the support-sentence gate, not an earlier one); a hyphenated multi-token brand label requiring every token both in the resolved name and in the article text; and a pipeline-level regression proving the real `verifyCompanyDiscovery()` flow accepts three distinct valid first-party Notion candidates that say "Notion" but never "Labs."

- Full zero-network suite: `node --test test/*.test.mjs` — **292/292** passed (281 pre-existing + 11 net new in `test/verification.test.mjs`).
- `node --check` on `src/verification/verifyCompany.mjs` and `test/verification.test.mjs` passed; `git diff --check` passed.
- `git diff --stat -- src/` confirmed exactly one production file changed.

## Live end-to-end confirmation (one authorized run, no retry)

Command: `runValidationCase("notion.so", apiKey, {})` — the same production entry point (`createCompanySnapshot()` under the hood) used by the Phase B validation harness.

**Result: `snapshot`.**

| Measure | Observed result |
| --- | --- |
| Discovery state | `ready_for_verification`, reason `null` |
| Resolved company | `Notion Labs, Inc.` |
| Resolved official domain | `notion.com` |
| Verification state | `verified`, 3/3 evidence accepted, fallback used |
| Description state | `described`, source `https://notion.com/` |
| Final public state | `snapshot` |
| Broad Exa Search | 1 |
| Fallback Exa Search | 1 (naturally triggered by B3 after broad-queue exhaustion; not manually forced) |
| Total Exa Search | 2 |
| Exa Contents | 1 |
| Publisher requests | 12 |
| Retries | 0 |
| Total latency | 9,651 ms |

Description: "Notion Labs, Inc. provides an AI-powered workspace platform that combines notes, documents, databases, and collaboration tools in one place. Its core use is to help teams organize work, collaborate, and automate workflows—examples include triaging product feedback, resolving support tickets in Slack, and automating weekly reporting. The product is aimed at teams and organizations seeking a centralized, AI-enabled workspace to support collaboration and operational efficiency."

### Exact three signals and untruncated source URLs

| # | Title | Published | Recency | Source class | URL |
| --- | --- | --- | --- | --- | --- |
| 1 | Introducing Notion's Developer Platform | 2026-05-13 | `FALLBACK` | `FIRST_PARTY` | `https://www.notion.com/blog/introducing-developer-platform` |
| 2 | Control which AI models your agents can use | 2026-09-09 | `RECENT` | `FIRST_PARTY` | `https://www.notion.com/en-gb/releases/2026-09-09` |
| 3 | Share Notion Workers across your team | 2026-07-09 | `RECENT` | `FIRST_PARTY` | `https://www.notion.com/releases/2026-07-09` |

All three signals were accepted via B3R3's new first-party brand-anchor path — their extracted text contains "Notion" but (consistent with the B3R0 diagnostic) not "Labs" — confirming the fix is what allowed this run to proceed past the company-match gate that previously blocked it. All later gates (triviality, date, recency, support-sentence matching, duplicate) were evaluated normally and passed on their own merits.

### Manual source grounding (all three URLs opened directly, not relying on snippets)

| # | URL | Opened | Materially supports the signal | Date supported | Company identity correct |
| --- | --- | --- | --- | --- | --- |
| 1 | `https://www.notion.com/blog/introducing-developer-platform` | Yes | Yes — official Notion blog post by Notion's Head of Product announcing the Developer Platform (Workers runtime, database syncing, External Agent API) | Yes — page states May 13, 2026 | Yes |
| 2 | `https://www.notion.com/en-gb/releases/2026-09-09` | Yes | Yes — official Notion releases-page entry describing new AI-model governance controls for Custom Agents | Yes — page states September 9, 2026 | Yes |
| 3 | `https://www.notion.com/releases/2026-07-09` | Yes | Yes — official Notion releases-page entry describing team-sharing permissions for "Workers" | Yes — page states July 9, 2026 | Yes |

**Distinct-event judgment:** All three pages have distinct headlines, distinct dates (roughly two months apart each), and distinct feature scopes (a platform launch; an AI-governance control; a sharing/permissions feature) — none are the same press release or announcement republished, unlike the previously-flagged Canva concern. One nuance worth recording transparently: signal 1 (the Developer Platform launch, which introduced "Workers" as a capability) and signal 3 (sharing "Workers" across a team, a follow-on capability for that same feature) are thematically related as sequential incremental releases within the same broader Developer Platform initiative, roughly two months apart — not the same event, but not fully unrelated either. This is recorded for the project owner's awareness rather than treated as a failure; the existing lexical-dedup heuristic did not flag them as duplicates, and on inspection they describe genuinely different, separately dated product changes.

## Provider accounting

| Accounting | Before B3R3 | After B3R3 |
| --- | ---: | ---: |
| Cumulative Exa Search | 37 | **39** |
| Cumulative Exa Contents | 8 | **9** |
| Retries | 0 | **0** |

## Gate impact

- `notion.so` now reaches a real three-signal `snapshot` with manually-grounded, genuinely first-party, correctly-dated, distinct-enough evidence — the specific §3.3 (usable three-signal coverage) blocker for this case is resolved.
- This does **not** formally re-certify §3.2's "5/5 ordinary resolution" or §3.3's "4/5 coverage" cohort metrics from `docs/PHASE_B_VALIDATION.md` — those require an authorized full six-case cohort re-run, not performed here (this task ran only `notion.so`, once).
- No other Phase B gate is affected. Craigslist's `insufficient_identity_evidence` finding, Canva's unconfirmed duplicate-event question, and the manual-grounding URL-persistence gap all remain exactly as previously recorded — untouched by this task.
- **Phase B validation remains `PHASE B VALIDATION — NOT APPROVED / REQUIRES PROJECT-OWNER DECISION`.** This task resolves one specific, previously-diagnosed root cause for one case; it is not a Phase B approval.

## Known limitations / residual risk

- **Short/generic official-domain brand labels.** If a company's official domain's leftmost label is a very short or generic word, the brand-anchor consistency check (bag-of-words membership against the resolved company name) is coarser than a full-phrase match. This is bounded in practice because the fallback only ever runs after B1/B1R1 has already confirmed the candidate's hostname belongs to the resolved company's official domain — it cannot cause a wrong-company acceptance, only a marginally looser textual-match bar on an already-correctly-attributed first-party page. This is the same class of risk that existed in the original all-tokens name-matching design, not a new one.
- **Hyphenated/multi-token brand labels** are matched as an unordered bag of tokens (each token independently required in both the resolved name and the article text), not as an ordered phrase. One focused test now covers this shape directly.
- This task did not re-run Craigslist, Canva, or the full six-case cohort; those remain open per `docs/PHASE_B_VALIDATION.md`.
