import { readFileSync } from "node:fs";
import path from "node:path";
import {
    assertFails,
    assertSucceeds,
    initializeTestEnvironment,
    type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";

const IMAGE = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00]);
const JPEG = { contentType: "image/jpeg" };
const FEED_UPLOADER = { email: "mansourshakla@gmail.com", email_verified: true };

let env: RulesTestEnvironment;

beforeAll(async () => {
    env = await initializeTestEnvironment({
        projectId: "demo-alqisc",
        storage: {
            rules: readFileSync(path.resolve(__dirname, "../../storage.rules"), "utf8"),
        },
    });
});

afterAll(async () => {
    await env.cleanup();
});

beforeEach(async () => {
    await env.clearStorage();
    await env.withSecurityRulesDisabled(async (context) => {
        const storage = context.storage();
        await storage.ref("public_content/poster-1").put(IMAGE, JPEG);
        await storage.ref("images/members/photo.jpg").put(IMAGE, JPEG);
        await storage.ref("images/feed/poster.jpg").put(IMAGE, JPEG);
        await storage.ref("images/profiles/me.jpg").put(IMAGE, JPEG);
        await storage.ref("committee-applications/abc.jpg").put(IMAGE, JPEG);
    });
});

type TestStorage = ReturnType<ReturnType<RulesTestEnvironment["unauthenticatedContext"]>["storage"]>;

// UploadTask is thenable but not a Promise, which the assert helpers expect.
function upload(storage: TestStorage, filePath: string, metadata = JPEG) {
    return storage.ref(filePath).put(IMAGE, metadata).then(() => undefined);
}

function anonymous() {
    return env.unauthenticatedContext().storage();
}

function feedUploader() {
    return env.authenticatedContext("admin-1", FEED_UPLOADER).storage();
}

describe("mobile app feed images", () => {
    it("lets anyone read a feed image", async () => {
        await assertSucceeds(anonymous().ref("public_content/poster-1").getMetadata());
    });

    it("lets the Flutter admin upload a feed poster", async () => {
        await assertSucceeds(upload(feedUploader(), "public_content/poster-2"));
    });

    it("blocks feed uploads from anyone else", async () => {
        await assertFails(upload(anonymous(), "public_content/poster-2"));
        const student = env
            .authenticatedContext("user-1", { email: "student@example.com", email_verified: true })
            .storage();
        await assertFails(upload(student, "public_content/poster-2"));
    });

    it("blocks non-image feed uploads", async () => {
        await assertFails(
            upload(feedUploader(), "public_content/poster-2", { contentType: "text/html" })
        );
    });
});

describe("website images", () => {
    it("lets anyone read public website folders", async () => {
        await assertSucceeds(anonymous().ref("images/members/photo.jpg").getMetadata());
        await assertSucceeds(anonymous().ref("images/feed/poster.jpg").getMetadata());
    });

    it("blocks every browser upload, including admins", async () => {
        await assertFails(upload(anonymous(), "images/members/new.jpg"));
        await assertFails(upload(feedUploader(), "images/members/new.jpg"));
    });

    it("keeps unlisted folders private", async () => {
        await assertFails(anonymous().ref("images/profiles/me.jpg").getMetadata());
    });
});

describe("private applicant photos", () => {
    it("keeps committee application photos away from every browser", async () => {
        await assertFails(anonymous().ref("committee-applications/abc.jpg").getMetadata());
        await assertFails(feedUploader().ref("committee-applications/abc.jpg").getMetadata());
        await assertFails(upload(feedUploader(), "committee-applications/abc.jpg"));
    });
});
