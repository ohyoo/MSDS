import { coreCourses, courses, program } from "./data";
import { analyzePlan } from "./plan";
import { recommendCourses } from "./recommendations";
import type { Course } from "./schema";
import { normalizeSearch } from "./search";

export type GuideResponse = {
  answer: string;
  sources: { label: string; url: string }[];
  suggestedCourses: string[];
};

function sourcesFor(selected: Course[] = []): GuideResponse["sources"] {
  const sources = [
    { label: "UConn MSDS program requirements", url: program.sourceUrl },
    ...selected.map((course) => ({
      label: `${course.code}: ${course.sourceType === "catalog" ? "Graduate Catalog" : "recorded course source"}`,
      url: course.sourceUrl,
    })),
  ];
  return [
    ...new Map(
      sources.map((source) => [`${source.label}|${source.url}`, source]),
    ).values(),
  ];
}

function summarizeCourse(course: Course): string {
  const studentSummary = course.studentDescription
    ? `Student-facing interpretation: ${course.studentDescription}`
    : "A student-facing summary is not available.";
  const facts = course.officialDescription
    ? `Catalog description: ${course.officialDescription}`
    : "The official catalog description is awaiting verification; consult the linked source.";
  const prerequisite = course.prerequisites
    ? `Recorded prerequisite/enrollment conditions: ${course.prerequisites}`
    : "Prerequisite/enrollment conditions are not verified in this dataset.";
  return `${course.code} — ${course.title}. ${studentSummary} ${facts} ${prerequisite}`;
}

/**
 * A grounded, rules-based guide requiring no account, student profile, or AI key.
 * Responses are derived only from local course/pathway/program records. This is
 * also the safe fallback for an optional server-side provider integration.
 */
