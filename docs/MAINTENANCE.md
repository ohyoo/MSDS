# Content and application maintenance

Content is local JSON validated by Zod. Edit it in a development checkout, review the diff, validate it, and rebuild the site. A CMS is not required. Do not place course descriptions in React components.

## Source policy

The Graduate Catalog is the source of record for titles, credits, descriptions, prerequisites, and enrollment restrictions. The MSDS course page establishes program-curated recommended versus specialty membership. Instructor descriptions may supply student-facing summaries; they do not replace catalog facts.

Every course preserves `sourceUrl`, `sourceType`, `lastChecked`, `sourceVerification`, `officialDescription`, and an optional `studentDescription`. Pending facts remain `null`. A missing prerequisite statement means **unknown**, never “no prerequisites.” Course existence does not establish semester availability, delivery mode, or degree approval.

Official sources were checked on October 6, 2026. All 96 departmental Graduate Catalog pages were retrieved, yielding 2,797 normalized courses numbered 5000 and above. The complete maintenance-only metadata is in `data/catalog/source-index.json`; the browser imports the smaller topic-filtered `courses.json` plus `coverage.json`. Nine required courses and 60 program-curated electives (21 recommended and 39 specialty) retain their separate program classifications.

The filtered index contains 203 records: 202 explicit topic matches plus retained reviewed candidate OPIM 5641. Deduplicating 27 program-curated codes leaves 176 catalog-only choices and 245 unique application records, of which 240 have verified official metadata. Topic counts overlap: AI 18, machine learning 56, advanced statistics 105, and sports 45. Treat these as versioned keyword-filter results, not an exhaustive academic classification.

