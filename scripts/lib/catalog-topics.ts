import * as cheerio from "cheerio";
import type { Course } from "../../src/lib/schema";

/** These rules identify explicit text, not academic approval or concentrations. */
export const topicRules = [
  {
    topic: "ai",
    tags: ["artificial-intelligence"],
    patterns: [
      "\\bartificial intelligence\\b",
      "\\bgenerative (?:AI|artificial intelligence)\\b",
      "\\blarge language models?\\b",
      "\\b(?:LLMs?|agentic systems?|retrieval[- ]augmented generation|prompt engineering)\\b",
      "\\bAI\\b",
    ],
  },
  {
    topic: "machine-learning",
    tags: ["machine-learning"],
    patterns: [
      "\\bmachine[- ]learning\\b",
      "\\b(?:deep|reinforcement|statistical|supervised|unsupervised|representation) learning\\b",
      "\\bneural networks?\\b",
      "\\bdata mining\\b",
      "\\bsupport vector machines?\\b",
    ],
  },
  {
    topic: "advanced-statistics",
    tags: ["advanced-statistics"],
    patterns: [
      "\\bBayesian\\b",
      "\\b(?:survival|longitudinal|multivariate|time[- ]series|spatio[- ]temporal|spatial|categorical) (?:data |statistical )?(?:analysis|statistics|models?|modeling|modelling|regression)\\b",
      "\\bcausal inference\\b",
      "\\b(?:statistical inference|mathematical statistics|nonparametric|econometrics|stochastic processes|structural equation|hierarchical (?:linear )?(?:models?|modeling|modelling)|multilevel (?:models?|modeling|modelling)|mixed[- ](?:effects? )?models?|(?:generalized |non)?linear models?|high[- ]dimensional (?:statistics|data|inference))\\b",
      "\\b(?:design of experiments|experimental design|randomized (?:clinical )?trials|statistical learning)\\b",
    ],
  },
  {
    topic: "sports",
    tags: ["sports"],
    patterns: [
      "\\bsports?\\b",
      "\\bathleti(?:c|cs|cism)\\b",
      "\\bathletes?\\b",
      "\\bmotion capture\\b",
      "\\b(?:biomechanical|human movement) (?:analysis|assessment|measurement)\\b",
    ],
  },
] as const;

export type CatalogTopic = (typeof topicRules)[number]["topic"];
export const topicRuleVersion = "2026-10-06.1";

export function discoverDepartments(html: string, indexUrl: string) {
  const $ = cheerio.load(html);
  const found = new Map<
    string,
    { department: string; title: string; sourceUrl: string; slug: string }
  >();
  $("a[href]").each((_, element) => {
    const href = $(element).attr("href");
    if (!href) return;
    let url: URL;
    try {
      url = new URL(href, indexUrl);
    } catch {
      return;
    }
    if (url.origin !== "https://catalog.uconn.edu" || url.search || url.hash)
      return;
    const match = url.pathname.match(/^\/graduate\/courses\/([a-z0-9-]+)\/$/);
    if (!match) return;
    const text = $(element).text().replace(/\s+/g, " ").trim();
    const department =
      text.match(/\(([A-Z]{2,6})\)\s*$/)?.[1] ?? match[1].toUpperCase();
    if (!found.has(url.href))
      found.set(url.href, {
        department,
        title: text,
        sourceUrl: url.href,
        slug: match[1],
      });
  });
  return [...found.values()].sort((a, b) =>
    a.department.localeCompare(b.department),
  );
}

export function matchCatalogTopics(course: Course, topics: readonly string[]) {
  const title = course.title;
  const description = course.officialDescription ?? "";
  // Generic thesis/internship/research shells only qualify if their actual
  // description names a topic; a departmental label alone does not qualify.
  const generic =
    /\b(?:thesis|dissertation|independent study|internship|practicum|supervised research|special topics|investigation of special topics|capstone project)\b/i.test(
      title,
    );
  const haystack = generic ? description : `${title}. ${description}`;
  const matches: { topic: string; evidence: string }[] = [];
  const tags = new Set<string>();
  for (const rule of topicRules) {
    if (!topics.includes(rule.topic)) continue;
    for (const pattern of rule.patterns) {
      const match = haystack.match(new RegExp(pattern, "i"));
      if (!match || match.index === undefined) continue;
      const start = Math.max(0, match.index - 65);
      const end = Math.min(haystack.length, match.index + match[0].length + 85);
      matches.push({
        topic: rule.topic,
        evidence: `${start > 0 ? "…" : ""}${haystack.slice(start, end).trim()}${end < haystack.length ? "…" : ""}`,
      });
      for (const tag of rule.tags) tags.add(tag);
      break;
    }
  }
  if (
    course.department === "KINS" &&
    matches.some((match) => match.topic === "sports")
  )
    tags.add("kinesiology");
  // Add specific tags only when explicitly supported by title/description text.
  const specific: [RegExp, string][] = [
    [/\bgenerative\s+(?:ai|artificial intelligence)\b/i, "generative-ai"],
    [/\bdeep learning\b/i, "deep-learning"],
    [/\breinforcement learning\b/i, "reinforcement-learning"],
    [/\bBayesian\b/i, "bayesian"],
    [/\btime[- ]series\b/i, "time-series"],
    [/\bforecast(?:ing|s)?\b/i, "forecasting"],
    [/\bpredict(?:ion|ive|ing)\b/i, "prediction"],
    [/\bcausal inference\b/i, "causal-inference"],
    [/\bsurvival (?:analysis|data|models?)\b/i, "survival-analysis"],
    [/\blongitudinal\b/i, "longitudinal-data"],
    [/\bspatio[- ]temporal\b/i, "spatio-temporal"],
    [/\bmultivariate\b/i, "multivariate-analysis"],
    [
      /\b(?:sport|sports) (?:management|organizations?|services?|facilities|venue|marketing|administration)\b/i,
      "sports-management",
    ],
    [/\b(?:sport|sports) marketing\b/i, "sport-marketing"],
    [/\bmarketing\b/i, "marketing"],
    [/\bbusiness\b/i, "business"],
    [/\boptimization\b/i, "optimization"],
    [
      /\b(?:text analytics|text mining|natural language processing)\b/i,
      "text-analytics",
    ],
    [/\b(?:ethics|ethical|responsible AI|AI governance)\b/i, "responsible-ai"],
  ];
  for (const [pattern, tag] of specific)
    if (pattern.test(haystack)) tags.add(tag);
  return { matches, tags: [...tags] };
}
