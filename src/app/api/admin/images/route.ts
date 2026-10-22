import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getFirebaseAdminStorage, verifyAdminSession } from "@/lib/firebase/admin";
import { storageDownloadUrl } from "@/lib/firebase/storage-origin";

export const runtime = "nodejs";

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const UPLOAD_FOLDERS = new Set([
    "departments", "members", "events", "classes", "blog", "settings", "profiles", "feed",
]);
const MANAGED_FOLDERS = new Set([...UPLOAD_FOLDERS, "migrated"]);
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

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

export async function GET(request: Request) {
    if (!(await verifyAdminSession())) {
        return NextResponse.json({ error: "Your admin session expired. Please sign in again." }, { status: 401 });
    }
    const value = new URL(request.url).searchParams.get("value") || "";
    const path = pathFromValue(value);
    if (!path || !isAllowedPath(path)) {
        return NextResponse.json({ error: "Invalid image path." }, { status: 400 });
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
    if (!(await verifyAdminSession())) {
        return NextResponse.json({ error: "Your admin session expired. Please sign in again." }, { status: 401 });
    }
    const form = await request.formData();
    const file = form.get("file");
    const folder = String(form.get("folder") || "");
    if (!(file instanceof File) || !UPLOAD_FOLDERS.has(folder)) {
        return NextResponse.json({ error: "Invalid image upload." }, { status: 400 });
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
            metadata: { firebaseStorageDownloadTokens: token, originalName: file.name.slice(0, 200) },
        },
    });
    const url = storageDownloadUrl(bucket.name, path, token);
    return NextResponse.json({ url, path, public_id: path, uploadedBytes: file.size });
}

export async function DELETE(request: Request) {
    if (!(await verifyAdminSession())) {
        return NextResponse.json({ error: "Your admin session expired. Please sign in again." }, { status: 401 });
    }
    const body = (await request.json().catch(() => null)) as { value?: string } | null;
    const path = pathFromValue(body?.value || "");
    if (!path || !isAllowedPath(path)) {
        return NextResponse.json({ error: "Invalid image path." }, { status: 400 });
    }
    await getFirebaseAdminStorage().bucket().file(path).delete({ ignoreNotFound: true });
    return NextResponse.json({ success: true });
}
