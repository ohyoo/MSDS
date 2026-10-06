import { z } from "zod";

const nonempty = z.string().trim().min(1);
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD");
const identifier = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

export const courseSchema = z
  .object({
    code: z.string().regex(/^[A-Z]{2,6} \d{4}[A-Z]?$/),
    title: nonempty,
    credits: z.number().nonnegative().max(20).nullable(),
    department: z.string().regex(/^[A-Z]{2,6}$/),
    kind: z.enum(["core", "capstone", "elective"]),
    officialDescription: nonempty.nullable(),
    studentDescription: nonempty.nullable(),
    prerequisites: nonempty.nullable(),
    tags: z.array(identifier),
    capabilities: z.array(identifier),
    pathways: z.array(identifier),
    msdsStatus: z.enum([
      "core",
      "capstone",
      "recommended",
      "specialty",
      "catalog-only",
    ]),
    delivery: z.enum(["unknown", "online", "in-person", "varies"]),
    approvalRequired: z.boolean().nullable(),
    sourceUrl: z.string().url(),
    sourceType: z.enum(["catalog", "program", "instructor", "user-provided"]),
    lastChecked: date.nullable(),
    sourceVerification: z.enum(["verified", "pending"]),
    curationSourceUrl: z.string().url().optional(),
    sourceNotes: nonempty.optional(),
    graduateLevel: z.number().int().min(5000).max(9000).optional(),
    catalogMatches: z
      .array(z.object({ topic: identifier, evidence: nonempty }).strict())
      .optional(),
  })
  .strict()
  .superRefine((course, ctx) => {
    if (!course.code.startsWith(`${course.department} `)) {
      ctx.addIssue({
        code: "custom",
        path: ["department"],
        message: "Department must match the course code",
      });
    }
    if (course.sourceVerification === "verified" && !course.lastChecked) {
      ctx.addIssue({
        code: "custom",
        path: ["lastChecked"],
        message: "Verified sources need a check date",
      });
    }
    if (
      course.sourceVerification === "verified" &&
      course.sourceType === "user-provided"
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["sourceVerification"],
        message:
          "User-provided seeds must be checked against an official source",
      });
    }
    if (course.kind !== "elective" && course.msdsStatus !== course.kind) {
      ctx.addIssue({
        code: "custom",
        path: ["msdsStatus"],
        message: "Core and capstone classifications must agree",
      });
    }
    if (
      course.kind === "elective" &&
      ["core", "capstone"].includes(course.msdsStatus)
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["msdsStatus"],
        message: "Electives cannot be classified as required courses",
      });
    }
    if (
      ["recommended", "specialty"].includes(course.msdsStatus) &&
      !course.curationSourceUrl
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["curationSourceUrl"],
        message: "Program-curated electives need a curation source",
      });
    }
  });

export const capabilitySchema = z
  .object({
    id: identifier,
    title: nonempty,
    shortLabel: nonempty,
    description: nonempty,
  })
  .strict();

export const pathwaySchema = z
  .object({
    id: identifier,
    title: nonempty,
    summary: nonempty,
    tags: z.array(identifier),
    coreCourses: z.array(nonempty),
    electives: z.array(nonempty),
    catalogCourses: z.array(nonempty),
    applications: z.array(nonempty),
    careers: z.array(nonempty),
    official: z.boolean(),
    officialSourceUrl: z.string().url().optional(),
    signature: z.boolean().optional(),
    electiveRange: z
      .object({ min: z.literal(2), max: z.literal(3) })
      .strict()
      .optional(),
    suggestedCombination: z.array(nonempty).min(2).max(3).optional(),
    capstone: z
      .object({
        title: nonempty,
        summary: nonempty,
        questions: z.array(nonempty).min(1),
      })
      .strict()
      .optional(),
    coreSubstitutionNote: nonempty.optional(),
  })
  .strict()
  .superRefine((pathway, ctx) => {
    if (pathway.official && !pathway.officialSourceUrl) {
      ctx.addIssue({
        code: "custom",
        path: ["officialSourceUrl"],
        message: "Official concentrations need program documentation",
      });
    }
  });

export const programSchema = z
  .object({
    name: nonempty,
    credits: z
      .object({
        total: z.number().int().positive(),
        core: z.number().int().positive(),
        electives: z.number().int().positive(),
        capstone: z.number().int().positive(),
      })
      .strict(),
    electiveCount: z.number().int().positive(),
    disclaimer: nonempty,
    sourceUrl: z.string().url(),
    lastChecked: date.nullable(),
    sourceVerification: z.enum(["verified", "pending"]),
  })
  .strict()
  .superRefine((program, ctx) => {
    if (
      program.credits.total !==
      program.credits.core +
        program.credits.electives +
        program.credits.capstone
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["credits"],
        message: "Credit components must equal the program total",
      });
    }
  });

const departmentCoverageSchema = z
  .object({
    department: nonempty,
    title: nonempty,
    sourceUrl: z.string().url(),
    status: z.enum(["retrieved", "failed"]),
    parsedCourses: z.number().int().nonnegative(),
    matchedCourses: z.number().int().nonnegative(),
    lastChecked: date,
    error: nonempty.optional(),
  })
  .strict();

export const catalogCoverageSchema = z
  .object({
    sourceUrl: z.string().url(),
    lastChecked: date,
    scope: nonempty,
    status: z.enum(["complete", "partial"]),
    totalDepartments: z.number().int().positive(),
    retrievedDepartments: z.number().int().nonnegative(),
    failedDepartments: z.array(
      z
        .object({
          department: nonempty,
          sourceUrl: z.string().url(),
          error: nonempty,
        })
        .strict(),
    ),
    totalParsedCourses: z.number().int().nonnegative(),
    matchedCourses: z.number().int().nonnegative(),
    indexedCourses: z.number().int().nonnegative(),
    retainedReviewedCandidates: z.array(nonempty),
    topics: z.array(identifier),
    topicCounts: z.record(identifier, z.number().int().nonnegative()),
    filterVersion: nonempty,
    refilteredFromStoredSnapshot: z.boolean().optional(),
    filterAppliedOn: date.optional(),
    rules: z.array(
      z.object({ topic: identifier, patterns: z.array(nonempty) }).strict(),
    ),
    departments: z.array(departmentCoverageSchema),
  })
  .strict();

export type Course = z.infer<typeof courseSchema>;
export type Capability = z.infer<typeof capabilitySchema>;
export type Pathway = z.infer<typeof pathwaySchema>;
export type Program = z.infer<typeof programSchema>;
export type CatalogCoverage = z.infer<typeof catalogCoverageSchema>;

export const coursesSchema = z.array(courseSchema);
export const capabilitiesSchema = z.array(capabilitySchema);
export const pathwaysSchema = z.array(pathwaySchema);
