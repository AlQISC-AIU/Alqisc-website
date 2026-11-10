import { crc32 } from "node:zlib";
import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import ExcelJS from "exceljs";
import { getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import sharp from "sharp";

// The committee registration form on /join.
//
// The first group of tests stubs /api/committee-registration, so it exercises
// the form in a browser without storing anything. The second group submits for
// real and only runs against the local Firebase emulators:
//
//   npm run dev:emulators -- npx playwright test tests/e2e/join.spec.ts

const API = "**/api/committee-registration";
const PHOTO_API = "**/api/committee-registration/photo-upload";
const ADMIN = "/club-console-alqisc-7q4m-test/admin";
const TEN_MB = 10 * 1024 * 1024;

// What the admin has opened in the stubbed tests. Co-Curricular and Sister
// Affairs are closed, and each open department offers different positions.
const AVAILABILITY = {
    open_top_positions: ["general_secretary", "general_treasurer"],
    open_department_positions: {
        exco_dawah: ["head", "first_deputy_head", "second_deputy_head", "exco_member"],
        exco_co_curricular: [],
        exco_multimedia: ["exco_member"],
        exco_education: ["head"],
        exco_ict: ["second_deputy_head", "exco_member"],
        exco_sister_affairs: [],
    },
};
const OPEN = {
    config: { is_open: true, term: "2026/27", deadline: "2026-11-22", intro: "", ...AVAILABILITY },
    accepting: true,
};

const MOTIVATION = "To serve the community.";

async function openForm(page: Page, info: unknown = OPEN) {
    await page.route(API, async (route) => {
        if (route.request().method() === "GET") {
            await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(info) });
        } else {
            await route.fallback();
        }
    });
    await page.goto("/join");
}

function stepHeading(page: Page, name: string) {
    return page.getByRole("heading", { level: 3, name });
}

function question(page: Page, name: string | RegExp) {
    return page.getByRole("group", { name });
}

/** Picks an answer in a single-choice question, found by its legend. */
async function choose(page: Page, name: string | RegExp, answer: string) {
    await question(page, name).getByText(answer, { exact: true }).click();
}

async function next(page: Page) {
    await page.getByRole("button", { name: /^Next:/ }).click();
}

async function fillDetails(page: Page, email = "aisha.rahman@student.aiu.edu.my") {
    await page.getByLabel("Student email").fill(email);
    await page.getByLabel("Full name (all uppercase)").fill("Aisha Rahman");
    await page.getByLabel("Student ID").fill("AIU21011234");
    await page.getByLabel("Contact number").fill("+60 11-2233 5566");
    await page.getByLabel("Nationality").fill("Malaysian");
    await choose(page, "Level of education", "Foundation");
}

async function fillAbout(page: Page) {
    await page.getByLabel(/What do you know about/).fill("It is the Al-Qur'an and Islamic Club at AIU.");
    await choose(page, "Have you ever joined any of our programs?", "Never");
}

async function fillLeadership(page: Page, first = "General Secretary", second = "General Treasurer", departmentPosition = "") {
    await choose(page, "First choice", first);
    await choose(page, "Second choice", second);
    if (departmentPosition) await choose(page, "Department position", departmentPosition);
}

async function fillCommitment(page: Page) {
    await page.getByLabel(/What makes you suitable/).fill(MOTIVATION);
    await choose(page, /another position other than what you apply for/, "Yes");
}

/** Goes to the line of leadership step with the earlier steps filled in. */
async function reachLeadership(page: Page, email?: string) {
    await fillDetails(page, email);
    await next(page);
    await fillAbout(page);
    await next(page);
    await expect(stepHeading(page, "Line of leadership")).toBeVisible();
}

/** Fills every required question and stops on the last step, ready to submit. */
async function fillRequired(page: Page, email?: string) {
    await reachLeadership(page, email);
    await fillLeadership(page);
    await next(page);
    await fillCommitment(page);
}

async function expectNoHorizontalOverflow(page: Page, context: string) {
    const overflows = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    expect(overflows, `${context} horizontal overflow`).toBe(false);
}

/** Every visible form control must have a name a screen reader can announce. */
async function expectControlsNamed(page: Page, context: string) {
    const unnamed = await page.evaluate(() =>
        [...document.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>("form input, form select, form textarea")]
            .filter((control) => !control.closest("[aria-hidden='true']"))
            .filter((control) => !(control.labels?.length || control.getAttribute("aria-label") || control.getAttribute("aria-labelledby")))
            .map((control) => control.name || control.id));
    expect(unnamed, `${context} controls without a label`).toEqual([]);
}

async function expectTouchTarget(page: Page, name: string | RegExp, role: "button" | "link" = "button") {
    const box = await page.getByRole(role, { name, exact: typeof name === "string" }).boundingBox();
    expect(box, String(name)).not.toBeNull();
    expect(box!.height, `${name} height`).toBeGreaterThanOrEqual(44);
}

// A real 1x1 PNG, a PDF, and a text file dressed up as an image.
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64");
const PDF = Buffer.from("%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF");
const NOT_AN_IMAGE = Buffer.from("<html><script>alert(1)</script></html>".padEnd(512, " "));

/** A valid PNG of exactly `size` bytes: a real image padded with ignorable data chunks. */
async function pngOfSize(size: number) {
    const image = await sharp({ create: { width: 32, height: 32, channels: 3, background: "#205870" } }).png().toBuffer();
    const end = image.subarray(image.length - 12); // the closing IEND chunk
    const chunks: Buffer[] = [image.subarray(0, image.length - 12)];
    let remaining = size - image.length;
    while (remaining > 0) {
        // A chunk costs 12 bytes of framing; keep each well under the decoder's 8 MB limit.
        const data = Math.min(remaining - 12, 4 * 1024 * 1024);
        if (data < 0) throw new Error("Cannot pad a PNG by fewer than 12 bytes.");
        const body = Buffer.concat([Buffer.from("prVt"), Buffer.alloc(data)]);
        const length = Buffer.alloc(4);
        length.writeUInt32BE(data);
        const checksum = Buffer.alloc(4);
        checksum.writeUInt32BE(crc32(body));
        chunks.push(length, body, checksum);
        remaining -= data + 12;
    }
    return Buffer.concat([...chunks, end]);
}

