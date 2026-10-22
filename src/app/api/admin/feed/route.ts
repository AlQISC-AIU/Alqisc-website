import { NextResponse } from "next/server";
import { createFeedItem, FEED_LIST_LIMIT, listFeedItems } from "@/lib/firebase/feed-admin";
import { failure, readJson, refreshPublicPages, requireAdmin, sessionExpired } from "@/lib/firebase/feed-route";
import { validateFeedInput } from "@/lib/feed-validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
    if (!(await requireAdmin())) return sessionExpired();
    try {
        return NextResponse.json({ items: await listFeedItems(), limit: FEED_LIST_LIMIT });
    } catch (error) {
        return failure(error, "The app feed could not be loaded.");
    }
}

export async function POST(request: Request) {
    if (!(await requireAdmin())) return sessionExpired();
    try {
        const result = validateFeedInput(
            await readJson(request),
            process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
        );
        if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
        const item = await createFeedItem(result.value);
        refreshPublicPages();
        return NextResponse.json({ item }, { status: 201 });
    } catch (error) {
        return failure(error, "The item could not be created.");
    }
}
