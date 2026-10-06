import { mkdir, readFile, writeFile, rename } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { coursesSchema } from "../src/lib/schema";
import { parseCatalogPage } from "./lib/catalog";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const argument = (name: string) => {
  const exact = args.indexOf(name);
  return exact >= 0
    ? args[exact + 1]
    : args.find((arg) => arg.startsWith(`${name}=`))?.slice(name.length + 1);
};
const departments = (
  argument("--departments") ?? "ARE,BIST,CSE,EPSY,GRAD,MKTG,NRE,OPIM,STAT"
)
  .split(",")
  .map((department) => department.trim().toUpperCase())
  .filter(Boolean);
const dryRun = args.includes("--dry-run");
const fromDir = argument("--from-dir");
const checkDate =
  argument("--checked-on") ?? new Date().toISOString().slice(0, 10);
const output = path.resolve(
  root,
  argument("--output") ?? "data/catalog/courses.json",
);

async function main() {
  if (args.includes("--help")) {
    console.log(
      "Refresh a local index of selected UConn graduate departments.\nOptions: --departments STAT,CSE --dry-run --from-dir /path/to/source-snapshots --checked-on YYYY-MM-DD --output data/catalog/courses.json\nOffline files must be named stat.html, cse.html, etc. Never fetches data during application page requests.",
    );
    return;
  }
  if (
    !departments.length ||
    departments.some((department) => !/^[A-Z]{2,6}$/.test(department))
  ) {
    throw new Error("Provide department codes such as STAT,CSE.");
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(checkDate))
    throw new Error("Use YYYY-MM-DD for --checked-on.");
  if (fromDir && !argument("--checked-on")) {
    throw new Error(
      "Offline snapshots require --checked-on with their actual retrieval date.",
    );
  }

  const fetched = [];
  for (const department of [...new Set(departments)]) {
    const url = `https://catalog.uconn.edu/graduate/courses/${department.toLowerCase()}/`;
    let html: string;
    if (fromDir) {
      html = await readFile(
        path.resolve(fromDir, `${department.toLowerCase()}.html`),
        "utf8",
      );
    } else {
      const response = await fetch(url, {
        headers: {
          "User-Agent":
            "MSDS-Curriculum-Explorer/1.0 (local academic metadata refresh)",
        },
        signal: AbortSignal.timeout(30_000),
      });
      if (!response.ok)
        throw new Error(
          `${department}: HTTP ${response.status}. Existing data was not changed.`,
        );
      if (!response.headers.get("content-type")?.includes("text/html"))
        throw new Error(`${department}: expected an HTML catalog page.`);
      html = await response.text();
    }
    const courses = coursesSchema.parse(parseCatalogPage(html, url, checkDate));
    if (!courses.length)
      throw new Error(
        `${department}: no 5000/6000-level courses parsed. Check source format; existing data was not changed.`,
      );
    fetched.push(...courses);
    console.log(`${department}: parsed ${courses.length} graduate courses`);
  }

  // Re-fetching one department retains earlier departments. Student summaries,
  // tags, program membership and pathway mappings remain in separate curated files.
  let previous: ReturnType<typeof coursesSchema.parse> = [];
  try {
    previous = coursesSchema.parse(JSON.parse(await readFile(output, "utf8")));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  const refreshed = new Set(departments);
  const previousByCode = new Map(
    previous.map((course) => [course.code, course]),
  );
  const withEditorialContent = fetched.map((course) => {
    const existing = previousByCode.get(course.code);
    return existing
      ? {
          ...course,
          studentDescription: existing.studentDescription,
          tags: existing.tags,
          capabilities: existing.capabilities,
          pathways: existing.pathways,
          ...(existing.sourceNotes
            ? { sourceNotes: existing.sourceNotes }
            : {}),
        }
      : course;
  });
  const next = [
    ...previous.filter((course) => !refreshed.has(course.department)),
    ...withEditorialContent,
  ].sort((a, b) => a.code.localeCompare(b.code));
  const uniqueCodes = new Set(next.map((course) => course.code));
  if (uniqueCodes.size !== next.length)
    throw new Error(
      "Duplicate course codes detected; existing data was not changed.",
    );
  if (dryRun) {
    console.log(
      `Dry run: ${next.length} records would be written to ${path.relative(root, output)}. No files changed.`,
    );
    return;
  }
  await mkdir(path.dirname(output), { recursive: true });
  const temporary = `${output}.tmp`;
  await writeFile(temporary, `${JSON.stringify(next, null, 2)}\n`, "utf8");
  await rename(temporary, output);
  console.log(
    `Saved ${next.length} catalog records. Curated courses and student descriptions were preserved.`,
  );
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