test.describe("the form (registration API stubbed)", () => {
    test("loads the first step with every applicant detail question and no leftover question 9 @responsive", async ({ page }) => {
        const errors: string[] = [];
        page.on("pageerror", (error) => errors.push(error.message));
        await openForm(page);

        await expect(page.getByRole("heading", { level: 1, name: "Join the AL-QISC Committee" })).toBeVisible();
        await expect(page.getByText("New committee recruitment 2026/27")).toBeVisible();
        await expect(page.getByText("General requirements for all candidates")).toBeVisible();
        await expect(page.getByText("Step 1 of 4")).toBeVisible();
        await expect(stepHeading(page, "Applicant details")).toBeVisible();
        await expect(page.getByText("Applications close on 22 November 2026")).toBeVisible();

        for (const label of ["Student email", "Full name (all uppercase)", "Student ID", "Contact number", "Nationality"]) {
            await expect(page.getByLabel(label), label).toBeVisible();
            await expect(page.getByLabel(label), label).toHaveAttribute("required", "");
        }
        await expect(question(page, "Level of education").locator("label")).toHaveText(["LC", "Foundation", "Bachelor Degree"]);
        await expect(page.getByText("Formal picture", { exact: true })).toBeVisible();
        await expect(page.locator("#photo")).toBeAttached();

        // The accidental dropdown from the Google Form is gone: no dropdown at
        // all until a Bachelor student is asked for their year, and no stray
        // "Option 1".
        await expect(page.locator("form select")).toHaveCount(0);
        await expect(page.getByText("Option 1")).toHaveCount(0);
        await expectControlsNamed(page, "applicant details");
        expect(errors).toEqual([]);
    });

    test("explains when registration is closed, and when the deadline has passed", async ({ page }) => {
        await openForm(page, { config: { ...OPEN.config, is_open: false }, accepting: false });
        await expect(page.getByRole("heading", { name: "Registration is currently closed" })).toBeVisible();
        await expect(page.getByLabel("Student email")).toHaveCount(0);

        await openForm(page, { config: { ...OPEN.config, deadline: "2020-01-31" }, accepting: false });
        await expect(page.getByText(/closed on 31 January 2020/)).toBeVisible();
    });

    test("reports when the form cannot be loaded", async ({ page }) => {
        await page.route(API, (route) => route.fulfill({ status: 500, body: "" }));
        await page.goto("/join");
        await expect(page.getByRole("alert").filter({ hasText: "couldn't load the registration form" })).toBeVisible();
    });

    test("Bachelor-only questions appear only for Bachelor Degree students", async ({ page }) => {
        await openForm(page);
        await expect(page.getByLabel("Year of study")).toHaveCount(0);
        await expect(page.getByLabel(/School, programme/)).toHaveCount(0);

        await choose(page, "Level of education", "Bachelor Degree");
        await expect(page.getByLabel("Year of study").locator("option")).toHaveText(["Select your year", "Year 1", "Year 2", "Year 3"]);
        await expect(page.getByLabel(/School, programme/)).toBeVisible();
        // Both are optional in the official form.
        await expect(page.getByLabel("Year of study")).not.toHaveAttribute("required", "");
        await expectControlsNamed(page, "bachelor questions");

        for (const level of ["LC", "Foundation"]) {
            await choose(page, "Level of education", level);
            await expect(page.getByLabel("Year of study"), level).toHaveCount(0);
            await expect(page.getByLabel(/School, programme/), level).toHaveCount(0);
        }
    });

    test("required questions and invalid formats stop the applicant from continuing", async ({ page }) => {
        await openForm(page);
        await next(page);

        await expect(stepHeading(page, "Applicant details")).toBeVisible();
        await expect(page.getByRole("alert").filter({ hasText: "highlighted questions" })).toBeVisible();
        await expect(page.getByText("Enter your student email.")).toBeVisible();
        await expect(page.getByText("Select your level of education.")).toBeVisible();
        await expect(page.getByLabel("Student email")).toBeFocused();
        await expect(page.getByLabel("Student email")).toHaveAttribute("aria-invalid", "true");
        await expect(page.getByLabel("Student email")).toHaveAttribute("aria-describedby", "student_email-error");

        await fillDetails(page);
        await page.getByLabel("Student email").fill("aisha@gmail.com");
        await page.getByLabel("Contact number").fill("12ab");
        await next(page);
        await expect(page.getByText(/Use your AIU student email ending in @student\.aiu\.edu\.my/)).toBeVisible();
        await expect(page.getByText(/Enter a valid contact number/)).toBeVisible();
        await expect(stepHeading(page, "Applicant details")).toBeVisible();

        await page.getByLabel("Student email").fill("aisha.rahman@student.aiu.edu.my");
        await page.getByLabel("Contact number").fill("+011-22335566");
        await next(page);
        await expect(stepHeading(page, "Getting to know you")).toBeVisible();
        await expect(page.getByText("Step 2 of 4")).toBeVisible();
    });

    test("the full name shows in capitals without moving the cursor while typing", async ({ page }) => {
        await openForm(page);
        const name = page.getByLabel("Full name (all uppercase)");
        await name.click();
        await page.keyboard.type("aisha rahman");
        await expect(name).toHaveCSS("text-transform", "uppercase");
        // Go back to the start and insert there; the text must land where the cursor is.
        await page.keyboard.press("Home");
        await page.keyboard.type("nur ");
        await expect(name).toHaveValue("nur aisha rahman");
        for (let i = 0; i < 5; i++) await page.keyboard.press("ArrowRight");
        await page.keyboard.type("X");
        await expect(name).toHaveValue("nur aishaX rahman");
    });

    test("the programs question follows the answer about joining our programs", async ({ page }) => {
        await openForm(page);
        await fillDetails(page);
        await next(page);

        await expect(question(page, "Have you ever joined any of our programs?").locator("label")).toHaveText(["Yes", "Never"]);
        await expect(page.getByLabel(/Which Al-Qisc programs/)).toHaveCount(0);
        await choose(page, "Have you ever joined any of our programs?", "Yes");
        await expect(page.getByLabel(/Which Al-Qisc programs/)).toBeVisible();
        await choose(page, "Have you ever joined any of our programs?", "Never");
        await expect(page.getByLabel(/Which Al-Qisc programs/)).toHaveCount(0);

        // Committee experience is optional and always offered.
        await expect(page.getByLabel(/committee member of any club or association/)).toBeVisible();
        await expect(page.getByLabel(/committee member of any club or association/)).not.toHaveAttribute("required", "");
        await expectControlsNamed(page, "getting to know you");

        await next(page);
        await expect(page.getByText("Tell us what you know about Al-Qisc.")).toBeVisible();
        await page.getByLabel(/What do you know about/).fill("It is the Islamic club at AIU.");
        await next(page);
        await expect(stepHeading(page, "Line of leadership")).toBeVisible();
    });

    test("only positions the admin has opened can be chosen", async ({ page }) => {
        await openForm(page);
        await reachLeadership(page);

        // Co-Curricular and Sister Affairs have nothing open, so they are not offered.
        const openChoices = [
            "General Secretary", "General Treasurer",
            "EXCO Da'wah", "EXCO Multimedia, Design & Publication", "EXCO Educational Development", "EXCO ICT & Technical",
        ];
        await expect(question(page, "First choice").locator("label")).toHaveText(openChoices);
        await expect(question(page, "Second choice").locator("label")).toHaveText(openChoices);
        // Top Committee positions and departments are listed apart.
        await expect(question(page, "First choice").getByText("Top Committee", { exact: true })).toBeVisible();
        await expect(question(page, "First choice").getByText("Departments", { exact: true })).toBeVisible();
        await expect(page.getByText("EXCO Co-Curricular")).toHaveCount(0);
        await expect(page.getByText("EXCO Sister Affairs")).toHaveCount(0);

        // Opening a position in one department does not open it in another.
        const departmentPosition = question(page, "Department position");
        await fillLeadership(page, "EXCO Da'wah", "General Secretary");
        await expect(departmentPosition.locator("label")).toHaveText(["Head of Department", "1st Deputy Head", "2nd Deputy Head", "EXCO Member"]);
        await choose(page, "First choice", "EXCO Multimedia, Design & Publication");
        await expect(departmentPosition.locator("label")).toHaveText(["EXCO Member"]);
        await choose(page, "First choice", "EXCO ICT & Technical");
        await expect(departmentPosition.locator("label")).toHaveText(["2nd Deputy Head", "EXCO Member"]);
        await choose(page, "First choice", "EXCO Educational Development");
        await expect(departmentPosition.locator("label")).toHaveText(["Head of Department"]);
        await expect(page.getByText("Department Secretary")).toHaveCount(0);
        await expectControlsNamed(page, "line of leadership");
    });

    test("the department position follows the two choices", async ({ page }) => {
        await openForm(page);
        await reachLeadership(page);
        const departmentPosition = question(page, "Department position");

        // Two Top Committee choices: no department position.
        await fillLeadership(page, "General Treasurer", "General Secretary");
        await expect(departmentPosition).toHaveCount(0);
        // Only the second choice is a department.
        await choose(page, "Second choice", "EXCO Multimedia, Design & Publication");
        await expect(departmentPosition).toBeVisible();
        // Only the first choice is a department.
        await fillLeadership(page, "EXCO ICT & Technical", "General Treasurer");
        await expect(departmentPosition).toBeVisible();
        // Both are departments: only what is open in both is offered.
        await fillLeadership(page, "EXCO Da'wah", "EXCO Multimedia, Design & Publication");
        await expect(departmentPosition.locator("label")).toHaveText(["EXCO Member"]);

        // It is required once shown.
        await next(page);
        await expect(page.getByText("Select the department position you are applying for.")).toBeVisible();
        await expect(stepHeading(page, "Line of leadership")).toBeVisible();

        // An answer is cleared when the question no longer applies to it.
        await fillLeadership(page, "EXCO Da'wah", "General Secretary", "Head of Department");
        await expect(departmentPosition.getByRole("radio", { name: "Head of Department" })).toBeChecked();
        await choose(page, "First choice", "General Treasurer");
        await expect(departmentPosition).toHaveCount(0);
        await choose(page, "First choice", "EXCO Da'wah");
        await expect(departmentPosition.getByRole("radio", { checked: true })).toHaveCount(0);
        // ...and when the new choice does not offer it.
        await choose(page, "Department position", "Head of Department");
        await choose(page, "First choice", "EXCO ICT & Technical");
        await expect(departmentPosition.getByRole("radio", { checked: true })).toHaveCount(0);

        // Two departments with no position open in common cannot be combined.
        await fillLeadership(page, "EXCO Educational Development", "EXCO Multimedia, Design & Publication");
        await expect(page.getByText(/do not have a department\s+position open in common/)).toBeVisible();
        await next(page);
        await expect(stepHeading(page, "Line of leadership")).toBeVisible();
    });

    test("the first and second choice must be different", async ({ page }) => {
        await openForm(page);
        await reachLeadership(page);

        await choose(page, "First choice", "General Secretary");
        const sameAsFirst = question(page, "Second choice").getByRole("radio", { name: /General Secretary/ });
        await expect(sameAsFirst).toBeDisabled();
        await expect(question(page, "Second choice").getByText("Already your first choice")).toBeVisible();

        // Changing the first choice to match the second is caught as well.
        await choose(page, "Second choice", "General Treasurer");
        await choose(page, "First choice", "General Treasurer");
        await expect(page.getByText("Your second choice must be different from your first choice.")).toBeVisible();
        await next(page);
        await expect(stepHeading(page, "Line of leadership")).toBeVisible();

        await choose(page, "Second choice", "General Secretary");
        await next(page);
        await expect(stepHeading(page, "Motivation and commitment")).toBeVisible();
    });

    test("work sample instructions show only for Multimedia and ICT choices", async ({ page }) => {
        await openForm(page);
        await reachLeadership(page);
        const workSamples = page.getByText("For those who apply for Multimedia and ICT department only");

        await fillLeadership(page, "EXCO Da'wah", "General Secretary");
        await expect(workSamples).toHaveCount(0);
        await choose(page, "Second choice", "EXCO ICT & Technical");
        await expect(workSamples).toBeVisible();
        await expect(page.getByRole("link", { name: /Open the work samples folder/ })).toHaveAttribute(
            "href", "https://drive.google.com/drive/folders/12Ju7HHONozGb3nETRvYUpjKQScr7YpS1?usp=sharing",
        );
        await expect(page.getByText(/Start each file name with your full name and student ID/)).toBeVisible();
        await choose(page, "Second choice", "General Secretary");
        await expect(workSamples).toHaveCount(0);
        await choose(page, "First choice", "EXCO Multimedia, Design & Publication");
        await expect(workSamples).toBeVisible();
    });

    test("a complete application is sent once, with a short motivation and no optional uploads", async ({ page }) => {
        await openForm(page);
        let body = "";
        let submissions = 0;
        let photoRequests = 0;
        await page.route(PHOTO_API, async (route) => { photoRequests++; await route.abort(); });
        await page.route(API, async (route) => {
            if (route.request().method() !== "POST") return route.fallback();
            submissions++;
            body = route.request().postDataBuffer()?.toString("utf8") || "";
            // Hold the response briefly so the loading state can be observed.
            await new Promise((resolve) => setTimeout(resolve, 400));
            await route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ success: true }) });
        });

        await fillRequired(page);
        await expect(question(page, /selected to serve in another club/).locator("label")).toHaveText([
            "Yes, I can fully commit to both clubs",
            "Yes, but I may need to balance my responsibilities.",
            "No, I may not be able to fulfill both commitments",
        ]);
        await expect(page.getByText("Supporting documents, if any")).toBeVisible();
        await expect(page.getByText("How your information is used")).toBeVisible();
        // The deadline is repeated beside the submit button.
        await expect(page.getByText(/Applications close on 22 November 2026, at the end of the day/)).toBeVisible();
        await expectControlsNamed(page, "motivation and commitment");

        await page.getByRole("button", { name: "Submit application" }).click();
        await expect(page.getByRole("button", { name: "Submitting..." })).toBeDisabled();
        await expect(page.getByRole("heading", { name: "Thank you for your application" })).toBeVisible();
        await expect(page.getByText(/Your application for General Secretary and General Treasurer has been received/)).toBeVisible();
        await expect(page.getByText("aisha.rahman@student.aiu.edu.my")).toBeVisible();
        await expect(page.getByText(/Shortlisted applicants will be contacted via email/)).toBeVisible();
        await expect(page.getByText("Surah Al-Anfal, verse 27")).toBeVisible();

        const field = (name: string) => new RegExp(`name="${name}"\\r\\n\\r\\n([^\\r]*)`).exec(body)?.[1];
        expect(submissions).toBe(1);
        expect(photoRequests).toBe(0);
        expect(field("student_email")).toBe("aisha.rahman@student.aiu.edu.my");
        expect(field("education_level")).toBe("foundation");
        expect(field("joined_programs")).toBe("never");
        expect(field("first_choice")).toBe("general_secretary");
        expect(field("second_choice")).toBe("general_treasurer");
        expect(field("department_position")).toBe("");
        expect(field("accept_other_position")).toBe("yes");
        expect(field("other_club_commitment")).toBe("");
        // Well under the 50 characters the earlier form demanded.
        expect(field("motivation")).toBe(MOTIVATION);
        // Each choice is sent exactly once.
        expect(body.match(/name="first_choice"/g)).toHaveLength(1);
        expect(body.match(/name="second_choice"/g)).toHaveLength(1);
        expect(body.match(/name="department_position"/g)).toHaveLength(1);
        // The hidden trap field goes out empty for a real person.
        expect(field("website")).toBe("");
        expect(body).not.toContain('name="photo_upload_id"');
        expect(body).not.toContain('name="document"');
    });

    test("the trap field for automated submissions is hidden from people", async ({ page }) => {
        await openForm(page);
        const trap = page.locator("#website");
        await expect(trap).toBeAttached();
        await expect(trap).toHaveAttribute("tabindex", "-1");
        await expect(trap).toHaveAttribute("autocomplete", "off");
        await expect(trap).not.toBeInViewport();
        expect(await trap.evaluate((element) => Boolean(element.closest("[aria-hidden='true']")))).toBe(true);
        // Nothing a screen reader or keyboard user can reach by its name.
        await expect(page.getByRole("textbox", { name: /Leave this field empty/ })).toHaveCount(0);
    });

    test("a failed submission keeps the answers and explains what went wrong", async ({ page }) => {
        await openForm(page);
        await page.route(API, async (route) => {
            if (route.request().method() !== "POST") return route.fallback();
            await route.fulfill({
                status: 409,
                contentType: "application/json",
                body: JSON.stringify({ error: "An application with this student email has already been submitted for this term." }),
            });
        });
        await fillRequired(page);
        await page.getByRole("button", { name: "Submit application" }).click();

        const dialog = page.getByRole("alertdialog", { name: "Application not sent" });
        await expect(dialog).toContainText("already been submitted");
        await dialog.getByRole("button", { name: "Close dialog" }).click();
        await expect(stepHeading(page, "Motivation and commitment")).toBeVisible();
        await expect(page.getByLabel(/What makes you suitable/)).toHaveValue(MOTIVATION);
        await expect(page.getByRole("button", { name: "Submit application" })).toBeEnabled();
        await expect(page.getByRole("heading", { name: "Thank you for your application" })).toHaveCount(0);
    });

    test("a question rejected by the server is shown on its own step", async ({ page }) => {
        await openForm(page);
        await page.route(API, async (route) => {
            if (route.request().method() !== "POST") return route.fallback();
            await route.fulfill({
                status: 400,
                contentType: "application/json",
                body: JSON.stringify({
                    error: "General Treasurer is not open for applications. Please choose another.",
                    errors: { second_choice: "General Treasurer is not open for applications. Please choose another." },
                }),
            });
        });
        await fillRequired(page);
        await page.getByRole("button", { name: "Submit application" }).click();
        await page.getByRole("alertdialog", { name: "Application not sent" }).getByRole("button", { name: "Close dialog" }).click();

        await expect(stepHeading(page, "Line of leadership")).toBeVisible();
        await expect(question(page, "Second choice").getByText("General Treasurer is not open for applications. Please choose another.")).toBeVisible();
        // Earlier answers are still there.
        await expect(question(page, "First choice").getByRole("radio", { name: "General Secretary" })).toBeChecked();
    });

    test("applicants can go back without losing their answers", async ({ page }) => {
        await openForm(page);
        await fillDetails(page);
        await next(page);
        await fillAbout(page);
        await page.getByRole("button", { name: "Back", exact: true }).click();
        await expect(stepHeading(page, "Applicant details")).toBeVisible();
        await expect(page.getByLabel("Student ID")).toHaveValue("AIU21011234");
        await expect(page.getByRole("radio", { name: "Foundation", exact: true })).toBeChecked();
        await next(page);
        await expect(page.getByLabel(/What do you know about/)).toHaveValue(/Islamic Club at AIU/);
    });

    test("a photo is checked for size and content the moment it is chosen", async ({ page }) => {
        await openForm(page);
        const photo = page.locator("#photo");

        // One byte over the limit.
        await photo.setInputFiles({ name: "huge.png", mimeType: "image/png", buffer: Buffer.concat([PNG, Buffer.alloc(TEN_MB + 1 - PNG.length)]) });
        await expect(page.getByText(/That file was not attached\. This photo is 10\.0 MB\. The limit is 10\.0 MB\./)).toBeVisible();
        await expect(page.getByAltText("Your photo preview")).toHaveCount(0);

        // An image extension and type, but not an image inside.
        await photo.setInputFiles({ name: "portrait.jpg", mimeType: "image/jpeg", buffer: NOT_AN_IMAGE });
        await expect(page.getByText(/That file was not attached\. This file is not a JPG, PNG, or WebP image\./)).toBeVisible();
        await photo.setInputFiles({ name: "scan.png", mimeType: "image/png", buffer: PDF });
        await expect(page.getByText(/This file is not a JPG, PNG, or WebP image\./)).toBeVisible();
        await expect(page.getByAltText("Your photo preview")).toHaveCount(0);

        // A real image is attached, whatever its name says.
        await photo.setInputFiles({ name: "formal.bin", mimeType: "application/octet-stream", buffer: PNG });
        await expect(page.getByAltText("Your photo preview")).toBeVisible();
        await expect(page.getByText(/formal\.bin · 1 KB/)).toBeVisible();
        await expect(page.getByText(/That file was not attached/)).toHaveCount(0);
        await expectTouchTarget(page, "Remove photo");
        await page.getByRole("button", { name: "Remove photo" }).click();
        await expect(page.getByAltText("Your photo preview")).toHaveCount(0);

        // The picture is optional: the step can be left without one.
        await fillDetails(page);
        await next(page);
        await expect(stepHeading(page, "Getting to know you")).toBeVisible();
    });

    test("a supporting document is checked for size and content the moment it is chosen", async ({ page }) => {
        await openForm(page);
        await fillRequired(page);
        const document = page.locator("#document");

        await document.setInputFiles({ name: "notes.pdf", mimeType: "application/pdf", buffer: Buffer.from("just some text") });
        await expect(page.getByText(/That file was not attached\. This file is not a PDF, JPG, PNG, or WebP file\./)).toBeVisible();
        await document.setInputFiles({ name: "big.pdf", mimeType: "application/pdf", buffer: Buffer.concat([PDF, Buffer.alloc(3 * 1024 * 1024 + 1 - PDF.length)]) });
        await expect(page.getByText(/This file is 3\.0 MB\. The limit is 3\.0 MB\./)).toBeVisible();

        await document.setInputFiles({ name: "certificate.pdf", mimeType: "application/pdf", buffer: PDF });
        await expect(page.getByText("certificate.pdf")).toBeVisible();
        await expect(page.getByText(/That file was not attached/)).toHaveCount(0);
        await expectTouchTarget(page, "Remove document");
        await page.getByRole("button", { name: "Remove document" }).click();
        await expect(page.getByText("certificate.pdf")).toHaveCount(0);
    });

    test("an application is not sent when its photo cannot be uploaded", async ({ page }) => {
        test.setTimeout(90_000);
        await openForm(page);
        let submissions = 0;
        await page.route(API, async (route) => {
            if (route.request().method() !== "POST") return route.fallback();
            submissions++;
            await route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ success: true }) });
        });
        await page.route(PHOTO_API, (route) => route.fulfill({
            status: 201,
            contentType: "application/json",
            body: JSON.stringify({ upload_id: "a".repeat(40), path: `committee-application-uploads/${"a".repeat(40)}/photo`, expires_at: "" }),
        }));
        // The connection to Storage drops for every attempt.
        await page.route(/firebasestorage\.googleapis\.com|:9199\//, (route) => route.abort("connectionfailed"));

        await page.locator("#photo").setInputFiles({ name: "formal.png", mimeType: "image/png", buffer: PNG });
        await fillRequired(page);
        await page.getByRole("button", { name: "Submit application" }).click();
        await expect(page.getByRole("button", { name: /Uploading your photo/ })).toBeDisabled();

        const dialog = page.getByRole("alertdialog", { name: "Application not sent" });
        await expect(dialog).toContainText("Your photo could not be uploaded, so your application has not been sent.", { timeout: 60_000 });
        expect(submissions).toBe(0);
        await dialog.getByRole("button", { name: "Close dialog" }).click();
        await expect(page.getByRole("heading", { name: "Thank you for your application" })).toHaveCount(0);
        // Everything is still in place for another try.
        await expect(page.getByLabel(/What makes you suitable/)).toHaveValue(MOTIVATION);
        await expect(page.getByRole("button", { name: "Submit application" })).toBeEnabled();
    });

    test("a refused photo upload is explained before anything is uploaded", async ({ page }) => {
        await openForm(page);
        let submissions = 0;
        let uploads = 0;
        await page.route(API, async (route) => {
            if (route.request().method() !== "POST") return route.fallback();
            submissions++;
            await route.abort();
        });
        await page.route(PHOTO_API, (route) => route.fulfill({
            status: 409,
            contentType: "application/json",
            body: JSON.stringify({ error: "An application with this student email has already been submitted for this term." }),
        }));
        await page.route(/firebasestorage\.googleapis\.com|:9199\//, async (route) => { uploads++; await route.abort(); });

        await page.locator("#photo").setInputFiles({ name: "formal.png", mimeType: "image/png", buffer: PNG });
        await fillRequired(page);
        await page.getByRole("button", { name: "Submit application" }).click();
        await expect(page.getByRole("alertdialog", { name: "Application not sent" })).toContainText("already been submitted");
        expect(uploads).toBe(0);
        expect(submissions).toBe(0);
    });

    test("the form can be completed with the keyboard alone", async ({ page }) => {
        test.setTimeout(90_000);
        await openForm(page);
        await page.route(API, async (route) => {
            if (route.request().method() !== "POST") return route.fallback();
            await route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ success: true }) });
        });

        const type = async (label: string | RegExp, text: string) => {
            await page.getByLabel(label).focus();
            await page.keyboard.type(text);
        };
        /** Moves to a question with Tab and picks an answer with the arrow keys. */
        const pick = async (name: string | RegExp, presses: number) => {
            const radios = question(page, name).getByRole("radio");
            await radios.first().focus();
            await page.keyboard.press("Space");
            for (let i = 0; i < presses; i++) await page.keyboard.press("ArrowDown");
            // The chosen card shows a focus ring.
            const focused = question(page, name).locator("label:focus-within");
            await expect(focused).toHaveCount(1);
            expect(await focused.evaluate((label) => getComputedStyle(label).boxShadow)).not.toBe("none");
        };

        await type("Student email", "aisha.rahman@student.aiu.edu.my");
        await page.keyboard.press("Tab");
        await expect(page.getByLabel("Full name (all uppercase)")).toBeFocused();
        await page.keyboard.type("Aisha Rahman");
        await page.keyboard.press("Tab");
        await expect(page.getByLabel("Student ID")).toBeFocused();
        await page.keyboard.type("AIU21011234");
        await page.keyboard.press("Tab");
        await page.keyboard.type("+60 11-2233 5566");
        await page.keyboard.press("Tab");
        await page.keyboard.type("Malaysian");
        await page.keyboard.press("Tab");
        // Tab lands on the level of education; Space picks LC, one arrow moves to Foundation.
        await expect(question(page, "Level of education").getByRole("radio").first()).toBeFocused();
        await page.keyboard.press("Space");
        await page.keyboard.press("ArrowDown");
        await expect(page.getByRole("radio", { name: "Foundation", exact: true })).toBeChecked();
        // Enter moves on, and focus lands on the new step's heading.
        await page.keyboard.press("Enter");
        await expect(stepHeading(page, "Getting to know you")).toBeFocused();

        await type(/What do you know about/, "The Islamic club at AIU.");
        await pick("Have you ever joined any of our programs?", 1);
        await expect(page.getByRole("radio", { name: "Never", exact: true })).toBeChecked();
        await page.getByRole("button", { name: /^Next:/ }).focus();
        await page.keyboard.press("Enter");
        await expect(stepHeading(page, "Line of leadership")).toBeFocused();

        await pick("First choice", 0);
        await expect(question(page, "First choice").getByRole("radio", { name: "General Secretary" })).toBeChecked();
        // The first choice is skipped in the second list, so Space lands on the next one.
        await question(page, "Second choice").getByRole("radio", { name: "General Treasurer" }).focus();
        await page.keyboard.press("Space");
        await page.getByRole("button", { name: /^Next:/ }).focus();
        await page.keyboard.press("Enter");
        await expect(stepHeading(page, "Motivation and commitment")).toBeFocused();

        await type(/What makes you suitable/, MOTIVATION);
        await pick(/another position other than what you apply for/, 0);
        // The file buttons are reachable too.
        await page.locator("#document").focus();
        await expect(page.locator("label[for='document']")).toHaveCSS("box-shadow", /rgb/);
        await page.getByRole("button", { name: "Submit application" }).focus();
        await page.keyboard.press("Enter");
        await expect(page.getByRole("heading", { name: "Thank you for your application" })).toBeVisible();
    });

    test("every step fits the screen with comfortable touch targets @responsive", async ({ page }) => {
        // Walks the whole form, which takes a while on a development server.
        test.setTimeout(90_000);
        await openForm(page);
        await choose(page, "Level of education", "Bachelor Degree");
        await expectNoHorizontalOverflow(page, "applicant details");
        await expectTouchTarget(page, /^Next:/);
        const uploadButton = await page.locator("label[for='photo']").boundingBox();
        expect(uploadButton!.height).toBeGreaterThanOrEqual(44);
        for (const card of await question(page, "Level of education").locator("label").all()) {
            expect((await card.boundingBox())!.height).toBeGreaterThanOrEqual(44);
        }

        await fillDetails(page);
        await next(page);
        await choose(page, "Have you ever joined any of our programs?", "Yes");
        await expectNoHorizontalOverflow(page, "getting to know you");

        await fillAbout(page);
        await next(page);
        await fillLeadership(page, "EXCO Multimedia, Design & Publication", "EXCO ICT & Technical", "EXCO Member");
        await expect(page.getByRole("link", { name: /Open the work samples folder/ })).toBeVisible();
        await expectTouchTarget(page, /Open the work samples folder/, "link");
        await expectNoHorizontalOverflow(page, "line of leadership");

        await next(page);
        await expect(stepHeading(page, "Motivation and commitment")).toBeVisible();
        await choose(page, /selected to serve in another club/, "Yes, but I may need to balance my responsibilities.");
        await expectTouchTarget(page, "Clear selection");
        await expectTouchTarget(page, "Submit application");
        await expectTouchTarget(page, "Back");
        await expectNoHorizontalOverflow(page, "motivation and commitment");
    });

    test("every step fits a narrow 320px phone", async ({ page }) => {
        await page.setViewportSize({ width: 320, height: 640 });
        await openForm(page);
        await choose(page, "Level of education", "Bachelor Degree");
        await expectNoHorizontalOverflow(page, "applicant details at 320px");
        await next(page);
        // Error messages wrap instead of widening the page.
        await expect(page.getByText("Enter your student email.")).toBeVisible();
        await expectNoHorizontalOverflow(page, "applicant details with errors at 320px");

        await fillDetails(page);
        await next(page);
        await fillAbout(page);
        await expectNoHorizontalOverflow(page, "getting to know you at 320px");
        await next(page);
        await fillLeadership(page, "EXCO Multimedia, Design & Publication", "EXCO ICT & Technical", "EXCO Member");
        await expectNoHorizontalOverflow(page, "line of leadership at 320px");
        await next(page);
        await fillCommitment(page);
        await expectNoHorizontalOverflow(page, "motivation and commitment at 320px");
    });
});

