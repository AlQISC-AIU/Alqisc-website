import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
    testDir: "./tests/e2e",
    fullyParallel: false,
    workers: 1,
    retries: 0,
    reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]],
    use: {
        baseURL: "http://localhost:3101",
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
        command: "npm run dev -- --port 3101",
        url: "http://localhost:3101",
        reuseExistingServer: false,
        timeout: 120_000,
    },
});
