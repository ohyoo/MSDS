import { describe, expect, it } from "vitest";
import {
  discoverDepartments,
  matchCatalogTopics,
  type CatalogTopic,
} from "../../scripts/lib/catalog-topics";
import { fixtureCourse } from "./fixtures";

// Synthetic index and course text are parser fixtures, never official metadata.
const indexUrl = "https://catalog.uconn.edu/graduate/courses/";
const allTopics: CatalogTopic[] = [
  "ai",
  "machine-learning",
  "advanced-statistics",
  "sports",
];

describe("official graduate department discovery", () => {
  it("normalizes relative department links, preserves labels, deduplicates, and sorts", () => {
    const html = `
      <a href="/graduate/courses/mock/">Synthetic Methods (MOCK)</a>
      <a href="test/">Fictional\n Testing (TEST)</a>
      <a href="https://catalog.uconn.edu/graduate/courses/mock/">Duplicate (MOCK)</a>
      <a href="/graduate/courses/example-studies/">Example Studies (EXST)</a>`;

    const departments = discoverDepartments(html, indexUrl);

    expect(departments).toEqual([
      {
        department: "EXST",
        title: "Example Studies (EXST)",
        sourceUrl:
          "https://catalog.uconn.edu/graduate/courses/example-studies/",
        slug: "example-studies",
      },
      {
        department: "MOCK",
        title: "Synthetic Methods (MOCK)",
        sourceUrl: "https://catalog.uconn.edu/graduate/courses/mock/",
        slug: "mock",
      },
      {
        department: "TEST",
        title: "Fictional Testing (TEST)",
        sourceUrl: "https://catalog.uconn.edu/graduate/courses/test/",
        slug: "test",
      },
    ]);
  });

  it("accepts only exact HTTPS graduate department paths on the official host", () => {
    const html = `
      <a href="/graduate/courses/test/">Valid (TEST)</a>
      <a href="https://example.test/graduate/courses/mock/">External (MOCK)</a>
      <a href="https://catalog.uconn.edu.example.test/graduate/courses/mock/">Impersonated (MOCK)</a>
      <a href="http://catalog.uconn.edu/graduate/courses/mock/">HTTP (MOCK)</a>
      <a href="/undergraduate/courses/mock/">Undergraduate (MOCK)</a>
      <a href="/graduate/courses/">Index</a>
      <a href="/graduate/courses/mock/5001/">Individual course</a>
      <a href="/graduate/courses/mock.html">Not a department</a>
      <a href="/graduate/courses/mock">Missing trailing slash</a>
      <a href="/graduate/courses/mock/?preview=1">Query variation</a>
      <a href="/graduate/courses/mock/#fake">Fragment variation</a>
      <a href="javascript:alert('fake')">Script URL</a>
      <a href="mailto:test@example.test">Email</a>`;

    expect(
      discoverDepartments(html, indexUrl).map(({ department }) => department),
    ).toEqual(["TEST"]);
  });

  it("continues discovering real links when an unrelated href is malformed", () => {
    const html = `
      <a href="https://[malformed">Broken link</a>
      <a href="/graduate/courses/test/">Valid (TEST)</a>`;

    expect(discoverDepartments(html, indexUrl)).toHaveLength(1);
    expect(discoverDepartments(html, indexUrl)[0].department).toBe("TEST");
  });
});

