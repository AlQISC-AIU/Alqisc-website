// One-off accessibility scan and screenshots; not part of the project.
import { test, type Page } from "@playwright/test";
import { writeFileSync } from "node:fs";

const SCRATCH = String.raw`C:\Users\ADMINI~1\AppData\Local\Temp\claude\19c0b064e5d40fec\af9a7a08-e0de-47dc-8705-276a9ca55b31\scratchpad`;
const AXE = SCRATCH + String.raw`\axe\node_modules\axe-core\axe.min.js`;
const OPEN = {
    config: {
        is_open: true, term: "2026/27", deadline: "2026-11-22", intro: "",
        open_top_positions: ["general_secretary", "general_treasurer"],
        open_department_positions: {
            exco_dawah: ["head", "first_deputy_head", "second_deputy_head", "exco_member"], exco_co_curricular: [],
            exco_multimedia: ["exco_member"], exco_education: ["head"], exco_ict: ["second_deputy_head", "exco_member"], exco_sister_affairs: [],
        },
    },
    accepting: true,
};
const results: Record<string, unknown> = {};

async function scan(page: Page, name: string, tag: string) {
    await page.addScriptTag({ path: AXE });
    const violations = await page.evaluate(async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const run = await (window as any).axe.run("main", { runOnly: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return run.violations.map((v: any) => ({ id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.slice(0, 4).map((n: any) => ({ html: n.html.slice(0, 160), summary: n.failureSummary?.slice(0, 220) })) }));
    });
    results[`${tag}:${name}`] = violations;
    writeFileSync(`${SCRATCH}\\axe-${tag}.json`, JSON.stringify(results, null, 2));
    await page.locator("main .max-w-3xl").last().screenshot({ path: `${SCRATCH}\\shots\\${tag}-${name}.png` });
}

test("axe @responsive", async ({ page }, info) => {
    test.setTimeout(120_000);
    const tag = info.project.name;
    const pick = (q: string | RegExp, a: string) => page.getByRole("group", { name: q }).getByText(a, { exact: true }).click();
    const next = () => page.getByRole("button", { name: /^Next:/ }).click();
    await page.route("**/api/committee-registration", (r) => r.request().method() === "GET"
        ? r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(OPEN) })
        : r.fulfill({ status: 201, contentType: "application/json", body: "{}" }));
    await page.goto("/join");
    await page.getByLabel("Student email").waitFor();
    await next();
    await pick("Level of education", "Bachelor Degree");
    await scan(page, "1-details-errors", tag);
    await page.getByLabel("Student email").fill("a.b@student.aiu.edu.my");
    await page.getByLabel("Full name (all uppercase)").fill("Aisha Rahman");
    await page.getByLabel("Student ID").fill("AIU21011234");
    await page.getByLabel("Contact number").fill("+60 11-2233 5566");
    await page.getByLabel("Nationality").fill("Malaysian");
    await next();
    await page.getByLabel(/What do you know about/).fill("The Islamic club.");
    await pick("Have you ever joined any of our programs?", "Yes");
    await scan(page, "2-about", tag);
    await next();
    await pick("First choice", "EXCO ICT & Technical");
    await pick("Second choice", "EXCO Da'wah");
    await pick("Department position", "EXCO Member");
    await scan(page, "3-leadership", tag);
    await next();
    await page.getByRole("button", { name: "Submit application" }).click();
    await pick(/selected to serve in another club/, "Yes, I can fully commit to both clubs");
    await scan(page, "4-commitment-errors", tag);
    await page.getByLabel(/What makes you suitable/).fill("To serve.");
    await pick(/another position other than/, "Yes");
    await page.getByRole("button", { name: "Submit application" }).click();
    await page.getByRole("heading", { name: "Thank you for your application" }).waitFor();
    await page.waitForTimeout(500);
    await scan(page, "5-confirmation", tag);
});

test("admin shot", async ({ page }) => {
    test.setTimeout(240_000);
    await page.goto("/club-console-alqisc-7q4m-test/admin/login");
    await page.locator("#admin-email").fill("admin@alqisc.test");
    await page.locator("#admin-password").fill("emulator-only-password");
    await page.getByRole("button", { name: "Sign In", exact: true }).click();
    await page.waitForURL(/\/admin\/dashboard/, { timeout: 90_000 });
    await page.goto("/club-console-alqisc-7q4m-test/admin/registrations");
    await page.getByRole("heading", { name: /^Applicants/ }).waitFor({ timeout: 60_000 });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${SCRATCH}\\shots\\admin.png`, fullPage: true });
});
