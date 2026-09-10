# Company Snapshot

A small web app that turns a company name or website into a clean, evidence-grounded snapshot — a short description and three recent, verifiable signals, each backed by a real public source. Built as a take-home exercise focused on correctness and honest failure over feature breadth.

**Live app:** [https://company-snapshot-v2.vercel.app](https://company-snapshot-v2.vercel.app)

## What it does

Enter a company **name** (e.g. `Stripe`) or **website/domain** (e.g. `notion.so`) and the app returns:

- a 2–3 sentence description of what the company does, grounded in its own homepage content;
- **three recent signals** — real news, launches, funding, or leadership changes — each with a title, date, and a clickable source link;
- an honest **limited-evidence** state instead of a fabricated or padded third signal when fewer than three defensible, distinct events can be verified;
- a clean one-page layout with a visible loading state while the snapshot is built.

There is no login, no history, and no stored data — every request is answered fresh from the live public web.

## Why this approach

The core principle is **live-web retrieval + publisher verification + deterministic evidence controls**, in that order:

1. **Resolve before synthesizing.** The company's identity (name, official domain) is confirmed with corroborating evidence before any signal search begins, so an ambiguous or unresolved company produces an honest clarification request rather than a guess.
2. **Verify every signal against its actual publisher page**, not just a search snippet — checking that the page is real, on-topic, dated, and materially supports the claim.
3. **Recency and distinctness are enforced deterministically.** Signals are bucketed by age, and duplicate coverage of the same underlying event is filtered out using shared, headline-corroborated facts — not generic topical similarity.
4. **No padding, no fabrication.** If three qualifying signals don't exist, the app says so.

This is a deliberately small, inspectable pipeline rather than a single opaque model call — every step's output can be checked against the real source.

## Architecture

```
input (name or domain)
  → company resolution (identity + official domain, with ambiguity safety)
  → one broad Exa Search
  → deterministic prioritization (recency, dedupe, provenance)
  → publisher verification (fetch, confirm, extract date/support)
  → at most one official-domain fallback search, if needed
  → grounded company description (one Exa Contents call)
  → deterministic snapshot assembly (exactly 3 signals, or an honest limited-evidence result)
  → HTTP endpoint (api/snapshot.mjs)
  → static frontend (public/)
```

- **No database, no auth, no accounts.** Every request is stateless.
- **No runtime multi-agent architecture, no retries, no provider waterfall.** One bounded pipeline, deterministic outcomes.
- **`EXA_API_KEY` is server-only** — read once inside the serverless function, never sent to the browser.

## Tech stack

- **Node.js** (native ES modules, zero npm dependencies — no `package.json`, no bundler, no framework)
- **Vercel** — static hosting for `public/` plus one serverless function, `api/snapshot.mjs`
- **[Exa](https://exa.ai)** — Search and Contents APIs (free tier; no paid usage)
- **Plain HTML/CSS/JS** frontend (`public/index.html`, `styles.css`, `app.js`)

## Local setup

There is nothing to install — the whole project runs on Node.js's built-ins.

```bash
# set your Exa key (server-side only)
export EXA_API_KEY=your-key-here

# run the full test suite (zero network calls)
node --test test/*.test.mjs

# exercise the real frontend against a local, zero-network fixture endpoint
node scripts/c3-local-ui-harness.mjs   # serves http://127.0.0.1:8787
```

To run the actual app locally against live Exa, use the Vercel CLI (`vercel dev`) from the repo root with `EXA_API_KEY` set in your environment — this repo is a native Vercel project (static `public/` + one Function), so no separate server code is needed.

Never commit a `.env` file or expose `EXA_API_KEY` to browser code; `.gitignore` already excludes `.env*`.

## Testing & validation

- **372/372 zero-network tests pass** (`node --test test/*.test.mjs`) — covering targeting, discovery, verification, deduplication, description generation, snapshot assembly, the HTTP endpoint, and the frontend controller.
- **Real production validation**, not just fixtures: a bounded live cohort (Stripe, PostHog, Canva, notion.so, Mercury, Craigslist, Datadog, Anthropic, Microsoft, Adobe, and others) was submitted to the deployed app, with every resulting signal's source URL manually opened and checked for identity, material support, and date accuracy.
- **Duplicate-event regressions**: a real production case (two publisher pages covering the same underlying company event) was reproduced with a zero-network fixture and fixed with a narrow, generic evidence-dedupe rule, backed by anti-overdedupe tests to guard against over-merging unrelated stories.
- **Safe-failure states are exercised directly**: ambiguous names, malformed input, sparse-evidence companies, and provider/description failures all resolve to their documented public states, never a fabricated result.
- **Frontend behavior** — loading state, source-link rendering, duplicate-submit prevention, and responsive layout — was validated via one live browser confirmation and static code review.

Full detail, every recorded run, and exact regression names: [`docs/TESTING.md`](docs/TESTING.md).

## Known limitations

- **Conservative company resolution.** A small number of clear, well-known companies (e.g. a large public company by name alone) can return a clarification request instead of a snapshot — the app refuses to guess rather than risk resolving to the wrong entity.
- **Provider/source variability.** A handful of companies (e.g. companies with sparse first-party web presence) have shown inconsistent identity-grounding behavior across separate live calls — not a wrong result, just variability in what the search provider returns.
- **Some companies will honestly return limited evidence** when fewer than three verifiable, distinct signals exist for them right now.
- **Same-event deduplication favors precision over recall.** It reliably catches duplicate coverage when at least one shared, specific fact appears in either publisher's own headline, but a same-event pair where neither headline states a shared figure — or where extraction is defeated by an unusual publisher page structure — can still occasionally survive as two signals. One such case was found and partially, not fully, closed in production; it is accepted as a known residual limitation rather than grounds for further retrieval-architecture changes.
- **No universal success guarantee.** This is a small, deterministic pipeline, not a general-purpose research agent — it is designed to fail honestly, not to succeed on every possible input.

## AI-assisted development

This project was built with an AI coding agent as the primary implementer, under a human-directed, plan-first workflow: architecture was proposed and challenged before implementation, real diffs were reviewed (not just completion claims), and every phase's actual behavior was verified against live output before being marked done. Where the agent produced something wrong — a bug, an over-broad fix, a misdiagnosed root cause — it was caught by independent bounded review or direct diff inspection, reproduced with a red-before-green regression, and corrected before being accepted.

- [`docs/WORKFLOW.md`](docs/WORKFLOW.md) — the governing development procedure (plan → implement → review diff → verify → commit).
- [`docs/AI_FAILURE_LOG.md`](docs/AI_FAILURE_LOG.md) — genuine mistakes made during development, how each was caught, and what changed.

## Documentation

| Document | What it covers |
| --- | --- |
| [`docs/ASSESSMENT_BRIEF.md`](docs/ASSESSMENT_BRIEF.md) | The original take-home brief (unmodified) |
| [`docs/PLAN.md`](docs/PLAN.md) | Full architecture decision record, phase by phase |
| [`docs/WORKFLOW.md`](docs/WORKFLOW.md) | The AI-assisted development procedure used throughout |
| [`docs/TESTING.md`](docs/TESTING.md) | Benchmark design and the complete verification record |
| [`docs/AI_FAILURE_LOG.md`](docs/AI_FAILURE_LOG.md) | Genuine AI mistakes, how they were caught, and their fixes |
| [`docs/PHASE_D2_PRODUCTION_VALIDATION.md`](docs/PHASE_D2_PRODUCTION_VALIDATION.md) | Source-by-source manual verification of the first successful production snapshots |
| [`docs/PHASE_E2_PRODUCTION_PREFLIGHT.md`](docs/PHASE_E2_PRODUCTION_PREFLIGHT.md) | Final pre-submission production/deployment preflight and findings |
| [`AGENTS.md`](AGENTS.md) | Operating rules given to the coding agent |

## Submission status / deployment

The app is live and functioning at the URL above, running the current `main` branch. The zero-network test suite is green, and the production deployment has been validated against a real, multi-company cohort with manually re-verified sources. A manual mobile-viewport (~375px) visual check by the project owner is still outstanding, and the submission package's chat transcript and half-page written reflection are prepared separately from this repository.
