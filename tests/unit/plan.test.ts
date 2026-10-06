import { describe, expect, it } from "vitest";
import { analyzePlan } from "../../src/lib/plan";
import { fixtureCourse, testCourses } from "./fixtures";

describe("elective shortlist analysis", () => {
  it("starts with program-sized planning guidance", () => {
    const analysis = analyzePlan([]);
    expect(analysis.suggestedPathway).toBeNull();
    expect(analysis.comments.join(" ")).toContain("6 credits");
  });

  it("distinguishes focused overlap from proven duplicate content", () => {
    const first = fixtureCourse({
      code: "TEST 9911",
      tags: ["machine-learning", "deep-learning", "generative-ai"],
    });
    const second = fixtureCourse({
      code: "TEST 9912",
      tags: ["machine-learning", "deep-learning", "nlp"],
    });
    const analysis = analyzePlan([first, second]);
    expect(analysis.themes).toContain("machine learning");
    expect(analysis.comments.join(" ")).toMatch(/do not prove duplicate/);
    expect(analysis.comments.join(" ")).toMatch(/domain knowledge/);
    expect(analysis.suggestedPathway).toBe("AI & Machine Learning");
  });

  it("explains methods plus business application breadth", () => {
    const analysis = analyzePlan([testCourses[2], testCourses[4]]);
    expect(analysis.comments.join(" ")).toMatch(/connects methods/);
    expect(analysis.comments.join(" ")).toMatch(/business/);
    expect(analysis.warnings.join(" ")).toMatch(
      /does not establish.*degree approval/,
    );
  });

  it("flags unknown credits, prerequisites, and broader-catalog eligibility", () => {
    const first = fixtureCourse({
      code: "TEST 9911",
      credits: null,
      prerequisites: "Instructor consent and prior computing coursework.",
      sourceVerification: "pending",
      lastChecked: null,
    });
    const analysis = analyzePlan([first, testCourses[0]]);
    expect(analysis.warnings.join(" ")).toMatch(/credit values are unverified/);
    expect(analysis.warnings.join(" ")).toMatch(/Instructor consent/);
    expect(analysis.warnings.join(" ")).toMatch(/broader-catalog suggestion/);
    expect(analysis.warnings.join(" ")).toMatch(/awaiting source verification/);
  });

  it("allows more than two candidates while prompting a later narrowing decision", () => {
    const analysis = analyzePlan(testCourses.slice(0, 3));
    expect(analysis.warnings.join(" ")).toMatch(/3 candidates/);
    expect(analysis.warnings.join(" ")).toMatch(/2-elective \/ 6-credit/);
  });

  it("deduplicates repeated selections rather than double-counting credits", () => {
    expect(analyzePlan([testCourses[0], testCourses[0]]).headline).toBe(
      "One course, a starting direction.",
    );
  });
});
