# Maintaining curriculum content

Content lives in JSON rather than React components. `npm run validate-data` checks the Zod schemas, identifier references, duplicate courses, pathway membership, and credit totals when all individual credits are known. Run it after every content change, followed by `npm test`, `npm run lint`, and `npm run build`.

## Sources and academic accuracy

Use the [UConn Graduate Catalog](https://catalog.uconn.edu/graduate/courses/) for official titles, credits, formal descriptions, prerequisites, and enrollment restrictions. Use the [MSDS course page](https://masters.datascience.uconn.edu/courses/) to establish recommended and specialty elective membership. The [MSDS degree catalog](https://catalog.uconn.edu/graduate/degree-programs/data-science-ms/) documents program requirements. Instructor text may replace the concise student-facing summary; it must not replace catalog facts.

On 2026-10-06, the MSDS course page, degree catalog, catalog index, home page, and all **96** graduate departmental pages discovered from the official catalog index were successfully retrieved after the initial environment network restriction was resolved. The degree catalog confirms 30 total credits: 21 core, two electives totaling 6, and a 3-credit capstone. The student dataset includes all nine required courses, 21 recommended electives, 39 specialty electives from the main MSDS curriculum sections, and 176 distinct broader-catalog discovery options: **245 courses**, of which 240 have verified catalog metadata and five retain pending official metadata. Delivery and degree-approval status remain unknown because catalog existence and curation do not establish either.

Five specialty entries appear on the MSDS list but are absent from their current departmental catalogs: **CSE 5506, CSE 5510, CSE 5815, CSE 5840, and MKTG 5220**. Their program curation was checked, but official metadata remains `sourceVerification: "pending"`, `sourceType: "program"`, and `credits`, `officialDescription`, and `prerequisites` are `null`. For these records, `lastChecked` describes the program-source check; it does not imply catalog verification. A source note explains this distinction. Absence from a catalog does not establish semester unavailability or permanent discontinuation.

For a new unverified seed, use `sourceType: "user-provided"`, `sourceVerification: "pending"`, and `lastChecked: null`. A linked source URL is a place to verify the record; it is not evidence that the page was successfully read. Do not mark a record verified merely because a link exists.

Student summaries, tags, capability mappings, suggested pathways, application examples, and career keywords are editorial interpretations grounded in the retrieved descriptions. They describe possible connections rather than formal requirements or guaranteed course coverage. Sports pathway assignments connect methods such as prediction, time series, optimization, and visualization to a possible application; they do not assert that a course teaches a sports-specific syllabus. The five pending specialty records use the program's descriptions to explain their listed themes and explicitly flag catalog confirmation as outstanding.

### Source differences requiring program review

| Course    | Program page                                             | Catalog treatment in this app                                                                                                                          |
| --------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| GRAD 5100 | Fundamentals of Data Science                             | Official title: Fundamental Skills for Data Science                                                                                                    |
| ARE 5311  | Applied Econometrics I                                   | Official title: Applied Econometrics I: Regression Analysis for Causal Inference                                                                       |
| GRAD 5900 | Applied Generative AI                                    | Official title: Special Topics in Graduate Education; variable credits stay `null`; no topic-specific formal description or prerequisites are asserted |
| OPIM 5671 | Data Mining and Business Intelligence                    | Official title: Data Mining and Time Series Forecasting; current catalog description retained                                                          |
| STAT 5405 | Older introductory-statistics/instructor-consent wording | Current catalog requires GRAD 5100, which may be taken concurrently, and includes current enrollment/credit restrictions                               |
| STAT 5410 | Older introductory-statistics/programming wording        | Current catalog requires GRAD 5100 and STAT 5405, with current enrollment restrictions                                                                 |

GRAD 5900 is verified as a generic catalog record and as an MSDS-recommended special topic; this does not verify a current Applied Generative AI offering, its specific credits, or its preparation requirements. Its student summary and source note make the distinction explicit. The separate, verified catalog courses OPIM 5515 and OPIM 5517 provide additional generative-AI discovery options with their actual catalog restrictions and without an MSDS-approval claim.

The complete normalized maintenance snapshot contains **2,797 graduate records** numbered 5000 and above. It stays in `source-index.json` and is not bundled into the browser. The student index contains **202 explicit topic matches** plus **one retained reviewed contextual alternative**, OPIM 5641, for 203 raw index records. Topic counts overlap: AI 18, machine learning 56, advanced statistics 105, and sports 45. The runtime gives 27 duplicate program-curated records precedence, leaving 176 distinct catalog-only options. `coverage.json` records every discovered department, retrieval status, checked date, parsed count, match count, failure, topic rule, and evidence scope.

“Complete” coverage means that all 96 discovered pages were retrieved; it does not claim that keyword rules capture every possible interpretation of academic relevance. The full stored snapshot makes it possible to inspect omitted records and widen the documented rules without another network retrieval. Topic relevance and tags are editorial interpretations of explicit official wording. `catalogMatches` preserves the topic and a short source-text excerpt for each automated match. Sports-domain discovery includes management, athletics, and directly stated measurement contexts; it does not label every such course a sports-analytics course. Generic thesis, dissertation, internship, and research shells are included only if their substantive description explicitly matches a selected topic, and their restrictions still apply.

## Files

| File                             | Purpose                                                                                        |
| -------------------------------- | ---------------------------------------------------------------------------------------------- |
| `data/program.json`              | Degree name, credit structure, source status, and the advising disclaimer                      |
| `data/core-courses.json`         | Required courses and applied capstone                                                          |
| `data/electives.json`            | Program-curated recommended and specialty electives                                            |
| `data/catalog/courses.json`      | Separately refreshed broader-catalog discovery index                                           |
| `data/catalog/source-index.json` | Complete normalized graduate metadata snapshot for maintenance; never imported by browser code |
| `data/catalog/coverage.json`     | Source coverage, dates, topical rules, counts, and retrieval failures                          |
| `data/pathways.json`             | Suggested pathway definitions and reviewed course assignments                                  |
| `data/capabilities.json`         | Shared capability labels and descriptions                                                      |
| `src/lib/schema.ts`              | Zod schema and shared TypeScript types                                                         |
| `src/lib/data.ts`                | Validated loading, lookups, source freshness, and merged course collection                     |

The runtime merges the broader catalog with the curated records by course code, preferring curated records. A catalog refresh never overwrites curated descriptions, classifications, tags, or pathway definitions. Existing catalog-index student descriptions, tags, capabilities, and pathway mappings are also preserved. After refreshing, review relevant catalog changes and deliberately copy official updates into curated files; the refresh does not silently merge incompatible facts. Review preserved source notes for continued accuracy when official metadata changes.

## Update a course description

1. Open the appropriate course JSON file and locate its code.
2. Copy the formal catalog wording to `officialDescription`; preserve requirement wording in `prerequisites`, including consent and enrollment restrictions. A missing prerequisite field means unknown, not that there are no prerequisites.
3. Put concise instructor or program-written wording in `studentDescription`. Keep it separate from `officialDescription`.
4. Record the exact official `sourceUrl`, `sourceType`, and the date the source was checked. Set `sourceVerification` to `"verified"` only after checking the source. Preserve program elective curation attribution in `curationSourceUrl`.
5. Check `credits` carefully. Use a number only for a fixed credit value; variable or uncertain credit values remain `null` pending a richer credit-range model. Do not infer three credits from a typical course.
6. Validate and review the change. Do not infer semester availability or delivery from a catalog entry.

## Add, remove, or reclassify an elective

Add a full schema-compatible object to `data/electives.json` after checking the program list and official catalog. `kind` is `"elective"`; `msdsStatus` is `"recommended"` or `"specialty"` according to the actual program section. Both classifications require `curationSourceUrl`. Mark broader catalog entries `"catalog-only"` and keep them in the catalog index.

For a specialty-to-recommended change, update `msdsStatus` only after the MSDS course page or an authoritative program update supports it. Record the curation source; catalog existence alone does not establish MSDS curation. `approvalRequired` is `true`, `false`, or `null` based on explicit policy; never infer automatic degree approval from a recommended badge.

When removing a course, also remove it from pathway references and review student guidance that names it. Check whether it remains relevant as a catalog-only option rather than silently changing its degree status.

## Tags and pathways

Tags are lowercase, hyphen-separated identifiers such as `machine-learning` or `time-series`. Prefer the existing vocabulary to avoid fragmenting search. Match tags to course content, not to hoped-for applications. A course need not literally mention “sports” to contribute relevant predictive methods, but the recommendation explanation must identify the actual method connection.

Add pathways in `data/pathways.json` with a unique ID, title, summary, tags, foundation-course references, reviewed elective references, optional catalog-course references, and application examples. Reference course codes exactly, including the space. Put program-curated electives in `electives`; put broader-catalog references in `catalogCourses`. Course capability and pathway mappings must use existing identifiers. Keep course `pathways` and pathway course references consistent when editing.

Each of the seven prototype pathways has two or three primary curated options, a `suggestedCombination` of two or three courses that may include a clearly labeled catalog-only option, an `electiveRange` of 2–3, and an example topical `capstone` with guiding questions. `signature: true` highlights AI and Sports. The AI example combines CSE 5825, OPIM 5509, and catalog-only OPIM 5515; Sports combines STAT 5825, OPIM 5604, and catalog-only EDLR 5380. This is a shortlist framework: the verified current degree requirement remains **two electives / six credits**, and a third option is not automatically an approved replacement or additional requirement. Prerequisites, access, and degree applicability must be checked for every selected course.

Capstone examples describe possible GRAD 5800 topics, not guaranteed project placements, supervision, data access, or offerings. `coreSubstitutionNote` explicitly identifies replacement of required core courses as a proposal requiring program approval, rather than a verified current MSDS policy. The verified degree object and required-course classifications are unchanged.

Suggested pathways have `official: false`. To add an official concentration later, first obtain program documentation, set `official: true`, and include `officialSourceUrl`. The schema requires that evidence. Review the interface wording and degree rules before publishing an official concentration; the flag alone is not a degree audit.

## Refresh or re-filter the catalog

Catalog metadata is fetched during maintenance, never on every student page request. The default command discovers every graduate department from the official index and applies the four topical rule sets:

```sh
npm run refresh-catalog -- --all-departments \
  --topics ai,machine-learning,advanced-statistics,sports --dry-run
npm run refresh-catalog
npm run validate-data
```

The parser includes graduate codes numbered 5000 and above, including 7000–9000 levels if present. `graduateLevel` describes the catalog code level and says nothing about MSDS approval. Fixed credits, titles, formal descriptions, and stated requirements are copied; zero-credit records remain zero and variable credit ranges stay `null`. The topic matcher generates only transparent relevance tags and evidence excerpts from actual title/description wording, with the KINS department supplying the kinesiology context tag. It generates no official facts, student summaries, capability mappings, pathway assignments, delivery, or approval status.

Fetches use concurrency four, timeouts, and bounded retry only for transient failures, while retaining TLS verification. A first full source-index creation requires every discovered department. Later partial department refreshes replace successful source pages while preserving records from other pages and failed pages. Failure details make coverage explicitly partial, and the command exits nonzero if any requested department failed. Invalid source structure does not silently erase records. Previously authored student text, tags, mappings, and reviewed contextual alternatives remain intact. Removed catalog records need a deliberate content review if existing pathways reference them.

A selected refresh preserves the rest of the complete index and its coverage:

```sh
npm run refresh-catalog -- --departments STAT,EDLR --dry-run
```

To widen rules in `scripts/lib/catalog-topics.ts` or re-filter the complete committed metadata **without network calls**:

```sh
npm run refresh-catalog -- --all-departments \
  --topics ai,machine-learning,advanced-statistics,sports \
  --from-index data/catalog/source-index.json --dry-run
```

Remove `--dry-run` to save the student index and coverage. This mode requires the stored source-index and its adjacent coverage file, preserves per-course original `lastChecked` dates, and marks the operation as re-filtering a stored snapshot. A later filter application is not a new official-source check. Use `--source-coverage`, `--output`, `--coverage-output`, and `--source-index-output` for deliberate alternate destinations.

For official HTML snapshots retrieved separately, include `catalog-index.html`, name each department file by its actual lowercase URL slug (`stat.html`, `cse.html`), and supply its real retrieval date:

```sh
npm run refresh-catalog -- --departments STAT,CSE \
  --from-dir /path/to/official-snapshots --checked-on YYYY-MM-DD --dry-run
```

Review the diff, source links, credit parsing, and requirement wording before publication. If UConn changes its HTML format, update `scripts/lib/catalog.ts` and verify the parser before refreshing. Fetches retain TLS verification; do not bypass it to get a successful refresh. Network restrictions should be resolved through environment network settings for `catalog.uconn.edu` and `masters.datascience.uconn.edu`.

## AI and deployment

The assistant uses the same validated local content as the explorer. Its factual quality depends on these records and source statuses; an LLM must not promote pending metadata to verified facts. Keep API keys server-side and configure only the environment variables documented in `.env.example`. The app remains usable without them. See the project README for provider configuration and deployment instructions.

The advising disclaimer is stored once in `program.json`. Course freshness is based on `lastChecked`; records older than 180 days are marked for review. A fresh catalog check establishes metadata freshness, not current semester offering, enrollment permission, or degree approval.
