import { describe, expect, it } from "vitest";
import { analyzePlan, proposePathway } from "../../src/lib/plan";
import { courses } from "../../src/lib/data";
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

  it("connects sports-domain knowledge to methods and a topical capstone", () => {
    const domain = fixtureCourse({
      code: "TEST 9921",
      title: "Sport Management",
      tags: ["sports-management", "sport-policy"],
      pathways: ["sports-analytics"],
    });
    const analysis = analyzePlan([domain, testCourses[0]]);
    expect(analysis.comments.join(" ")).toMatch(/connects methods/);
    expect(analysis.comments.join(" ")).toMatch(/sports management/);
    expect(analysis.comments.join(" ")).toMatch(/topical capstone/);
    expect(analysis.comments.join(" ")).toMatch(
      /not an official or approved concentration/,
    );
  });

  it("treats a three-course concentration example as a proposal beyond the current elective requirement", () => {
    const analysis = analyzePlan(testCourses.slice(0, 3));
    expect(analysis.comments.join(" ")).toMatch(
      /3 candidates.*concentration example/,
    );
    expect(analysis.warnings.join(" ")).toMatch(
      /extends beyond.*2-elective \/ 6-credit/,
    );
    expect(analysis.warnings.join(" ")).toMatch(
      /core substitution needs explicit MSDS program approval/,
    );
    expect(analysis.warnings.join(" ")).toMatch(
      /required core remains unchanged/,
    );
  });

  it("builds signature examples from two or three distinct local electives", () => {
    for (const id of ["ai-machine-learning", "sports-analytics"]) {
      const proposal = proposePathway(id);
      expect(proposal).not.toBeNull();
      expect(proposal!.courses.length).toBeGreaterThanOrEqual(2);
      expect(proposal!.courses.length).toBeLessThanOrEqual(3);
      expect(new Set(proposal!.courses.map((course) => course.code)).size).toBe(
        proposal!.courses.length,
      );
      expect(
        proposal!.courses.every(
          (course) =>
            course.kind === "elective" &&
            courses.some((known) => known.code === course.code),
        ),
      ).toBe(true);
      expect(proposal!.coreSubstitutionNote).toMatch(/approval/i);
      expect(proposal!.pathway.official).toBe(false);
    }
  });
});
