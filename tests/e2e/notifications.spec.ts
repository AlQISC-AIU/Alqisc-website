import { expect, test } from "@playwright/test";

test("global messages open as centered, dismissible dialogs @responsive", async ({ page }, testInfo) => {
    if (testInfo.project.name === "mobile-chrome") {
        await page.setViewportSize({ width: 393, height: 727 });
    }
    await page.goto("/");
    await page.waitForFunction(() => !window.alert.toString().includes("[native code]"));

    await page.evaluate(() => {
        for (const detail of [
            { type: "success", title: "Saved", message: "Your changes were saved." },
            { type: "warning", title: "Please check", message: "Review the highlighted information." },
            { type: "error", title: "Upload failed", message: "The image could not be uploaded." },
        ]) {
            window.dispatchEvent(new CustomEvent("alqisc:notification", { detail }));
        }
    });

    const successDialog = page.getByRole("dialog", { name: "Saved" });
    await expect(successDialog).toBeVisible();
    await expect(successDialog).toHaveAttribute("aria-modal", "true");
    await expect(successDialog.getByText("Your changes were saved.")).toBeVisible();
    await expect(page.getByText("Review the highlighted information.")).toHaveCount(0);

    const box = await successDialog.boundingBox();
    const viewport = page.viewportSize();
    expect(box).not.toBeNull();
    expect(viewport).not.toBeNull();
    expect(Math.abs(box!.x + box!.width / 2 - viewport!.width / 2)).toBeLessThanOrEqual(2);
    expect(Math.abs(box!.y + box!.height / 2 - viewport!.height / 2)).toBeLessThanOrEqual(2);
    await expect(successDialog.getByRole("button", { name: "Close dialog" })).toBeFocused();

    await successDialog.getByRole("button", { name: "Close dialog" }).click();
    const warningDialog = page.getByRole("alertdialog", { name: "Please check" });
    await expect(warningDialog).toBeVisible();
    await expect(warningDialog.getByText("Review the highlighted information.")).toBeVisible();

    await page.keyboard.press("Escape");
    const errorDialog = page.getByRole("alertdialog", { name: "Upload failed" });
    await expect(errorDialog).toBeVisible();
    await expect(errorDialog.getByText("The image could not be uploaded.")).toBeVisible();

    await errorDialog.getByRole("button", { name: "Close dialog" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.getByRole("alertdialog")).toHaveCount(0);
});
