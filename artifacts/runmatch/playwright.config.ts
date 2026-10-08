import { defineConfig } from "@playwright/test";

const port = Number(process.env.RUNMATCH_AUTH_TEST_PORT ?? 20895);
const basePath = "/runmatch";
const baseURL = `http://127.0.0.1:${port}${basePath}`;

export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/*.spec.ts",
  outputDir: "../../.cache/playwright/runmatch-auth",
  reporter: "list",
  workers: 1,
  timeout: 90_000,
  expect: {
    timeout: 20_000,
  },
  use: {
    baseURL,
    viewport: { width: 1280, height: 900 },
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "clerk-testing-setup",
      testMatch: /clerk\.setup\.ts/,
    },
    {
      name: "chromium",
      testMatch: /clerk-base-path\.spec\.ts/,
      dependencies: ["clerk-testing-setup"],
      use: {
        browserName: "chromium",
        launchOptions: {
          executablePath:
            process.env.CHROMIUM_EXECUTABLE_PATH ?? "/repl/tools/bin/chromium",
          args: ["--no-sandbox"],
        },
      },
    },
    {
      name: "webkit",
      testMatch: /clerk-base-path\.spec\.ts/,
      grep: /inbox badges show only the active account unread count during account switches/,
      dependencies: ["clerk-testing-setup"],
      use: {
        browserName: "webkit",
      },
    },
    {
      name: "firefox",
      testMatch: /clerk-base-path\.spec\.ts/,
      grep: /inbox badges show only the active account unread count during account switches/,
      dependencies: ["clerk-testing-setup"],
      use: {
        browserName: "firefox",
      },
    },
  ],
  webServer: {
    command: `PORT=${port} BASE_PATH=${basePath}/ pnpm --filter @workspace/runmatch run dev`,
    url: `${baseURL}/`,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
