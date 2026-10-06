import { coreCourses, courses, pathways, program } from "./data";
import { recommendCourses, SPORTS_DOMAIN_TAGS } from "./recommendations";
import type { Course, Pathway } from "./schema";
import { humanizeTag } from "./search";

export type PlanAnalysis = {
  headline: string;
  comments: string[];
  warnings: string[];
  themes: string[];
  suggestedPathway: string | null;
};

const domainTags = new Set([
  "business",
  "business-analytics",
  "marketing",
  "health",
  "biostatistics",
  "bioinformatics",
  "sports",
  "finance",
  "geospatial",
  "environment",
  "environmental",
  "gis",
  ...SPORTS_DOMAIN_TAGS,
]);
const aiTags = new Set([
  "ai",
  "artificial-intelligence",
  "machine-learning",
  "deep-learning",
  "generative-ai",
  "nlp",
  "reinforcement-learning",
]);

export type PathwayProposal = {
  pathway: Pathway;
  courses: Course[];
  capstone: NonNullable<Pathway["capstone"]> | null;
  coreSubstitutionNote: string;
};

/** Prefer the reviewed local combination; never turn a required core into an elective. */
export function proposePathway(
  pathwayId: string,
  candidateCourses: Course[] = courses,
): PathwayProposal | null {
  const pathway = pathways.find((item) => item.id === pathwayId);
  if (!pathway) return null;
  const mappedCodes = new Set([
    ...pathway.electives,
    ...pathway.catalogCourses,
    ...(pathway.suggestedCombination ?? []),
  ]);
  const candidates = [
    ...new Map(
      candidateCourses
        .filter(
          (course) =>
            course.kind === "elective" &&
            (mappedCodes.has(course.code) ||
              course.pathways.includes(pathwayId)),
        )
        .map((course) => [course.code, course]),
    ).values(),
  ];
  const count = Math.min(
    3,
    Math.max(
      2,
      pathway.suggestedCombination?.length ?? pathway.electiveRange?.max ?? 3,
    ),
  );
  const chosen = (pathway.suggestedCombination ?? [])
    .map((code) => candidates.find((course) => course.code === code))
    .filter((course): course is Course => Boolean(course))
    .slice(0, count);
  const ranked = recommendCourses(pathway.title, [], candidates);
  while (chosen.length < count) {
    const usedTags = new Set(chosen.flatMap((course) => course.tags));
    const next = ranked
      .filter(({ course }) => !chosen.some((item) => item.code === course.code))
      .map((item) => ({
        ...item,
        portfolioScore:
          item.score +
          Math.min(
            6,
            item.course.tags.filter((tag) => !usedTags.has(tag)).length * 2,
          ) -
          (item.course.sourceVerification === "pending" ? 10 : 0),
      }))
      .sort(
        (a, b) =>
          b.portfolioScore - a.portfolioScore ||
          a.course.code.localeCompare(b.course.code),
      )[0];
    if (!next) break;
    chosen.push(next.course);
  }
  return {
    pathway,
    courses: chosen,
    capstone: pathway.capstone ?? null,
    coreSubstitutionNote:
      pathway.coreSubstitutionNote ??
      "The recorded core courses remain required. Any potential core substitution is an unconfirmed proposal requiring explicit MSDS program approval; this tool cannot establish course equivalence or waive a requirement.",
  };
}