// ---------------------------------------------------------------------------
// Real submissions. These write to Firestore and Storage, so they only ever run
// against the local emulators with a demo project.
// ---------------------------------------------------------------------------
const projectId = process.env.FIREBASE_PROJECT_ID || "";
const bucketName = process.env.FIREBASE_STORAGE_BUCKET || "";
const storageHost = process.env.FIREBASE_STORAGE_EMULATOR_HOST || "";
const onEmulators = Boolean(process.env.FIRESTORE_EMULATOR_HOST && storageHost && projectId.startsWith("demo-"));

function emulatorApp() {
    return getApps().find((app) => app.name === "join-e2e")
        || initializeApp({ projectId, storageBucket: bucketName }, "join-e2e");
}
const db = () => getFirestore(emulatorApp());
const bucket = () => getStorage(emulatorApp()).bucket();

const TERM = "E2E 2026/27";
const BROWSER_EMAIL = `browser.applicant.${Date.now()}@student.aiu.edu.my`;
// Head is open in Da'wah only; EXCO Member in Da'wah and Multimedia; ICT has
// its own pair; General Treasurer and three departments are closed.
const REAL_AVAILABILITY = {
    open_top_positions: ["general_secretary"],
    open_department_positions: {
        exco_dawah: ["head", "exco_member"],
        exco_co_curricular: [],
        exco_multimedia: ["exco_member"],
        exco_education: [],
        exco_ict: ["second_deputy_head", "exco_member"],
        exco_sister_affairs: [],
    },
};

