import { guideRequestSchema, respondToGuide } from "@/lib/assistant-server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const declaredLength = Number(request.headers.get("content-length") || 0);
  if (declaredLength > 8000) return Response.json({ error: "Please keep your question under 1,200 characters." }, { status: 413 });
  const reader = request.body?.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  if (reader) {
    while (true) {
      const { value: chunk, done } = await reader.read();
      if (done) break;
      size += chunk.byteLength;
      if (size > 8000) {
        await reader.cancel();
        return Response.json({ error: "Question too long." }, { status: 413 });
      }
      chunks.push(chunk);
    }
  }
  const body = Buffer.concat(chunks).toString("utf8");
  let value: unknown;
  try { value = JSON.parse(body); } catch { return Response.json({ error: "Invalid JSON request." }, { status: 400 }); }
  const parsed = guideRequestSchema.safeParse(value);
  if (!parsed.success) return Response.json({ error: "Enter a question of 1–1,200 characters and at most 12 course codes." }, { status: 400 });
  return Response.json(await respondToGuide(parsed.data), { headers: { "Cache-Control": "no-store" } });
}
