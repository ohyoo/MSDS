import { mkdir, readFile, writeFile, rename } from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as cheerio from "cheerio";
import {
  coursesSchema,
  catalogCoverageSchema,
  type Course,
} from "../src/lib/schema";
import { parseCatalogPage } from "./lib/catalog";
import {
  discoverDepartments,
  matchCatalogTopics,
  topicRules,
  topicRuleVersion,
} from "./lib/catalog-topics";

// Node 24 supports the platform's configured HTTPS proxy without weakening TLS.
(
  http as typeof http & { setGlobalProxyFromEnv?: () => void }
).setGlobalProxyFromEnv?.();
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const argument = (name: string) => {
  const exact = args.indexOf(name);
  return exact >= 0
    ? args[exact + 1]
    : args.find((arg) => arg.startsWith(`${name}=`))?.slice(name.length + 1);
};
const departmentsArg = argument("--departments");
const allMode = args.includes("--all-departments") || !departmentsArg;
const selectedDepartments = (departmentsArg ?? "")
  .split(",")
  .map((value) => value.trim().toUpperCase())
  .filter(Boolean);
const topics = (
  argument("--topics") ?? "ai,machine-learning,advanced-statistics,sports"
)
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);
const dryRun = args.includes("--dry-run");
const fromDir = argument("--from-dir");
const fromIndex = argument("--from-index");
const snapshotDir = argument("--snapshot-dir");
let checkDate =
  argument("--checked-on") ?? new Date().toISOString().slice(0, 10);
const output = path.resolve(
  root,
  argument("--output") ?? "data/catalog/courses.json",
);
const coverageOutput = argument("--coverage-output")
  ? path.resolve(root, argument("--coverage-output")!)
  : path.join(path.dirname(output), "coverage.json");
const sourceIndexOutput = argument("--source-index-output")
  ? path.resolve(root, argument("--source-index-output")!)
  : path.join(path.dirname(output), "source-index.json");
const indexUrl = "https://catalog.uconn.edu/graduate/courses/";

type DepartmentResult = {
  department: string;
  title: string;
  sourceUrl: string;
  status: "retrieved" | "failed";
  parsedCourses: number;
  matchedCourses: number;
  lastChecked: string;
  error?: string;
};

class RetrievalError extends Error {
  constructor(
    message: string,
    readonly transient: boolean,
  ) {
    super(message);
  }
}

async function fetchHtml(url: string): Promise<string> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent":
            "MSDS-Curriculum-Explorer/1.0 (academic catalog maintenance; bounded concurrency)",
        },
        signal: AbortSignal.timeout(30_000),
      });
      if (!response.ok)
        throw new RetrievalError(
          `HTTP ${response.status}`,
          [408, 429, 500, 502, 503, 504].includes(response.status),
        );
      if (!response.headers.get("content-type")?.includes("text/html"))
        throw new RetrievalError("Expected an HTML catalog response", false);
      return await response.text();
    } catch (error) {
      const transient = !(error instanceof RetrievalError) || error.transient;
      if (!transient || attempt === 2) throw error;
      // Retry only diagnosed transient responses/timeouts, with bounded backoff.
      await new Promise((resolve) => setTimeout(resolve, (attempt + 1) * 1500));
    }
  }
  throw new Error("Retrieval attempts exhausted");
}

async function writeAtomic(filename: string, data: unknown) {
  await mkdir(path.dirname(filename), { recursive: true });
  const temporary = `${filename}.tmp`;
  await writeFile(temporary, `${JSON.stringify(data, null, 2)}\n`, "utf8");
  await rename(temporary, filename);
}

