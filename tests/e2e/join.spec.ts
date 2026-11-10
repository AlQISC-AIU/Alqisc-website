import { expect, test, type Page } from "@playwright/test";
import { getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

// The committee registration form on /join.
//
// Most tests stub /api/committee-registration, so they exercise the form
// without storing anything. The last group submits for real and only runs
// against the local Firebase emulators:
//
//   node scripts/dev-emulators.mjs "npx playwright test tests/e2e/join.spec.ts"

const API = "**/api/committee-registration";
const OPEN = {
    config: { is_open: true, term: "2026/27", deadline: "", intro: "" },
    accepting: true,
};

const MOTIVATION = "I want to serve the community, help organise events and learn from the senior members.";

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

/** Picks an answer in a single-choice question, found by its legend. */
async function choose(page: Page, question: string | RegExp, answer: string) {
    await page.getByRole("group", { name: question }).getByText(answer, { exact: true }).click();
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

async function fillLeadership(page: Page, first = "General Secretary", second = "General Treasurer") {
    await choose(page, "First choice", first);
    await choose(page, "Second choice", second);
}

async function fillCommitment(page: Page) {
    await page.getByLabel(/What makes you suitable/).fill(MOTIVATION);
    await choose(page, /another position other than what you apply for/, "Yes");
}

/** Fills every required question and stops on the last step, ready to submit. */
async function fillRequired(page: Page, email?: string) {
    await fillDetails(page, email);
    await next(page);
    await fillAbout(page);
    await next(page);
    await fillLeadership(page);
    await next(page);
    await fillCommitment(page);
}

async function expectNoHorizontalOverflow(page: Page, context: string) {
    const overflows = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    expect(overflows, `${context} horizontal overflow`).toBe(false);
}

test("join page loads the first step with every applicant detail question", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await openForm(page);

    await expect(page.getByRole("heading", { level: 1, name: "Join the AL-QISC Committee" })).toBeVisible();
    await expect(page.getByText("New committee recruitment 2026/27")).toBeVisible();
    await expect(page.getByText("General requirements for all candidates")).toBeVisible();
    await expect(page.getByText("Step 1 of 4")).toBeVisible();
    await expect(stepHeading(page, "Applicant details")).toBeVisible();

    for (const label of ["Student email", "Full name (all uppercase)", "Student ID", "Contact number", "Nationality"]) {
        await expect(page.getByLabel(label), label).toBeVisible();
        await expect(page.getByLabel(label), label).toHaveAttribute("required", "");
    }
    await expect(page.getByRole("group", { name: "Level of education" }).getByRole("radio")).toHaveCount(3);
    for (const level of ["LC", "Foundation", "Bachelor Degree"]) {
        await expect(page.getByRole("radio", { name: level, exact: true })).toBeAttached();
    }
    await expect(page.getByText("Formal picture", { exact: true })).toBeVisible();
    await expect(page.locator("#photo")).toBeAttached();
    expect(errors).toEqual([]);
});

test("join page explains when registration is closed", async ({ page }) => {
    await openForm(page, { config: { ...OPEN.config, is_open: false }, accepting: false });
    await expect(page.getByRole("heading", { name: "Registration is currently closed" })).toBeVisible();
    await expect(page.getByLabel("Student email")).toHaveCount(0);
});

test("join page reports when the form cannot be loaded", async ({ page }) => {
    await page.route(API, (route) => route.fulfill({ status: 500, body: "" }));
    await page.goto("/join");
    await expect(page.getByRole("alert").filter({ hasText: "couldn't load the registration form" })).toBeVisible();
});

test("Bachelor-only questions appear only for Bachelor Degree students", async ({ page }) => {
    await openForm(page);
    await expect(page.getByLabel("Year of study")).toHaveCount(0);
    await expect(page.getByLabel(/School, programme/)).toHaveCount(0);

    await choose(page, "Level of education", "Bachelor Degree");
    await expect(page.getByLabel("Year of study")).toBeVisible();
    await expect(page.getByLabel("Year of study").locator("option")).toHaveText(["Select your year", "Year 1", "Year 2", "Year 3"]);
    await expect(page.getByLabel(/School, programme/)).toBeVisible();
    // Both are optional in the official form.
    await expect(page.getByLabel("Year of study")).not.toHaveAttribute("required", "");

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

    await fillDetails(page);
    await page.getByLabel("Student email").fill("aisha@gmail.com");
    await page.getByLabel("Contact number").fill("12ab");
    await next(page);
    await expect(page.getByText(/Use your AIU student email ending in @student\.aiu\.edu\.my/)).toBeVisible();
    await expect(page.getByText(/Enter a valid contact number/)).toBeVisible();
    await expect(stepHeading(page, "Applicant details")).toBeVisible();

    await page.getByLabel("Student email").fill("aisha.rahman@student.aiu.edu.my");
    await page.getByLabel("Contact number").fill("+011-22335566");
    await expect(page.getByLabel("Full name (all uppercase)")).toHaveValue("AISHA RAHMAN");
    await next(page);
    await expect(stepHeading(page, "Getting to know you")).toBeVisible();
    await expect(page.getByText("Step 2 of 4")).toBeVisible();
});

test("the programs question follows the answer about joining our programs", async ({ page }) => {
    await openForm(page);
    await fillDetails(page);
    await next(page);

    await expect(page.getByRole("group", { name: "Have you ever joined any of our programs?" }).locator("label")).toHaveText(["Yes", "Never"]);
    await expect(page.getByLabel(/Which Al-Qisc programs/)).toHaveCount(0);
    await choose(page, "Have you ever joined any of our programs?", "Yes");
    await expect(page.getByLabel(/Which Al-Qisc programs/)).toBeVisible();
    await choose(page, "Have you ever joined any of our programs?", "Never");
    await expect(page.getByLabel(/Which Al-Qisc programs/)).toHaveCount(0);

    // Committee experience is optional and always offered.
    await expect(page.getByLabel(/committee member of any club or association/)).toBeVisible();
    await expect(page.getByLabel(/committee member of any club or association/)).not.toHaveAttribute("required", "");

    await next(page);
    await expect(page.getByText("Tell us what you know about Al-Qisc.")).toBeVisible();
    await page.getByLabel(/What do you know about/).fill("It is the Islamic club at AIU.");
    await next(page);
    await expect(stepHeading(page, "Line of leadership")).toBeVisible();
});

test("line of leadership options match the official form and drive the department sections", async ({ page }) => {
    await openForm(page);
    await fillDetails(page);
    await next(page);
    await fillAbout(page);
    await next(page);

    await expect(page.getByRole("group", { name: "First choice" }).locator("label")).toHaveText([
        "General Secretary", "General Treasurer", "EXCO Da'wah", "EXCO Co-Curricular",
        "EXCO Multimedia, Design & Publication", "EXCO Educational Development", "EXCO ICT & Technical", "EXCO Sister Affairs",
    ]);
    await expect(page.getByRole("group", { name: "Second choice" }).locator("label")).toHaveText([
        "General Secretary", "General Treasurer", "EXCO Co-Curricular", "EXCO Educational Development",
        "EXCO ICT & Technical", "EXCO Sister Affairs", "EXCO Multimedia, Design & Publication", "EXCO Da'wah",
    ]);

    const departmentPosition = page.getByRole("group", { name: "Department position" });
    const workSamples = page.getByText("For those who apply for Multimedia and ICT department only");
    await fillLeadership(page, "General Secretary", "General Treasurer");
    await expect(departmentPosition).toHaveCount(0);
    await expect(workSamples).toHaveCount(0);

    await choose(page, "Second choice", "EXCO Da'wah");
    await expect(departmentPosition.locator("label")).toHaveText([
        "Head of Department", "Deputy Head of Department", "Department Secretary", "Member",
    ]);
    await expect(workSamples).toHaveCount(0);

    await choose(page, "First choice", "EXCO ICT & Technical");
    await expect(workSamples).toBeVisible();
    await expect(page.getByRole("link", { name: /Open the work samples folder/ })).toHaveAttribute(
        "href", "https://drive.google.com/drive/folders/12Ju7HHONozGb3nETRvYUpjKQScr7YpS1?usp=sharing",
    );
    await choose(page, "First choice", "EXCO Multimedia, Design & Publication");
    await expect(workSamples).toBeVisible();
    await choose(page, "First choice", "EXCO Sister Affairs");
    await expect(workSamples).toHaveCount(0);

    // The department position is optional and can be cleared again.
    await choose(page, "Department position", "Member");
    await departmentPosition.getByRole("button", { name: "Clear selection" }).click();
    await expect(departmentPosition.getByRole("radio", { checked: true })).toHaveCount(0);
    await next(page);
    await expect(stepHeading(page, "Motivation and commitment")).toBeVisible();
});

test("a complete application is sent to the registration endpoint without the optional uploads", async ({ page }) => {
    await openForm(page);
    let body = "";
    await page.route(API, async (route) => {
        if (route.request().method() !== "POST") return route.fallback();
        body = route.request().postDataBuffer()?.toString("utf8") || "";
        // Hold the response briefly so the loading state can be observed.
        await new Promise((resolve) => setTimeout(resolve, 400));
        await route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ success: true }) });
    });

    await fillRequired(page);
    await expect(page.getByRole("group", { name: /selected to serve in another club/ }).locator("label")).toHaveText([
        "Yes, I can fully commit to both clubs",
        "Yes, but I may need to balance my responsibilities.",
        "No, I may not be able to fulfill both commitments",
    ]);
    await expect(page.getByText("Supporting documents, if any")).toBeVisible();

    await page.getByRole("button", { name: "Submit application" }).click();
    await expect(page.getByRole("button", { name: "Submitting..." })).toBeDisabled();
    await expect(page.getByRole("heading", { name: "Thank you for your application" })).toBeVisible();
    await expect(page.getByText(/Shortlisted applicants will be contacted via email/)).toBeVisible();
    await expect(page.getByText("Surah Al-Anfal, verse 27")).toBeVisible();

    const field = (name: string) => new RegExp(`name="${name}"\\r\\n\\r\\n([^\\r]*)`).exec(body)?.[1];
    expect(field("student_email")).toBe("aisha.rahman@student.aiu.edu.my");
    expect(field("full_name")).toBe("AISHA RAHMAN");
    expect(field("education_level")).toBe("foundation");
    expect(field("joined_programs")).toBe("never");
    expect(field("first_choice")).toBe("general_secretary");
    expect(field("second_choice")).toBe("general_treasurer");
    expect(field("accept_other_position")).toBe("yes");
    expect(field("other_club_commitment")).toBe("");
    expect(field("motivation")).toBe(MOTIVATION);
    expect(body).not.toContain('name="photo"');
    expect(body).not.toContain('name="document"');
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
});

