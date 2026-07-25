import { defineConfig, devices } from "@playwright/test";

const testBaseUrl = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3101";
const testPort = new URL(testBaseUrl).port || "3000";

export default defineConfig({
    testDir: "./tests/e2e",
    fullyParallel: false,
    workers: 1,
    retries: 0,
    reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]],
    use: {
        baseURL: testBaseUrl,
        trace: "retain-on-failure",
        screenshot: "only-on-failure",
        video: "off",
    },
    projects: [
        { name: "desktop-chrome", use: { ...devices["Desktop Chrome"], channel: "chrome" } },
        {
            name: "mobile-chrome",
            use: { channel: "chrome", viewport: { width: 393, height: 727 }, hasTouch: true },
            grep: /@responsive/,
        },
    ],
    webServer: {
        command: `npm run dev -- --port ${testPort}`,
        url: testBaseUrl,
        reuseExistingServer: process.env.PLAYWRIGHT_REUSE_EXISTING === "true",
        timeout: 120_000,
    },
});
