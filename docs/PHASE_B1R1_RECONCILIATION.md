# B1R1 — Conservative Cross-TLD Canonical-Domain Reconciliation

Date: 2026-09-10

## Why this exists

The Phase B representative-cohort validation gate (`docs/PHASE_B_VALIDATION.md`) found that `notion.so` — an ordinary cohort case exercising domain-input behavior — failed to resolve. A subsequent bounded diagnostic (one additional live Exa Search) established the exact cause: Exa's discovery response for `notion.so` returned an explicitly unambiguous (`ambiguous: false`) identity naming `Notion` / `notion.com`. Grounding was strong but not uniform across the two fields: `officialDomain` grounding was 7/7 citations on `notion.com`, exclusively; `resolvedCompanyName` grounding had 10 citations, including multiple direct first-party `notion.com` citations, but also several secondary-source citations (`chosunbiz.com`, `technewsdaily.com`, `createwith.com`) that were not on `notion.com`. None of either field's grounding was on `notion.so`. The existing domain-input identity rule in `src/targeting/companyTarget.mjs` only accepted a proposed domain equal to or a subdomain of the submitted one, so it correctly and safely returned `clarification_needed` / `contradictory_identity` — this was the intended, safe behavior of the pre-B1R1 rule, not a bug, and it is preserved as historical fact.

That rule cannot distinguish a genuinely wrong-company retarget (e.g. `stripe.com` → `other.test`) from a narrower, legitimate case: the submitted and proposed domains differ only in TLD, share the same brand label, the provider is explicitly unambiguous, the resolved name agrees with that brand, the resolved-name grounding directly corroborates the proposed domain (at least one citation, not necessarily every citation), and the official-domain grounding is exclusively on the proposed domain (every citation). The project owner approved a generic, tightly bounded reconciliation rule for exactly this narrow case — not a Notion-specific fix.

## The approved generic rule

Implemented in `src/targeting/companyTarget.mjs` (`reconcileCrossTldDomain`, called only from `confirmCompanyIdentity`'s `TARGET_KIND.DOMAIN` branch, only when the proposed domain differs from the submitted one and is not a subdomain of it). All conditions below are mandatory; failing any one preserves the existing `contradictory_identity` outcome:

- **(A)** `evidence.ambiguous === false` exactly (not `true`, not missing).
- **(B)** Both the submitted and proposed hostnames have exactly two dot-separated labels (e.g. `notion.so` / `notion.com` qualify; `app.example.com` or `foo.co.uk` do not — no public-suffix dependency was added).
- **(C)** The leftmost label of both hostnames is exactly, case-normalized, string-equal — no fuzzy or substring matching.
- **(D)** The resolved company name is consistent with that shared brand label, reusing the existing `namesAreConsistent()` prefix/legal-suffix machinery unchanged (no second name heuristic was added).
- **(E)** `groundingByField.resolvedCompanyName` contains at least one exact HTTP(S) citation on the proposed domain or a subdomain of it.
- **(F)** `groundingByField.officialDomain` is a non-empty array in which **every** citation (not just one) is a valid HTTP(S) URL on the proposed domain or a subdomain of it.
- **(G)** The combined `evidenceUrls` array also contains at least one citation on the proposed domain.

On success, the resolved `officialDomain` is the **provider-proposed** domain, not the submitted one; this flows naturally to B3's fallback query, B4B's description homepage, and B5's public identity without any downstream code change. No company- or domain-specific branch exists anywhere in the implementation; no new dependency, network call, or retry was added.

## Zero-network verification

Two sub-agent reviews ran (both read-only, no fixes applied by them):

1. **Investigation/false-positive-risk agent** — confirmed the rule's structure matched this spec exactly, found no exploitable string-manipulation bug (correctly rejects empty labels, multi-label hosts, and IDN homographs because `URL()`'s own IDNA normalization keeps genuinely different codepoints as distinct ASCII labels), confirmed reconciliation is unreachable from `TARGET_KIND.NAME` or the same-domain path, and identified one **structural, by-design residual risk**: for short/generic single-word brand labels (e.g. `x.co` vs `x.com`), two unrelated real companies could coincidentally share a label, and since a domain-kind target carries no independent submitted company name, condition (D) checks the resolved name only against the shared label itself — not against anything the user actually typed. This is an inherent property of the approved design (a domain-only input has no separate name to cross-check against), not an implementation defect, and is called out here for the record rather than silently accepted.
2. **Independent review agent** — reviewed the complete diff against 16 specific criteria (reconciliation scope boundary, unchanged same-domain/name-input paths, no hardcoding, exact-not-fuzzy matching, `.every()` vs `.some()` on official-domain grounding, safe suffix-boundary hostname comparison, correct returned domain, no new network/retry/dependency, non-tautological tests). Result: **no issues found**.

Four additional tests were added following the investigation agent's recommendations: case-insensitive brand matching, a genuine IDN/punycode-homograph rejection (using the real IDNA encoding of a Cyrillic-substituted lookalike), and an explicitly-labeled test documenting the short-brand-label residual risk above as accepted, approved-design behavior rather than a hidden gap.

