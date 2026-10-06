import {
  courses,
  coreCourses,
  electives,
  catalogCourses,
  catalogIndex,
  catalogCoverage,
  pathways,
  capabilities,
  program,
} from "../src/lib/data";

const problems: string[] = [];
const unique = (values: string[], label: string) => {
  if (new Set(values).size !== values.length)
    problems.push(`${label} contains duplicate identifiers.`);
};
unique(
  coreCourses.map((course) => course.code),
  "Core courses",
);
unique(
  electives.map((course) => course.code),
  "Curated electives",
);
unique(
  catalogIndex.map((course) => course.code),
  "Catalog index",
);
unique(
  pathways.map((pathway) => pathway.id),
  "Pathways",
);
unique(
  capabilities.map((capability) => capability.id),
  "Capabilities",
);
unique(
  [...coreCourses, ...electives].map((course) => course.code),
  "Curated course collection",
);

const courseCodes = new Set(courses.map((course) => course.code));
const coreCodes = new Set(coreCourses.map((course) => course.code));
const electiveCodes = new Set(electives.map((course) => course.code));
const catalogCodes = new Set(catalogCourses.map((course) => course.code));
const capabilityIds = new Set(capabilities.map((capability) => capability.id));
const pathwayIds = new Set(pathways.map((pathway) => pathway.id));
for (const course of courses) {
  for (const capability of course.capabilities) {
    if (!capabilityIds.has(capability))
      problems.push(`${course.code}: unknown capability ${capability}`);
  }
  for (const pathway of course.pathways) {
    if (!pathwayIds.has(pathway))
      problems.push(`${course.code}: unknown pathway ${pathway}`);
  }
  unique(course.tags, `${course.code} tags`);
}
for (const pathway of pathways) {
  if (pathway.suggestedCombination) {
    unique(pathway.suggestedCombination, `${pathway.id}.suggestedCombination`);
    for (const code of pathway.suggestedCombination) {
      const course = courses.find((entry) => entry.code === code);
      if (!course || course.kind !== "elective")
        problems.push(
          `${pathway.id}.suggestedCombination: ${code} must reference an existing elective.`,
        );
    }
  }
  const collections = [
    [pathway.coreCourses, coreCodes, "coreCourses"],
    [pathway.electives, electiveCodes, "electives"],
    [pathway.catalogCourses, catalogCodes, "catalogCourses"],
  ] as const;
  for (const [references, available, label] of collections) {
    unique(references, `${pathway.id}.${label}`);
    for (const code of references) {
      if (!courseCodes.has(code) || !available.has(code))
        problems.push(
          `${pathway.id}.${label}: course ${code} is not in the expected collection.`,
        );
    }
  }
}
if (catalogCoverage.indexedCourses !== catalogIndex.length)
  problems.push(
    "Catalog coverage indexedCourses differs from the actual index length.",
  );
if (
  catalogCoverage.matchedCourses !==
  catalogIndex.filter((course) => course.catalogMatches?.length).length
)
  problems.push(
    "Catalog coverage matchedCourses differs from explicitly matched records.",
  );
if (
  catalogCoverage.status === "complete" &&
  (catalogCoverage.retrievedDepartments !== catalogCoverage.totalDepartments ||
    catalogCoverage.failedDepartments.length)
)
  problems.push(
    "Complete coverage requires every discovered department and no retrieval failures.",
  );
const fullSource = coursesSchema.parse(
  JSON.parse(
    readFileSync(
      new URL("../data/catalog/source-index.json", import.meta.url),
      "utf8",
    ),
  ),
);
unique(
  fullSource.map((course) => course.code),
  "Full catalog source snapshot",
);
if (
  catalogCoverage.status === "complete" &&
  fullSource.length !== catalogCoverage.totalParsedCourses
)
  problems.push(
    "Complete catalog coverage must agree with the full normalized source snapshot length.",
  );
const requiredCore = coreCourses.filter((course) => course.kind === "core");
const capstone = coreCourses.filter((course) => course.kind === "capstone");
if (!requiredCore.length || capstone.length !== 1)
  problems.push("Include the required core and exactly one capstone.");
if (requiredCore.every((course) => course.credits !== null)) {
  const sum = requiredCore.reduce(
    (total, course) => total + (course.credits ?? 0),
    0,
  );
  if (sum !== program.credits.core)
    problems.push(
      `Core credits total ${sum}; program data specifies ${program.credits.core}.`,
    );
}
if (
  capstone[0]?.credits !== null &&
  capstone[0]?.credits !== program.credits.capstone
)
  problems.push("Capstone credits disagree with the program structure.");

if (problems.length) {
  console.error(problems.join("\n"));
  process.exitCode = 1;
} else {
  console.log(
    `Data valid: ${coreCourses.length} required courses, ${electives.length} curated electives, ${catalogCourses.length} catalog courses, ${pathways.length} suggested pathways.`,
  );
  const pending = courses.filter(
    (course) => course.sourceVerification === "pending",
  ).length;
  if (pending)
    console.log(
      `Content review: ${pending} course records are awaiting official-source verification. Pending facts remain explicitly unknown.`,
    );
}
import { readFileSync } from "node:fs";
import { coursesSchema } from "../src/lib/schema";
