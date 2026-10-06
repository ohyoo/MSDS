import { describe, expect, it } from "vitest";
import { parseCatalogPage } from "../../scripts/lib/catalog";

// These synthetic CourseLeaf fragments exercise parsing only. They are never
// used as official UConn metadata or written to the local course index.
const sourceUrl = "https://example.test/graduate/courses/test/";
const checkedOn = "2026-10-06";

describe("graduate catalog metadata parser", () => {
  it("extracts modern CourseLeaf titles, fixed credits, and source provenance", () => {
    const html = `
      <div class="courseblock" data-coursecode="TEST 5001">
        <div class="cols"><span class="detail-code">TEST 5001</span>
          <span class="detail-title">Synthetic\u00a0Methods</span></div>
        <span class="detail-hours_html">3 Credits</span>
        <div class="courseblockextra">A fictional description with
          <em>formatting</em> and extra whitespace.</div>
      </div>`;

    const [course] = parseCatalogPage(html, sourceUrl, checkedOn);
    expect(course).toMatchObject({
      code: "TEST 5001",
      title: "Synthetic Methods",
      credits: 3,
      department: "TEST",
      officialDescription:
        "A fictional description with formatting and extra whitespace.",
      sourceUrl,
      lastChecked: checkedOn,
      sourceType: "catalog",
      sourceVerification: "verified",
      msdsStatus: "catalog-only",
    });
    expect(course.studentDescription).toBeNull();
    expect(course.prerequisites).toBeNull();
    expect(course.approvalRequired).toBeNull();
    expect(course.tags).toEqual([]);
  });

  it.each(["1-6 Credits", "1–6 Credit Hours"])(
    "leaves variable credits unresolved instead of inventing a fixed value (%s)",
    (creditText) => {
      const html = `
        <div class="courseblock" data-coursecode="TEST 6001">
          <span class="detail-code">TEST 6001</span>
          <span class="detail-title">Fictional Independent Study</span>
          <span class="detail-hours_html">${creditText}</span>
          <div class="courseblockextra">A fictional variable-credit activity.</div>
        </div>`;

      const [course] = parseCatalogPage(html, sourceUrl, checkedOn);
      expect(course.credits).toBeNull();
      expect(course.title).toBe("Fictional Independent Study");
    },
  );

  it("keeps consent, prerequisites, and enrollment restrictions verbatim", () => {
    const requirements =
      "Prerequisites: TEST 5001 or consent of instructor. Open only to graduate students. Recommended preparation: linear algebra.";
    const html = `
      <div class="courseblock" data-coursecode="TEST 6010">
        <span class="detail-code">TEST 6010</span>
        <span class="detail-title">Synthetic Advanced Methods</span>
        <span class="detail-hours_html">3 Credits</span>
        <div class="courseblockextra">Fictional advanced methods.</div>
        <div class="detail-reqs">${requirements}</div>
      </div>`;

    const [course] = parseCatalogPage(html, sourceUrl, checkedOn);
    expect(course.prerequisites).toBe(requirements);
    expect(course.officialDescription).toBe("Fictional advanced methods.");
    // Consent in catalog text does not establish MSDS approval status.
    expect(course.approvalRequired).toBeNull();
  });

  it("supports legacy headings and retains their recorded requirement paragraphs", () => {
    const html = `
      <div class="courseblock">
        <p class="courseblocktitle">TEST 5502. Fictional Topics. (3 credits)</p>
        <p class="courseblockdesc">Fictional methods for a test fixture.</p>
        <p class="courseblockextra">Prerequisite: TEST 5001; consent of instructor.</p>
        <p class="courseblockother">Co-requisite: TEST 5501.</p>
      </div>`;

    const [course] = parseCatalogPage(html, sourceUrl, checkedOn);
    expect(course).toMatchObject({
      code: "TEST 5502",
      title: "Fictional Topics",
      credits: 3,
      officialDescription: "Fictional methods for a test fixture.",
      prerequisites:
        "Prerequisite: TEST 5001; consent of instructor.\n\nCo-requisite: TEST 5501.",
    });
  });

  it("indexes only identified 5000/6000-level courses and preserves department codes and suffixes", () => {
    const blocks = [
      ["TEST 4999", "Fictional Undergraduate Course"],
      ["TEST 5000", "Fictional Graduate Course"],
      ["MOCK 6000W", "Fictional Graduate Writing Course"],
      ["TEST 7000", "Outside the Selected Level Range"],
      ["not a course code", "Unidentified Block"],
    ]
      .map(
        ([code, title]) => `
          <div class="courseblock" data-coursecode="${code}">
            <span class="detail-code">${code}</span>
            <span class="detail-title">${title}</span>
            <span class="detail-hours_html">3 Credits</span>
          </div>`,
      )
      .join("");

    const courses = parseCatalogPage(blocks, sourceUrl, checkedOn);
    expect(courses.map(({ code }) => code)).toEqual([
      "TEST 5000",
      "MOCK 6000W",
    ]);
    expect(courses.map(({ department }) => department)).toEqual([
      "TEST",
      "MOCK",
    ]);
  });

  it("keeps absent catalog facts unknown and rejects blocks without a title", () => {
    const html = `
      <div class="courseblock" data-coursecode="TEST 5001">
        <span class="detail-code">TEST 5001</span>
        <span class="detail-title">Fictional Minimal Record</span>
      </div>
      <div class="courseblock" data-coursecode="TEST 5002">
        <span class="detail-code">TEST 5002</span>
      </div>`;

    const courses = parseCatalogPage(html, sourceUrl, checkedOn);
    expect(courses).toHaveLength(1);
    expect(courses[0]).toMatchObject({
      credits: null,
      officialDescription: null,
      prerequisites: null,
      approvalRequired: null,
    });
  });
});
