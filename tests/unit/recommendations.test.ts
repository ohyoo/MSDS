import { describe, expect, it } from "vitest";
import {
  recommendCourses,
  RECOMMENDATION_WEIGHTS,
} from "../../src/lib/recommendations";
import { containsPhrase, normalizeSearch } from "../../src/lib/search";
import { fixtureCourse, testCourses } from "./fixtures";

describe("local recommendations", () => {
  it("connects sports analytics to useful methods without requiring literal sports wording", () => {
    const matches = recommendCourses(
      "I am interested in sports analytics and prediction",
      [],
      testCourses,
    );
    expect(matches[0].course.code).toBe("TEST 9901");
    expect(matches[0].matchedTags).toContain("time-series");
    expect(matches[0].reasons.join(" ")).toMatch(/sports forecasting/);
    expect(matches.some(({ course }) => course.code === "TEST 9904")).toBe(
      true,
    );
    expect(matches[0].course.title.toLowerCase()).not.toContain("sports");
    expect(
      recommendCourses("sports analytics", [], testCourses)[0].course.code,
    ).toBe("TEST 9901");
  });

  it("rewards combined GenAI and business coverage and retains complementary options", () => {
    const matches = recommendCourses("GenAI and business", [], testCourses);
    expect(matches[0].course.code).toBe("TEST 9902");
    expect(matches[0].reasons.join(" ")).toMatch(/generative AI/);
    expect(matches[0].reasons.join(" ")).toMatch(/business/);
    expect(
      matches.find(({ course }) => course.code === "TEST 9903"),
    ).toBeDefined();
    expect(
      matches.find(({ course }) => course.code === "TEST 9905"),
    ).toBeDefined();
  });

  it("expands interest chips identically to the equivalent free text", () => {
    expect(
      recommendCourses(
        "",
        ["Sports Analytics", "Machine Learning"],
        testCourses,
      ).map(({ course }) => course.code),
    ).toEqual(
      recommendCourses(
        "Sports Analytics Machine Learning",
        [],
        testCourses,
      ).map(({ course }) => course.code),
    );
  });

  it("handles common misspellings through fuzzy course-content search", () => {
    const matches = recommendCourses(
      "bayseian machne lerning",
      [],
      testCourses,
    );
    expect(matches[0].course.code).toBe("TEST 9904");
    expect(matches[0].reasons.join(" ")).toMatch(/fuzzy/);
  });

  it("gives tags more weight than a passing description mention", () => {
    const tagged = fixtureCourse({
      code: "TEST 9911",
      title: "Methods A",
      tags: ["optimization"],
    });
    const incidental = fixtureCourse({
      code: "TEST 9912",
      title: "Methods B",
      officialDescription:
        "This fictional test description briefly discusses optimization.",
    });
    const matches = recommendCourses("optimization", [], [incidental, tagged]);
    expect(matches[0].course.code).toBe(tagged.code);
    expect(RECOMMENDATION_WEIGHTS.tag).toBeGreaterThan(
      RECOMMENDATION_WEIGHTS.description,
    );
  });

  it("keeps course codes searchable, excludes core courses, and leaves no-match queries empty", () => {
    const courses = [
      ...testCourses,
      fixtureCourse({
        code: "TEST 9910",
        kind: "core",
        msdsStatus: "core",
        title: "Machine Learning",
      }),
    ];
    expect(recommendCourses("TEST 9904", [], courses)[0].course.code).toBe(
      "TEST 9904",
    );
    expect(
      recommendCourses("Please show TEST 9904", [], courses)[0].course.code,
    ).toBe("TEST 9904");
    expect(
      recommendCourses("machine learning", [], courses).some(
        ({ course }) => course.code === "TEST 9910",
      ),
    ).toBe(false);
    expect(recommendCourses("zzzzzzzzzz", [], courses)).toEqual([]);
  });

  it("does not fabricate interest explanations for the initial browse state", () => {
    const recommended = fixtureCourse({
      code: "TEST 9911",
      msdsStatus: "recommended",
      curationSourceUrl: "https://example.test/program",
    });
    const matches = recommendCourses("", [], [testCourses[0], recommended]);
    expect(matches[0].course.code).toBe(recommended.code);
    expect(matches[0].reasons[0]).toMatch(/add interests/i);
  });
});

describe("search normalization", () => {
  it("normalizes punctuation, casing, hyphens, and accents", () => {
    expect(normalizeSearch("  Géospatial & Time-Series!  ")).toBe(
      "geospatial and time series",
    );
    expect(containsPhrase("AI-assisted learning", "AI")).toBe(true);
    expect(containsPhrase("chair allocation", "AI")).toBe(false);
  });
});
