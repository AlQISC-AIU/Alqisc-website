import { expect, test } from "@playwright/test";

test("public navigation and primary pages render without browser errors @responsive", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));

    for (const path of ["/", "/about", "/events", "/classes", "/blog", "/contact", "/donation"]) {
        const response = await page.goto(path);
        expect(response?.status(), path).toBe(200);
        await expect(page.locator("body"), path).toBeVisible();
    }
    expect(errors).toEqual([]);
});

test("standard inner pages keep their hero content centered without horizontal overflow @responsive", async ({ page }) => {
    for (const path of ["/blog", "/classes", "/contact", "/donation", "/events"]) {
        await page.goto(path);

        const heading = page.getByRole("heading", { level: 1 });
        await expect(heading).toBeVisible();

        const headingBox = await heading.boundingBox();
        const heroBox = await heading.locator("xpath=ancestor::section[1]").boundingBox();
        const viewport = page.viewportSize();
        expect(headingBox, `${path} heading bounds`).not.toBeNull();
        expect(heroBox, `${path} hero bounds`).not.toBeNull();
        expect(viewport, `${path} viewport`).not.toBeNull();

        const headingCenter = headingBox!.x + headingBox!.width / 2;
        const viewportCenter = viewport!.width / 2;
        expect(Math.abs(headingCenter - viewportCenter), `${path} heading alignment`).toBeLessThanOrEqual(4);
        expect(heroBox!.height, `${path} hero height`).toBeGreaterThanOrEqual(viewport!.height);

        const hasHorizontalOverflow = await page.evaluate(
            () => document.documentElement.scrollWidth > document.documentElement.clientWidth
        );
        expect(hasHorizontalOverflow, `${path} horizontal overflow`).toBe(false);
    }
});

test("about page renders the branded hero and opens the ICT directory first @responsive", async ({ page }) => {
    await page.goto("/about");

    const hero = page.getByRole("heading", { level: 1, name: "About AL-QISC" }).locator("xpath=ancestor::section[1]");
    await expect(hero).toBeVisible();
    await expect(hero.locator("svg.pointer-events-none")).toHaveCount(1);

    const selectedTab = page.getByRole("tab", { selected: true });
    await expect(selectedTab).toHaveText("ICT");
    await expect(page.getByText("Committee members", { exact: true })).toHaveCount(0);

    const selectedTabIsFullyVisible = await selectedTab.evaluate((element) => {
        const tabBounds = element.getBoundingClientRect();
        const scrollerBounds = element.parentElement?.parentElement?.getBoundingClientRect();
        return Boolean(
            scrollerBounds &&
            tabBounds.left >= scrollerBounds.left &&
            tabBounds.right <= scrollerBounds.right &&
            tabBounds.top >= scrollerBounds.top &&
            tabBounds.bottom <= scrollerBounds.bottom
        );
    });
    expect(selectedTabIsFullyVisible).toBe(true);

    const hasHorizontalOverflow = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth
    );
    expect(hasHorizontalOverflow).toBe(false);
});

test("blog recent posts heading and about image composition are centered", async ({ page }) => {
    await page.goto("/blog");
    const recentPosts = page.getByRole("heading", { name: "Recent Posts" });
    const recentPostsBox = await recentPosts.boundingBox();
    const viewport = page.viewportSize();
    expect(recentPostsBox).not.toBeNull();
    expect(viewport).not.toBeNull();
    expect(Math.abs(recentPostsBox!.x + recentPostsBox!.width / 2 - viewport!.width / 2)).toBeLessThanOrEqual(4);

    await page.goto("/about");
    const committeeImage = page.getByAltText("AL-QISC committee at Albukhary International University");
    await expect(committeeImage).toBeVisible();
    await expect(committeeImage.locator("xpath=ancestor::figure[1]").locator("img")).toHaveCount(2);
});

test("contact form preserves input and opens an error dialog when delivery fails", async ({ page }) => {
    await page.route("**/api/contact", async (route) => {
        await route.fulfill({
            status: 503,
            contentType: "application/json",
            body: JSON.stringify({ error: "Online message delivery is not configured yet. Please use the email address shown on this page." }),
        });
    });
    await page.goto("/contact");
    await page.getByLabel(/^Name/).fill("E2E Visitor");
    await page.getByLabel(/^Email/).fill("visitor@example.com");
    await page.getByLabel(/^Subject/).fill("Release test");
    await page.getByLabel(/^Message/).fill("This is an automated delivery-state test message.");
    await expect(page.getByRole("textbox", { name: "Message", exact: true })).toHaveValue(/automated delivery-state/);
    await page.getByRole("button", { name: "Send Message" }).click();

    const errorDialog = page.getByRole("alertdialog", { name: "Message not sent" });
    await expect(errorDialog).toBeVisible();
    await expect(errorDialog).toContainText(/not configured/i);
    await expect(page.getByRole("textbox", { name: "Message", exact: true })).toHaveValue(/automated delivery-state/);
});
