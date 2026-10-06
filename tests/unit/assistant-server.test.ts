import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { respondToGuide } from "../../src/lib/assistant-server";
import { answerGuide } from "../../src/lib/guide";
import { courses } from "../../src/lib/data";
import { POST } from "../../server/guide-handler";

// The provider boundary is tested against fictional local records, independent
// of current official data and the course-refresh operation.
vi.mock("../../src/lib/data", async () => {
  const { fixtureCourse, testCourses } = await import("./fixtures");
  const extraCourses = Array.from({ length: 8 }, (_, index) =>
    fixtureCourse({
      code: `TEST ${9910 + index}`,
      title: `Fictional Isolated Topic ${index + 1}`,
      sourceUrl: `https://example.test/catalog/test-${9910 + index}`,
    }),
  );
  return {
    courses: [...testCourses, ...extraCourses],
    electives: [...testCourses, ...extraCourses],
    coreCourses: [],
    pathways: [],
    program: {
      credits: { total: 30, core: 15, electives: 12, capstone: 3 },
      electiveCount: 4,
      sourceUrl: "https://example.test/program",
      sourceVerification: "verified",
    },
  };
});

const input = {
  question:
    "Are these approved and will they count toward my degree for generative AI?",
  selectedCodes: ["TEST 9902"],
};

function providerResponse(content: string) {
  return Response.json({ choices: [{ message: { content } }] });
}

