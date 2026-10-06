import { describe, expect, it } from "vitest";
import {
  recommendCourses,
  RECOMMENDATION_WEIGHTS,
} from "../../src/lib/recommendations";
import { containsPhrase, normalizeSearch } from "../../src/lib/search";
import { fixtureCourse, testCourses } from "./fixtures";
import { courses } from "../../src/lib/data";

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

  it("prioritizes sports-management domain evidence over generic business management while retaining methods", () => {
    const sportDomain = fixtureCourse({
      code: "TEST 9921",
      title: "Sport Management and Policy",
      tags: ["sports-management", "sport-policy", "athletics"],
    });
    const business = fixtureCourse({
      code: "TEST 9922",
      title: "Business Management",
      tags: ["business", "decision-making", "marketing"],
    });
    const results = recommendCourses(
      "sports management",
      [],
      [business, testCourses[0], sportDomain],
    );
    expect(results[0].course.code).toBe(sportDomain.code);
    expect(results[0].reasons.join(" ")).toMatch(/Matches the sports domain/);
    expect(
      results
        .find(({ course }) => course.code === testCourses[0].code)
        ?.reasons.join(" "),
    ).toMatch(/methods connection/);
    expect(
      recommendCourses("sport management", [], [business, sportDomain])[0]
        .course.code,
    ).toBe(sportDomain.code);
  });

  it("recognizes leadership and kinesiology evidence even without a literal sports title", () => {
    const leadership = fixtureCourse({
      code: "TEST 9923",
      title: "Leadership of Athletic Organizations",
      tags: ["sports-leadership", "athletics"],
    });
    const movement = fixtureCourse({
      code: "TEST 9924",
      title: "Human Movement Instrumentation",
      tags: ["kinesiology"],
    });
    expect(
      recommendCourses("sports leadership", [], [testCourses[0], leadership])[0]
        .course.code,
    ).toBe(leadership.code);
    const results = recommendCourses(
      "kinesiology",
      [],
      [testCourses[0], movement],
    );
    expect(results[0].course.code).toBe(movement.code);
    expect(results[0].matchedTags).toContain("kinesiology");
  });

  it("balances actual sports-analytics methods with actual sports-domain context", () => {
    const leading = recommendCourses("sports analytics", [], courses).slice(
      0,
      3,
    );
    expect(
      leading.some(
        ({ course }) =>
          course.tags.includes("prediction") ||
          course.tags.includes("predictive-modeling"),
      ),
    ).toBe(true);
    expect(
      leading.some(({ course }) => course.tags.includes("time-series")),
    ).toBe(true);
    expect(
      leading.some(({ course }) => course.tags.includes("sports-management")),
    ).toBe(true);
    expect(
      leading.every(
        ({ course }) => !/capstone|current research|thesis/i.test(course.title),
      ),
    ).toBe(true);
  });

  it("ranks generic degree-specific research shells lower while keeping exact code lookup", () => {
    const shell = fixtureCourse({
      code: "TEST 9929",
      title: "Capstone Project in Sport Management",
      tags: ["sports", "sports-management"],
    });
    const candidates = [shell, testCourses[0]];
    const results = recommendCourses("sports analytics", [], candidates);
    expect(results[0].course.code).toBe(testCourses[0].code);
    expect(
      results
        .find(({ course }) => course.code === shell.code)
        ?.reasons.join(" "),
    ).toMatch(/research\/study shell/);
    expect(recommendCourses("TEST 9929", [], candidates)[0].course.code).toBe(
      shell.code,
    );
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
