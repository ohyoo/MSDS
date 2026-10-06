import { createServer } from "node:http";
import { POST } from "./guide-handler";

const allowedOrigins = new Set((process.env.MSDS_ALLOWED_ORIGINS || "http://localhost:3000,https://ohyoo.github.io").split(",").map((origin) => origin.trim()));
const server = createServer(async (request, response) => {
  response.setHeader("Cache-Control", "no-store");
  const origin = request.headers.origin;
  if (origin && !allowedOrigins.has(origin)) { response.writeHead(403); response.end("Origin not allowed"); return; }
  if (origin) {
    response.setHeader("Access-Control-Allow-Origin", origin);
    response.setHeader("Vary", "Origin");
    response.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    response.setHeader("Access-Control-Allow-Headers", "Content-Type");
  }
  if (request.url !== "/api/guide") { response.writeHead(404); response.end("Not found"); return; }
  if (request.method === "OPTIONS") { response.writeHead(204); response.end(); return; }
  if (request.method !== "POST") { response.writeHead(405); response.end("Use POST"); return; }
  let body = "";
  try {
    for await (const chunk of request) {
      body += chunk.toString();
      if (Buffer.byteLength(body) > 8000) { response.writeHead(413); response.end("Question too long"); return; }
    }
    const result = await POST(new Request("http://localhost/api/guide", { method: "POST", body }));
    response.writeHead(result.status, { "Content-Type": "application/json" });
    response.end(await result.text());
  } catch {
    response.writeHead(500, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ error: "Guide unavailable. Use the local curriculum guide." }));
  }
});
server.listen(Number(process.env.MSDS_GUIDE_PORT || 8787), "0.0.0.0", () => console.log("Optional MSDS guide service is ready."));
