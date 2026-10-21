import { readFileSync } from "node:fs";
import path from "node:path";
import {
    assertFails,
    assertSucceeds,
    initializeTestEnvironment,
    type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";

const FEED_ADMIN = { email: "admin@example.com", email_verified: true };
const WEBSITE_COLLECTIONS = [
    "departments", "teams", "members", "classes", "blog_posts", "site_settings",
];
const SERVER_ONLY_DOCS = [
    "authorized_admins/admin@example.com",
    "committee_applications/abc",
    "committee_registration_config/current",
    "private_config/instagram",
];

let env: RulesTestEnvironment;

beforeAll(async () => {
    env = await initializeTestEnvironment({
        projectId: "demo-alqisc",
        firestore: {
            rules: readFileSync(path.resolve(__dirname, "../../firestore.rules"), "utf8"),
        },
    });
});

afterAll(async () => {
    await env.cleanup();
});

beforeEach(async () => {
    await env.clearFirestore();
    await env.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await db.doc("admin_config/allowlist").set({ emails: [FEED_ADMIN.email] });
        await db.doc("public_content/published-1").set({
            kind: "event", source: "alqisc", status: "published", priority: 0,
            title: { en: "Published" }, published_at: new Date(),
        });
        await db.doc("public_content/draft-1").set({
            kind: "announcement", source: "alqisc", status: "draft", priority: 0,
            title: { en: "Draft" }, published_at: new Date(),
        });
        await db.doc("public_config/sources").set({ youtube_enabled: true });
        for (const name of WEBSITE_COLLECTIONS) {
            await db.doc(`${name}/doc-1`).set({ value: name });
        }
        for (const docPath of SERVER_ONLY_DOCS) {
            await db.doc(docPath).set({ secret: true });
        }
    });
});

function anonymous() {
    return env.unauthenticatedContext().firestore();
}

function signedIn(token: Record<string, unknown> = { email: "student@example.com", email_verified: true }) {
    return env.authenticatedContext("user-1", token).firestore();
}

function feedAdmin() {
    return env.authenticatedContext("admin-1", FEED_ADMIN).firestore();
}

describe("mobile app feed (installed app versions)", () => {
    it("lets anyone run the app's feed query without signing in", async () => {
        await assertSucceeds(
            anonymous()
                .collection("public_content")
                .where("status", "==", "published")
                .orderBy("priority", "desc")
                .orderBy("published_at", "desc")
                .limit(240)
                .get()
        );
    });

    it("lets anyone run the website's events query", async () => {
        await assertSucceeds(
            anonymous()
                .collection("public_content")
                .where("kind", "==", "event")
                .where("status", "==", "published")
                .orderBy("starts_at", "desc")
                .get()
        );
    });

    it("hides drafts from the public", async () => {
        await assertFails(anonymous().doc("public_content/draft-1").get());
        await assertFails(anonymous().collection("public_content").get());
    });

    it("blocks public and student writes to the feed", async () => {
        await assertFails(anonymous().doc("public_content/new").set({ status: "published" }));
        await assertFails(signedIn().doc("public_content/published-1").update({ priority: 9 }));
    });

    it("lets the Flutter admin read drafts and write the feed", async () => {
        await assertSucceeds(feedAdmin().doc("public_content/draft-1").get());
        await assertSucceeds(feedAdmin().doc("public_content/new").set({ status: "draft" }));
        await assertSucceeds(feedAdmin().doc("public_config/sources").set({ youtube_enabled: false }));
    });

    it("rejects an allowlisted email that is not verified", async () => {
        const unverified = env
            .authenticatedContext("admin-2", { email: FEED_ADMIN.email, email_verified: false })
            .firestore();
        await assertFails(unverified.doc("public_content/new").set({ status: "draft" }));
    });

    it("keeps source switches public to read but admin-only to write", async () => {
        await assertSucceeds(anonymous().doc("public_config/sources").get());
        await assertFails(anonymous().doc("public_config/sources").set({ youtube_enabled: false }));
    });

    it("shows the admin allowlist only to signed-in users, and nobody can change it", async () => {
        await assertFails(anonymous().doc("admin_config/allowlist").get());
        await assertSucceeds(signedIn().doc("admin_config/allowlist").get());
        await assertFails(feedAdmin().doc("admin_config/allowlist").set({ emails: [] }));
    });
});

describe("website content", () => {
    it.each(WEBSITE_COLLECTIONS)("lets anyone read %s", async (name) => {
        await assertSucceeds(anonymous().doc(`${name}/doc-1`).get());
        await assertSucceeds(anonymous().collection(name).get());
    });

    it.each(WEBSITE_COLLECTIONS)("blocks every browser write to %s", async (name) => {
        await assertFails(anonymous().doc(`${name}/doc-1`).set({ value: "x" }));
        await assertFails(signedIn().doc(`${name}/doc-1`).set({ value: "x" }));
        await assertFails(feedAdmin().doc(`${name}/doc-1`).set({ value: "x" }));
        await assertFails(feedAdmin().doc(`${name}/doc-1`).delete());
    });
});

describe("server-only data", () => {
    it.each(SERVER_ONLY_DOCS)("keeps %s away from every browser", async (docPath) => {
        await assertFails(anonymous().doc(docPath).get());
        await assertFails(signedIn().doc(docPath).get());
        await assertFails(feedAdmin().doc(docPath).get());
        await assertFails(feedAdmin().doc(docPath).set({ secret: false }));
    });

    it("blocks listing committee applications", async () => {
        await assertFails(feedAdmin().collection("committee_applications").get());
    });
});
