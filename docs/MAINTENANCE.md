# Content and application maintenance

Content is local JSON validated by Zod. Edit it in a development checkout, review the diff, validate it, and rebuild the site. A CMS is not required. Do not place course descriptions in React components.

## Source policy

The Graduate Catalog is the source of record for titles, credits, descriptions, prerequisites, and enrollment restrictions. The MSDS course page establishes program-curated recommended versus specialty membership. Instructor descriptions may supply student-facing summaries; they do not replace catalog facts.

Every course preserves `sourceUrl`, `sourceType`, `lastChecked`, `sourceVerification`, `officialDescription`, and an optional `studentDescription`. Pending facts remain `null`. A missing prerequisite statement means **unknown**, never “no prerequisites.” Course existence does not establish semester availability, delivery mode, or degree approval.

The initial official-source check was completed on October 6, 2026: nine required courses, 60 program-curated electives (21 recommended and 39 specialty), and ten reviewed broader-catalog candidates are available. Official catalog metadata is verified for 74 of the 79 records. CSE 5506, CSE 5510, CSE 5815, CSE 5840, and MKTG 5220 remain on the verified program specialty list but are absent from their current departmental catalogs; their formal metadata stays pending. Their `lastChecked` date records the program-source check, not catalog verification. See [data and source review notes](DATA.md#source-differences-requiring-program-review), including the generic GRAD 5900 special-topics treatment.

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

## 5. Add an official concentration later

First obtain program documentation that explicitly establishes the concentration. The pathway schema already permits `official: true` and requires `officialSourceUrl` in that case. Add that authoritative URL and reviewed definitions to `data/pathways.json`.

Do not mark a suggested thematic pathway official on the basis of relevant courses alone. This flag and source link record recognition; they do not implement concentration-specific degree auditing. Formal credit, enrollment, or completion rules would need additional reviewed data and a separate feature change.

## 6. Refresh catalog metadata

The refresh script retrieves only requested departments and creates a normalized local index. It never runs during application requests. First inspect changes without writing:

```sh
npm run refresh-catalog -- --departments STAT,CSE --dry-run
```

After network access works and the output is sensible:

```sh
npm run refresh-catalog -- --departments STAT,CSE
npm run validate-data
```

Without `--departments`, the script uses `ARE,BIST,CSE,EPSY,GRAD,MKTG,NRE,OPIM,STAT`. Initial discovery also reviewed EEB; include `--departments EEB` to refresh that department's candidates. It indexes 5000- and 6000-level courses. Fixed credits are retained; variable-credit ranges remain unknown in the numeric field. Descriptions and detected enrollment restrictions preserve source wording. Inspect parser output against the source before relying on it; catalog page structure can change.

Refreshing selected departments preserves existing records for other departments, as well as existing editorial summaries, tags, capabilities, pathway assignments, and source notes for refreshed catalog records. The script validates all retrieved data before an atomic output replacement. Fetch failures, empty parsing, invalid data, and duplicate codes leave the existing index unchanged. It does not edit the program-curated files; reconcile their official facts separately after reviewing catalog changes. Program-curated records take precedence when the same code appears in both collections.

For authoritative saved HTML, place files such as `stat.html` and `cse.html` in a source snapshot directory. Supply the date those files were actually retrieved:

```sh
npm run refresh-catalog -- --departments STAT,CSE --from-dir /path/to/catalog-snapshots --checked-on YYYY-MM-DD --dry-run
```

Replace the path and date before running; remove `--dry-run` to write. `--output data/catalog/review.json` can produce a separate review artifact. Offline mode requires an explicit check date. Never change a retrieval date merely to make stale content appear current. The UI flags records older than 180 days for review.

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
