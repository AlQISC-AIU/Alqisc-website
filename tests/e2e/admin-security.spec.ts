import { expect, request, test, type APIRequestContext } from "@playwright/test";
import {
    adminAuth,
    adminBucket,
    adminDb,
    cleanupIdentity,
    createAddedAdmin,
    idTokenForUid,
    primaryAdminEmail,
    uniqueRun,
} from "./firebase-harness";

let added: Awaited<ReturnType<typeof createAddedAdmin>>;
let addedApi: APIRequestContext;
const createdContentIds: string[] = [];
const createdImagePaths: string[] = [];
const testBaseUrl = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3101";

test.beforeAll(async () => {
    added = await createAddedAdmin();
    addedApi = await request.newContext({ baseURL: testBaseUrl });
    const response = await addedApi.post("/api/auth/session", { data: { idToken: added.idToken } });
    expect(response.status()).toBe(200);
});

test.afterAll(async () => {
    for (const id of createdContentIds) {
        await adminDb.collection("classes").doc(id).delete().catch(() => undefined);
    }
    for (const path of createdImagePaths) {
        await adminBucket.file(path).delete({ ignoreNotFound: true }).catch(() => undefined);
    }
    await addedApi?.dispose();
    if (added) await cleanupIdentity(added.email, added.uid);
});

test("anonymous users cannot access protected pages or APIs", async ({ request: anonymous, page }) => {
    await page.goto("/club-console-alqisc-7q4m-test/admin/dashboard");
    await expect(page).toHaveURL(/\/club-console-alqisc-7q4m-test\/admin\/login/);
    expect((await anonymous.post("/api/admin/content", { data: {} })).status()).toBe(401);
    expect((await anonymous.get("/api/admin/profile")).status()).toBe(401);
    expect((await anonymous.get("/api/admin/users")).status()).toBe(403);
});

test("added admins cannot manage administrators", async () => {
    expect((await addedApi.get("/api/admin/users")).status()).toBe(403);
    expect((await addedApi.post("/api/admin/users", {
        data: { email: `peer-${uniqueRun}@example.com`, displayName: "Peer Admin" },
    })).status()).toBe(403);
});

test("content API rejects broad, polluted, and timestamp-forging mutations", async () => {
    const broad = await addedApi.post("/api/admin/content", {
        data: { collection: "classes", action: "delete", filters: [] },
    });
    expect(broad.status()).toBe(400);

    const polluted = await addedApi.post("/api/admin/content", {
        data: {
            collection: "classes",
            action: "insert",
            filters: [],
            payload: { slug: uniqueRun, title: "Unsafe", extraData: "not allowed" },
        },
    });
    expect(polluted.status()).toBe(400);

    const forged = await addedApi.post("/api/admin/content", {
        data: {
            collection: "classes",
            action: "insert",
            filters: [],
            payload: { slug: uniqueRun, title: "Unsafe", created_at: "2000-01-01T00:00:00.000Z" },
        },
    });
    expect(forged.status()).toBe(400);
});

test("content manager is denied sections outside assigned permissions", async () => {
    const response = await addedApi.post("/api/admin/content", {
        data: {
            collection: "events",
            action: "insert",
            filters: [],
            payload: {
                title: "Unauthorized event",
                description: "",
                date: new Date().toISOString(),
                time: "",
                location: "",
                category: "special",
                status: "upcoming",
                image_url: "",
                is_featured: false,
                registration_url: "",
            },
        },
    });
    expect(response.status()).toBe(403);
});

