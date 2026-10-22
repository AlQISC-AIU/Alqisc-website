import "server-only";

import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { verifyAdminSession } from "./admin";
import { FeedError } from "./feed-admin";

// Shared plumbing for the /api/admin/feed routes.

export const FEED_ID = /^[A-Za-z0-9_-]{1,128}$/;

export function sessionExpired() {
    return NextResponse.json({ error: "Your admin session expired. Please sign in again." }, { status: 401 });
}

export async function requireAdmin(): Promise<boolean> {
    return !!(await verifyAdminSession());
}

export async function readJson(request: Request): Promise<unknown> {
    const raw = await request.text();
    if (raw.length > 100_000) throw new FeedError("The request is too large.", 413);
    try {
        return JSON.parse(raw || "null");
    } catch {
        throw new FeedError("The request body is not valid JSON.", 400);
    }
}

export function failure(error: unknown, fallback: string) {
    if (error instanceof FeedError) {
        return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error(fallback, error);
    return NextResponse.json({ error: fallback }, { status: 500 });
}

// The website caches events and feed reads, so refresh them after each change.
export function refreshPublicPages() {
    revalidateTag("events", { expire: 0 });
    revalidateTag("feed", { expire: 0 });
    revalidatePath("/sitemap.xml");
}
