# UConn MSDS Curriculum Explorer

**Explore Your MSDS Learning Journey** — a standalone student-facing prototype that connects the core curriculum to data science capabilities, suggested pathways, and elective planning.

The learning map represents capabilities that come together in practice. It does not prescribe a semester sequence or establish formal prerequisites. Student-facing summaries, capability mappings, and suggested pathways are interpretive material requiring MSDS program review.

## Current content readiness

The initial checkout contained no application, course spreadsheet, or instructor descriptions. The supplied project brief seeds the eight core courses, capstone, and 30-credit structure (21 core / 6 electives / 3 capstone).

Access to the official UConn sources has been restored. All nine required-course records and the program credit structure were checked against official sources on October 6, 2026. The catalog title **Fundamental Skills for Data Science** is used for GRAD 5100; its source note preserves the program page's different wording. ARE 5353, EPSY 5641, and OPIM 5605 each carry two credits, making the eight-course core total 21 credits.

The app keeps nine required courses and **60 program-curated electives** (21 recommended and 39 specialty) separate from broader-catalog discovery. Five specialty courses—CSE 5506, CSE 5510, CSE 5815, CSE 5840, and MKTG 5220—are on the verified MSDS list but absent from their current departmental catalogs. Their official metadata remains pending; credits, formal descriptions, and prerequisites are unknown. Catalog absence does not establish semester availability or permanent discontinuation.

The complete official Graduate Catalog discovery pass retrieved **all 96 departmental pages** and normalized **2,797 graduate courses numbered 5000 or above**. Complete metadata is preserved in `data/catalog/source-index.json` for maintenance; it is not bundled into the browser. A smaller local index exposes explicit AI, machine-learning, advanced-statistics, and sports topic matches, with official-text evidence excerpts and source dates. `coverage.json` records department coverage, matching rules, and counts. Topic relevance is an interpretive keyword filter, not an exhaustive academic classification or an approval rule. The app performs no catalog retrieval during student browsing.

The discovery index contains **203 records**: 202 explicit topic matches and one retained reviewed candidate, OPIM 5641. Program-curated records take precedence for 27 duplicate codes, leaving **176 catalog-only options** and **245 unique courses** in the app. Official catalog metadata is verified for 240 of those records; the five pending specialty entries retain their verified program membership. Topic counts overlap because a course can match several themes.

