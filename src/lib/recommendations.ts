import Fuse from "fuse.js";
import type { Course } from "./schema";
import {
  containsPhrase,
  humanizeTag,
  normalizeSearch,
  searchTerms,
} from "./search";

export type Recommendation = {
  course: Course;
  score: number;
  reasons: string[];
  matchedTags: string[];
};

/** Published so the interface and maintainers can explain the ranking. */
export const RECOMMENDATION_WEIGHTS = {
  tag: 8,
  title: 6,
  pathway: 5,
  description: 2,
  department: 2,
  interestCoverage: 4,
  fuzzy: 3,
  programCurated: 0.5,
  sportsDomain: 6,
  sportsSpecificity: 8,
  sportsMethodsPortfolio: 8,
  sportsContextPortfolio: 4,
  researchShellPenalty: 12,
} as const;

export const SPORTS_DOMAIN_TAGS = new Set([
  "sports",
  "sport",
  "sports-management",
  "sport-management",
  "sports-leadership",
  "sport-leadership",
  "athletics",
  "sport-policy",
  "sports-policy",
  "sports-marketing",
  "sport-marketing",
  "kinesiology",
  "sports-governance",
  "sport-governance",
]);

const sportsMethodTags = new Set([
  "prediction",
  "predictive-modeling",
  "machine-learning",
  "time-series",
  "forecasting",
  "causal-inference",
  "optimization",
]);

function isResearchShell(course: Course): boolean {
  return /\b(capstone|thesis|dissertation|independent study|independent studies|directed study|directed studies|current research)\b/.test(
    normalizeSearch(course.title),
  );
}

type InterestGroup = {
  id: string;
  label: string;
  aliases: string[];
  concepts: string[];
};

/** These are educational connections, not course requirements or approval rules. */
export const INTEREST_GROUPS: InterestGroup[] = [
  {
    id: "generative-ai",
    label: "generative AI",
    aliases: [
      "generative ai",
      "genai",
      "gen ai",
      "llm",
      "llms",
      "large language models",
    ],
    concepts: [
      "generative-ai",
      "genai",
      "large-language-models",
      "nlp",
      "natural-language-processing",
      "deep-learning",
      "machine-learning",
      "ai",
    ],
  },
  {
    id: "machine-learning",
    label: "machine learning",
    aliases: [
      "machine learning",
      "ml",
      "artificial intelligence",
      "ai",
      "predictive modeling",
      "prediction",
    ],
    concepts: [
      "machine-learning",
      "predictive-modeling",
      "prediction",
      "deep-learning",
      "ai",
      "artificial-intelligence",
      "data-mining",
    ],
  },
  {
    id: "deep-learning",
    label: "deep learning",
    aliases: ["deep learning", "neural networks"],
    concepts: ["deep-learning", "neural-networks", "machine-learning", "ai"],
  },
  {
    id: "sports",
    label: "sports analytics",
    aliases: [
      "sport",
      "sports",
      "sports analytics",
      "athletics",
      "sports management",
      "sport management",
      "sports leadership",
      "sport leadership",
      "kinesiology",
    ],
    concepts: [
      "sports",
      "sport",
      "sports-management",
      "sport-management",
      "sports-leadership",
      "sport-leadership",
      "athletics",
      "sport-policy",
      "sports-policy",
      "sports-marketing",
      "sport-marketing",
      "kinesiology",
      "sport-governance",
      "predictive-modeling",
      "prediction",
      "time-series",
      "forecasting",
      "machine-learning",
      "causal-inference",
      "optimization",
      "decision-making",
      "visualization",
    ],
  },
  {
    id: "business",
    label: "business and decision analytics",
    aliases: [
      "business",
      "business analytics",
      "decision analytics",
      "marketing",
      "management",
    ],
    concepts: [
      "business",
      "business-analytics",
      "decision-making",
      "marketing",
      "marketing-analytics",
      "optimization",
      "predictive-modeling",
      "causal-inference",
      "communication",
      "ai-applications",
    ],
  },
  {
    id: "finance",
    label: "finance",
    aliases: ["finance", "financial", "investing", "risk"],
    concepts: [
      "finance",
      "financial-analytics",
      "time-series",
      "forecasting",
      "risk",
      "optimization",
      "predictive-modeling",
    ],
  },
  {
    id: "health",
    label: "health and biostatistics",
    aliases: [
      "health",
      "biostatistics",
      "biology",
      "biomedical",
      "medical",
      "clinical",
      "bioinformatics",
    ],
    concepts: [
      "health",
      "biostatistics",
      "survival-analysis",
      "survival",
      "longitudinal-data",
      "longitudinal",
      "categorical-data",
      "causal-inference",
      "bioinformatics",
    ],
  },
  {
    id: "causal",
    label: "causal inference",
    aliases: [
      "causal",
      "causality",
      "causal inference",
      "experiments",
      "evaluation",
    ],
    concepts: [
      "causal-inference",
      "causal-reasoning",
      "evaluation",
      "experimental-design",
      "measurement",
    ],
  },
  {
    id: "statistics",
    label: "advanced statistics",
    aliases: [
      "advanced statistics",
      "statistics",
      "statistical",
      "bayesian",
      "uncertainty",
    ],
    concepts: [
      "advanced-statistics",
      "statistical-modeling",
      "statistics",
      "bayesian",
      "uncertainty",
      "inference",
    ],
  },
  {
    id: "time-series",
    label: "time series and forecasting",
    aliases: ["time series", "forecasting", "temporal"],
    concepts: ["time-series", "forecasting", "spatio-temporal", "prediction"],
  },
  {
    id: "geospatial",
    label: "geospatial analytics",
    aliases: ["geospatial", "gis", "spatial", "remote sensing", "geography"],
    concepts: [
      "geospatial",
      "gis",
      "spatial",
      "spatial-analysis",
      "remote-sensing",
      "spatio-temporal",
    ],
  },
  {
    id: "environment",
    label: "environmental data",
    aliases: [
      "environment",
      "environmental",
      "climate",
      "ecology",
      "sustainability",
    ],
    concepts: [
      "environment",
      "environmental",
      "environmental-data",
      "geospatial",
      "remote-sensing",
      "spatial",
      "spatio-temporal",
    ],
  },
  {
    id: "cybersecurity",
    label: "cybersecurity",
    aliases: ["cybersecurity", "cyber security", "security"],
    concepts: ["cybersecurity", "security", "networks", "systems"],
  },
  {
    id: "optimization",
    label: "optimization",
    aliases: ["optimization", "optimisation", "operations research"],
    concepts: [
      "optimization",
      "algorithms",
      "operations-research",
      "decision-making",
    ],
  },
  {
    id: "nlp",
    label: "NLP and text analytics",
    aliases: [
      "nlp",
      "natural language",
      "text analytics",
      "text mining",
      "language",
    ],
    concepts: [
      "nlp",
      "natural-language-processing",
      "text-analytics",
      "text-mining",
      "generative-ai",
      "deep-learning",
    ],
  },
  {
    id: "computing",
    label: "computing and data engineering",
    aliases: [
      "data engineering",
      "computing",
      "systems",
      "programming",
      "distributed",
      "high performance",
      "algorithms",
    ],
    concepts: [
      "data-engineering",
      "computing",
      "programming",
      "algorithms",
      "high-performance-computing",
      "distributed-systems",
      "systems",
      "databases",
    ],
  },
];