Verification performed:
- Focused tests: `test/company-target.test.mjs` (30/30, including 17 new B1R1-prefixed tests), `test/discover-company.test.mjs` (10/10, including 2 new B1R1 pipeline-level tests), `test/phase-b-validation.test.mjs` (16/16, including one existing fixture updated to reflect its scenario now correctly reconciling — see below — and one new end-to-end regression proving it).
- Full zero-network suite: `node --test test/*.test.mjs` — **281/281** passed.
- `node --check` on all changed `.mjs` files passed; `git diff --check` passed.
- `git diff --stat -- src/` shows exactly one file changed: `src/targeting/companyTarget.mjs` (+63/-1).

**Note on `test/phase-b-validation.test.mjs`:** that file's existing test 15 (added in the prior Phase B validation correction task) used a `notion.so` → `notion.com` fixture with strong, fully-corroborated, unambiguous grounding — precisely the shape B1R1 is designed to reconcile. Under B1R1 that fixture now correctly resolves instead of returning `contradictory_identity`, so the fixture's proposed domain was changed to an unrelated brand (`othercorp.com`) to keep testing genuine cross-brand rejection, and a new test 16 was added using the original same-brand shape to explicitly prove the intended behavior change through the real production discovery pipeline. This is a test update required by an intentional, approved production-behavior change, not a rewrite of any historical phase-report finding.

## Live end-to-end confirmation (one authorized run)

Command: `runValidationCase("notion.so", apiKey, {})` (the same production entry point, and same `ALLOWED_CASES` cohort membership, already used by `scripts/phase-b-validation.mjs`), run exactly once, no retry.

| Measure | Observed result |
| --- | --- |
| Discovery (B1/B2) state | `ready_for_verification` (reason: `null` — no longer `clarification_needed`/`contradictory_identity`) |
| Resolved company name | `Notion Labs, Inc.` |
| Resolved official domain | `notion.com` |
| Verification (B3) state | `insufficient_evidence` — 0 accepted evidence records, fallback used |
| Description (B4B) state | `described` — grounded description produced from `https://notion.com/` |
| Final public state | `insufficient_evidence` (0 signals; honest, non-fabricated, no padding) |
| Broad Exa Search | 1 |
| Fallback Exa Search | 1 (naturally triggered by B3 after broad-queue exhaustion; not manually forced) |
| Total Exa Search | 2 |
| Exa Contents | 1 |
| Publisher requests | 20 |
| Retries | 0 |
| Total latency | 14,755 ms |

**B1R1's own scope succeeded: identity resolution for `notion.so` is now correct** — it resolves to the real company (`Notion Labs, Inc.` / `notion.com`), not a wrong entity, and not a safe-but-unnecessary clarification. Per the pre-authorized stop rule for this task, the run is recorded exactly as observed and **no further live call, investigation, or repair was made**: verification's `insufficient_evidence` result (despite 2 Exa Searches and 20 publisher fetches) is a **new, distinct downstream finding**, not a B1R1 regression and not something this task repairs. No signal URLs exist to record or manually ground, since no signal was accepted (0 evidence records) and the run never reached `snapshot`. A plausible but unconfirmed hypothesis is that `notion.com`'s content pages have a structural shape B3's publisher-extraction gate does not currently accept — similar in kind to the historical NVIDIA Newsroom `<article>`/`<main>` gap later fixed in B3R2 — but this is speculation recorded for the project owner's awareness, not a diagnosed root cause, and B3 is explicitly out of scope for this task.

## Provider accounting

| Accounting | Before B1R1 | After B1R1 |
| --- | ---: | ---: |
| Cumulative Exa Search | 33 | **35** |
| Cumulative Exa Contents | 7 | **8** |
| Retries | 0 | **0** |

## Gate impact

- **§3.2 (5/5 ordinary clear-company resolution):** The specific identity-resolution defect that caused `notion.so` to fail is now fixed and confirmed live — B1 correctly resolves `notion.so` to its real company rather than remaining stuck in safe clarification. This is **not** the same as a formal §3.2 re-certification: the historical six-case cohort result recorded in `docs/PHASE_B_VALIDATION.md` is preserved as-is, and re-certifying "5/5" would require an authorized full cohort re-run, which this single-company diagnostic task was not authorized to perform.
- **§3.3 (≥4/5 ordinary coverage — usable three-signal result):** **Still not satisfied for `notion.so`.** Even with correct identity resolution, the case now stops at `insufficient_evidence` in B3 rather than reaching a three-signal snapshot, for a reason this task does not investigate.
- No other §3 gate is affected by this task. §3.6 (Canva distinctness, unconfirmed), §3.8 (Craigslist), and the manual-grounding URL-persistence gap remain exactly as recorded in `docs/PHASE_B_VALIDATION.md`'s prior correction — untouched here.

**Phase B remains `PHASE B VALIDATION — NOT APPROVED / REQUIRES PROJECT-OWNER DECISION`.** This task fixes one identified root cause and surfaces a new, separate downstream finding for `notion.so`; it does not approve Phase B, does not re-run Craigslist or Canva, and does not begin Phase C, endpoint/UI, or deployment work.