test("department head is restricted to assigned department relationships", async () => {
    const assignedDepartmentId = `${uniqueRun}-assigned`;
    const otherDepartmentId = `${uniqueRun}-other`;
    const assignedTeamId = `${uniqueRun}-assigned-team`;
    const otherTeamId = `${uniqueRun}-other-team`;
    const timestamp = new Date().toISOString();
    const departmentData = (slug: string, name: string) => ({
        slug,
        name,
        full_name: `${name} Department`,
        description: "Temporary RBAC test department",
        image_url: "",
        objectives: ["Test scoped access"],
        responsibilities: ["Test scoped access"],
        is_active: false,
        display_order: 9999,
        created_at: timestamp,
        updated_at: timestamp,
    });

    await Promise.all([
        adminDb.collection("departments").doc(assignedDepartmentId)
            .set(departmentData(`${uniqueRun}-assigned`, "Assigned")),
        adminDb.collection("departments").doc(otherDepartmentId)
            .set(departmentData(`${uniqueRun}-other`, "Other")),
        adminDb.collection("teams").doc(assignedTeamId)
            .set({ department_id: assignedDepartmentId, title: "Assigned Team", display_order: 0 }),
        adminDb.collection("teams").doc(otherTeamId)
            .set({ department_id: otherDepartmentId, title: "Other Team", display_order: 0 }),
    ]);

    const departmentHead = await createAddedAdmin({
        role: "department_head",
        permissions: ["departments"],
        departmentIds: [assignedDepartmentId],
    });
    const departmentApi = await request.newContext({ baseURL: testBaseUrl });
    let insertedTeamId = "";
    try {
        expect((await departmentApi.post("/api/auth/session", {
            data: { idToken: departmentHead.idToken },
        })).status()).toBe(200);

        const allowed = await departmentApi.post("/api/admin/content", {
            data: {
                collection: "departments",
                action: "update",
                filters: [{ field: "id", operator: "==", value: assignedDepartmentId }],
                payload: { description: "Updated by assigned department head" },
            },
        });
        expect(allowed.status()).toBe(200);

        const denied = await departmentApi.post("/api/admin/content", {
            data: {
                collection: "departments",
                action: "update",
                filters: [{ field: "id", operator: "==", value: otherDepartmentId }],
                payload: { description: "Unauthorized update" },
            },
        });
        expect(denied.status()).toBe(403);

        const teamInsert = await departmentApi.post("/api/admin/content", {
            data: {
                collection: "teams",
                action: "insert",
                filters: [],
                payload: {
                    department_id: assignedDepartmentId,
                    title: "Department Head Team",
                    display_order: 1,
                },
            },
        });
        expect(teamInsert.status()).toBe(200);
        const teamBody = await teamInsert.json() as { data: Array<{ id: string }> };
        insertedTeamId = teamBody.data[0].id;

        const crossDepartmentTeam = await departmentApi.post("/api/admin/content", {
            data: {
                collection: "teams",
                action: "insert",
                filters: [],
                payload: {
                    department_id: otherDepartmentId,
                    title: "Unauthorized Team",
                    display_order: 1,
                },
            },
        });
        expect(crossDepartmentTeam.status()).toBe(403);
    } finally {
        await departmentApi.dispose();
        await cleanupIdentity(departmentHead.email, departmentHead.uid);
        if (insertedTeamId) {
            await adminDb.collection("teams").doc(insertedTeamId).delete().catch(() => undefined);
        }
        await Promise.all([
            adminDb.collection("teams").doc(assignedTeamId).delete().catch(() => undefined),
            adminDb.collection("teams").doc(otherTeamId).delete().catch(() => undefined),
            adminDb.collection("departments").doc(assignedDepartmentId).delete().catch(() => undefined),
            adminDb.collection("departments").doc(otherDepartmentId).delete().catch(() => undefined),
        ]);
    }
});