async function main() {
  if (args.includes("--help")) {
    console.log(
      "Refresh a local, topic-filtered UConn Graduate Catalog index.\nDefault: all discovered departments and ai,machine-learning,advanced-statistics,sports topics.\nOptions: --all-departments --departments STAT,EDLR --topics ai,machine-learning,advanced-statistics,sports --dry-run --from-dir /official-snapshots --checked-on YYYY-MM-DD --from-index data/catalog/source-index.json --source-coverage data/catalog/coverage.json --snapshot-dir /downloaded-snapshots --output data/catalog/courses.json --coverage-output data/catalog/coverage.json --source-index-output data/catalog/source-index.json\nOffline HTML files: catalog-index.html and lowercase department-slug.html. --from-index makes no network calls and preserves original source-check dates. No student-page request fetches catalog data. Core requirements and program elective membership are never changed by this script.",
    );
    return;
  }
  if (
    !allMode &&
    (!selectedDepartments.length ||
      selectedDepartments.some((value) => !/^[A-Z]{2,6}$/.test(value)))
  )
    throw new Error("Provide department codes such as STAT,EDLR.");
  if (
    !topics.length ||
    topics.some((value) => !topicRules.some((rule) => rule.topic === value))
  )
    throw new Error(
      "Supported topics: ai,machine-learning,advanced-statistics,sports.",
    );
  if (!/^\d{4}-\d{2}-\d{2}$/.test(checkDate))
    throw new Error("Use YYYY-MM-DD for --checked-on.");
  if (fromDir && !argument("--checked-on"))
    throw new Error(
      "Offline snapshots require --checked-on with their actual retrieval date.",
    );
  if (fromDir && fromIndex)
    throw new Error("Choose --from-dir or --from-index, not both.");
  if (fromIndex && snapshotDir)
    throw new Error(
      "--snapshot-dir requires HTML retrieval rather than --from-index.",
    );
  const storedSource = fromIndex
    ? coursesSchema.parse(
        JSON.parse(await readFile(path.resolve(root, fromIndex), "utf8")),
      )
    : undefined;
  const storedCoverage = fromIndex
    ? catalogCoverageSchema.parse(
        JSON.parse(
          await readFile(
            path.resolve(
              root,
              argument("--source-coverage") ??
                path.join(path.dirname(fromIndex), "coverage.json"),
            ),
            "utf8",
          ),
        ),
      )
    : undefined;
  if (storedCoverage) {
    checkDate = storedCoverage.lastChecked;
    console.log(
      `Re-filtering a stored source snapshot last checked ${checkDate}; no network retrieval or source-date update.`,
    );
  }
  const indexHtml = fromIndex
    ? ""
    : fromDir
      ? await readFile(path.resolve(fromDir, "catalog-index.html"), "utf8")
      : await fetchHtml(indexUrl);
  const discovered = storedCoverage
    ? storedCoverage.departments.map((entry) => ({
        department: entry.department,
        title: entry.title,
        sourceUrl: entry.sourceUrl,
        slug: new URL(entry.sourceUrl).pathname
          .split("/")
          .filter(Boolean)
          .at(-1)!,
      }))
    : discoverDepartments(indexHtml, indexUrl);
  if (!discovered.length)
    throw new Error(
      "No graduate departmental URLs discovered. Existing data was not changed.",
    );
  const selected = allMode
    ? discovered
    : discovered.filter((entry) =>
        selectedDepartments.includes(entry.department),
      );
  const missing = selectedDepartments.filter(
    (department) =>
      !discovered.some((entry) => entry.department === department),
  );
  if (!allMode && missing.length)
    throw new Error(
      `Departments absent from current official index: ${missing.join(", ")}.`,
    );
  if (snapshotDir && !dryRun) {
    await mkdir(snapshotDir, { recursive: true });
    await writeFile(
      path.join(snapshotDir, "catalog-index.html"),
      indexHtml,
      "utf8",
    );
  }
  console.log(
    `Discovered ${discovered.length} official department pages; checking ${selected.length}, concurrency 4. Topics: ${topics.join(", ")}.`,
  );

  const results: DepartmentResult[] = [];
  const fetched: Course[] = [];
  const allParsed: Course[] = [];
  let cursor = 0;
  const worker = async () => {
    while (cursor < selected.length) {
      const department = selected[cursor++];
      try {
        let parsed: Course[];
        if (storedSource) {
          const previousDepartment = storedCoverage?.departments.find(
            (entry) => entry.sourceUrl === department.sourceUrl,
          );
          if (previousDepartment?.status === "failed")
            throw new RetrievalError(
              `Stored coverage records a retrieval failure: ${previousDepartment.error}`,
              false,
            );
          parsed = storedSource.filter(
            (course) => course.sourceUrl === department.sourceUrl,
          );
          if (parsed.length !== previousDepartment?.parsedCourses)
            throw new RetrievalError(
              "Stored source-index count differs from its source coverage; preserve existing files and repair the snapshot",
              false,
            );
        } else {
          const html = fromDir
            ? await readFile(
                path.resolve(fromDir, `${department.slug}.html`),
                "utf8",
              )
            : await fetchHtml(department.sourceUrl);
          if (snapshotDir && !dryRun)
            await writeFile(
              path.join(snapshotDir, `${department.slug}.html`),
              html,
              "utf8",
            );
          const $ = cheerio.load(html);
          if (
            !$(".courseblock").length &&
            !/no (?:graduate )?courses (?:are )?(?:listed|available|offered)/i.test(
              $("body").text(),
            )
          )
            throw new RetrievalError(
              "No course blocks found; check the source format",
              false,
            );
          parsed = coursesSchema.parse(
            parseCatalogPage(html, department.sourceUrl, checkDate),
          );
        }
        allParsed.push(...parsed);
        const relevant = parsed.flatMap((course) => {
          const relevance = matchCatalogTopics(course, topics);
          return relevance.matches.length
            ? [
                {
                  ...course,
                  tags: relevance.tags,
                  catalogMatches: relevance.matches,
                },
              ]
            : [];
        });
        results.push({
          ...department,
          status: "retrieved",
          parsedCourses: parsed.length,
          matchedCourses: relevant.length,
          lastChecked:
            storedCoverage?.departments.find(
              (entry) => entry.sourceUrl === department.sourceUrl,
            )?.lastChecked ?? checkDate,
        });
        fetched.push(...relevant);
        console.log(
          `${department.department}: ${parsed.length} graduate records, ${relevant.length} topic matches`,
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        results.push({
          ...department,
          status: "failed",
          parsedCourses: 0,
          matchedCourses: 0,
          lastChecked: checkDate,
          error: message,
        });
        console.error(`${department.department}: failed — ${message}`);
      }
    }
  };
  await Promise.all(
    Array.from({ length: Math.min(4, selected.length) }, worker),
  );

  let previous: Course[] = [];
  try {
    previous = coursesSchema.parse(JSON.parse(await readFile(output, "utf8")));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  const successfulUrls = new Set(
    results
      .filter((entry) => entry.status === "retrieved")
      .map((entry) => entry.sourceUrl),
  );
  const previousByCode = new Map(
    previous.map((course) => [course.code, course]),
  );
  const explicitCodes = new Set(fetched.map((course) => course.code));
  const parsedByCode = new Map(
    allParsed.map((course) => [course.code, course]),
  );
  const retainedReviewed = previous.flatMap((course) => {
    const fresh = parsedByCode.get(course.code);
    return fresh && !explicitCodes.has(course.code) && course.studentDescription
      ? [fresh]
      : [];
  });
  const withEditorial = [...fetched, ...retainedReviewed].map((course) => {
    const existing = previousByCode.get(course.code);
    return existing
      ? {
          ...course,
          studentDescription: existing.studentDescription,
          tags: [...new Set([...existing.tags, ...course.tags])],
          capabilities: existing.capabilities,
          pathways: existing.pathways,
          ...(existing.sourceNotes
            ? { sourceNotes: existing.sourceNotes }
            : {}),
        }
      : course;
  });
  const nextByCode = new Map(
    previous
      .filter((course) => !successfulUrls.has(course.sourceUrl))
      .map((course) => [course.code, course]),
  );
  for (const course of withEditorial) {
    const existing = nextByCode.get(course.code);
    if (!existing || existing.sourceUrl === course.sourceUrl)
      nextByCode.set(course.code, course);
    else
      throw new Error(
        `Conflicting duplicate code ${course.code} at ${existing.sourceUrl} and ${course.sourceUrl}. Existing data was not changed.`,
      );
  }
  const next = coursesSchema.parse(
    [...nextByCode.values()].sort((a, b) => a.code.localeCompare(b.code)),
  );

  let previousSource: Course[] = [];
  try {
    previousSource = coursesSchema.parse(
      JSON.parse(await readFile(sourceIndexOutput, "utf8")),
    );
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  const sourceByCode = new Map(
    previousSource
      .filter((course) => !successfulUrls.has(course.sourceUrl))
      .map((course) => [course.code, course]),
  );
  for (const course of allParsed) {
    const existing = sourceByCode.get(course.code);
    if (existing && existing.sourceUrl !== course.sourceUrl)
      throw new Error(
        `Conflicting source-index duplicate ${course.code}; existing files were preserved.`,
      );
    sourceByCode.set(course.code, course);
  }
  const fullSource = coursesSchema.parse(
    [...sourceByCode.values()].sort((a, b) => a.code.localeCompare(b.code)),
  );

  let previousDepartments: DepartmentResult[] = [];
  if (!allMode) {
    try {
      previousDepartments =
        JSON.parse(await readFile(coverageOutput, "utf8")).departments ?? [];
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }
  const selectedUrls = new Set(results.map((entry) => entry.sourceUrl));
  const departmentCoverage = [
    ...previousDepartments.filter(
      (entry) => !selectedUrls.has(entry.sourceUrl),
    ),
    ...results,
  ].sort((a, b) => a.department.localeCompare(b.department));
  const failed = departmentCoverage.filter(
    (entry) => entry.status === "failed",
  );
  const retrieved = departmentCoverage.filter(
    (entry) => entry.status === "retrieved",
  );
  const topicCounts = Object.fromEntries(
    topics.map((topic) => [
      topic,
      next.filter((course) =>
        course.catalogMatches?.some((match) => match.topic === topic),
      ).length,
    ]),
  );
  const coverage = {
    sourceUrl: indexUrl,
    lastChecked: checkDate,
    scope:
      "Graduate catalog courses numbered 5000 and above; explicit topic matches in official titles/descriptions. Academic relevance is interpretive, not an approval decision.",
    status:
      failed.length || retrieved.length < discovered.length
        ? "partial"
        : "complete",
    totalDepartments: discovered.length,
    retrievedDepartments: retrieved.length,
    failedDepartments: failed.map(({ department, sourceUrl, error }) => ({
      department,
      sourceUrl,
      error: error ?? "Unknown retrieval error",
    })),
    totalParsedCourses: retrieved.reduce(
      (sum, entry) => sum + entry.parsedCourses,
      0,
    ),
    matchedCourses: next.filter((course) => course.catalogMatches?.length)
      .length,
    indexedCourses: next.length,
    retainedReviewedCandidates: next
      .filter((course) => !course.catalogMatches?.length)
      .map((course) => course.code),
    topics,
    topicCounts,
    filterVersion: topicRuleVersion,
    refilteredFromStoredSnapshot: Boolean(fromIndex),
    filterAppliedOn: new Date().toISOString().slice(0, 10),
    rules: topicRules
      .filter((rule) => topics.includes(rule.topic))
      .map(({ topic, patterns }) => ({ topic, patterns: [...patterns] })),
    departments: departmentCoverage.map(
      ({
        department,
        title,
        sourceUrl,
        status,
        parsedCourses,
        matchedCourses,
        lastChecked,
        error,
      }) => ({
        department,
        title,
        sourceUrl,
        status,
        parsedCourses,
        matchedCourses,
        lastChecked,
        ...(error ? { error } : {}),
      }),
    ),
  };
  if (dryRun) {
    console.log(
      `Dry run: ${next.length} student-index records (${coverage.matchedCourses} explicit topic matches); ${retrieved.length}/${discovered.length} departments represented; ${failed.length} failures. No files changed.`,
    );
    return;
  }
  if (!retrieved.length)
    throw new Error(
      "No department pages successfully retrieved; existing files were preserved.",
    );
  if (!previousSource.length && retrieved.length !== discovered.length)
    throw new Error(
      "Initial full source-index creation requires every discovered department. Existing index files were preserved.",
    );
  await writeAtomic(output, next);
  await writeAtomic(coverageOutput, coverage);
  await writeAtomic(sourceIndexOutput, fullSource);
  console.log(
    `Saved ${next.length} student-index records, ${fullSource.length} full source records, and coverage metadata (${retrieved.length}/${discovered.length} departments; ${failed.length} failures). Curated records and editorial content were preserved.`,
  );
  if (failed.length) process.exitCode = 1;
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
