import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mkdir, writeFile } from "node:fs/promises";

async function assertAccessible(
  results: Awaited<ReturnType<AxeBuilder["analyze"]>>,
  name: string,
) {
  await mkdir("test-results", { recursive: true });
  await writeFile(
    `test-results/axe-${name}.json`,
    JSON.stringify(results.violations, null, 2),
  );
  expect(
    results.violations.map((violation) => ({
      id: violation.id,
      count: violation.nodes.length,
      examples: violation.nodes.slice(0, 3).map((node) => node.target),
    })),
  ).toEqual([]);
}

test("credit structure and connected curriculum open authoritative course details", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("./");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Explore Your MSDS",
  );
  await expect(page.locator(".program-summary")).toContainText("30");
  await expect(page.locator(".program-summary")).toContainText("21");
  await expect(page.locator(".program-summary")).toContainText("Two electives");
  const capability = page.getByRole("button", {
    name: "Causal reasoning & evaluation",
    exact: true,
  });
  await capability.click();
  await expect(capability).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".connected-course-list")).toContainText(
    "EPSY 5641",
  );
  await page
    .locator(".connected-course-list")
    .getByRole("button", { name: "EPSY 5641" })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("OFFICIAL COURSE DESCRIPTION");
  await expect(dialog).toContainText("verified");
  await expect(
    dialog.getByRole("link", { name: "Open official course source" }),
  ).toHaveAttribute("href", /catalog\.uconn\.edu/);
  await expect(
    dialog.getByRole("button", { name: "Close dialog" }),
  ).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  expect(
    await dialog.evaluate((node) => node.contains(document.activeElement)),
  ).toBe(true);
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(
    page
      .locator(".connected-course-list")
      .getByRole("button", { name: "EPSY 5641" }),
  ).toBeFocused();
  expect(errors).toEqual([]);
});

test("sports and combined GenAI/business searches produce explained elective recommendations", async ({
  page,
}) => {
  await page.goto("./");
  const search = page.getByRole("textbox", {
    name: "Search electives by interests or career goals",
  });
  await search.fill("sports analytics");
  await expect(page.locator(".elective-card").first()).toBeVisible();
  await expect(page.locator(".match-reason").first()).toContainText(
    /sports|forecasting|performance/i,
  );
  await expect(page.locator(".elective-card").first()).toContainText(
    "Predictive Modeling",
  );
  await search.fill("generative AI and business");
  await expect(page.locator(".elective-card").first()).toBeVisible();
  await expect(page.locator(".elective-card").first()).toContainText(
    "Generative AI for Business",
  );
  await expect(page.locator(".match-reason").first()).toContainText(
    /generative|business|learning|ai/i,
  );
  await page
    .getByLabel("Filter by recommendation type")
    .selectOption("specialty");
  await expect(
    page.locator(".elective-card").first().locator(".status-badge"),
  ).toContainText("Specialty");
  await search.fill("");
  await page
    .getByLabel("Filter by recommendation type")
    .selectOption("catalog-only");
  await expect(
    page.locator(".elective-card").first().locator(".status-badge"),
  ).toContainText("Explore from UConn Catalog");
});

test("shortlist accepts more than two, analyzes the combination, and restores course codes", async ({
  page,
}) => {
  await page.goto("./");
  const buttons = page.locator(".elective-card .shortlist-button");
  await buttons.nth(0).click();
  await buttons.nth(1).click();
  await buttons.nth(2).click();
  await page
    .getByRole("button", {
      name: "Open my elective plan, 3 courses shortlisted",
    })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.locator(".plan-course")).toHaveCount(3);
  await expect(dialog).toContainText("HOW THE PIECES FIT");
  await expect(dialog).toContainText(/approval|approved/i);
  await expect(dialog).toHaveCSS("opacity", "1");
  await expect(page.locator(".modal-backdrop")).toHaveCSS("opacity", "1");
  await assertAccessible(
    await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze(),
    "elective-plan",
  );
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("msds-elective-plan") || "[]"),
  );
  expect(saved).toHaveLength(3);
  expect(saved.every((item: unknown) => typeof item === "string")).toBe(true);
  await page.reload();
  await expect(
    page.getByRole("button", {
      name: "Open my elective plan, 3 courses shortlisted",
    }),
  ).toBeVisible();
});

test("pathways contain actual course possibilities and the guide cites sources without AI", async ({
  page,
}) => {
  await page.goto("./");
  await expect(page.locator(".signature-pathways .pathway-card")).toHaveCount(
    2,
  );
  await page
    .locator(".pathway-card")
    .filter({ hasText: "Sports Analytics" })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("SUGGESTED PATHWAY");
  await expect(dialog.locator(".related-courses button").first()).toBeVisible();
  await expect(dialog).toContainText(/elective possibilities/i);
  await expect(dialog.locator(".pathway-combination-row")).toHaveCount(3);
  await expect(dialog.locator(".pathway-combination-list")).toContainText(
    "EDLR 5380",
  );
  await expect(dialog.locator(".pathway-capstone-brief")).toContainText(
    "TOPICAL CAPSTONE IDEA",
  );
  await expect(dialog).toContainText("Additional credits & core substitutions");
  await expect(dialog).toHaveCSS("opacity", "1");
  await expect(page.locator(".modal-backdrop")).toHaveCSS("opacity", "1");
  await assertAccessible(
    await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze(),
    "pathway",
  );
  await page.keyboard.press("Escape");
  await page
    .getByRole("textbox", { name: "Ask the curriculum guide a question" })
    .fill("Will CSE 5825 be offered next fall and count toward my degree?");
  await page.getByRole("button", { name: "Send question" }).click();
  await expect(page.locator(".guide-message-guide")).toContainText("cannot");
  await expect(page.locator(".guide-message-guide a").first()).toHaveAttribute(
    "href",
    /uconn\.edu/,
  );
});

test("desktop and course detail pass automated accessibility checks", async ({
  page,
}) => {
  await page.goto("./");
  await expect(page.locator(".core-card")).toHaveCount(8);
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  await assertAccessible(results, "desktop");
  await mkdir("docs/screenshots", { recursive: true });
  await page.screenshot({ path: "docs/screenshots/desktop.png" });
  await page.locator(".core-card").filter({ hasText: "STAT 5405" }).click();
  await expect(page.getByRole("dialog")).toHaveCSS("opacity", "1");
  await expect(page.locator(".modal-backdrop")).toHaveCSS("opacity", "1");
  const modalResults = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  await assertAccessible(modalResults, "course-dialog");
});

test("mobile navigation and layout are usable without horizontal overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("./");
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page
    .getByRole("navigation", { name: "Mobile navigation" })
    .getByRole("link", { name: "Explore electives" })
    .click();
  await expect(
    page.getByRole("textbox", {
      name: "Search electives by interests or career goals",
    }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  await assertAccessible(results, "mobile");
  await page.goto("./");
  await mkdir("docs/screenshots", { recursive: true });
  await page.screenshot({ path: "docs/screenshots/mobile.png" });
  await expect(page.locator(".program-summary .stat-total")).toBeInViewport();
  await page.setViewportSize({ width: 320, height: 740 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
