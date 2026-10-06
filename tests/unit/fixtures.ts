import type { Course } from "../../src/lib/schema";

/** Fictional courses used only to isolate recommendation behavior in tests. */
export function fixtureCourse(overrides: Partial<Course> = {}): Course {
  return {
    code: "TEST 9901",
    title: "Fictional test methods",
    credits: 3,
    department: "TEST",
    kind: "elective",
    officialDescription: "Fictional course content for unit testing.",
    studentDescription: null,
    prerequisites: null,
    tags: [],
    capabilities: [],
    pathways: [],
    msdsStatus: "catalog-only",
    delivery: "unknown",
    approvalRequired: null,
    sourceUrl: "https://example.test/catalog/test-9901",
    sourceType: "catalog",
    lastChecked: "2026-10-06",
    sourceVerification: "verified",
    ...overrides,
  };
}

export const testCourses = [
  fixtureCourse({
    code: "TEST 9901",
    title: "Predictive Modeling and Time Series",
    tags: [
      "prediction",
      "predictive-modeling",
      "time-series",
      "machine-learning",
    ],
    department: "TEST",
  }),
  fixtureCourse({
    code: "TEST 9902",
    title: "Generative AI for Business Decisions",
    tags: ["generative-ai", "business", "decision-making", "ai-applications"],
    department: "TEST",
  }),
  fixtureCourse({
    code: "TEST 9903",
    title: "Deep Learning and Language Models",
    tags: ["deep-learning", "generative-ai", "nlp", "machine-learning"],
    department: "TEST",
  }),
  fixtureCourse({
    code: "TEST 9904",
    title: "Bayesian Machine Learning",
    tags: [
      "bayesian",
      "machine-learning",
      "uncertainty",
      "advanced-statistics",
    ],
    department: "TEST",
  }),
  fixtureCourse({
    code: "TEST 9905",
    title: "Marketing and Business Analytics",
    tags: ["business", "marketing", "decision-making"],
    department: "TEST",
  }),
  fixtureCourse({
    code: "TEST 9906",
    title: "Environmental Remote Sensing",
    tags: ["environmental", "remote-sensing", "geospatial"],
    department: "TEST",
  }),
];