/** Advisory interpretations of a shortlist, never a formal degree audit. */
export function analyzePlan(selected: Course[]): PlanAnalysis {
  const unique = [
    ...new Map(selected.map((course) => [course.code, course])).values(),
  ];
  if (!unique.length) {
    return {
      headline: "Start with a question you want to answer.",
      comments: [
        `Shortlist electives to compare their skills, applications, and prerequisites. The program's elective component is ${program.credits.electives} credits across ${program.electiveCount} electives.`,
      ],
      warnings: [],
      themes: [],
      suggestedPathway: null,
    };
  }

  const comments: string[] = [];
  const warnings: string[] = [];
  const tagCounts = new Map<string, number>();
  unique.forEach((course) =>
    new Set(course.tags).forEach((tag) =>
      tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1),
    ),
  );
  const sharedTags = [...tagCounts.entries()]
    .filter(([, count]) => count > 1)
    .sort((a, b) => b[1] - a[1])
    .map(([tag]) => tag);
  const allTags = [...tagCounts.keys()];
  const themes = (sharedTags.length ? sharedTags : allTags)
    .slice(0, 6)
    .map(humanizeTag);

  const pathwayScores = pathways
    .map((pathway) => {
      const codes = new Set([...pathway.electives, ...pathway.catalogCourses]);
      const directCount = unique.filter((course) =>
        codes.has(course.code),
      ).length;
      const tagMatches = pathway.tags.filter((tag) => tagCounts.has(tag));
      const coverage = unique.filter(
        (course) =>
          codes.has(course.code) ||
          course.tags.some((tag) => pathway.tags.includes(tag)),
      ).length;
      return {
        pathway,
        score: directCount * 5 + tagMatches.length + coverage * 2,
        coverage,
      };
    })
    .filter((match) => match.score >= 3)
    .sort(
      (a, b) =>
        b.coverage - a.coverage ||
        b.score - a.score ||
        a.pathway.id.localeCompare(b.pathway.id),
    );
  const suggested = pathwayScores[0]?.pathway;

  if (unique.length === 1) {
    comments.push(
      `${unique[0].code} gives your shortlist a starting focus${themes.length ? ` in ${themes.slice(0, 3).join(", ")}` : ""}. Add another candidate to compare depth and breadth.`,
    );
  } else {
    if (sharedTags.length)
      comments.push(
        `Common themes: ${sharedTags.slice(0, 4).map(humanizeTag).join(", ")}. These courses may build depth around the same kinds of problems.`,
      );
    else
      comments.push(
        "The courses emphasize different tagged skills. This can broaden your toolkit; choose a capstone question that gives the combination a clear purpose.",
      );

    let strongestOverlap:
      | { first: Course; second: Course; tags: string[]; ratio: number }
      | undefined;
    for (let i = 0; i < unique.length; i++) {
      for (let j = i + 1; j < unique.length; j++) {
        const firstTags = new Set(unique[i].tags);
        const secondTags = new Set(unique[j].tags);
        const intersection = [...firstTags].filter((tag) =>
          secondTags.has(tag),
        );
        const denominator = Math.min(firstTags.size, secondTags.size);
        const ratio = denominator ? intersection.length / denominator : 0;
        if (
          intersection.length >= 2 &&
          ratio >= 0.6 &&
          (!strongestOverlap || ratio > strongestOverlap.ratio)
        )
          strongestOverlap = {
            first: unique[i],
            second: unique[j],
            tags: intersection,
            ratio,
          };
      }
    }
    if (strongestOverlap)
      comments.push(
        `${strongestOverlap.first.code} and ${strongestOverlap.second.code} share several themes (${strongestOverlap.tags.slice(0, 3).map(humanizeTag).join(", ")}). Compare their official descriptions and assessment approaches before choosing both; shared tags do not prove duplicate content.`,
      );

    const domains = allTags.filter((tag) => domainTags.has(tag));
    const methods = allTags.filter(
      (tag) =>
        aiTags.has(tag) ||
        [
          "optimization",
          "causal-inference",
          "advanced-statistics",
          "time-series",
          "predictive-modeling",
          "prediction",
        ].includes(tag),
    );
    if (domains.length && methods.length)
      comments.push(
        `This combination connects methods (${methods.slice(0, 2).map(humanizeTag).join(", ")}) with applications (${domains.slice(0, 2).map(humanizeTag).join(", ")}). A project using both can make the connection concrete.`,
      );
    else if (
      unique.every((course) => course.tags.some((tag) => aiTags.has(tag)))
    )
      comments.push(
        "This is a focused AI/ML shortlist. It develops technical depth; consider how you will add domain knowledge, causal evaluation, and responsible practice through the core and capstone.",
      );
    else if (new Set(unique.map((course) => course.department)).size > 1)
      comments.push(
        "The shortlist spans departments, which may add different disciplinary perspectives. Department variety alone does not establish complementary content.",
      );
  }

  const connectedCore = coreCourses
    .filter(
      (course) =>
        course.kind === "core" && course.tags.some((tag) => tagCounts.has(tag)),
    )
    .slice(0, 3);
  if (connectedCore.length)
    comments.push(
      `Build on shared foundations in ${connectedCore.map((course) => `${course.code} (${course.title})`).join("; ")}. This is a capability connection, not a prerequisite sequence.`,
    );
  if (suggested)
    comments.push(
      `A possible pathway identity is ${suggested.title}. ${suggested.official ? "Check its documented program requirements." : "This is a suggested exploration pathway, not an official concentration."} Application ideas include ${suggested.applications.slice(0, 2).join("; ").toLowerCase()}.`,
    );

  if (unique.length >= 2 && unique.length <= 3 && suggested) {
    const signature = suggested;
    const topicalCapstone =
      signature.capstone?.title ?? suggested.applications[0];
    comments.push(
      `These ${unique.length} candidates can form an exploratory ${suggested.title} concentration example with a topical capstone${topicalCapstone ? `: ${topicalCapstone}` : ""}. This is a proposed learning combination, not an official or approved concentration.`,
    );
    if (signature.capstone?.questions[0])
      comments.push(
        `Capstone question to explore: ${signature.capstone.questions[0]} The project topic and data access still need supervisor/program confirmation.`,
      );
  }

  if (unique.length > program.electiveCount)
    warnings.push(
      `You have ${unique.length} candidates. Keep this shortlist while exploring, then narrow it to the ${program.electiveCount}-elective / ${program.credits.electives}-credit component with the MSDS program.`,
    );
  if (unique.length === 3)
    warnings.push(
      `A 3-course concentration example extends beyond the current ${program.electiveCount}-elective / ${program.credits.electives}-credit component. A third course or any proposed core substitution needs explicit MSDS program approval; the recorded required core remains unchanged.`,
    );
  if (unique.length === program.electiveCount) {
    if (unique.some((course) => course.credits === null))
      warnings.push(
        "Some credit values are unverified. Confirm the credit total in the current Graduate Catalog.",
      );
    else {
      const total = unique.reduce(
        (sum, course) => sum + (course.credits ?? 0),
        0,
      );
      if (total !== program.credits.electives)
        warnings.push(
          `The recorded credits total ${total}; the elective component is ${program.credits.electives} credits. Confirm the intended courses and credit values with the program.`,
        );
    }
  }
  for (const course of unique) {
    if (
      course.prerequisites &&
      !/^none[.]?$/i.test(course.prerequisites.trim())
    )
      warnings.push(
        `${course.code}: review its catalog prerequisites/enrollment conditions — ${course.prerequisites}`,
      );
    if (course.msdsStatus === "catalog-only")
      warnings.push(
        `${course.code} is a broader-catalog suggestion, not a program-curated MSDS elective; degree applicability needs program confirmation.`,
      );
    if (course.msdsStatus === "specialty")
      warnings.push(
        `${course.code} is a specialty elective; check its prerequisites, consent requirements, and current availability.`,
      );
    if (
      course.approvalRequired === true &&
      course.msdsStatus !== "catalog-only"
    )
      warnings.push(
        `${course.code}: program or instructor approval is required according to the recorded course information. This tool cannot grant approval.`,
      );
    if (course.sourceVerification === "pending")
      warnings.push(
        `${course.code}: official metadata is awaiting source verification; confirm catalog facts before planning enrollment.`,
      );
  }
  warnings.push(
    "This shortlist is planning guidance. Confirm elective selections and current availability with the MSDS program; it does not establish admission, enrollment, or degree approval.",
  );
  return {
    headline:
      unique.length === 1
        ? "One course, a starting direction."
        : sharedTags.length
          ? "A shared theme, with room to go deeper."
          : "Different strengths, one possible journey.",
    comments,
    warnings: [...new Set(warnings)],
    themes,
    suggestedPathway: suggested?.title ?? null,
  };
}
