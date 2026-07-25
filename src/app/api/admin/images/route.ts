import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import {
    getFirebaseAdminAuth,
    getFirebaseAdminDb,
    getFirebaseAdminStorage,
    verifyAdminContext,
} from "@/lib/firebase/admin";
import {
    canManageDepartment,
    hasAdminPermission,
    type AdminAccess,
    type AdminPermission,
} from "@/lib/admin-access";

export const runtime = "nodejs";

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const UPLOAD_FOLDERS = new Set([
    "departments", "members", "events", "classes", "blog", "settings", "profiles",
]);
const MANAGED_FOLDERS = new Set([...UPLOAD_FOLDERS, "migrated"]);
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const FOLDER_PERMISSIONS: Record<string, AdminPermission> = {
    departments: "departments",
    members: "departments",
    events: "events",
    classes: "classes",
    blog: "blog",
    settings: "settings",
};

function safeFileStem(name: string): string {
    return name.replace(/\.[^.]+$/, "").normalize("NFKD")
        .replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "image";
}

function extensionFor(type: string): string {
    if (type === "image/jpeg") return "jpg";
    if (type === "image/png") return "png";
    if (type === "image/gif") return "gif";
    return "webp";
}

function pathFromValue(value: string): string | null {
    if (value.startsWith("images/")) return value;
    try {
        const encodedPath = new URL(value).pathname.split("/o/")[1];
        const path = encodedPath ? decodeURIComponent(encodedPath) : "";
        return path.startsWith("images/") ? path : null;
    } catch {
        return null;
    }
}

function isAllowedPath(path: string): boolean {
    const [root, folder] = path.split("/");
    return root === "images" && MANAGED_FOLDERS.has(folder) && path.split("/").length === 3;
}

function canUseFolder(access: AdminAccess, folder: string): boolean {
    if (folder === "profiles") return true;
    if (folder === "migrated") {
        return access.permissions.some((permission) =>
            ["departments", "events", "classes", "blog", "settings"].includes(permission)
        );
    }
    const permission = FOLDER_PERMISSIONS[folder];
    return Boolean(permission && hasAdminPermission(access, permission));
}

function uploadedByUidFromMetadata(value: unknown): string {
    if (!value || typeof value !== "object") return "";
    const customMetadata = (value as { metadata?: unknown }).metadata;
    if (!customMetadata || typeof customMetadata !== "object") return "";
    const uploadedByUid = (customMetadata as Record<string, unknown>).uploadedByUid;
    return typeof uploadedByUid === "string" ? uploadedByUid : "";
}

export async function GET(request: Request) {
    const context = await verifyAdminContext();
    if (!context) {
        return NextResponse.json({ error: "Your admin session expired. Please sign in again." }, { status: 401 });
    }
    const value = new URL(request.url).searchParams.get("value") || "";
    const path = pathFromValue(value);
    if (!path || !isAllowedPath(path)) {
        return NextResponse.json({ error: "Invalid image path." }, { status: 400 });
    }
    const folder = path.split("/")[1] || "";
    if (!canUseFolder(context.access, folder)) {
        return NextResponse.json({ error: "You do not have permission to access this image." }, { status: 403 });
    }

    const file = getFirebaseAdminStorage().bucket().file(path);
    const [exists] = await file.exists();
    if (!exists) return NextResponse.json({ error: "Image not found." }, { status: 404 });
    const [[metadata], [contents]] = await Promise.all([file.getMetadata(), file.download()]);
    return new NextResponse(new Uint8Array(contents), {
        headers: {
            "Content-Type": metadata.contentType || "application/octet-stream",
            "Cache-Control": "private, no-store",
            "X-Content-Type-Options": "nosniff",
        },
    });
}

