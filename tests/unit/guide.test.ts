import { describe, expect, it } from "vitest";
import { answerGuide } from "../../src/lib/guide";
import { coreCourses, program } from "../../src/lib/data";
import { testCourses } from "./fixtures";

describe("grounded deterministic curriculum guide", () => {
  it("refuses to infer semester availability or promise enrollment", () => {
    const result = answerGuide(
      "Is CSE 5709 offered next spring? Can I enroll?",
    );
    expect(result.answer).toMatch(
      /does not contain current semester schedules/,
    );
    expect(result.answer).toMatch(/cannot promise enrollment/);
    expect(
      result.sources.some((source) => source.url === program.sourceUrl),
    ).toBe(true);
  });

  it("does not approve an individual degree plan", () => {
    const result = answerGuide(
      "Are these approved and will they count toward my degree?",
      testCourses.slice(0, 2),
    );
    expect(result.answer).toMatch(/cannot establish degree approval/);
    expect(result.answer).toMatch(/MSDS program\/advisor/);
    expect(result.sources.length).toBeGreaterThan(0);
  });

  it("compares named core courses with their recorded sources", () => {
    const result = answerGuide(
      "What is the difference between STAT 5405 and CSE 5709?",
    );
    expect(result.answer).toContain("STAT 5405");
    expect(result.answer).toContain("CSE 5709");
    expect(result.answer).toMatch(/not a formal prerequisite sequence/);
    expect(
      result.sources.some(
        (source) =>
          source.url ===
          coreCourses.find((course) => course.code === "STAT 5405")?.sourceUrl,
      ),
    ).toBe(true);
    expect(result.suggestedCourses).toEqual(
      expect.arrayContaining(["STAT 5405", "CSE 5709"]),
    );
  });

  it("explains causal reasoning as a core capability without inventing course ordering", () => {
    const result = answerGuide(
      "How does causal inference fit into the curriculum?",
    );
    expect(result.answer).toContain("EPSY 5641");
    expect(result.answer).toMatch(/predicting an outcome/);
    expect(result.answer).toMatch(/not a mandatory course order/);
    expect(result.sources.length).toBeGreaterThan(0);
  });

  it("uses the selected shortlist for an overlap question", () => {
    const result = answerGuide(
      "Do these two electives overlap too much?",
      testCourses.slice(1, 3),
    );
    expect(result.answer).toMatch(/Common themes/);
    expect(result.answer).toMatch(/not formal academic approval/);
    expect(result.suggestedCourses).toEqual(["TEST 9902", "TEST 9903"]);
  });

  it("answers the credit structure from program data", () => {
    const result = answerGuide("How many credits are required?");
    expect(result.answer).toContain(`${program.credits.total} credits`);
    expect(result.answer).toContain(`${program.credits.core} core`);
    expect(result.answer).toContain("not official concentrations");
  });

  it("has a useful no-match response without requesting student personal information", () => {
    const result = answerGuide("zzzzzzzzzz");
    expect(result.suggestedCourses).toEqual([]);
    expect(result.answer).toMatch(/more specific interest/);
    expect(result.answer).not.toMatch(/name|email|student id/i);
  });

  it("does not substitute invented facts for a course outside the local index", () => {
    const result = answerGuide("What is TEST 9999?");
    expect(result.answer).toMatch(/cannot provide a grounded description/);
    expect(result.suggestedCourses).toEqual([]);
    expect(
      result.sources.some(
        (source) =>
          source.url === "https://catalog.uconn.edu/graduate/courses/",
      ),
    ).toBe(true);
  });
});
