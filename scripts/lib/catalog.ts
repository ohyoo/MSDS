import * as cheerio from "cheerio";
import type { Course } from "../../src/lib/schema";

const clean = (text: string) =>
  text
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/** Parse CourseLeaf metadata without generating descriptions or course tags. */
export function parseCatalogPage(
  html: string,
  sourceUrl: string,
  lastChecked: string,
): Course[] {
  const $ = cheerio.load(html);
  const parsed: Course[] = [];
  $(".courseblock").each((_, element) => {
    const block = $(element);
    const modern = block.find(".detail-code").length > 0;
    const heading =
      clean(block.find(".courseblocktitle").first().text()) ||
      clean(block.find(".cols").first().text());
    const codeMatch = (block.attr("data-coursecode") || heading).match(
      /^([A-Z]{2,6})\s+(\d{4}[A-Z]?)\b/,
    );
    if (!codeMatch || !/^[56]/.test(codeMatch[2])) return;

    const creditText =
      clean(
        block
          .find(".courseblockcredits, .credits, .detail-hours_html")
          .first()
          .text(),
      ) || heading;
    const creditMatch = creditText.match(
      /(?:\(|\b)(\d+(?:\.\d+)?)\s*(?:[-–]\s*(\d+(?:\.\d+)?))?\s*(?:credits?|credit hours?)\b/i,
    );
    const credits =
      creditMatch && !creditMatch[2] ? Number(creditMatch[1]) : null;
    const title = clean(
      (modern
        ? block.find(".detail-title").first().text()
        : heading.slice(codeMatch[0].length)
      )
        .replace(/^[.\s:–-]+/, "")
        .replace(
          /\s*[.(]?\s*\d+(?:\.\d+)?\s*(?:[-–]\s*\d+(?:\.\d+)?)?\s*(?:credits?|credit hours?)\.?\)?\s*$/i,
          "",
        )
        .replace(/\.$/, ""),
    );
    if (!title) return;

    const descriptions = block
      .find(modern ? ".courseblockextra" : ".courseblockdesc")
      .map((_, node) => clean($(node).text()))
      .get()
      .filter(Boolean);
    const extras = block
      .find(modern ? ".detail-reqs" : ".courseblockextra, .courseblockother")
      .map((_, node) => clean($(node).text()))
      .get()
      .filter(Boolean);
    const requirements = modern
      ? extras
      : [...descriptions, ...extras].filter((text) =>
          /prerequisite|corequisite|co-requisite|consent|open (?:only )?to|enrollment restriction|recommended preparation/i.test(
            text,
          ),
        );
    // Retain the catalog's wording, including enrollment restrictions. A missing
    // requirement is unknown; it is never interpreted as "no prerequisites".
    parsed.push({
      code: `${codeMatch[1]} ${codeMatch[2]}`,
      title,
      credits,
      department: codeMatch[1],
      kind: "elective",
      officialDescription: descriptions.join("\n\n") || null,
      studentDescription: null,
      prerequisites: requirements.join("\n\n") || null,
      tags: [],
      capabilities: [],
      pathways: [],
      msdsStatus: "catalog-only",
      delivery: "unknown",
      approvalRequired: null,
      sourceUrl,
      sourceType: "catalog",
      lastChecked,
      sourceVerification: "verified",
    });
  });
  return parsed;
}
