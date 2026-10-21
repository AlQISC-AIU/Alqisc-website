"use client";

import { isStorageUrl } from "./storage-origin";

const MAX_SOURCE_BYTES = 10 * 1024 * 1024;
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const MAX_IMAGE_EDGE = 1920;
const ALLOWED_FOLDERS = new Set([
    "departments",
    "members",
    "events",
    "classes",
    "blog",
    "settings",
    "profiles",
    "feed",
]);
const ALLOWED_TYPES = new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
]);

export interface FirebaseImageUpload {
    url: string;
    path: string;
    public_id: string;
    originalBytes: number;
    uploadedBytes: number;
}

function safeFileStem(name: string): string {
    return name
        .replace(/\.[^.]+$/, "")
        .normalize("NFKD")
        .replace(/[^a-zA-Z0-9_-]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 60) || "image";
}

function extensionFor(type: string): string {
    if (type === "image/jpeg") return "jpg";
    if (type === "image/png") return "png";
    if (type === "image/gif") return "gif";
    return "webp";
}

async function dataUrlToFile(dataUrl: string): Promise<File> {
    if (!dataUrl.startsWith("data:image/")) {
        throw new Error("Only image files can be uploaded.");
    }

    const response = await fetch(dataUrl);
    const blob = await response.blob();
    return new File([blob], `image.${extensionFor(blob.type)}`, { type: blob.type });
}

async function canvasBlob(
    bitmap: ImageBitmap,
    width: number,
    height: number
): Promise<Blob> {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d", { alpha: true });
    if (!context) throw new Error("This browser cannot optimize the selected image.");
    context.drawImage(bitmap, 0, 0, width, height);

    return new Promise((resolve, reject) => {
        canvas.toBlob(
            (blob) => blob ? resolve(blob) : reject(new Error("Image optimization failed.")),
            "image/webp",
            0.82
        );
    });
}

async function optimizeImage(file: File): Promise<File> {
    if (!ALLOWED_TYPES.has(file.type)) {
        throw new Error("Choose a JPG, PNG, WebP, or GIF image.");
    }
    if (file.size > MAX_SOURCE_BYTES) {
        throw new Error("The selected image is larger than 10 MB.");
    }

    if (file.type === "image/gif" || file.size < 900 * 1024) return file;
    if (typeof createImageBitmap !== "function") {
        if (file.size <= MAX_UPLOAD_BYTES) return file;
        throw new Error("This browser cannot resize an image larger than 5 MB. Please choose a smaller file.");
    }

    const bitmap = await createImageBitmap(file);
    try {
        const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(bitmap.width, bitmap.height));
        const width = Math.max(1, Math.round(bitmap.width * scale));
        const height = Math.max(1, Math.round(bitmap.height * scale));
        const optimized = await canvasBlob(bitmap, width, height);

        if (optimized.size >= file.size && file.size <= MAX_UPLOAD_BYTES) return file;
        return new File([optimized], `${safeFileStem(file.name)}.webp`, {
            type: "image/webp",
            lastModified: Date.now(),
        });
    } finally {
        bitmap.close();
    }
}

export async function uploadImageAction(
    source: File | string,
    folder: string,
    onProgress?: (percent: number) => void
): Promise<FirebaseImageUpload> {
    if (!ALLOWED_FOLDERS.has(folder)) throw new Error("Invalid image destination.");
    const original = typeof source === "string" ? await dataUrlToFile(source) : source;
    const optimized = await optimizeImage(original);
    if (optimized.size > MAX_UPLOAD_BYTES) {
        throw new Error("The optimized image is still larger than 5 MB.");
    }

    const form = new FormData();
    form.set("file", optimized);
    form.set("folder", folder);
    onProgress?.(10);
    const response = await fetch("/api/admin/images", { method: "POST", body: form });
    const body = (await response.json().catch(() => null)) as
        | { url?: string; path?: string; public_id?: string; uploadedBytes?: number; error?: string }
        | null;
    if (!response.ok || !body?.url || !body.path) {
        throw new Error(body?.error || "The image could not be uploaded.");
    }
    onProgress?.(100);
    return {
        url: body.url,
        path: body.path,
        public_id: body.public_id || body.path,
        originalBytes: original.size,
        uploadedBytes: body.uploadedBytes || optimized.size,
    };
}

export function getFirebaseStoragePath(value: string): string | null {
    if (!value) return null;
    if (value.startsWith("images/")) return value;
    if (!isStorageUrl(value)) return null;

    try {
        const parsed = new URL(value);
        const encodedPath = parsed.pathname.split("/o/")[1];
        if (!encodedPath) return null;
        const path = decodeURIComponent(encodedPath);
        return path.startsWith("images/") ? path : null;
    } catch {
        return null;
    }
}

export async function deleteImageAction(value: string): Promise<void> {
    const path = getFirebaseStoragePath(value);
    if (!path) return;
    const response = await fetch("/api/admin/images", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value: path }),
    });
    if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error || "The image could not be removed.");
    }
}