CSE 5506, CSE 5510, CSE 5815, CSE 5840, and MKTG 5220 remain on the verified program specialty list but are absent from their current departmental catalogs; their formal metadata stays pending. Their `lastChecked` date records the program-source check, not catalog verification. See [data and source review notes](DATA.md#source-differences-requiring-program-review), including the generic GRAD 5900 special-topics treatment.

Use actual retrieval evidence to update verification flags. A passed schema validation run is not permission to mark sources verified.

For each content refresh, retrieve the [MSDS courses page](https://masters.datascience.uconn.edu/courses/), [degree requirements](https://catalog.uconn.edu/graduate/degree-programs/data-science-ms/), and relevant [department catalog pages](https://catalog.uconn.edu/graduate/courses/). Record the actual check date and preserve exact official wording. Review the eight core courses' individual credits against the stated 21-credit total rather than assuming every core is three credits.

## 1. Update a course description

Edit the matching record in `data/core-courses.json` or `data/electives.json`.

- Copy catalog wording into `officialDescription`; preserve prerequisites and enrollment restrictions in `prerequisites`.
- Put a concise, interpretive summary in `studentDescription`. Review it with the program or instructor.
- Update `sourceUrl`, `sourceType`, and the actual `lastChecked` date (`YYYY-MM-DD`) for the official metadata. Set `sourceVerification` to `verified` only after checking an authoritative source.
- Keep the catalog URL as provenance for official fields. Use optional `sourceNotes` for a source discrepancy or instructor-summary attribution; the single course `sourceType` must not suggest instructor text is an official catalog fact.

Run `npm run validate-data` and review the detail drawer. Official and student-facing descriptions should remain visibly distinct.

## 2. Add or remove an elective

Add a normalized record to `data/electives.json` for program-curated courses. Use the complete shape in `src/lib/schema.ts`: code, title, nullable credits, department, kind, descriptions, prerequisites, tags, capabilities, pathways, classification, delivery, nullable approval status, and provenance.

Set `kind` to `elective`; use `recommended` or `specialty` only when the MSDS source establishes membership. Include `curationSourceUrl` pointing to that page, as well as the authoritative catalog `sourceUrl`. Use `catalog-only` for broader catalog suggestions, ordinarily maintained in `data/catalog/courses.json`. Do not infer `approvalRequired`; use `null` when unknown, and `delivery: "unknown"` unless verified.

Use existing capability/pathway IDs or add the corresponding definitions. Before deleting a course, remove references from `pathways.json`. Removing a program-curated elective does not necessarily remove its separate broader catalog entry, which retains a `catalog-only` classification.

## 3. Change specialty to recommended

Check that the current MSDS page supports the change. Update the course's `msdsStatus` from `specialty` to `recommended`, preserve `curationSourceUrl`, and review the applicable official facts and freshness date. The classification indicates program curation; it does not promise approval for an individual student's plan. Check the new badge in the explorer.

## 4. Add a suggested pathway

Add a unique lowercase hyphenated `id` in `data/pathways.json`, plus `title`, `summary`, `tags`, `coreCourses`, `electives`, `catalogCourses`, `applications`, `careers`, and `official: false`. Reference actual course codes from the appropriate local collection. Leave unverified elective mappings empty rather than fabricating assignments.

Mappings are interpretive educational connections and require program review. Add the pathway ID to relevant courses' `pathways` arrays when justified by their actual descriptions. Verify that the interface labels the pathway as suggested rather than an official concentration.

The current seven templates also define:

- `signature`: `true` for the featured AI & Machine Learning and Sports Analytics suggestions; this is a presentation flag, not official program recognition.
- `electiveRange`: `{ "min": 2, "max": 3 }`, describing the exploratory template size rather than changing the verified two-elective requirement.
- `suggestedCombination`: two or three unique, real course codes from the local elective collections, including any explicitly catalog-only discovery options.
- `capstone`: a `title`, `summary`, and nonempty `questions` array describing a possible topical GRAD 5800 project; these are proposals requiring review of scope, data access, and supervision.
- `coreSubstitutionNote`: explicit language explaining that replacing a required core is a proposal requiring program approval, with no verified substitution policy.

The current degree remains eight core courses totaling 21 credits, two electives totaling 6 credits, and a 3-credit capstone. Keep a third suggested course clearly optional and subject to approval/credit-fit confirmation. A template does not replace required core courses or create an official concentration.

## 5. Add an official concentration later

First obtain program documentation that explicitly establishes the concentration. The pathway schema already permits `official: true` and requires `officialSourceUrl` in that case. Add that authoritative URL and reviewed definitions to `data/pathways.json`.

Do not mark a suggested thematic pathway official on the basis of relevant courses alone. This flag and source link record recognition; they do not implement concentration-specific degree auditing. Formal credit, enrollment, or completion rules would need additional reviewed data and a separate feature change.

## 6. Refresh catalog metadata

The refresh script discovers departments from the official graduate-course index. By default it retrieves all discovered departments with concurrency four and filters title/description text for `ai,machine-learning,advanced-statistics,sports`. It never runs during application requests. First inspect a complete refresh without writing:

```sh
npm run refresh-catalog -- --all-departments --dry-run
```

After reviewing the output, refresh the checked-in data and save official HTML snapshots outside the checkout:

```sh
npm run refresh-catalog -- --all-departments --snapshot-dir /workspace/msds-catalog-snapshots
npm run validate-data
```

Plain `npm run refresh-catalog` also means all departments. `--departments STAT,EDLR` limits a later refresh to those departments; `--topics ai,sports` limits topic filters. Supported topic IDs are `ai`, `machine-learning`, `advanced-statistics`, and `sports`. Initial full source-index creation requires a successful pass over every discovered department.

Three files are maintained: `courses.json` (topic matches and retained reviewed candidates), `coverage.json` (department results, rules, counts, and dates), and `source-index.json` (complete normalized source metadata). The full source index is not imported by the UI; it supports later review and wider matching without runtime UConn calls. Catalog metadata copies official wording, credits, and stated requirements. Fixed credits are numeric; variable ranges stay `null`. Topic tags and `catalogMatches` evidence are transparent interpretive results, not new official claims.

Refreshing selected departments preserves unselected records and existing editorial summaries, tags, capabilities, pathway assignments, and source notes. The script does not edit program-curated files or the degree rules. Reconcile their official facts separately after reviewing changes; curated records take precedence for duplicate codes. Inspect official wording and evidence excerpts against the source, especially if catalog HTML changes.

A later partial retrieval preserves prior records for failed departments, writes successful updates with partial coverage, and exits unsuccessfully. Check `failedDepartments`, repair the cause, and rerun affected departments before calling the refresh complete. No successful department retrieval, invalid schemas, or conflicting duplicate codes stops the update. Each output file is replaced atomically; the three-file set is not a single transaction, so rerun after an interrupted write and validate all outputs together.

For authoritative saved HTML, include `catalog-index.html` and department-slug files such as `stat.html` and `edlr.html`. Supply their actual retrieval date:

```sh
npm run refresh-catalog -- --all-departments --from-dir /workspace/msds-catalog-snapshots --checked-on YYYY-MM-DD --dry-run
```

Replace the path and date before running; remove `--dry-run` to write. Offline mode requires an explicit check date. `--output`, `--coverage-output`, and `--source-index-output` can direct outputs to a separate review directory. Never change retrieval dates merely to make stale content appear current. The UI flags records older than 180 days for review.

Re-filter the complete normalized metadata without any network calls:

```sh
npm run refresh-catalog -- --all-departments --topics ai,machine-learning,advanced-statistics,sports --from-index data/catalog/source-index.json --dry-run
```

Remove `--dry-run` after reviewing the results to save. `--from-index` uses the adjacent `coverage.json` by default; `--source-coverage` can identify its accompanying coverage file elsewhere. It preserves original per-course and coverage source-check dates. Saved coverage records `refilteredFromStoredSnapshot` and `filterAppliedOn` to distinguish matching changes from fresh retrieval. Use `--from-index` or `--from-dir` separately; snapshot downloading applies only to HTML retrieval.

To widen matching, review the local full metadata and edit the versioned rules in `scripts/lib/catalog-topics.ts`, then use `--from-index` to apply them to every stored course without new UConn calls. Update `topicRuleVersion`, inspect new evidence excerpts, and run parser/topic tests. The filter identifies explicit words in official titles and descriptions; it does not exhaustively classify every academically relevant course. Generic research or special-topic shells qualify only when their descriptions explicitly support the topic.

## 7. Modify recommendation tags

Use lowercase hyphenated tags in course and pathway records, such as `machine-learning` or `time-series`. Tags should reflect reviewed descriptions or clearly identified interpretive mappings. They must not encode presumed availability or approval.

`src/lib/recommendations.ts` defines explicit interest aliases, domain-to-method connections, and ranking weights. Related methods allow a sports query to find predictive modeling and forecasting without requiring a literal “sports” title. Tags, titles, pathway mappings, descriptions, and departments contribute transparent reasons; Fuse.js adds typo tolerance. Change aliases or weights only with meaningful ranking tests for affected examples. Run `npm run test` and inspect search explanations for sports analytics and generative AI plus business.

## 8. Configure the optional AI assistant

The static application supplies a deterministic browser guide by default. To add a model, host `server/guide-server.ts` separately and configure server-only `MSDS_AI_API_KEY`, HTTPS `MSDS_AI_ENDPOINT`, and `MSDS_AI_MODEL`. Never commit keys or expose them through `NEXT_PUBLIC_` variables. Set public `NEXT_PUBLIC_MSDS_GUIDE_ENDPOINT` to that service's complete `/api/guide` URL when building the static site; this value contains no secret.

Use host-injected environment variables with `npm run guide:serve`. For a local ignored `.env.local` file, use `node --env-file=.env.local --import tsx server/guide-server.ts` to load it explicitly. The service defaults to port `8787`; `MSDS_GUIDE_PORT` overrides it. Set `MSDS_ALLOWED_ORIGINS` to comma-separated exact browser origins. See the [deployment guide](DEPLOYMENT.md) for HTTPS hosting and origin details.

The default guide is deterministic. Optional model retrieval uses selected, mentioned, and locally ranked course records, with at most eight records sent as context. The endpoint must support OpenAI-compatible chat completions and JSON response formatting. Valid output is limited to up to three context course codes and a `compare`, `foundations`, or `pathways` follow-up type. The server validates this output; local data supplies all explanatory text and source links. The model cannot generate catalog facts, approval decisions, or semester claims. Failure falls back to deterministic guidance.

No live provider has been tested without credentials. When enabling one, test valid selection, unknown course rejection, provider failure, and fallback using an authorized account. Review the provider's handling of submitted questions before student use.

The application stores only shortlisted course codes in browser local storage. Guide questions are transient, with no application conversation persistence. A configured provider receives the question and minimal course context. Remind users not to submit personal records; avoid adding guide request-body logging or unnecessary student fields.

## 9. Deploy the site

Use the [deployment guide](DEPLOYMENT.md) for GitHub Pages, Vercel, Cloudflare Pages, and the optional separate Node.js guide service. The included GitHub Actions workflow publishes the static `out/` export under `/MSDS`. Update its build base path for a different URL, and keep all provider secrets outside the static-site build. Publishing an official advising resource requires academic content review.

## Review every content change

```sh
npm run validate-data
npm run typecheck
npm run lint
npm run test
npm run build
```

Run `npm run test:e2e` when the browser is installed, then inspect the affected course details, ranking explanations, category badges, and mobile layout. Validate-data checks format, references, classifications, and available credit totals; source verification remains a human/content responsibility.

Before release, confirm the advising disclaimer remains accessible:

> Course offerings, prerequisites, and availability may change. Suggested pathways and course recommendations are for exploration and planning and do not constitute formal approval. Students should confirm elective selections with the MSDS program.
