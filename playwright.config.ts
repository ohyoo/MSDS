import { defineConfig } from "@playwright/test";
import { existsSync } from "node:fs";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
const chromium =
  process.env.CHROMIUM_PATH ||
  (existsSync("/usr/bin/chromium") ? "/usr/bin/chromium" : undefined);

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 30_000,
  reporter: "list",
  use: {
    baseURL: `http://127.0.0.1:3000${basePath}/`,
    viewport: { width: 1440, height: 960 },
    browserName: "chromium",
    launchOptions: { executablePath: chromium, args: ["--no-sandbox"] },
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm start",
    url: `http://127.0.0.1:3000${basePath}/`,
    reuseExistingServer: !process.env.CI,
    timeout: 20_000,
  },
});
