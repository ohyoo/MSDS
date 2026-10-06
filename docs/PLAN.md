# UConn MSDS Curriculum Explorer

## Architecture and design

A standalone Next.js App Router application with strict TypeScript, React, Tailwind CSS, Zod-validated local JSON, and a deterministic recommendation layer. No authentication, student records, live catalog scraping, or API key is required. A navy, white, and warm-paper academic design centers the interactive capability map. Capabilities describe connections, never a required semester or prerequisite order.

## Data and source policy

`data/core-courses.json`, `electives.json`, `pathways.json`, `capabilities.json`, and `program.json` are independently editable. Every course retains official description, optional interpretive student summary, prerequisites, credits, provenance, verification state, and last-check date. Catalog facts take priority; the MSDS website determines recommended versus specialty membership. Unknown facts remain null. Catalog-discovered courses always remain distinct from program-curated electives.

Source discovery completed on 2026-10-06. The initially empty checkout contained no spreadsheets or instructor descriptions. After resolving the initial network restriction, the MSDS course page, degree catalog, course index, home page, and all 96 discovered graduate department catalogs were retrieved. A complete maintenance-only source snapshot retains 2,797 graduate records. The student index contains 202 explicit AI/ML/advanced-statistics/sports topic matches plus one retained reviewed contextual option; program-curated precedence produces 245 visible courses: nine required, 60 curated electives, and 176 catalog-only options. Coverage is complete for discovered pages, while topic relatedness remains interpretive. The catalog confirms the 30/21/6/3-credit structure. Five program-listed specialty courses retain pending official metadata. GRAD 5900 preserves the catalog's generic special-topics title and variable credits, with the program's Applied Generative AI label clearly attributed. See `docs/DATA.md` for source conflicts, rules, and review items.

## Page hierarchy

- Journey: credit structure, interactive capability map, required courses, and capstone.
- Core: course details separating official descriptions and interpretive summaries.
- Explore: free-text interests, combined chips, ranking reasons, category filters, and shortlist actions.
- My Plan: persistent course-code-only shortlist, comparison, breadth, overlap, and prerequisite reminders.
- Pathways: seven suggested, data-driven examples with two- or three-course combinations, core foundations, topical capstone examples, applications, and careers; AI and Sports signature examples; no official concentration or core-substitution policy claim.
- Guide: source-linked deterministic answers and optional server-side model enhancement.

## Recommendations

Normalize query terms and chips; expand explicit domain synonyms (sports forecasting to predictive modeling and time series). Weight title, tags, descriptions, departments, and pathway matches; add fuzzy matching. Display reasons for scores. Rank only local records. Never infer approval or availability. Unit tests cover sports, GenAI plus business, typo tolerance, reasons, and comparison warnings.

## Assistant

The default rules-based guide uses validated records. Deterministic retrieval supplies a small set of source IDs and URLs to an optional server-only provider adapter. Request and response schemas constrain exchanges and source IDs must belong to retrieved records. Official decisions and semester questions route to the program. No conversation persistence, sensitive student fields, or client-exposed key. The deterministic answer remains usable if enhancement fails.

## Deployment

Publish the static Next.js export to GitHub Pages using the requested repository base path. The deterministic guide runs locally without a server or API key. A separate optional server adapter can provide model enhancement on a compatible Node/serverless host; it is not required for the Pages experience. Document this tradeoff and save reusable local startup and readiness instructions.

## Implementation cycles

1. Discovery, source verification, uncertainties, and architecture.
2. Schema-validated local data, ingestion tools, and Next.js scaffold.
3. Responsive journey, core details, and capstone integration.
4. Elective search, ranking, shortlist commentary, and pathways.
5. Grounded guide, optional server adapter, and safe fallback.
6. Data validation, unit tests, lint, production build, browser/accessibility checks, screenshots, documentation, and logical commits.

## Required checks and review

Required: schema validation, ranking/guardrail tests, lint, production build, browser checks of navigation, details, search, shortlist, pathways, keyboard interactions, and mobile layout. Optional: live model calls and external publication. Program review must confirm interpreted capabilities, pathways, student summaries, and current curated electives. A proxy denial is a source-verification blocker, not permission to invent catalog facts.
