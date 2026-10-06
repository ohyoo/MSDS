# UConn MSDS Curriculum Explorer

## Architecture and design

A standalone Next.js App Router application with strict TypeScript, React, Tailwind CSS, Zod-validated local JSON, and a deterministic recommendation layer. No authentication, student records, live catalog scraping, or API key is required. A navy, white, and warm-paper academic design centers the interactive capability map. Capabilities describe connections, never a required semester or prerequisite order.

## Data and source policy

`data/core-courses.json`, `electives.json`, `pathways.json`, `capabilities.json`, and `program.json` are independently editable. Every course retains official description, optional interpretive student summary, prerequisites, credits, provenance, verification state, and last-check date. Catalog facts take priority; the MSDS website determines recommended versus specialty membership. Unknown facts remain null. Catalog-discovered courses always remain distinct from program-curated electives.

Initial evidence: the checkout has no files, commits, spreadsheets, or instructor descriptions. The user supplied eight core titles, a capstone, and the 30/21/6/3 credit structure. On 2026-10-06 the environment proxy denied the two official UConn hosts before reaching the sites. Required domains were saved for user application. Until retrieval succeeds, individual credits, official descriptions, enrollment requirements, and curated elective membership must remain unverified rather than inferred.

## Page hierarchy

- Journey: credit structure, interactive capability map, required courses, and capstone.
- Core: course details separating official descriptions and interpretive summaries.
- Explore: free-text interests, combined chips, ranking reasons, category filters, and shortlist actions.
- My Plan: persistent course-code-only shortlist, comparison, breadth, overlap, and prerequisite reminders.
- Pathways: seven suggested, data-driven examples with core foundations, electives, applications, and careers; no official concentration claim.
- Guide: source-linked deterministic answers and optional server-side model enhancement.

## Recommendations

Normalize query terms and chips; expand explicit domain synonyms (sports forecasting to predictive modeling and time series). Weight title, tags, descriptions, departments, and pathway matches; add fuzzy matching. Display reasons for scores. Rank only local records. Never infer approval or availability. Unit tests cover sports, GenAI plus business, typo tolerance, reasons, and comparison warnings.

## Assistant

The default rules-based guide uses validated records. Deterministic retrieval supplies a small set of source IDs and URLs to an optional server-only provider adapter. Request and response schemas constrain exchanges and source IDs must belong to retrieved records. Official decisions and semester questions route to the program. No conversation persistence, sensitive student fields, or client-exposed key. The deterministic answer remains usable if enhancement fails.

## Deployment

Use a normal Node.js Next.js deployment or Vercel. Cloudflare full-server deployments require its Next.js adapter; a static export can be a future variant if the optional API route is removed. Document this tradeoff rather than claiming an untested host configuration. Save reusable local startup and readiness instructions.

## Implementation cycles

1. Discovery, source verification, uncertainties, and architecture.
2. Schema-validated local data, ingestion tools, and Next.js scaffold.
3. Responsive journey, core details, and capstone integration.
4. Elective search, ranking, shortlist commentary, and pathways.
5. Grounded guide, optional server adapter, and safe fallback.
6. Data validation, unit tests, lint, production build, browser/accessibility checks, screenshots, documentation, and logical commits.

## Required checks and review

Required: schema validation, ranking/guardrail tests, lint, production build, browser checks of navigation, details, search, shortlist, pathways, keyboard interactions, and mobile layout. Optional: live model calls and external publication. Program review must confirm interpreted capabilities, pathways, student summaries, and current curated electives. A proxy denial is a source-verification blocker, not permission to invent catalog facts.