export function answerGuide(
  question: string,
  selected: Course[] = [],
): GuideResponse {
  const normalized = normalizeSearch(question);
  const mentionedCodes = [
    ...question.toUpperCase().matchAll(/\b([A-Z]{2,6})[\s-]*(\d{4}[A-Z]?)\b/g),
  ].map((match) => `${match[1]} ${match[2]}`);
  const mentionedCourses = courses.filter((course) =>
    mentionedCodes.includes(course.code),
  );
  const discussionCourses = mentionedCourses.length
    ? mentionedCourses
    : selected;
  const availability =
    /\b(semester|fall|spring|summer|winter|schedule|offered|offerings|availability|available|enroll|enrollment|seat|seats)\b/.test(
      normalized,
    );
  const approval =
    /\b(approved|approval|guarantee|guaranteed|count toward|count towards|counts toward|counts towards|will count|can i take|allowed to take|fulfill|fulfil|satisfy|eligible|eligibility|admitted)\b/.test(
      normalized,
    );
  if (availability || approval) {
    const guardrails: string[] = [];
    if (availability)
      guardrails.push(
        "The local course catalog does not contain current semester schedules or seat information. A catalog entry does not establish that a course will be offered, and I cannot promise enrollment. Check UConn's current course schedule and confirm with the MSDS program.",
      );
    if (approval)
      guardrails.push(
        "I can help explore course choices, but I cannot establish degree approval or your eligibility. Recommended, specialty, and broader-catalog labels describe the recorded course lists; they do not approve an individual plan. Confirm the current prerequisites and your elective selections with the MSDS program/advisor.",
      );
    if (mentionedCourses.length)
      guardrails.push(
        mentionedCourses
          .map(
            (course) =>
              `${course.code}: ${course.prerequisites ?? "prerequisites/enrollment conditions await verification"}.`,
          )
          .join(" "),
      );
    return {
      answer: guardrails.join("\n\n"),
      sources: sourcesFor(discussionCourses),
      suggestedCourses: mentionedCourses.map((course) => course.code),
    };
  }

  if (mentionedCodes.length && !mentionedCourses.length) {
    return {
      answer: `I do not have ${mentionedCodes.join(", ")} in the local course index, so I cannot provide a grounded description or prerequisite comparison. Check the current UConn Graduate Catalog and ask the MSDS program about elective applicability. A catalog entry alone does not establish availability or degree approval.`,
      sources: [
        ...sourcesFor(),
        {
          label: "UConn Graduate Course Catalog",
          url: "https://catalog.uconn.edu/graduate/courses/",
        },
      ],
      suggestedCourses: [],
    };
  }

  if (
    /\b(overlap|combination|shortlist|my plan|these two|complement|compare my)\b/.test(
      normalized,
    ) &&
    discussionCourses.length
  ) {
    const analysis = analyzePlan(discussionCourses);
    return {
      answer: [
        analysis.headline,
        ...analysis.comments.slice(0, 4),
        ...analysis.warnings.slice(0, 2),
        "These comments are exploratory guidance, not formal academic approval.",
      ].join("\n\n"),
      sources: sourcesFor(discussionCourses),
      suggestedCourses: discussionCourses.map((course) => course.code),
    };
  }

  if (mentionedCourses.length >= 2) {
    const pair = mentionedCourses.slice(0, 2);
    const common = pair[0].capabilities.filter((capability) =>
      pair[1].capabilities.includes(capability),
    );
    const comparison = common.length
      ? `They share capability areas in ${common.map((capability) => capability.replace(/-/g, " ")).join(", ")}. Shared areas do not mean identical course content.`
      : "Their recorded capability mappings emphasize different parts of the data science workflow.";
    return {
      answer: `${pair.map(summarizeCourse).join("\n\n")}\n\n${comparison} Course-to-capability mappings are educational interpretations, not a formal prerequisite sequence. Confirm official requirements through the linked sources.`,
      sources: sourcesFor(pair),
      suggestedCourses: pair.map((course) => course.code),
    };
  }
  if (
    mentionedCourses.length === 1 &&
    !/\b(recommend|elective|consider|interest)\b/.test(normalized)
  ) {
    return {
      answer: `${summarizeCourse(mentionedCourses[0])}\n\nCourse-to-capability mappings are educational interpretations. Confirm official requirements through the linked source.`,
      sources: sourcesFor(mentionedCourses),
      suggestedCourses: mentionedCodes,
    };
  }
  if (
    /\b(causal|causality)\b/.test(normalized) &&
    /\b(core|curriculum|fit|role|why)\b/.test(normalized)
  ) {
    const causal = coreCourses.find((course) => course.code === "EPSY 5641");
    return {
      answer: `Causal reasoning helps distinguish predicting an outcome from asking how an intervention could change it. It connects problem framing, measurement, assumptions, and evaluation to decisions. ${causal ? `${causal.code} — ${causal.title} is the core connection in the recorded curriculum. ${causal.studentDescription ?? "Its official description is awaiting source verification."}` : "Check the program's current curriculum for the core course mapping."}\n\nThis capability complements statistical reasoning, machine learning, and responsible practice; the map describes connections, not a mandatory course order.`,
      sources: sourcesFor(causal ? [causal] : []),
      suggestedCourses: causal ? [causal.code] : [],
    };
  }
  if (
    /\b(credits|requirements|structure|how many|required)\b/.test(normalized) &&
    !/\b(prerequisite|prerequisites)\b/.test(normalized)
  ) {
    return {
      answer: `The recorded MSDS structure is ${program.credits.total} credits: ${program.credits.core} core, ${program.credits.electives} elective credits across ${program.electiveCount} electives, and a ${program.credits.capstone}-credit applied capstone.${program.sourceVerification === "pending" ? " This starting program record is awaiting verification against current public sources." : ""} Suggested pathways describe ways to connect your interests and elective choices; they are not official concentrations unless separately documented by the program. Confirm your individual plan with the MSDS program.`,
      sources: sourcesFor(),
      suggestedCourses: [],
    };
  }

  const recommendations = recommendCourses(question, [], courses).slice(0, 4);
  if (!recommendations.length)
    return {
      answer:
        "I can explain core courses, compare a shortlist, or connect interests such as sports analytics, generative AI, business, health, and computing to the local course index. I do not yet have a grounded elective match for this question. Try a course code or a more specific interest. The guide works from local records; current schedules and individual degree approvals require the MSDS program.",
      sources: sourcesFor(),
      suggestedCourses: [],
    };
  const recommendationsText = recommendations.map(({ course, reasons }) => {
    const category =
      course.msdsStatus === "recommended"
        ? "MSDS recommended"
        : course.msdsStatus === "specialty"
          ? "MSDS specialty elective"
          : "broader-catalog suggestion; program approval must be confirmed";
    return `${course.code} — ${course.title} (${category}). ${reasons[0]}${course.sourceVerification === "pending" ? " Official metadata awaits source verification." : ""}`;
  });
  const needsCombined =
    /\b(genai|gen ai|generative ai)\b/.test(normalized) &&
    /\b(business|marketing)\b/.test(normalized);
  return {
    answer: `Here are local-data matches to explore:\n\n${recommendationsText.join("\n\n")}${needsCombined ? "\n\nFor GenAI and business, compare a technical AI elective with a business or decision-focused elective. The best pair depends on their verified prerequisites and how you want to apply the methods; a strong combined match can connect both interests." : ""}\n\nThese are transparent recommendation connections, not enrollment or degree approval. Confirm prerequisites, availability, and elective selections with the MSDS program.`,
    sources: sourcesFor(
      recommendations.map((recommendation) => recommendation.course),
    ),
    suggestedCourses: recommendations.map(
      (recommendation) => recommendation.course.code,
    ),
  };
}