export async function POST(request: Request) {
    const context = await verifyAdminContext();
    if (!context) {
        return NextResponse.json({ error: "Your admin session expired. Please sign in again." }, { status: 401 });
    }
    const form = await request.formData();
    const file = form.get("file");
    const folder = String(form.get("folder") || "");
    if (!(file instanceof File) || !UPLOAD_FOLDERS.has(folder)) {
        return NextResponse.json({ error: "Invalid image upload." }, { status: 400 });
    }
    if (!canUseFolder(context.access, folder)) {
        return NextResponse.json({ error: "You do not have permission to upload to this section." }, { status: 403 });
    }
    if (!ALLOWED_TYPES.has(file.type) || file.size > MAX_UPLOAD_BYTES) {
        return NextResponse.json({ error: "Choose a JPG, PNG, WebP, or GIF image up to 5 MB." }, { status: 400 });
    }

    const path = `images/${folder}/${Date.now()}-${randomUUID()}-${safeFileStem(file.name)}.${extensionFor(file.type)}`;
    const token = randomUUID();
    const bucket = getFirebaseAdminStorage().bucket();
    await bucket.file(path).save(Buffer.from(await file.arrayBuffer()), {
        resumable: false,
        metadata: {
            contentType: file.type,
            cacheControl: "public,max-age=31536000,immutable",
            metadata: {
                firebaseStorageDownloadTokens: token,
                originalName: file.name.slice(0, 200),
                uploadedByUid: context.token.uid,
            },
        },
    });
    const url = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(path)}?alt=media&token=${token}`;
    return NextResponse.json({ url, path, public_id: path, uploadedBytes: file.size });
}

export async function DELETE(request: Request) {
    const context = await verifyAdminContext();
    if (!context) {
        return NextResponse.json({ error: "Your admin session expired. Please sign in again." }, { status: 401 });
    }
    const body = (await request.json().catch(() => null)) as { value?: string } | null;
    const path = pathFromValue(body?.value || "");
    if (!path || !isAllowedPath(path)) {
        return NextResponse.json({ error: "Invalid image path." }, { status: 400 });
    }
    const folder = path.split("/")[1] || "";
    if (!canUseFolder(context.access, folder)) {
        return NextResponse.json({ error: "You do not have permission to remove this image." }, { status: 403 });
    }

    const file = getFirebaseAdminStorage().bucket().file(path);
    if (context.access.role === "department_head" && ["departments", "members"].includes(folder)) {
        const [metadata] = await file.getMetadata().catch(() => [{ metadata: {} }]);
        const uploadedByUid = uploadedByUidFromMetadata(metadata);
        const referenced = await isAssignedDepartmentImage(context.access, path);
        if (uploadedByUid !== context.token.uid && !referenced) {
            return NextResponse.json(
                { error: "You can remove only images belonging to your assigned department." },
                { status: 403 }
            );
        }
    }
    if (
        folder === "migrated" &&
        context.access.role !== "super_admin" &&
        !context.access.isLegacy
    ) {
        const [metadata] = await file.getMetadata().catch(() => [{ metadata: {} }]);
        const uploadedByUid = uploadedByUidFromMetadata(metadata);
        const referenced = await isPermittedContentImage(context.access, path);
        if (uploadedByUid !== context.token.uid && !referenced) {
            return NextResponse.json(
                { error: "You can remove only migrated images used by a section you manage." },
                { status: 403 }
            );
        }
    }
    if (folder === "profiles") {
        const [metadata] = await file.getMetadata().catch(() => [{ metadata: {} }]);
        const uploadedByUid = uploadedByUidFromMetadata(metadata);
        const user = await getFirebaseAdminAuth().getUser(context.token.uid);
        const isCurrentPhoto = Boolean(user.photoURL && pathFromValue(user.photoURL) === path);
        if (uploadedByUid !== context.token.uid && !isCurrentPhoto) {
            return NextResponse.json({ error: "You can remove only your own profile image." }, { status: 403 });
        }
    }
    await file.delete({ ignoreNotFound: true });
    return NextResponse.json({ success: true });
}

async function isAssignedDepartmentImage(access: AdminAccess, path: string): Promise<boolean> {
    const db = getFirebaseAdminDb();
    for (const departmentId of access.departmentIds) {
        if (!canManageDepartment(access, departmentId)) continue;
        const department = await db.collection("departments").doc(departmentId).get();
        if (department.exists && pathFromValue(String(department.data()?.image_url || "")) === path) {
            return true;
        }
        const teams = await db.collection("teams").where("department_id", "==", departmentId).get();
        for (const team of teams.docs) {
            const members = await db.collection("members").where("team_id", "==", team.id).get();
            if (members.docs.some((member) =>
                pathFromValue(String(member.data().image_url || "")) === path
            )) {
                return true;
            }
        }
    }
    return false;
}

async function isPermittedContentImage(access: AdminAccess, path: string): Promise<boolean> {
    if (access.role === "department_head") return isAssignedDepartmentImage(access, path);

    const db = getFirebaseAdminDb();
    const checks: Array<Promise<boolean>> = [];
    if (hasAdminPermission(access, "events")) {
        checks.push(db.collection("events").get().then((snapshot) =>
            snapshot.docs.some((document) =>
                pathFromValue(String(document.data().image_url || "")) === path
            )
        ));
    }
    if (hasAdminPermission(access, "classes")) {
        checks.push(db.collection("classes").get().then((snapshot) =>
            snapshot.docs.some((document) =>
                pathFromValue(String(document.data().image_url || "")) === path
            )
        ));
    }
    if (hasAdminPermission(access, "blog")) {
        checks.push(db.collection("blog_posts").get().then((snapshot) =>
            snapshot.docs.some((document) =>
                pathFromValue(String(document.data().featured_image_url || "")) === path
            )
        ));
    }
    if (hasAdminPermission(access, "settings")) {
        checks.push(db.collection("site_settings").get().then((snapshot) =>
            snapshot.docs.some((document) =>
                pathFromValue(String(document.data().value || "")) === path
            )
        ));
    }
    return (await Promise.all(checks)).some(Boolean);
}