test("added admin can publish and remove one validated class", async () => {
    const insert = await addedApi.post("/api/admin/content", {
        data: {
            collection: "classes",
            action: "insert",
            filters: [],
            payload: {
                slug: uniqueRun,
                title: "Codex E2E class",
                description: "Temporary release-gating content",
                schedule: "Sunday",
                time: "10:00",
                venue: "E2E",
                fee: "Free",
                students_enrolled: 0,
                image_url: "",
                objectives: ["Verify publishing"],
                registration_url: "https://example.com/register",
                is_active: false,
            },
        },
    });
    expect(insert.status()).toBe(200);
    const inserted = await insert.json() as { data: Array<{ id: string }> };
    const id = inserted.data[0].id;
    createdContentIds.push(id);

    const duplicate = await addedApi.post("/api/admin/content", {
        data: {
            collection: "classes",
            action: "insert",
            filters: [],
            payload: {
                slug: uniqueRun,
                title: "Duplicate slug",
                description: "",
                schedule: "",
                time: "",
                venue: "",
                fee: "Free",
                students_enrolled: 0,
                image_url: "",
                objectives: [],
                registration_url: "",
                is_active: true,
            },
        },
    });
    expect(duplicate.status()).toBe(409);

    const inactivePublic = await addedApi.get(`/classes/${uniqueRun}`);
    expect(inactivePublic.status()).toBe(404);

    const update = await addedApi.post("/api/admin/content", {
        data: {
            collection: "classes",
            action: "update",
            filters: [{ field: "id", operator: "==", value: id }],
            payload: { is_active: true },
        },
    });
    expect(update.status()).toBe(200);
    expect((await addedApi.get(`/classes/${uniqueRun}`)).status()).toBe(200);

    const remove = await addedApi.post("/api/admin/content", {
        data: {
            collection: "classes",
            action: "delete",
            filters: [{ field: "id", operator: "==", value: id }],
        },
    });
    expect(remove.status()).toBe(200);
    createdContentIds.splice(createdContentIds.indexOf(id), 1);
    expect((await addedApi.get(`/classes/${uniqueRun}`)).status()).toBe(404);
});

test("added admin can upload, proxy-read, and delete an isolated image", async () => {
    const upload = await addedApi.post("/api/admin/images", {
        multipart: {
            folder: "classes",
            file: {
                name: `${uniqueRun}.png`,
                mimeType: "image/png",
                buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64"),
            },
        },
    });
    expect(upload.status()).toBe(200);
    const uploaded = await upload.json() as { url: string; path: string };
    createdImagePaths.push(uploaded.path);

    const proxied = await addedApi.get(`/api/admin/images?value=${encodeURIComponent(uploaded.url)}`);
    expect(proxied.status()).toBe(200);
    expect(proxied.headers()["content-type"]).toContain("image/png");

    const remove = await addedApi.delete("/api/admin/images", { data: { value: uploaded.url } });
    expect(remove.status()).toBe(200);
    createdImagePaths.splice(createdImagePaths.indexOf(uploaded.path), 1);
});

test("removing an allowlist record invalidates an existing added-admin session", async () => {
    await adminDb.collection("authorized_admins").doc(added.email).delete();
    expect((await addedApi.get("/api/admin/profile")).status()).toBe(401);
});

test("primary invite flow never force-verifies an existing unverified account", async () => {
    const primary = await adminAuth.getUserByEmail(primaryAdminEmail);
    const primaryApi = await request.newContext({ baseURL: testBaseUrl });
    const session = await primaryApi.post("/api/auth/session", {
        data: { idToken: await idTokenForUid(primary.uid) },
    });
    expect(session.status()).toBe(200);

    const email = `unverified-${uniqueRun}@example.com`;
    const user = await adminAuth.createUser({ email, emailVerified: false, disabled: false });
    try {
        const invite = await primaryApi.post("/api/admin/users", {
            data: { email, displayName: "Unverified Test", role: "classes_manager" },
        });
        expect(invite.status()).toBe(409);
        const unchanged = await adminAuth.getUser(user.uid);
        expect(unchanged.emailVerified).toBe(false);
        expect(unchanged.disabled).toBe(false);
        expect((await adminDb.collection("authorized_admins").doc(email).get()).exists).toBe(false);
    } finally {
        await adminAuth.deleteUser(user.uid).catch(() => undefined);
        await primaryApi.dispose();
    }
});