Check per-record `sourceVerification` and `lastChecked` values and the [source differences requiring program review](docs/DATA.md#source-differences-requiring-program-review). In particular, GRAD 5900 is a variable-credit generic special-topics catalog record; the program's Applied Generative AI label does not verify a current topic offering or its specific credits. Student-facing summaries and pathway mappings remain interpretive material for program review.

The app displays source status and keeps unknown facts explicit. It never substitutes generated official facts for missing source content.

## Suggested pathways and degree rules

AI & Machine Learning and Sports Analytics are featured signature **suggested pathways**. All seven pathway templates include two- or three-course exploratory combinations, relevant core foundations, and a topical GRAD 5800 capstone brief with questions to investigate. They are not official concentrations.

The verified degree structure remains **eight required core courses / 21 credits, two electives / 6 credits, and the 3-credit capstone**. A third course is an optional planning candidate requiring confirmation of approval and how its credits would fit. Replacing a required core course to develop a concentration is a proposal requiring explicit MSDS program approval; the application does not establish a substitution policy or course equivalence.

## Run locally

Requirements: Node.js 22 or later and npm. No database, sign-in, or AI API key is required.

```sh
npm ci
npm run dev
```

Open <http://localhost:3000>. In the Codex cloud environment, use its writable npm cache:

```sh
npm ci --cache /workspace/.npm-cache
npm run dev
```

Create a production static export:

```sh
npm run build
npm run start
```

The `out/` directory is the deployable site; `start` previews it at <http://localhost:3000>. The default guide runs locally in the browser, allowing the full student experience to work on GitHub Pages without a server or API key. See [deployment instructions](docs/DEPLOYMENT.md) for the GitHub Actions publishing workflow and other static hosts.

## Application and data

Next.js 16, React 19, strict TypeScript, and Tailwind CSS provide the UI; Zod validates local content. Fuse.js complements weighted, explainable recommendation matching. All course content lives outside React components.

| Location                         | Purpose                                                                |
| -------------------------------- | ---------------------------------------------------------------------- |
| `data/program.json`              | Credit structure, source status, and advising disclaimer               |
| `data/core-courses.json`         | Core and capstone records                                              |
| `data/electives.json`            | Program-curated recommended and specialty electives                    |
| `data/catalog/courses.json`      | Topic-filtered broader-catalog discovery index                         |
| `data/catalog/coverage.json`     | Department coverage, topic rules, evidence counts, and dates           |
| `data/catalog/source-index.json` | Full normalized catalog metadata for maintenance; not a browser import |
| `data/capabilities.json`         | Interpretive learning capabilities                                     |
| `data/pathways.json`             | Suggested pathways and optional future official concentrations         |
| `src/lib/schema.ts`              | Content schemas and cross-field constraints                            |
| `src/lib/recommendations.ts`     | Interest expansion, ranking weights, and explanations                  |
| `src/lib/assistant-server.ts`    | Optional, constrained server-side AI adapter                           |
| `server/guide-server.ts`         | Separately hosted optional guide service                               |
| `scripts/refresh-catalog.ts`     | Offline or network-backed local catalog refresh                        |

The interface distinguishes **MSDS Recommended**, **MSDS Specialty Elective**, and **Explore from UConn Catalog**. A catalog entry or recommendation does not establish degree approval, enrollment eligibility, or current semester availability.

## Checks

```sh
npm run validate-data
npm run typecheck
npm run lint
npm run test
npm run build
```

`validate-data` checks schemas, course references, classification rules, and known credit totals. Passing it does not establish that pending records have been verified against official sources.

Browser smoke tests use Playwright:

```sh
npm run test:e2e
```

The cloud environment uses Chromium at `/usr/bin/chromium`. On another machine, install Playwright Chromium with `npx playwright install chromium` and its documented system dependencies if needed. `npm run format:check` checks formatting; `npm run format` updates it.

Browser review captures: [desktop](docs/screenshots/desktop.png) and [mobile](docs/screenshots/mobile.png).

## Optional curriculum guide

The guide provides deterministic, source-linked responses in the browser without a model. To enable the optional provider, deploy the separate guide service and configure server-only `MSDS_AI_API_KEY`, `MSDS_AI_ENDPOINT`, and `MSDS_AI_MODEL` variables. Point the static app to that service with public `NEXT_PUBLIC_MSDS_GUIDE_ENDPOINT` at build time. Never prefix a secret with `NEXT_PUBLIC_`; the public value is a service URL only.

The provider must support an HTTPS OpenAI-compatible chat-completions endpoint and `response_format: { "type": "json_object" }`. It selects at most three course IDs from a small local context and one allowed follow-up type. The application validates those selections and renders explanations from local data. The provider cannot author official claims. Invalid responses, timeouts, and unavailable providers fall back to the deterministic guide. Live provider operation has not been tested because no credential is configured.

Shortlists persist only as course codes in the current browser's local storage. Guide questions are transient and are not stored by the application. When a provider is configured, it receives the question and a small relevant course context; its own retention policy applies. Students should not submit personal records or sensitive information. See [maintenance and privacy details](docs/MAINTENANCE.md).

## Content maintenance

[Maintenance instructions](docs/MAINTENANCE.md) cover descriptions, electives, classifications, pathways, concentrations, catalog refreshes, recommendation tags, AI configuration, and deployment. [The architecture plan](docs/PLAN.md) records the source policy and implementation phases.

Re-filter the complete stored metadata without network access:

```sh
npm run refresh-catalog -- --all-departments --topics ai,machine-learning,advanced-statistics,sports --from-index data/catalog/source-index.json --dry-run
```

Remove `--dry-run` after reviewing the results to save the local index. Original source-check dates remain intact; re-filtering is not a fresh catalog retrieval.

Authoritative sources:

- [MSDS courses and program-curated electives](https://masters.datascience.uconn.edu/courses/)
- [MS Data Science degree requirements](https://catalog.uconn.edu/graduate/degree-programs/data-science-ms/)
- [Graduate course catalog](https://catalog.uconn.edu/graduate/courses/)

Course offerings, prerequisites, and availability may change. Suggested pathways and course recommendations are for exploration and planning and do not constitute formal approval. Students should confirm elective selections with the MSDS program.