describe("evidence-based catalog topic matching", () => {
  it.each([
    {
      title: "Fictional Artificial Intelligence",
      description: "Generative AI applications and large language models.",
      topic: "ai",
      evidence: "Artificial Intelligence",
      tags: ["artificial-intelligence", "generative-ai"],
    },
    {
      title: "Fictional Machine Learning",
      description: "Deep learning and neural networks for prediction.",
      topic: "machine-learning",
      evidence: "Machine Learning",
      tags: ["machine-learning", "deep-learning", "prediction"],
    },
    {
      title: "Fictional Bayesian Methods",
      description: "Bayesian inference for longitudinal data analysis.",
      topic: "advanced-statistics",
      evidence: "Bayesian",
      tags: ["advanced-statistics", "bayesian", "longitudinal-data"],
    },
    {
      title: "Fictional Sports Management",
      description: "Sports organizations, facilities, and marketing.",
      topic: "sports",
      evidence: "Sports",
      tags: ["sports", "sports-management", "marketing"],
    },
  ])(
    "matches explicit $topic text and returns grounded evidence and tags",
    ({ title, description, topic, evidence, tags }) => {
      const course = fixtureCourse({ title, officialDescription: description });

      const result = matchCatalogTopics(course, allTopics);

      expect(result.matches).toEqual([
        { topic, evidence: expect.stringContaining(evidence) },
      ]);
      expect(result.tags).toEqual(expect.arrayContaining(tags));
      // Evidence is an excerpt from the actual title/description, not generated
      // claims based on a department, a keyword tag, or a hoped-for application.
      expect(`${title}. ${description}`).toContain(result.matches[0].evidence);
    },
  );

  it("rejects substrings such as transport and chair as sport or AI evidence", () => {
    const course = fixtureCourse({
      title: "Fictional Transport and Decorative Chair Systems",
      officialDescription:
        "Rail transport, airport infrastructure, scholarship, and repaired classroom furniture.",
      studentDescription: "Artificial intelligence and sports management.",
      tags: ["artificial-intelligence", "machine-learning", "sports"],
      department: "TEST",
    });

    const result = matchCatalogTopics(course, allTopics);

    expect(result.matches).toEqual([]);
    expect(result.tags).toEqual([]);
  });

  it("matches explicit AI shorthand case-insensitively", () => {
    const explicit = fixtureCourse({
      title: "Fictional Topics in Computing",
      officialDescription: "Review ai governance and responsible AI systems.",
    });
    const abbreviation = fixtureCourse({
      title: "Fictional Practical AI",
      officialDescription: "A fictional course about AI.",
    });

    expect(matchCatalogTopics(explicit, allTopics)).toMatchObject({
      matches: [
        { topic: "ai", evidence: expect.stringContaining("ai governance") },
      ],
      tags: expect.arrayContaining([
        "artificial-intelligence",
        "responsible-ai",
      ]),
    });
    expect(matchCatalogTopics(abbreviation, allTopics).matches).toEqual([
      { topic: "ai", evidence: expect.stringContaining("Practical AI") },
    ]);
  });

  it.each([
    [
      "Fictional Machine-learning Methods",
      "machine-learning",
      "machine-learning",
    ],
    ["Fictional Time-series Modeling", "advanced-statistics", "time-series"],
    [
      "Fictional Sport Venue and Event Management",
      "sports",
      "sports-management",
    ],
    ["Fictional Human Movement Measurement", "sports", "sports"],
  ])("recognizes explicit topic variants in %s", (title, topic, tag) => {
    const course = fixtureCourse({ title, officialDescription: null });

    const result = matchCatalogTopics(course, allTopics);

    expect(result.matches).toEqual([
      { topic, evidence: expect.stringContaining(title) },
    ]);
    expect(result.tags).toContain(tag);
  });

  it.each([
    "Fictional Thesis in Machine Learning",
    "Fictional Dissertation in Sports Management",
    "Fictional Independent Study in Artificial Intelligence",
    "Fictional Supervised Research in Bayesian Analysis",
    "Fictional Special Topics in Deep Learning",
    "Fictional Capstone Project in Sports",
    "Fictional Internship in AI Applications",
    "Fictional Practicum in Sports Management",
  ])(
    "excludes generic shells without an explicit topic in their description: %s",
    (title) => {
      const course = fixtureCourse({
        title,
        officialDescription:
          "An individually arranged activity selected in consultation with an instructor.",
      });

      expect(matchCatalogTopics(course, allTopics)).toEqual({
        matches: [],
        tags: [],
      });
    },
  );

  it("includes a generic study shell only when its official description identifies a topic", () => {
    const course = fixtureCourse({
      title: "Fictional Special Topics in Sports",
      officialDescription:
        "Bayesian models and causal inference for an individually chosen investigation.",
    });

    const result = matchCatalogTopics(course, allTopics);

    expect(result.matches).toEqual([
      {
        topic: "advanced-statistics",
        evidence: expect.stringContaining("Bayesian models"),
      },
    ]);
    expect(result.tags).toEqual(
      expect.arrayContaining([
        "advanced-statistics",
        "bayesian",
        "causal-inference",
      ]),
    );
    expect(result.tags).not.toContain("sports");
  });

  it("returns one evidence match per requested topic and deduplicates tags", () => {
    const course = fixtureCourse({
      title: "Fictional AI Applications for Sport Management",
      officialDescription:
        "Artificial intelligence, sports organizations, and machine learning. Deep learning and Bayesian models.",
    });

    const result = matchCatalogTopics(course, ["ai", "sports"]);

    expect(result.matches.map(({ topic }) => topic)).toEqual(["ai", "sports"]);
    expect(result.tags).toEqual(
      expect.arrayContaining([
        "artificial-intelligence",
        "sports",
        "sports-management",
      ]),
    );
    expect(new Set(result.tags).size).toBe(result.tags.length);
    expect(result.tags).not.toContain("machine-learning");
    expect(result.tags).not.toContain("advanced-statistics");
  });

  it("records bounded verbatim evidence around a description match", () => {
    const description = `${"Unrelated fictional background. ".repeat(8)}Machine learning methods.${" Unrelated fictional application.".repeat(8)}`;
    const course = fixtureCourse({
      title: "Fictional Long Description",
      officialDescription: description,
    });

    const result = matchCatalogTopics(course, ["machine-learning"]);

    expect(result.matches).toHaveLength(1);
    const evidence = result.matches[0].evidence;
    expect(evidence.startsWith("…")).toBe(true);
    expect(evidence.endsWith("…")).toBe(true);
    expect(evidence).toContain("Machine learning");
    expect(evidence.length).toBeLessThan(180);
    expect(description).toContain(evidence.slice(1, -1));
  });
});
