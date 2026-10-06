import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";

const root = resolve("out");
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
};
createServer(async (request, response) => {
  try {
    let path = decodeURIComponent(
      new URL(request.url || "/", "http://localhost").pathname,
    );
    if (basePath) {
      if (path === "/") {
        response.writeHead(302, { Location: `${basePath}/` });
        response.end();
        return;
      }
      if (!path.startsWith(`${basePath}/`) && path !== basePath)
        throw new Error("Not found");
      path = path.slice(basePath.length);
    }
    let file = resolve(root, `.${path || "/"}`);
    if (file !== root && !file.startsWith(root + sep))
      throw new Error("Not found");
    if ((await stat(file)).isDirectory()) file = resolve(file, "index.html");
    const body = await readFile(file);
    response.writeHead(200, {
      "Content-Type": mime[extname(file)] || "application/octet-stream",
      "Cache-Control": "no-cache",
    });
    response.end(body);
  } catch {
    response.writeHead(404);
    response.end("Not found");
  }
}).listen(Number(process.env.PORT || 3000), "0.0.0.0", () =>
  console.log("MSDS static site is ready."),
);
