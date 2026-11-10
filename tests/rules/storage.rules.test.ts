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
        // The photo-upload rule looks up a ticket in Firestore.
        firestore: {
            rules: readFileSync(path.resolve(__dirname, "../../firestore.rules"), "utf8"),
        },
    });
});

afterAll(async () => {
    await env.cleanup();
});

beforeEach(async () => {
    await env.clearStorage();
    await env.clearFirestore();
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

describe("committee application photo uploads", () => {
    const TEN_MB = 10 * 1024 * 1024;
    const MINUTE = 60 * 1000;

    /** Writes the ticket the website's server issues before an upload. */
    async function issueTicket(id: string, ticket: { size: number; content_type?: string; expires_in?: number }) {
        await env.withSecurityRulesDisabled(async (context) => {
            await context.firestore().doc(`committee_upload_tickets/${id}`).set({
                application_id: "application-1",
                size: ticket.size,
                content_type: ticket.content_type ?? "image/jpeg",
                expires_at: new Date(Date.now() + (ticket.expires_in ?? 15 * MINUTE)),
            });
        });
    }

    function send(storage: TestStorage, id: string, size: number, contentType = "image/jpeg", name = "photo") {
        return storage.ref(`committee-application-uploads/${id}/${name}`).put(new Uint8Array(size), { contentType }).then(() => undefined);
    }

    it("lets an applicant upload the photo their ticket describes", async () => {
        await issueTicket("ticket-1", { size: 2048 });
        await assertSucceeds(send(anonymous(), "ticket-1", 2048));
    });

    it("accepts PNG and WebP photos as well", async () => {
        await issueTicket("ticket-png", { size: 64, content_type: "image/png" });
        await issueTicket("ticket-webp", { size: 64, content_type: "image/webp" });
        await assertSucceeds(send(anonymous(), "ticket-png", 64, "image/png"));
        await assertSucceeds(send(anonymous(), "ticket-webp", 64, "image/webp"));
    });

    it("accepts a photo of exactly 10 MB", async () => {
        await issueTicket("ticket-max", { size: TEN_MB });
        await assertSucceeds(send(anonymous(), "ticket-max", TEN_MB));
    });

    it("refuses a photo over 10 MB even when a ticket names that size", async () => {
        await issueTicket("ticket-big", { size: TEN_MB + 1 });
        await assertFails(send(anonymous(), "ticket-big", TEN_MB + 1));
    });

    it("refuses an upload without a ticket", async () => {
        await assertFails(send(anonymous(), "no-such-ticket", 2048));
        await assertFails(send(feedUploader(), "no-such-ticket", 2048));
    });

    it("refuses an upload once the ticket has expired", async () => {
        await issueTicket("ticket-old", { size: 2048, expires_in: -MINUTE });
        await assertFails(send(anonymous(), "ticket-old", 2048));
    });

    it("refuses a file that differs from the ticket in size or type", async () => {
        await issueTicket("ticket-2", { size: 2048 });
        await assertFails(send(anonymous(), "ticket-2", 4096));
        await assertFails(send(anonymous(), "ticket-2", 2048, "image/png"));
    });

    it("refuses anything that is not a JPG, PNG or WebP image", async () => {
        for (const type of ["text/html", "image/svg+xml", "image/gif", "application/pdf"]) {
            await issueTicket("ticket-type", { size: 64, content_type: type });
            await assertFails(send(anonymous(), "ticket-type", 64, type));
        }
    });

    it("refuses any other file name under a ticket", async () => {
        await issueTicket("ticket-3", { size: 2048 });
        await assertFails(send(anonymous(), "ticket-3", 2048, "image/jpeg", "photo.jpg"));
        await assertFails(send(anonymous(), "ticket-3", 2048, "image/jpeg", "extra/photo"));
    });

    it("never lets an upload be read, changed or deleted from a browser", async () => {
        await issueTicket("ticket-4", { size: 2048 });
        await assertSucceeds(send(anonymous(), "ticket-4", 2048));

        for (const storage of [anonymous(), feedUploader()]) {
            const file = storage.ref("committee-application-uploads/ticket-4/photo");
            await assertFails(file.getMetadata());
            await assertFails(file.getDownloadURL());
            await assertFails(file.updateMetadata({ contentType: "text/html" }));
            await assertFails(file.delete());
        }
        await assertFails(anonymous().ref("committee-application-uploads").listAll());
        await assertFails(anonymous().ref("committee-application-uploads/ticket-4").listAll());
    });

    it("lets the ticket holder retry an interrupted upload, but only with the same file", async () => {
        await issueTicket("ticket-5", { size: 2048 });
        await assertSucceeds(send(anonymous(), "ticket-5", 2048));
        await assertSucceeds(send(anonymous(), "ticket-5", 2048));
        await assertFails(send(anonymous(), "ticket-5", 2049));
        await assertFails(send(anonymous(), "ticket-5", 2048, "image/png"));
    });

    it("closes the upload path once the server has used the ticket", async () => {
        await issueTicket("ticket-6", { size: 2048 });
        await assertSucceeds(send(anonymous(), "ticket-6", 2048));
        // On submission the server deletes the ticket.
        await env.withSecurityRulesDisabled(async (context) => {
            await context.firestore().doc("committee_upload_tickets/ticket-6").delete();
        });
        await assertFails(send(anonymous(), "ticket-6", 2048));
        await assertFails(send(feedUploader(), "ticket-6", 2048));
    });

    it("still keeps stored application files away from every browser", async () => {
        await issueTicket("abc", { size: 5 });
        await assertFails(upload(anonymous(), "committee-applications/abc.jpg"));
        await assertFails(anonymous().ref("committee-applications/abc.jpg").delete());
        await assertFails(anonymous().ref("committee-applications/abc.jpg").getDownloadURL());
    });
});