function request(body: unknown, headers: Record<string, string> = {}) {
  return new Request("https://example.test/api/guide", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.stubEnv("MSDS_AI_API_KEY", "");
  vi.stubEnv("MSDS_AI_ENDPOINT", "https://example.test/chat/completions");
  vi.stubEnv("MSDS_AI_MODEL", "fictional-test-model");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("server-side curriculum assistant guardrails", () => {
  it("returns the grounded guide without making an external request when no API key exists", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    const selected = courses.filter((course) =>
      input.selectedCodes.includes(course.code),
    );

    const result = await respondToGuide(input);

    expect(result).toEqual({
      ...answerGuide(input.question, selected),
      mode: "deterministic",
    });
    expect(result.answer).toContain("cannot establish degree approval");
    expect(fetch).not.toHaveBeenCalled();
  });

  it.each([
    "This is prose instead of JSON",
    JSON.stringify({
      courseCodes: ["TEST 9902"],
      followUp: "pathways",
      approval: "Your plan is approved",
    }),
    JSON.stringify({ courseCodes: ["TEST 9902"], followUp: "enroll" }),
  ])(
    "falls back safely when the model violates its output contract (%s)",
    async (content) => {
      vi.stubEnv("MSDS_AI_API_KEY", "fictional-test-key");
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(providerResponse(content)),
      );
      const baseline = await respondToGuide({ ...input });

      expect(baseline.mode).toBe("deterministic");
      expect(baseline.answer).toContain("cannot establish degree approval");
      expect(baseline.answer).not.toContain("Your plan is approved");
      expect(baseline.sources).toContainEqual({
        label: "UConn MSDS program requirements",
        url: "https://example.test/program",
      });
    },
  );

  it("rejects a real local course ID that was not in the provider's retrieved context", async () => {
    vi.stubEnv("MSDS_AI_API_KEY", "fictional-test-key");
    let excludedCode: string | undefined;
    const fetch = vi.fn(async (_url: unknown, init: RequestInit) => {
      const payload = JSON.parse(String(init.body));
      const context: { courses: { code: string }[] } = JSON.parse(
        payload.messages[1].content,
      );
      excludedCode = courses.find(
        (course) => !context.courses.some(({ code }) => code === course.code),
      )?.code;
      expect(excludedCode).toBeDefined();
      return providerResponse(
        JSON.stringify({ courseCodes: [excludedCode], followUp: "pathways" }),
      );
    });
    vi.stubGlobal("fetch", fetch);

    const result = await respondToGuide(input);

    expect(fetch).toHaveBeenCalledOnce();
    expect(result.mode).toBe("deterministic");
    expect(result.suggestedCourses).not.toContain(excludedCode);
    expect(result.answer).toContain("cannot establish degree approval");
  });

  it("adds only local course summaries while retaining deterministic advisories and sources", async () => {
    vi.stubEnv("MSDS_AI_API_KEY", "fictional-test-key");
    const chosen = courses.find((course) => course.code === "TEST 9903")!;
    const fetch = vi.fn(async (_url: unknown, init: RequestInit) => {
      const payload = JSON.parse(String(init.body));
      const context: { courses: { code: string }[] } = JSON.parse(
        payload.messages[1].content,
      );
      expect(context.courses.some(({ code }) => code === chosen.code)).toBe(
        true,
      );
      return providerResponse(
        JSON.stringify({
          courseCodes: [chosen.code, chosen.code],
          followUp: "foundations",
        }),
      );
    });
    vi.stubGlobal("fetch", fetch);
    const selected = courses.filter((course) =>
      input.selectedCodes.includes(course.code),
    );
    const grounded = answerGuide(input.question, selected);

    const result = await respondToGuide(input);

    expect(result.mode).toBe("ai");
    expect(result.answer.startsWith(grounded.answer)).toBe(true);
    expect(result.answer).toContain(`${chosen.code} — ${chosen.title}`);
    expect(result.answer).toContain(chosen.officialDescription);
    expect(result.sources.map(({ url }) => url)).toEqual(
      expect.arrayContaining(grounded.sources.map(({ url }) => url)),
    );
    expect(result.sources).toContainEqual({
      label: chosen.code,
      url: chosen.sourceUrl,
    });
    expect(
      result.suggestedCourses.filter((code) => code === chosen.code),
    ).toHaveLength(1);
    expect(result).toHaveProperty(
      "followUp",
      "Which core courses provide foundations for this interest?",
    );
  });

  it("returns a deterministic response on provider failure and refuses insecure endpoints", async () => {
    vi.stubEnv("MSDS_AI_API_KEY", "fictional-test-key");
    const fetch = vi
      .fn()
      .mockRejectedValue(new Error("Fictional provider failure"));
    vi.stubGlobal("fetch", fetch);
    expect((await respondToGuide(input)).mode).toBe("deterministic");
    expect(fetch).toHaveBeenCalledOnce();

    fetch.mockClear();
    vi.stubEnv("MSDS_AI_ENDPOINT", "http://example.test/chat/completions");
    expect((await respondToGuide(input)).mode).toBe("deterministic");
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe("guide HTTP request boundary", () => {
  it("rejects malformed JSON with a client error", async () => {
    const response = await POST(request('{"question":'));
    expect(response.status).toBe(400);
    expect(await response.json()).toHaveProperty(
      "error",
      "Invalid JSON request.",
    );
  });

  it.each([
    {},
    { question: " " },
    { question: 7 },
    { question: "x".repeat(1201) },
    { question: "test", selectedCodes: Array(13).fill("TEST 9901") },
    { question: "test", selectedCodes: ["x".repeat(21)] },
    { question: "test", selectedCodes: [42] },
    { question: "test", apiKey: "unexpected-field" },
  ])("rejects invalid request fields: %j", async (body) => {
    const response = await POST(request(body));
    expect(response.status).toBe(400);
    expect(await response.json()).toHaveProperty("error");
  });

  it("enforces the declared body limit before attempting to read the request", async () => {
    const incoming = request(
      { question: "valid" },
      { "content-length": "8001" },
    );
    const readBody = vi.spyOn(incoming.body!, "getReader");

    const response = await POST(incoming);

    expect(response.status).toBe(413);
    expect(readBody).not.toHaveBeenCalled();
  });

  it("rejects an oversized body even when content length is absent", async () => {
    const response = await POST(request("x".repeat(8001)));
    expect(response.status).toBe(413);
  });

  it("measures the body limit in bytes for multibyte text", async () => {
    const body = JSON.stringify({ question: "é".repeat(4000) });
    expect(body.length).toBeLessThan(8000);
    expect(new TextEncoder().encode(body).byteLength).toBeGreaterThan(8000);

    const response = await POST(request(body));

    expect(response.status).toBe(413);
  });

  it("cancels a chunked request as soon as its body exceeds the byte limit", async () => {
    const cancel = vi.fn();
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array(8001));
        // The stream deliberately remains open. The handler must reject the
        // oversized chunk without waiting for an attacker to finish sending.
      },
      cancel,
    });
    const incoming = new Request("https://example.test/api/guide", {
      method: "POST",
      body: stream,
      duplex: "half",
    } as RequestInit);

    const response = await POST(incoming);

    expect(response.status).toBe(413);
    expect(cancel).toHaveBeenCalledOnce();
  });

  it("serves a valid trimmed question without a provider key and disables response caching", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    const response = await POST(
      request({ question: "  How many credits are required?  " }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(body.mode).toBe("deterministic");
    expect(body.answer).toContain("30 credits");
    expect(body.answer).toContain("not official concentrations");
    expect(body.sources).toContainEqual({
      label: "UConn MSDS program requirements",
      url: "https://example.test/program",
    });
    expect(fetch).not.toHaveBeenCalled();
  });
});