function interestGroups(text: string): InterestGroup[] {
  const normalized = normalizeSearch(text);
  // A phrase such as “generative AI” is one interest; its embedded “AI” must
  // not silently count as a second independent interest-coverage bonus.
  const withoutGenerativePhrase = normalized.replace(
    /\b(generative ai|gen ai)\b/g,
    " ",
  );
  const withoutSportsBusinessPhrase = normalized.replace(
    /\bsports? (management|leadership|marketing|policy)\b/g,
    " ",
  );
  return INTEREST_GROUPS.filter((group) =>
    group.aliases.some((alias) =>
      containsPhrase(
        group.id === "machine-learning"
          ? withoutGenerativePhrase
          : group.id === "business"
            ? withoutSportsBusinessPhrase
            : normalized,
        alias,
      ),
    ),
  );
}

function matchConcept(
  course: Course,
  concept: string,
): { score: number; tags: string[]; source: string } {
  const tags = course.tags.filter(
    (tag) => normalizeSearch(tag) === normalizeSearch(concept),
  );
  if (tags.length)
    return { score: RECOMMENDATION_WEIGHTS.tag, tags, source: "course tags" };
  if (containsPhrase(course.title, concept))
    return {
      score: RECOMMENDATION_WEIGHTS.title,
      tags: [],
      source: "course title",
    };
  if (course.pathways.some((pathway) => containsPhrase(pathway, concept)))
    return {
      score: RECOMMENDATION_WEIGHTS.pathway,
      tags: [],
      source: "pathway mapping",
    };
  const description = `${course.officialDescription ?? ""} ${course.studentDescription ?? ""}`;
  if (containsPhrase(description, concept))
    return {
      score: RECOMMENDATION_WEIGHTS.description,
      tags: [],
      source: "course description",
    };
  if (containsPhrase(course.department, concept))
    return {
      score: RECOMMENDATION_WEIGHTS.department,
      tags: [],
      source: "department",
    };
  return { score: 0, tags: [], source: "" };
}

/**
 * Pure local search. Each interest contributes its strongest match, a small bonus
 * for supporting concepts, and a coverage bonus. Fuzzy matching only adds evidence
 * from course content. A tiny curated-list bonus breaks otherwise similar matches;
 * approval, availability, and delivery never increase relevance.
 */