const validFields = {
    student_email: "api.applicant@student.aiu.edu.my",
    full_name: "Api Applicant",
    student_id: "AIU21019999",
    education_level: "bachelor",
    year_of_study: "Year 1",
    programme: "SCI & BCS & Cohort 6",
    phone: "+60112233556",
    nationality: "Malaysian",
    about_alqisc: "The Islamic club at AIU.",
    joined_programs: "yes",
    programs_joined: "Weekly Islamic Talk",
    experience: "",
    first_choice: "exco_ict",
    second_choice: "general_secretary",
    department_position: "exco_member",
    motivation: MOTIVATION,
    accept_other_position: "yes",
    other_club_commitment: "balance",
    website: "",
};

test.describe("real submissions (Firebase emulators only)", () => {
    test.skip(!onEmulators, "Needs the local Firebase emulators; see the comment at the top of this file.");
    test.describe.configure({ mode: "serial" });

    // The endpoints limit requests per address, so each request below comes
    // from its own address unless a test is about that limit.
    let address = 0;
    const from = () => ({ "x-forwarded-for": `10.20.${Math.floor(++address / 250)}.${address % 250}` });
    const RUN = Date.now();
    let person = 0;
    const applicant = (overrides: Record<string, string> = {}) => ({
        ...validFields,
        // Unique per run: the server remembers recent attempts per email.
        student_email: `applicant.${RUN}.${++person}@student.aiu.edu.my`,
        ...overrides,
    });

    const submit = (request: APIRequestContext, fields: Record<string, string>, files: Record<string, { name: string; mimeType: string; buffer: Buffer }> = {}) =>
        request.post("/api/committee-registration", { headers: from(), multipart: { ...fields, ...files } });

    const requestUpload = (request: APIRequestContext, fields: Record<string, string>, photo: { size: number; type: string }) =>
        request.post("/api/committee-registration/photo-upload", {
            headers: from(),
            data: { ...fields, photo_size: photo.size, photo_type: photo.type },
        });

    /** Uploads a file the way a browser does: straight to Storage, signed in as nobody. */
    const uploadToStorage = (request: APIRequestContext, path: string, contentType: string, buffer: Buffer) =>
        request.post(`http://${storageHost}/v0/b/${bucketName}/o?name=${encodeURIComponent(path)}`, {
            headers: { "Content-Type": contentType },
            data: buffer,
        });

    const stored = async (email: string) =>
        (await db().collection("committee_applications").where("student_email", "==", email).get()).docs;

    async function clearCollection(name: string) {
        for (const document of (await db().collection(name).get()).docs) await document.ref.delete();
    }

    async function setConfig(overrides: Record<string, unknown> = {}) {
        await db().doc("committee_registration_config/current").set({
            is_open: true, term: TERM, deadline: "", intro: "", updated_at: new Date().toISOString(), ...REAL_AVAILABILITY, ...overrides,
        });
    }

    test.beforeAll(async () => {
        await setConfig();
        await clearCollection("committee_applications");
        await clearCollection("committee_upload_tickets");
        await bucket().deleteFiles({ prefix: "committee-application" });
    });

    test.describe("the public endpoints", () => {
        test("report what is open, and still carry the earlier response fields", async ({ request }) => {
            const response = await request.get("/api/committee-registration");
            expect(response.status()).toBe(200);
            const body = await response.json();
            expect(body.accepting).toBe(true);
            expect(body.config).toMatchObject({ is_open: true, term: TERM, deadline: "", intro: "", ...REAL_AVAILABILITY });
            // What the earlier form read; kept so older clients do not break.
            expect(body.config.open_positions).toEqual(["secretary", "head", "deputy_head", "committee_member"]);
            expect(Array.isArray(body.config.open_departments)).toBe(true);
            expect(Array.isArray(body.departments)).toBe(true);
            expect(body.eligible_members).toEqual([]);
        });

        test("reject incomplete, invalid and unexpected input", async ({ request }) => {
            const missing = await submit(request, { website: "" });
            expect(missing.status()).toBe(400);
            expect(Object.keys((await missing.json()).errors).sort()).toEqual([
                "about_alqisc", "accept_other_position", "education_level", "first_choice", "full_name", "joined_programs",
                "motivation", "nationality", "phone", "second_choice", "student_email", "student_id",
            ]);

            const invalid = await submit(request, applicant({ student_email: "someone@gmail.com", phone: "12", education_level: "phd" }));
            expect(invalid.status()).toBe(400);
            expect(Object.keys((await invalid.json()).errors).sort()).toEqual(["education_level", "phone", "student_email"]);

            // Markup and control characters are stored as plain text, never refused or run.
            const awkward = applicant({ about_alqisc: "<script>alert(1)</script> ' OR 1=1 --", motivation: "=HYPERLINK(\"http://x\")" });
            expect((await submit(request, awkward)).status()).toBe(201);
            const [record] = await stored(awkward.student_email);
            expect(record.data().about_alqisc).toContain("<script>alert(1)</script>");
            // Fields the form does not have cannot be smuggled into the record.
            const smuggled = applicant({ status: "accepted", admin_notes: "approved", photo_path: "images/members/x.jpg", term: "other" });
            expect((await submit(request, smuggled)).status()).toBe(201);
            expect((await stored(smuggled.student_email))[0].data()).toMatchObject({ status: "pending", admin_notes: "", photo_path: "", term: TERM });
        });

        test("refuse a filled trap field", async ({ request }) => {
            const bot = applicant({ website: "https://spam.example" });
            const response = await submit(request, bot);
            expect(response.status()).toBe(400);
            expect((await response.json()).error).toBe("Invalid registration submission.");
            expect(await stored(bot.student_email)).toHaveLength(0);

            const ticket = await requestUpload(request, bot, { size: PNG.length, type: "image/png" });
            expect(ticket.status()).toBe(400);
        });

        test("accept only positions that are open", async ({ request }) => {
            // An open Top Committee position with an open department position.
            const open = applicant({ first_choice: "general_secretary", second_choice: "exco_dawah", department_position: "head" });
            expect((await submit(request, open)).status()).toBe(201);

            // A closed Top Committee position.
            const closedTop = await submit(request, applicant({ first_choice: "general_treasurer", second_choice: "exco_dawah", department_position: "head" }));
            expect(closedTop.status()).toBe(400);
            expect((await closedTop.json()).errors).toEqual({ first_choice: "General Treasurer is not open for applications. Please choose another." });

            // A department with nothing open.
            const closedDepartment = await submit(request, applicant({ first_choice: "exco_education", second_choice: "general_secretary", department_position: "head" }));
            expect(closedDepartment.status()).toBe(400);
            expect(Object.keys((await closedDepartment.json()).errors)).toEqual(["first_choice"]);

            // Head is open in Da'wah, which does not open it in Multimedia.
            const elsewhere = await submit(request, applicant({ first_choice: "exco_multimedia", second_choice: "general_secretary", department_position: "head" }));
            expect(elsewhere.status()).toBe(400);
            expect((await elsewhere.json()).errors).toEqual({
                department_position: "Head of Department is not open for applications in EXCO Multimedia, Design & Publication.",
            });
            const here = applicant({ first_choice: "exco_multimedia", second_choice: "general_secretary", department_position: "exco_member" });
            expect((await submit(request, here)).status()).toBe(201);

            // A department position must be open in both departments chosen.
            const both = await submit(request, applicant({ first_choice: "exco_dawah", second_choice: "exco_multimedia", department_position: "head" }));
            expect(both.status()).toBe(400);

            // A position level that does not exist in departments.
            for (const department_position of ["department_secretary", "general_secretary", "member"]) {
                const response = await submit(request, applicant({ department_position }));
                expect(response.status(), department_position).toBe(400);
            }
        });

        test("require two different choices and one department position", async ({ request }) => {
            const same = await submit(request, applicant({ first_choice: "exco_ict", second_choice: "exco_ict" }));
            expect(same.status()).toBe(400);
            expect((await same.json()).errors).toEqual({ second_choice: "Your second choice must be different from your first choice." });

            const noSecond = await submit(request, applicant({ second_choice: "" }));
            expect(noSecond.status()).toBe(400);

            // A department choice needs its department position.
            const noPosition = await submit(request, applicant({ department_position: "" }));
            expect(noPosition.status()).toBe(400);
            expect(Object.keys((await noPosition.json()).errors)).toEqual(["department_position"]);

            // A choice sent twice, or as a list, is refused outright.
            const person1 = applicant();
            const repeated = new FormData();
            for (const [key, value] of Object.entries(person1)) repeated.append(key, value);
            repeated.append("first_choice", "exco_dawah");
            const twice = await request.post("/api/committee-registration", { headers: from(), multipart: repeated });
            expect(twice.status()).toBe(400);
            expect((await twice.json()).error).toMatch(/one first choice, one second choice and one department position/);
            expect(await stored(person1.student_email)).toHaveLength(0);

            const list = await request.post("/api/committee-registration/photo-upload", {
                headers: from(),
                data: { ...applicant(), first_choice: ["exco_ict", "exco_dawah"], photo_size: PNG.length, photo_type: "image/png" },
            });
            expect(list.status()).toBe(400);
        });

        test("store a department application and a Top Committee one, once per student email", async ({ request }) => {
            const department = applicant();
            expect((await submit(request, department)).status()).toBe(201);
            const [record] = await stored(department.student_email);
            expect(record.data()).toMatchObject({
                form_version: 2,
                term: TERM,
                full_name: "API APPLICANT",
                education_level: "bachelor",
                year_of_study: "Year 1",
                programme: "SCI & BCS & Cohort 6",
                nationality: "Malaysian",
                joined_programs: "yes",
                programs_joined: "Weekly Islamic Talk",
                first_choice: "exco_ict",
                first_choice_name: "EXCO ICT & Technical · EXCO Member",
                second_choice: "general_secretary",
                second_choice_name: "General Secretary",
                department_position: "exco_member",
                accept_other_position: "yes",
                other_club_commitment: "balance",
                photo_path: "",
                document_path: "",
                status: "pending",
            });
            // Nothing about a Google account is collected.
            for (const field of ["google_name", "google_email", "google_photo", "uid", "display_name", "photo_url"]) {
                expect(record.data()).not.toHaveProperty(field);
            }

            // The same student cannot apply again, for the same or other positions.
            expect((await submit(request, department)).status()).toBe(409);
            const other = await submit(request, { ...department, first_choice: "exco_dawah", second_choice: "exco_multimedia", department_position: "exco_member" });
            expect(other.status()).toBe(409);
            expect((await submit(request, { ...department, student_email: department.student_email.toUpperCase() })).status()).toBe(409);
            expect(await stored(department.student_email)).toHaveLength(1);
        });

        test("limit repeated attempts for one student email without blocking others on the same network", async ({ request }) => {
            const campus = { "x-forwarded-for": `203.0.113.${Date.now() % 250}` };
            const post = (student_email: string) =>
                request.post("/api/committee-registration", { headers: campus, multipart: { ...validFields, student_email, phone: "x" } });

            const statuses: number[] = [];
            // The limit lives in the server's memory, so each run uses its own addresses.
            const run = Date.now();
            for (let attempt = 0; attempt < 11; attempt++) statuses.push((await post(`limited.${run}@student.aiu.edu.my`)).status());
            expect(statuses.slice(0, 10)).toEqual(Array(10).fill(400));
            expect(statuses[10]).toBe(429);

            // Other students behind the same campus address are unaffected.
            for (let student = 0; student < 30; student++) {
                expect((await post(`classmate.${run}.${student}@student.aiu.edu.my`)).status(), `classmate ${student}`).toBe(400);
            }
        });
    });

    test.describe("photo uploads", () => {
        test("the upload endpoint only helps complete, valid applications", async ({ request }) => {
            const person1 = applicant();
            const good = await requestUpload(request, person1, { size: PNG.length, type: "image/png" });
            expect(good.status()).toBe(201);
            const ticket = await good.json();
            expect(ticket.upload_id).toMatch(/^[a-f0-9]{40}$/);
            expect(ticket.path).toBe(`committee-application-uploads/${ticket.upload_id}/photo`);

            expect((await requestUpload(request, { ...person1, phone: "x" }, { size: PNG.length, type: "image/png" })).status()).toBe(400);
            expect((await requestUpload(request, { ...person1, first_choice: "general_treasurer" }, { size: PNG.length, type: "image/png" })).status()).toBe(400);
            // Size and type limits.
            expect((await requestUpload(request, person1, { size: TEN_MB + 1, type: "image/png" })).status()).toBe(400);
            expect((await requestUpload(request, person1, { size: 0, type: "image/png" })).status()).toBe(400);
            for (const type of ["image/gif", "image/svg+xml", "application/pdf", "text/html"]) {
                expect((await requestUpload(request, person1, { size: 100, type })).status(), type).toBe(400);
            }
        });

        test("a photo uploaded straight to Storage is checked, re-encoded and filed with the application", async ({ request }) => {
            const person1 = applicant();
            const ticket = await (await requestUpload(request, person1, { size: PNG.length, type: "image/png" })).json();
            expect((await uploadToStorage(request, ticket.path, "image/png", PNG)).status()).toBe(200);

            const response = await submit(request, { ...person1, photo_upload_id: ticket.upload_id }, {
                document: { name: "portfolio.pdf", mimeType: "application/pdf", buffer: PDF },
            });
            expect(response.status()).toBe(201);

            const [record] = await stored(person1.student_email);
            const data = record.data();
            expect(data.photo_path).toBe(`committee-applications/${record.id}.jpg`);
            expect(data.photo_type).toBe("image/jpeg");
            expect(data.document_path).toBe(`committee-applications/${record.id}-document.pdf`);
            const [photo] = await bucket().file(data.photo_path).download();
            expect((await sharp(photo).metadata()).format).toBe("jpeg");
            expect((await bucket().file(data.document_path).download())[0].equals(PDF)).toBe(true);
            // The temporary upload and its ticket are gone.
            expect((await bucket().file(ticket.path).exists())[0]).toBe(false);
            expect((await db().doc(`committee_upload_tickets/${ticket.upload_id}`).get()).exists).toBe(false);
        });

        test("a valid photo of exactly 10 MB is accepted end to end, and one byte more is refused", async ({ request }) => {
            test.setTimeout(120_000);
            const largest = await pngOfSize(TEN_MB);
            expect(largest.length).toBe(TEN_MB);

            const person1 = applicant();
            const ticket = await (await requestUpload(request, person1, { size: TEN_MB, type: "image/png" })).json();
            expect((await uploadToStorage(request, ticket.path, "image/png", largest)).status()).toBe(200);
            expect((await submit(request, { ...person1, photo_upload_id: ticket.upload_id })).status()).toBe(201);
            const [record] = await stored(person1.student_email);
            const [photo] = await bucket().file(record.data().photo_path).download();
            expect((await sharp(photo).metadata()).format).toBe("jpeg");
            // The stored copy is small enough for the admin routes to return.
            expect(photo.length).toBeLessThan(4 * 1024 * 1024);

            // One byte over: no ticket, and Storage refuses it even with a forged one.
            const person2 = applicant();
            expect((await requestUpload(request, person2, { size: TEN_MB + 1, type: "image/png" })).status()).toBe(400);
            const forged = "f".repeat(40);
            await db().doc(`committee_upload_tickets/${forged}`).set({
                application_id: "x", size: TEN_MB + 1, content_type: "image/png", expires_at: new Date(Date.now() + 600_000),
            });
            const tooBig = await uploadToStorage(request, `committee-application-uploads/${forged}/photo`, "image/png", Buffer.concat([largest, Buffer.alloc(1)]));
            expect(tooBig.status()).toBe(403);
            await db().doc(`committee_upload_tickets/${forged}`).delete();
        });

        test("a file that is not really an image is refused and removed, and no application is stored", async ({ request }) => {
            const person1 = applicant();
            // Storage only sees the declared type, so the upload itself goes through.
            const ticket = await (await requestUpload(request, person1, { size: NOT_AN_IMAGE.length, type: "image/png" })).json();
            expect((await uploadToStorage(request, ticket.path, "image/png", NOT_AN_IMAGE)).status()).toBe(200);

            const response = await submit(request, { ...person1, photo_upload_id: ticket.upload_id });
            expect(response.status()).toBe(400);
            expect(await response.json()).toMatchObject({ code: "photo", error: "Upload your photo as a JPG, PNG, or WebP image." });
            expect(await stored(person1.student_email)).toHaveLength(0);
            expect((await bucket().file(ticket.path).exists())[0]).toBe(false);
            expect((await db().doc(`committee_upload_tickets/${ticket.upload_id}`).get()).exists).toBe(false);

            // A truncated image with a genuine header is caught as well.
            const person2 = applicant();
            const broken = PNG.subarray(0, 24);
            const second = await (await requestUpload(request, person2, { size: broken.length, type: "image/png" })).json();
            await uploadToStorage(request, second.path, "image/png", broken);
            expect((await submit(request, { ...person2, photo_upload_id: second.upload_id })).status()).toBe(400);
            expect(await stored(person2.student_email)).toHaveLength(0);
        });

        test("an interrupted upload leaves no application behind, and can be finished later", async ({ request }) => {
            const person1 = applicant();
            const ticket = await (await requestUpload(request, person1, { size: PNG.length, type: "image/png" })).json();

            // The browser never finished sending the file.
            const early = await submit(request, { ...person1, photo_upload_id: ticket.upload_id });
            expect(early.status()).toBe(400);
            expect(await early.json()).toMatchObject({ code: "photo", error: "Your photo did not finish uploading. Please try again." });
            expect(await stored(person1.student_email)).toHaveLength(0);

            // Sending it again against the same ticket completes the application.
            expect((await uploadToStorage(request, ticket.path, "image/png", PNG)).status()).toBe(200);
            expect((await submit(request, { ...person1, photo_upload_id: ticket.upload_id })).status()).toBe(201);
            expect(await stored(person1.student_email)).toHaveLength(1);
        });

        test("an upload only counts for the application it was allowed for", async ({ request }) => {
            const owner = applicant();
            const ticket = await (await requestUpload(request, owner, { size: PNG.length, type: "image/png" })).json();
            await uploadToStorage(request, ticket.path, "image/png", PNG);

            const thief = applicant();
            const stolen = await submit(request, { ...thief, photo_upload_id: ticket.upload_id });
            expect(stolen.status()).toBe(400);
            expect(await stored(thief.student_email)).toHaveLength(0);
            // The owner's upload is untouched and still works.
            expect((await submit(request, { ...owner, photo_upload_id: ticket.upload_id })).status()).toBe(201);

            for (const upload_id of ["../../committee-applications/x", "a".repeat(40), "not-a-ticket"]) {
                const response = await submit(request, { ...applicant(), photo_upload_id: upload_id });
                expect(response.status(), upload_id).toBe(400);
            }
        });

        test("starting again discards the earlier unfinished upload, and expired uploads are cleared", async ({ request }) => {
            const person1 = applicant();
            const first = await (await requestUpload(request, person1, { size: PNG.length, type: "image/png" })).json();
            await uploadToStorage(request, first.path, "image/png", PNG);
            const second = await (await requestUpload(request, person1, { size: PNG.length, type: "image/png" })).json();
            expect(second.upload_id).not.toBe(first.upload_id);
            // One live upload per application: the first is gone, file and ticket.
            expect((await bucket().file(first.path).exists())[0]).toBe(false);
            expect((await db().doc(`committee_upload_tickets/${first.upload_id}`).get()).exists).toBe(false);
            expect((await uploadToStorage(request, first.path, "image/png", PNG)).status()).toBe(403);

            // An upload abandoned past its time limit is refused...
            await uploadToStorage(request, second.path, "image/png", PNG);
            await db().doc(`committee_upload_tickets/${second.upload_id}`).update({ expires_at: new Date(Date.now() - 60_000) });
            const late = await submit(request, { ...person1, photo_upload_id: second.upload_id });
            expect(late.status()).toBe(400);
            expect((await late.json()).error).toBe("Your photo upload has expired. Please attach it again.");
            expect((await bucket().file(second.path).exists())[0]).toBe(false);

            // ...and one nobody comes back for is swept up by the next applicant's request.
            const abandoned = await (await requestUpload(request, applicant(), { size: PNG.length, type: "image/png" })).json();
            await uploadToStorage(request, abandoned.path, "image/png", PNG);
            await db().doc(`committee_upload_tickets/${abandoned.upload_id}`).update({ expires_at: new Date(Date.now() - 60_000) });
            expect((await requestUpload(request, applicant(), { size: PNG.length, type: "image/png" })).status()).toBe(201);
            expect((await bucket().file(abandoned.path).exists())[0]).toBe(false);
            expect((await db().doc(`committee_upload_tickets/${abandoned.upload_id}`).get()).exists).toBe(false);
        });

        test("uploads and stored files cannot be read, replaced or deleted from outside", async ({ request }) => {
            const person1 = applicant();
            const ticket = await (await requestUpload(request, person1, { size: PNG.length, type: "image/png" })).json();
            await uploadToStorage(request, ticket.path, "image/png", PNG);
            const object = (path: string) => `http://${storageHost}/v0/b/${bucketName}/o/${encodeURIComponent(path)}`;

            // The temporary upload.
            expect((await request.get(`${object(ticket.path)}?alt=media`)).status()).toBe(403);
            expect((await request.get(object(ticket.path))).status()).toBe(403);
            expect((await request.delete(object(ticket.path))).status()).toBe(403);
            // Without a ticket nothing can be written into the upload folder.
            expect((await uploadToStorage(request, `committee-application-uploads/${"b".repeat(40)}/photo`, "image/png", PNG)).status()).toBe(403);
            // A different file than the ticket describes.
            expect((await uploadToStorage(request, ticket.path, "image/jpeg", PNG)).status()).toBe(403);
            expect((await uploadToStorage(request, ticket.path, "image/png", Buffer.concat([PNG, PNG]))).status()).toBe(403);

            expect((await submit(request, { ...person1, photo_upload_id: ticket.upload_id })).status()).toBe(201);
            const [record] = await stored(person1.student_email);
            const final = record.data().photo_path;
            // The stored photo.
            expect((await request.get(`${object(final)}?alt=media`)).status()).toBe(403);
            expect((await request.delete(object(final))).status()).toBe(403);
            expect((await uploadToStorage(request, final, "image/jpeg", PNG)).status()).toBe(403);
            expect((await bucket().file(final).exists())[0]).toBe(true);
            // The ticket is spent, so its path is closed too.
            expect((await uploadToStorage(request, ticket.path, "image/png", PNG)).status()).toBe(403);
        });

        test("supporting documents are checked on the server", async ({ request }) => {
            const fake = await submit(request, applicant(), { document: { name: "cv.pdf", mimeType: "application/pdf", buffer: Buffer.from("MZ not a pdf") } });
            expect(fake.status()).toBe(400);
            expect((await fake.json()).error).toMatch(/PDF, JPG, PNG, or WebP/);

            const big = await submit(request, applicant(), {
                document: { name: "big.pdf", mimeType: "application/pdf", buffer: Buffer.concat([PDF, Buffer.alloc(3 * 1024 * 1024 + 1 - PDF.length)]) },
            });
            expect(big.status()).toBe(400);
            expect((await big.json()).error).toBe("Your supporting document must be 3 MB or smaller.");

            const exact = applicant();
            const largest = await submit(request, exact, {
                document: { name: "portfolio.pdf", mimeType: "application/pdf", buffer: Buffer.concat([PDF, Buffer.alloc(3 * 1024 * 1024 - PDF.length)]) },
            });
            expect(largest.status()).toBe(201);
            expect((await stored(exact.student_email))[0].data().document_type).toBe("application/pdf");

            // Omitting the document is fine.
            const none = applicant();
            expect((await submit(request, none)).status()).toBe(201);
            expect((await stored(none.student_email))[0].data()).toMatchObject({ document_path: "", document_name: "" });
        });
    });

    test("the form submits a full application with a 10 MB-class photo and a supporting document", async ({ page }) => {
        test.setTimeout(120_000);
        const email = BROWSER_EMAIL;
        const photo = await pngOfSize(6 * 1024 * 1024); // larger than the website's own server accepts in one request
        await page.goto("/join");
        await expect(page.getByText(`New committee recruitment ${TERM}`)).toBeVisible();

        await fillDetails(page, email);
        await choose(page, "Level of education", "Bachelor Degree");
        await page.getByLabel("Year of study").selectOption("Year 3");
        await page.getByLabel(/School, programme/).fill("SBSS & BBAM & Cohort 5");
        await page.locator("#photo").setInputFiles({ name: "formal.png", mimeType: "image/png", buffer: photo });
        await expect(page.getByAltText("Your photo preview")).toBeVisible();
        await expect(page.getByText(/formal\.png · 6\.0 MB/)).toBeVisible();
        await next(page);

        await page.getByLabel(/What do you know about/).fill("It is the Al-Qur'an and Islamic Club at AIU.");
        await choose(page, "Have you ever joined any of our programs?", "Yes");
        await page.getByLabel(/Which Al-Qisc programs/).fill("Weekly Islamic Talk");
        await page.getByLabel(/committee member of any club or association/).fill("Secretary of the debate club.");
        await next(page);

        // Only what the admin opened is offered: General Treasurer is closed.
        await expect(question(page, "First choice").locator("label")).toHaveText([
            "General Secretary", "EXCO Da'wah", "EXCO Multimedia, Design & Publication", "EXCO ICT & Technical",
        ]);
        await fillLeadership(page, "EXCO Multimedia, Design & Publication", "General Secretary", "EXCO Member");
        await next(page);

        await fillCommitment(page);
        await choose(page, /selected to serve in another club/, "Yes, I can fully commit to both clubs");
        await page.locator("#document").setInputFiles({ name: "portfolio.pdf", mimeType: "application/pdf", buffer: PDF });
        await page.getByRole("button", { name: "Submit application" }).click();

        await expect(page.getByRole("heading", { name: "Thank you for your application" })).toBeVisible({ timeout: 60_000 });
        await expect(page.getByText(/EXCO Multimedia, Design & Publication · EXCO Member and General Secretary/)).toBeVisible();
        // Multimedia applicants are reminded about the work samples folder.
        await expect(page.getByRole("link", { name: "work samples folder" })).toBeVisible();

        const [record] = await stored(email);
        const data = record.data();
        expect(data).toMatchObject({
            full_name: "AISHA RAHMAN",
            student_id: "AIU21011234",
            phone: "+60 11-2233 5566",
            nationality: "Malaysian",
            education_level: "bachelor",
            year_of_study: "Year 3",
            programme: "SBSS & BBAM & Cohort 5",
            about_alqisc: "It is the Al-Qur'an and Islamic Club at AIU.",
            joined_programs: "yes",
            programs_joined: "Weekly Islamic Talk",
            experience: "Secretary of the debate club.",
            first_choice: "exco_multimedia",
            first_choice_name: "EXCO Multimedia, Design & Publication · EXCO Member",
            second_choice: "general_secretary",
            second_choice_name: "General Secretary",
            department_position: "exco_member",
            motivation: MOTIVATION,
            accept_other_position: "yes",
            other_club_commitment: "full",
            photo_type: "image/jpeg",
            document_type: "application/pdf",
            document_name: "portfolio.pdf",
        });
        expect(data.photo_path).toBe(`committee-applications/${record.id}.jpg`);
        expect(data.document_path).toBe(`committee-applications/${record.id}-document.pdf`);
        expect((await bucket().file(data.photo_path).exists())[0]).toBe(true);
        expect((await bucket().file(data.document_path).download())[0].equals(PDF)).toBe(true);
        // Nothing is left in the upload folder.
        expect((await bucket().getFiles({ prefix: "committee-application-uploads/" }))[0].filter((file) => file.name.includes(record.id))).toHaveLength(0);
    });

    test.describe("the admin console", () => {
        test("is closed to anyone who is not signed in", async ({ request }) => {
            const base = "/api/admin/committee-registration";
            const id = "a".repeat(40);
            const json = { headers: { "Content-Type": "application/json" } };
            const responses = {
                list: await request.get(base),
                settings: await request.put(base, { ...json, data: { is_open: false } }),
                status: await request.patch(base, { ...json, data: { id, status: "accepted" } }),
                remove: await request.delete(base, { ...json, data: { id } }),
                export: await request.post(`${base}/export`, { ...json, data: { ids: [id] } }),
                photo: await request.get(`${base}/photo?id=${id}`),
                document: await request.get(`${base}/document?id=${id}`),
            };
            for (const [name, response] of Object.entries(responses)) {
                expect(response.status(), name).toBe(401);
                expect(await response.text(), name).not.toContain("student.aiu.edu.my");
            }
        });

        test("lets admins open positions one by one, review applications by position, download files, export and delete", async ({ page, request }) => {
            // The dev server compiles the admin pages on first visit, which is slow.
            test.setTimeout(240_000);
            // A record in the shape the earlier form stored, to check it still displays.
            await db().collection("committee_applications").doc("a".repeat(40)).set({
                term: TERM, full_name: "Legacy Applicant", student_email: "legacy@student.aiu.edu.my",
                personal_email: "legacy@example.com", phone: "+60123456789", student_id: "AIU20010001",
                programme: "Computer Science", year_of_study: "Year 4", position: "deputy_head", current_member_id: "",
                first_choice: "media", second_choice: "", first_choice_name: "Media", second_choice_name: "",
                current_member_name: "", current_member_role: "", motivation: "An application from the earlier form.",
                experience: "", photo_path: "", photo_type: "", status: "pending", admin_notes: "",
                created_at: "2026-01-01T00:00:00.000Z", updated_at: "2026-01-01T00:00:00.000Z",
            });

            // The sign-in created by scripts/seed-emulators.mjs; it exists only in the emulator.
            await page.goto(`${ADMIN}/login`);
            await page.locator("#admin-email").fill("admin@alqisc.test");
            await page.locator("#admin-password").fill("emulator-only-password");
            await page.getByRole("button", { name: "Sign In", exact: true }).click();
            await page.waitForURL(/\/admin\/dashboard/, { timeout: 90_000 });
            await page.goto(`${ADMIN}/registrations`);
            const applicants = page.getByRole("heading", { name: /^Applicants/ });
            await expect(applicants).toBeVisible({ timeout: 60_000 });

            // --- Position availability -----------------------------------------
            const top = (name: string) => page.getByRole("checkbox", { name, exact: true });
            const department = (name: string) => page.getByRole("group", { name, exact: true });
            await expect(page.getByText("(6 open)")).toBeVisible();
            await expect(top("General Secretary")).toBeChecked();
            await expect(top("General Treasurer")).not.toBeChecked();
            await expect(department("EXCO Da'wah").getByRole("checkbox")).toHaveCount(4);
            await expect(department("EXCO Da'wah").getByRole("checkbox", { name: "Head of Department" })).toBeChecked();
            await expect(department("EXCO Multimedia, Design & Publication").getByRole("checkbox", { name: "Head of Department" })).not.toBeChecked();
            await expect(page.getByRole("checkbox", { name: "Department Secretary" })).toHaveCount(0);

            // Open General Treasurer, and 1st Deputy Head in Sister Affairs only.
            await top("General Treasurer").check();
            await department("EXCO Sister Affairs").getByRole("checkbox", { name: "1st Deputy Head" }).check();
            // Close EXCO Member in ICT only.
            await department("EXCO ICT & Technical").getByRole("checkbox", { name: "EXCO Member" }).uncheck();
            await expect(department("EXCO Da'wah").getByRole("checkbox", { name: "1st Deputy Head" })).not.toBeChecked();
            await expect(department("EXCO Da'wah").getByRole("checkbox", { name: "EXCO Member" })).toBeChecked();
            await expect(page.getByText("(7 open)")).toBeVisible();
            await page.getByLabel("Deadline (optional)").fill("2026-11-22");
            await page.getByRole("button", { name: "Save settings" }).click();
            await page.getByRole("dialog", { name: "Settings saved" }).getByRole("button", { name: "Close dialog" }).click();

            // The public form follows at once.
            const info = await (await request.get("/api/committee-registration")).json();
            expect(info.config.deadline).toBe("2026-11-22");
            expect(info.config.open_top_positions).toEqual(["general_secretary", "general_treasurer"]);
            expect(info.config.open_department_positions).toMatchObject({
                exco_dawah: ["head", "exco_member"],
                exco_ict: ["second_deputy_head"],
                exco_sister_affairs: ["first_deputy_head"],
                exco_co_curricular: [],
            });
            // The newly opened position takes applications; the closed one no longer does.
            const treasurer = applicant({ first_choice: "general_treasurer", second_choice: "exco_sister_affairs", department_position: "first_deputy_head" });
            expect((await submit(request, treasurer)).status()).toBe(201);
            expect((await submit(request, applicant())).status()).toBe(400);

            // Registration cannot be left open with nothing to apply for.
            const none = await page.request.put("/api/admin/committee-registration", {
                data: { is_open: true, term: TERM, open_top_positions: [], open_department_positions: {} },
            });
            expect(none.status()).toBe(400);
            expect((await none.json()).error).toBe("Open at least one position before opening registration.");

            // --- Applications, grouped by the position put first -----------------
            await page.reload();
            await expect(applicants).toBeVisible({ timeout: 60_000 });
            const group = (name: string) => page.getByRole("region", { name, exact: true });
            await expect(group("General Treasurer").getByRole("button", { name: /API APPLICANT/ })).toHaveCount(1);
            await expect(group("EXCO Multimedia, Design & Publication · EXCO Member").getByRole("button", { name: /AISHA RAHMAN/ })).toHaveCount(1);
            // The record from the earlier form keeps its old label.
            const legacy = group("Deputy Head · Media").getByRole("button", { name: /Legacy Applicant/ });
            await legacy.click();
            await expect(page.getByText("legacy@example.com")).toBeVisible();
            await legacy.click();

            await page.getByLabel("Filter by first or second choice").selectOption({ label: "EXCO Multimedia, Design & Publication" });
            const row = page.getByRole("button", { name: /AISHA RAHMAN/ });
            await row.click();
            for (const answer of [
                "Malaysian", "Bachelor Degree", "Year 3", "SBSS & BBAM & Cohort 5",
                "EXCO Multimedia, Design & Publication · EXCO Member", "General Secretary", "EXCO Member",
                "Yes, I can fully commit to both clubs", "Weekly Islamic Talk", "Secretary of the debate club.", MOTIVATION,
            ]) {
                // Scoped to the answers, since the filters list the same labels as options.
                await expect(page.locator("dd, p", { hasText: answer }).first(), answer).toBeVisible();
            }
            const details = page.locator("dl").filter({ hasText: "First choice" });
            await expect(details.locator("div", { hasText: /^Department position/ }).locator("dd")).toHaveText("EXCO Member");
            // The photo and document come through signed-in routes.
            const photo = page.getByAltText("Photo of AISHA RAHMAN");
            await expect(photo).toBeVisible();
            expect(await photo.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
            const [documentDownload] = await Promise.all([
                page.waitForEvent("download"),
                page.getByRole("link", { name: /Download supporting document \(portfolio\.pdf\)/ }).click(),
            ]);
            expect(documentDownload.suggestedFilename()).toBe("AISHA-RAHMAN-supporting-document.pdf");

            // --- Status and notes still work -------------------------------------
            await page.getByLabel("Status", { exact: true }).selectOption("shortlisted");
            await page.getByRole("dialog", { name: "Application updated" }).getByRole("button", { name: "Close dialog" }).click();
            const [browserRecord] = await stored(BROWSER_EMAIL);
            expect((await browserRecord.ref.get()).data()?.status).toBe("shortlisted");

            // --- Excel export ----------------------------------------------------
            await page.getByLabel("Filter by first or second choice").selectOption("");
            const [excel] = await Promise.all([
                page.waitForEvent("download"),
                page.getByRole("button", { name: /Export Excel/ }).click(),
            ]);
            expect(excel.suggestedFilename()).toMatch(/^committee-applications-.*\.xlsx$/);
            const workbook = new ExcelJS.Workbook();
            await workbook.xlsx.readFile(await excel.path());
            const sheet = workbook.getWorksheet("Applications")!;
            const headers = (sheet.getRow(1).values as unknown[]).slice(1);
            expect(headers).toEqual([
                "Photo", "Name", "First choice", "Second choice", "Department position", "Status", "Student email",
                "Contact number", "Student ID", "Nationality", "Level of education", "Year of study", "School, programme & cohort",
                "What they know about Al-Qisc", "Joined our programs", "Programs joined", "Committee experience",
                "Suitability & motivation", "Accepts another position", "If also serving another club", "Supporting document",
                "Position (earlier form)", "Personal email (earlier form)", "Admin notes", "Term", "Submitted",
            ]);
            const column = (header: string) => headers.indexOf(header) + 1;
            const rows = sheet.getRows(2, sheet.rowCount - 1) || [];
            const exported = rows.find((item) => item.getCell(column("Student email")).value === BROWSER_EMAIL)!;
            expect(exported.getCell(column("Name")).value).toBe("AISHA RAHMAN");
            expect(exported.getCell(column("First choice")).value).toBe("EXCO Multimedia, Design & Publication · EXCO Member");
            expect(exported.getCell(column("Second choice")).value).toBe("General Secretary");
            expect(exported.getCell(column("Department position")).value).toBe("EXCO Member");
            expect(exported.getCell(column("Status")).value).toBe("Shortlisted");
            expect(exported.getCell(column("Level of education")).value).toBe("Bachelor Degree");
            expect(exported.getCell(column("If also serving another club")).value).toBe("Yes, I can fully commit to both clubs");
            expect(exported.getCell(column("Supporting document")).value).toBe("Attached (download in admin)");
            const old = rows.find((item) => item.getCell(column("Name")).value === "Legacy Applicant")!;
            expect(old.getCell(column("Position (earlier form)")).value).toBe("Deputy Head");
            expect(old.getCell(column("Personal email (earlier form)")).value).toBe("legacy@example.com");
            // Text that looks like a formula stays text.
            const formula = rows.find((item) => String(item.getCell(column("Suitability & motivation")).value).startsWith("=HYPERLINK"))!;
            expect(formula.getCell(column("Suitability & motivation")).type).toBe(ExcelJS.ValueType.String);
            // The applicant's photo is embedded.
            expect(sheet.getImages().length).toBeGreaterThan(0);

            // --- Deleting an application removes its files ----------------------
            const { photo_path, document_path } = browserRecord.data();
            expect((await bucket().file(photo_path).exists())[0]).toBe(true);
            page.once("dialog", (dialog) => void dialog.accept());
            await page.getByRole("button", { name: "Delete", exact: true }).click();
            await page.getByRole("dialog", { name: "Application deleted" }).getByRole("button", { name: "Close dialog" }).click();
            expect(await stored(BROWSER_EMAIL)).toHaveLength(0);
            expect((await bucket().file(photo_path).exists())[0]).toBe(false);
            expect((await bucket().file(document_path).exists())[0]).toBe(false);
            // Its files are gone from the admin routes too.
            expect((await page.request.get(`/api/admin/committee-registration/photo?id=${browserRecord.id}`)).status()).toBe(404);
            expect((await page.request.get(`/api/admin/committee-registration/document?id=${browserRecord.id}`)).status()).toBe(404);
        });
    });

    test("the endpoints refuse applications once registration is closed or the deadline has passed", async ({ request }) => {
        await setConfig({ is_open: false });
        expect((await submit(request, applicant())).status()).toBe(403);
        expect((await requestUpload(request, applicant(), { size: PNG.length, type: "image/png" })).status()).toBe(403);

        await setConfig({ deadline: "2020-01-31" });
        const late = await submit(request, applicant());
        expect(late.status()).toBe(403);
        expect((await (await request.get("/api/committee-registration")).json()).accepting).toBe(false);

        // Open, in time, but with no position opened.
        await setConfig({ open_top_positions: [], open_department_positions: {} });
        expect((await submit(request, applicant())).status()).toBe(403);
        await setConfig();
    });
});