test("a question rejected by the server is shown on its own step", async ({ page }) => {
    await openForm(page);
    await page.route(API, async (route) => {
        if (route.request().method() !== "POST") return route.fallback();
        await route.fulfill({
            status: 400,
            contentType: "application/json",
            body: JSON.stringify({ error: "Enter your student ID.", errors: { student_id: "Enter your student ID (4 to 20 letters or numbers)." } }),
        });
    });
    await fillRequired(page);
    await page.getByRole("button", { name: "Submit application" }).click();
    await page.getByRole("alertdialog", { name: "Application not sent" }).getByRole("button", { name: "Close dialog" }).click();

    await expect(stepHeading(page, "Applicant details")).toBeVisible();
    await expect(page.getByText("Enter your student ID (4 to 20 letters or numbers).")).toBeVisible();
    // Earlier answers are still there.
    await expect(page.getByLabel("Nationality")).toHaveValue("Malaysian");
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

test("an oversized or unsupported supporting document is not attached", async ({ page }) => {
    await openForm(page);
    await fillDetails(page);
    await next(page);
    await fillAbout(page);
    await next(page);
    await fillLeadership(page);
    await next(page);

    await page.locator("#document").setInputFiles({ name: "notes.txt", mimeType: "text/plain", buffer: Buffer.from("hello") });
    await expect(page.getByText(/That file was not attached\. Choose a PDF/)).toBeVisible();
    await page.locator("#document").setInputFiles({ name: "big.pdf", mimeType: "application/pdf", buffer: Buffer.alloc(3 * 1024 * 1024 + 1) });
    await expect(page.getByText(/the limit is 3\.0 MB/)).toBeVisible();

    await page.locator("#document").setInputFiles({ name: "certificate.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4\n%%EOF") });
    await expect(page.getByText("certificate.pdf")).toBeVisible();
    await page.getByRole("button", { name: "Remove document" }).click();
    await expect(page.getByText("certificate.pdf")).toHaveCount(0);
});

test("every step of the join form fits the screen @responsive", async ({ page }) => {
    await openForm(page);
    await choose(page, "Level of education", "Bachelor Degree");
    await expectNoHorizontalOverflow(page, "applicant details");
    const submit = page.getByRole("button", { name: /^Next:/ });
    const box = await submit.boundingBox();
    expect(box).not.toBeNull();
    // Comfortable touch target.
    expect(box!.height).toBeGreaterThanOrEqual(44);

    await fillDetails(page);
    await next(page);
    await choose(page, "Have you ever joined any of our programs?", "Yes");
    await expectNoHorizontalOverflow(page, "getting to know you");

    await fillAbout(page);
    await next(page);
    await fillLeadership(page, "EXCO Multimedia, Design & Publication", "EXCO ICT & Technical");
    await expect(page.getByRole("group", { name: "Department position" })).toBeVisible();
    await expectNoHorizontalOverflow(page, "line of leadership");

    await next(page);
    await expect(stepHeading(page, "Motivation and commitment")).toBeVisible();
    await expectNoHorizontalOverflow(page, "motivation and commitment");
});

// ---------------------------------------------------------------------------
// Real submissions. These write to Firestore and Storage, so they only ever run
// against the local emulators with a demo project.
// ---------------------------------------------------------------------------
const projectId = process.env.FIREBASE_PROJECT_ID || "";
const onEmulators = Boolean(
    process.env.FIRESTORE_EMULATOR_HOST && process.env.FIREBASE_STORAGE_EMULATOR_HOST && projectId.startsWith("demo-"),
);

function emulatorApp() {
    return getApps().find((app) => app.name === "join-e2e")
        || initializeApp({ projectId, storageBucket: process.env.FIREBASE_STORAGE_BUCKET }, "join-e2e");
}

const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64");
const PDF = Buffer.from("%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF");

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
    second_choice: "general_treasurer",
    department_position: "member",
    motivation: MOTIVATION,
    accept_other_position: "yes",
    other_club_commitment: "balance",
    website: "",
};