export function recommendCourses(
  query: string,
  interests: string[],
  courses: Course[],
): Recommendation[] {
  const text = [query, ...interests].join(" ");
  const normalized = normalizeSearch(text);
  const groups = interestGroups(text);
  const sportsFocus = containsPhrase(text, "kinesiology")
    ? "kinesiology"
    : (/\bsports? (management|leadership|marketing|policy)\b/.exec(
        normalized,
      )?.[1] ?? null);
  const terms = searchTerms(text);
  const electiveCourses = courses.filter(
    (course) => course.kind === "elective",
  );
  const fuse = new Fuse(electiveCourses, {
    includeScore: true,
    threshold: 0.36,
    ignoreLocation: true,
    minMatchCharLength: 3,
    keys: [
      { name: "code", weight: 0.1 },
      { name: "title", weight: 0.3 },
      { name: "tags", weight: 0.3 },
      { name: "studentDescription", weight: 0.1 },
      { name: "officialDescription", weight: 0.1 },
      { name: "pathways", weight: 0.07 },
      { name: "department", weight: 0.03 },
    ],
  });
  const fuzzyMatches = new Map<string, { strongest: number; total: number }>();
  const fuzzyTerms = [...new Set([normalized, ...terms])].filter(
    (term) => term.length >= 3,
  );
  for (const term of fuzzyTerms) {
    for (const result of fuse.search(term)) {
      const evidence = 1 - (result.score ?? 1);
      const previous = fuzzyMatches.get(result.item.code) ?? {
        strongest: 0,
        total: 0,
      };
      fuzzyMatches.set(result.item.code, {
        strongest: Math.max(previous.strongest, evidence),
        total: previous.total + evidence,
      });
    }
  }

  const results = electiveCourses
    .map((course): Recommendation => {
      let score = 0;
      const reasons: string[] = [];
      const matchedTags = new Set<string>();
      for (const group of groups) {
        const matches = group.concepts
          .map((concept, index) => {
            const match = matchConcept(course, concept);
            // The direct concept carries full weight; related tools carry 65%.
            const direct = containsPhrase(text, concept) || index === 0;
            return {
              ...match,
              concept,
              weightedScore: match.score * (direct ? 1 : 0.65),
            };
          })
          .filter((match) => match.score > 0)
          .sort((a, b) => b.weightedScore - a.weightedScore);
        if (!matches.length) continue;
        score +=
          matches[0].weightedScore +
          Math.min(
            3,
            matches
              .slice(1)
              .reduce((sum, match) => sum + match.weightedScore * 0.2, 0),
          ) +
          RECOMMENDATION_WEIGHTS.interestCoverage;
        matches.forEach((match) =>
          match.tags.forEach((tag) => matchedTags.add(tag)),
        );
        const skills =
          [
            ...new Set(
              matches
                .filter((match) => match.source !== "pathway mapping")
                .slice(0, 3)
                .map((match) => humanizeTag(match.concept)),
            ),
          ].join(", ") || "Related curriculum themes";
        const sportsDomain =
          group.id === "sports" &&
          matches.some(
            (match) =>
              SPORTS_DOMAIN_TAGS.has(match.concept) &&
              (match.source === "course tags" ||
                match.source === "course title"),
          );
        if (sportsDomain && sportsFocus)
          score += RECOMMENDATION_WEIGHTS.sportsDomain;
        const sportsSpecific =
          group.id === "sports" &&
          sportsFocus &&
          (sportsFocus === "kinesiology"
            ? course.department === "KINS" ||
              course.tags.includes("kinesiology")
            : containsPhrase(course.title, sportsFocus) ||
              course.tags.some((tag) => containsPhrase(tag, sportsFocus)));
        if (sportsSpecific) {
          score += RECOMMENDATION_WEIGHTS.sportsSpecificity;
          reasons.push(
            `Direct ${sportsFocus} evidence in ${course.department === "KINS" && sportsFocus === "kinesiology" ? "the Kinesiology department" : "the course title or tags"} adds specificity to your sports interest.`,
          );
        }
        reasons.push(
          sportsDomain
            ? `Matches the sports domain through ${skills} (${matches[0].source}). Pair domain knowledge with prediction, evaluation, or decision methods for an analytics pathway.`
            : group.id === "sports"
              ? `${skills[0].toUpperCase()}${skills.slice(1)} can support sports forecasting or performance decisions; this is a methods connection, not a sports-specific course claim.`
              : `Matches ${group.label} through ${skills} (${matches[0].source}).`,
        );
      }

      // Preserve exact code/title and arbitrary text queries outside curated interests.
      const directMatches = terms
        .map((term) => ({ term, ...matchConcept(course, term) }))
        .filter((match) => match.score > 0);
      if (containsPhrase(normalized, course.code) && normalized) {
        score += 20;
        reasons.unshift("Exact course-code match.");
      }
      if (directMatches.length && groups.length === 0) {
        score += directMatches.reduce((sum, match) => sum + match.score, 0);
        directMatches.forEach((match) =>
          match.tags.forEach((tag) => matchedTags.add(tag)),
        );
        reasons.push(
          `Matches ${directMatches
            .slice(0, 3)
            .map((match) => match.term)
            .join(", ")} in course content.`,
        );
      }
      const fuzzyEvidence = fuzzyMatches.get(course.code);
      // Matching multiple query terms matters; a single generic word must not beat
      // a course matching an entire misspelled phrase.
      const fuzzy = fuzzyEvidence
        ? fuzzyEvidence.strongest * 0.5 +
          (fuzzyEvidence.total / Math.max(1, fuzzyTerms.length)) * 0.5
        : 0;
      if (fuzzy > 0) {
        score += fuzzy * RECOMMENDATION_WEIGHTS.fuzzy;
        if (!reasons.length)
          reasons.push(
            "Similar wording in the course title, tags, or description; fuzzy search also handles small spelling differences.",
          );
      }
      if (!normalized) {
        reasons.push(
          course.msdsStatus === "recommended"
            ? "On the MSDS recommended elective list; add interests to personalize the ranking."
            : "Explore this elective, then add interests to personalize the ranking.",
        );
        score =
          course.msdsStatus === "recommended"
            ? 2
            : course.msdsStatus === "specialty"
              ? 1
              : 0.5;
      } else if (score > 0 && course.msdsStatus === "recommended") {
        score += RECOMMENDATION_WEIGHTS.programCurated;
      }
      if (
        score > 0 &&
        isResearchShell(course) &&
        !containsPhrase(normalized, course.code)
      ) {
        score = Math.max(
          0.1,
          score - RECOMMENDATION_WEIGHTS.researchShellPenalty,
        );
        reasons.push(
          "Ranked lower because this is a capstone, thesis, or research/study shell rather than a standard taught elective; check its program-specific eligibility and project arrangements.",
        );
      }
      return {
        course,
        score: Math.round(score * 100) / 100,
        reasons,
        matchedTags: [...matchedTags],
      };
    })
    .filter((recommendation) => recommendation.score > 0)
    .sort(
      (a, b) => b.score - a.score || a.course.code.localeCompare(b.course.code),
    );

  // A broad sports-analytics request needs both useful analytical tools and a
  // domain perspective. Give the best two methods and one taught domain course
  // explicit, bounded portfolio bonuses; domain-specific requests use evidence
  // specificity above instead. Shell courses remain indexed but get no bonus.
  if (groups.some((group) => group.id === "sports") && !sportsFocus) {
    const methodCandidates = results.filter(
      ({ course }) =>
        !isResearchShell(course) &&
        !course.tags.some((tag) => SPORTS_DOMAIN_TAGS.has(tag)) &&
        course.tags.some((tag) => sportsMethodTags.has(tag)),
    );
    const methods = methodCandidates.slice(0, 1);
    const firstMethodTags = new Set(
      methods[0]?.course.tags.filter((tag) => sportsMethodTags.has(tag)) ?? [],
    );
    const complementaryMethod = methodCandidates
      .slice(1)
      .map((item) => ({
        item,
        selectionScore:
          item.score +
          Math.min(
            6,
            item.course.tags.filter(
              (tag) => sportsMethodTags.has(tag) && !firstMethodTags.has(tag),
            ).length * 3,
          ),
      }))
      .sort(
        (a, b) =>
          b.selectionScore - a.selectionScore ||
          a.item.course.code.localeCompare(b.item.course.code),
      )[0]?.item;
    if (complementaryMethod) methods.push(complementaryMethod);
    const context = results.find(
      ({ course }) =>
        !isResearchShell(course) &&
        course.tags.some((tag) => SPORTS_DOMAIN_TAGS.has(tag)),
    );
    for (const method of methods) {
      method.score =
        Math.round(
          (method.score + RECOMMENDATION_WEIGHTS.sportsMethodsPortfolio) * 100,
        ) / 100;
      method.reasons.push(
        "A sports-analytics portfolio bonus highlights a leading analytical-methods option alongside domain context.",
      );
    }
    if (context) {
      context.score =
        Math.round(
          (context.score + RECOMMENDATION_WEIGHTS.sportsContextPortfolio) * 100,
        ) / 100;
      context.reasons.push(
        "A sports-context portfolio bonus highlights one taught domain option alongside analytical methods.",
      );
    }
    results.sort(
      (a, b) => b.score - a.score || a.course.code.localeCompare(b.course.code),
    );
  }
  return results;
}