test.describe("real submissions (Firebase emulators only)", () => {
    test.skip(!onEmulators, "Needs the local Firebase emulators; see the comment at the top of this file.");
    test.describe.configure({ mode: "serial" });

    // The endpoint allows five submissions per address every ten minutes, so
    // each request below comes from its own address.
    let address = 0;
    const from = () => ({ "x-forwarded-for": `10.20.30.${++address}` });

    test.beforeAll(async () => {
        const db = getFirestore(emulatorApp());
        const timestamp = new Date().toISOString();
        await db.doc("committee_registration_config/current").set({ is_open: true, term: "E2E 2026/27", deadline: "", intro: "", updated_at: timestamp });
        for (const doc of (await db.collection("committee_applications").get()).docs) await doc.ref.delete();
    });

    test("the endpoint reports the form as open", async ({ request }) => {
        const response = await request.get("/api/committee-registration");
        expect(response.status()).toBe(200);
        expect(await response.json()).toEqual({
            config: { is_open: true, term: "E2E 2026/27", deadline: "", intro: "" },
            accepting: true,
        });
    });

    test("the endpoint rejects incomplete and invalid applications", async ({ request }) => {
        const missing = await request.post("/api/committee-registration", { headers: from(), multipart: { website: "" } });
        expect(missing.status()).toBe(400);
        expect(Object.keys((await missing.json()).errors).sort()).toEqual([
            "about_alqisc", "accept_other_position", "education_level", "first_choice", "full_name", "joined_programs",
            "motivation", "nationality", "phone", "second_choice", "student_email", "student_id",
        ]);

        const invalid = await request.post("/api/committee-registration", {
            headers: from(),
            multipart: { ...validFields, student_email: "someone@gmail.com", phone: "12", first_choice: "president" },
        });
        expect(invalid.status()).toBe(400);
        expect(Object.keys((await invalid.json()).errors).sort()).toEqual(["first_choice", "phone", "student_email"]);

        const fakePhoto = await request.post("/api/committee-registration", {
            headers: from(),
            multipart: { ...validFields, photo: { name: "photo.png", mimeType: "image/png", buffer: Buffer.from("<svg onload=alert(1)>") } },
        });
        expect(fakePhoto.status()).toBe(400);
        expect((await fakePhoto.json()).error).toMatch(/JPG, PNG, or WebP/);

        const fakeDocument = await request.post("/api/committee-registration", {
            headers: from(),
            multipart: { ...validFields, document: { name: "cv.pdf", mimeType: "application/pdf", buffer: Buffer.from("MZ not a pdf") } },
        });
        expect(fakeDocument.status()).toBe(400);

        const bot = await request.post("/api/committee-registration", { headers: from(), multipart: { ...validFields, website: "spam" } });
        expect(bot.status()).toBe(400);

        const db = getFirestore(emulatorApp());
        expect((await db.collection("committee_applications").get()).size).toBe(0);
    });

    test("the endpoint stores an application without the optional uploads, once per email", async ({ request }) => {
        const created = await request.post("/api/committee-registration", { headers: from(), multipart: validFields });
        expect(created.status()).toBe(201);

        const db = getFirestore(emulatorApp());
        const snapshot = await db.collection("committee_applications").where("student_email", "==", validFields.student_email).get();
        expect(snapshot.size).toBe(1);
        expect(snapshot.docs[0].data()).toMatchObject({
            form_version: 2,
            term: "E2E 2026/27",
            full_name: "API APPLICANT",
            education_level: "bachelor",
            year_of_study: "Year 1",
            programme: "SCI & BCS & Cohort 6",
            nationality: "Malaysian",
            joined_programs: "yes",
            programs_joined: "Weekly Islamic Talk",
            first_choice: "exco_ict",
            first_choice_name: "EXCO ICT & Technical",
            second_choice: "general_treasurer",
            second_choice_name: "General Treasurer",
            department_position: "member",
            accept_other_position: "yes",
            other_club_commitment: "balance",
            photo_path: "",
            document_path: "",
            status: "pending",
        });

        const duplicate = await request.post("/api/committee-registration", { headers: from(), multipart: validFields });
        expect(duplicate.status()).toBe(409);
    });

    test("the form submits a full application with a photo and a supporting document", async ({ page }) => {
        const email = "browser.applicant@student.aiu.edu.my";
        await page.goto("/join");
        await expect(page.getByText("New committee recruitment E2E 2026/27")).toBeVisible();

        await fillDetails(page, email);
        await choose(page, "Level of education", "Bachelor Degree");
        await page.getByLabel("Year of study").selectOption("Year 3");
        await page.getByLabel(/School, programme/).fill("SBSS & BBAM & Cohort 5");
        await page.locator("#photo").setInputFiles({ name: "formal.png", mimeType: "image/png", buffer: PNG });
        await expect(page.getByAltText("Your photo preview")).toBeVisible();
        await next(page);

        await page.getByLabel(/What do you know about/).fill("It is the Al-Qur'an and Islamic Club at AIU.");
        await choose(page, "Have you ever joined any of our programs?", "Yes");
        await page.getByLabel(/Which Al-Qisc programs/).fill("Weekly Islamic Talk");
        await page.getByLabel(/committee member of any club or association/).fill("Secretary of the debate club.");
        await next(page);

        await fillLeadership(page, "EXCO Multimedia, Design & Publication", "General Secretary");
        await choose(page, "Department position", "Deputy Head of Department");
        await next(page);

        await fillCommitment(page);
        await choose(page, /selected to serve in another club/, "Yes, I can fully commit to both clubs");
        await page.locator("#document").setInputFiles({ name: "portfolio.pdf", mimeType: "application/pdf", buffer: PDF });
        await page.getByRole("button", { name: "Submit application" }).click();

        await expect(page.getByRole("heading", { name: "Thank you for your application" })).toBeVisible();
        // Multimedia applicants are reminded about the work samples folder.
        await expect(page.getByRole("link", { name: "work samples folder" })).toBeVisible();

        const db = getFirestore(emulatorApp());
        const snapshot = await db.collection("committee_applications").where("student_email", "==", email).get();
        expect(snapshot.size).toBe(1);
        const stored = snapshot.docs[0].data();
        expect(stored).toMatchObject({
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
            second_choice: "general_secretary",
            department_position: "deputy_head",
            motivation: MOTIVATION,
            accept_other_position: "yes",
            other_club_commitment: "full",
            photo_type: "image/png",
            document_type: "application/pdf",
            document_name: "portfolio.pdf",
        });

        const bucket = getStorage(emulatorApp()).bucket();
        expect(stored.photo_path).toBe(`committee-applications/${snapshot.docs[0].id}.png`);
        expect(stored.document_path).toBe(`committee-applications/${snapshot.docs[0].id}-document.pdf`);
        expect((await bucket.file(stored.photo_path).exists())[0]).toBe(true);
        expect((await bucket.file(stored.document_path).download())[0].equals(PDF)).toBe(true);
    });

    test("admins can review the new answers, download the document and export to Excel", async ({ page }) => {
        // The dev server compiles the admin pages on first visit, which is slow.
        test.setTimeout(180_000);
        // A record in the shape the earlier form stored, to check it still displays.
        const db = getFirestore(emulatorApp());
        await db.collection("committee_applications").doc("a".repeat(40)).set({
            term: "E2E 2026/27", full_name: "Legacy Applicant", student_email: "legacy@student.aiu.edu.my",
            personal_email: "legacy@example.com", phone: "+60123456789", student_id: "AIU20010001",
            programme: "Computer Science", year_of_study: "Year 4", position: "deputy_head", current_member_id: "",
            first_choice: "media", second_choice: "", first_choice_name: "Media", second_choice_name: "",
            current_member_name: "", current_member_role: "", motivation: "An application from the earlier form.",
            experience: "", photo_path: "", photo_type: "", status: "pending", admin_notes: "",
            created_at: "2026-01-01T00:00:00.000Z", updated_at: "2026-01-01T00:00:00.000Z",
        });

        // The sign-in created by scripts/seed-emulators.mjs; it exists only in the emulator.
        await page.goto("/club-console-alqisc-7q4m-test/admin/login");
        await page.locator("#admin-email").fill("admin@alqisc.test");
        await page.locator("#admin-password").fill("emulator-only-password");
        await page.getByRole("button", { name: "Sign In", exact: true }).click();
        await page.waitForURL(/\/admin\/dashboard/, { timeout: 90_000 });
        await page.goto("/club-console-alqisc-7q4m-test/admin/registrations");

        await expect(page.getByRole("heading", { name: /Applicants/ })).toContainText("(3)", { timeout: 60_000 });
        const legacy = page.getByRole("button", { name: /Legacy Applicant/ });
        await expect(legacy).toContainText("Deputy Head · Media");
        await legacy.click();
        await expect(page.getByText("legacy@example.com")).toBeVisible();
        await legacy.click();

        await page.getByLabel("Filter by first or second choice").selectOption({ label: "EXCO Multimedia, Design & Publication" });
        await expect(page.getByRole("heading", { name: /Applicants/ })).toContainText("(1)");
        const row = page.getByRole("button", { name: /AISHA RAHMAN/ });
        await expect(row).toContainText("EXCO Multimedia, Design & Publication");
        await row.click();
        for (const answer of [
            "Malaysian", "Bachelor Degree", "Year 3", "SBSS & BBAM & Cohort 5", "General Secretary", "Deputy Head of Department",
            "Yes, I can fully commit to both clubs", "Weekly Islamic Talk", "Secretary of the debate club.", MOTIVATION,
        ]) {
            // Scoped to the answers, since the filters list the same labels as options.
            await expect(page.locator("dd, p", { hasText: answer }).first(), answer).toBeVisible();
        }
        await expect(page.getByAltText("Photo of AISHA RAHMAN")).toBeVisible();

        const [documentDownload] = await Promise.all([
            page.waitForEvent("download"),
            page.getByRole("link", { name: /Download supporting document \(portfolio\.pdf\)/ }).click(),
        ]);
        expect(documentDownload.suggestedFilename()).toBe("AISHA-RAHMAN-supporting-document.pdf");

        await page.getByLabel("Filter by first or second choice").selectOption("");
        const [excel] = await Promise.all([
            page.waitForEvent("download"),
            page.getByRole("button", { name: /Export Excel/ }).click(),
        ]);
        expect(excel.suggestedFilename()).toMatch(/^committee-applications-.*\.xlsx$/);
    });

    test("the endpoint refuses applications once registration is closed", async ({ request }) => {
        const db = getFirestore(emulatorApp());
        await db.doc("committee_registration_config/current").update({ is_open: false });
        const response = await request.post("/api/committee-registration", {
            headers: from(),
            multipart: { ...validFields, student_email: "late.applicant@student.aiu.edu.my" },
        });
        expect(response.status()).toBe(403);
        await db.doc("committee_registration_config/current").update({ is_open: true });
    });
});
