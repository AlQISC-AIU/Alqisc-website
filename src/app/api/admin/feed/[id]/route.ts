import { NextResponse } from "next/server";
import {
    deleteFeedItem,
    getFeedItem,
    updateFeedItem,
    updateSocialItem,
} from "@/lib/firebase/feed-admin";
import {
    FEED_ID,
    failure,
    readJson,
    refreshPublicPages,
    requireAdmin,
    sessionExpired,
} from "@/lib/firebase/feed-route";
import { validateFeedInput, validateSocialUpdate } from "@/lib/feed-validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

async function itemId(context: Context): Promise<string | null> {
    const { id } = await context.params;
    return FEED_ID.test(id) ? id : null;
}

function invalidId() {
    return NextResponse.json({ error: "Invalid item." }, { status: 400 });
}

export async function GET(_request: Request, context: Context) {
    if (!(await requireAdmin())) return sessionExpired();
    const id = await itemId(context);
    if (!id) return invalidId();
    try {
        const item = await getFeedItem(id);
        if (!item) return NextResponse.json({ error: "This item no longer exists." }, { status: 404 });
        return NextResponse.json({ item });
    } catch (error) {
        return failure(error, "The item could not be loaded.");
    }
}

// Edit an announcement or event.
export async function PUT(request: Request, context: Context) {
    if (!(await requireAdmin())) return sessionExpired();
    const id = await itemId(context);
    if (!id) return invalidId();
    try {
        const result = validateFeedInput(
            await readJson(request),
            process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
        );
        if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
        const item = await updateFeedItem(id, result.value);
        refreshPublicPages();
        return NextResponse.json({ item });
    } catch (error) {
        return failure(error, "The item could not be saved.");
    }
}

// Archive, republish, reorder or unlock an imported Instagram or YouTube post.
export async function PATCH(request: Request, context: Context) {
    if (!(await requireAdmin())) return sessionExpired();
    const id = await itemId(context);
    if (!id) return invalidId();
    try {
        const result = validateSocialUpdate(await readJson(request));
        if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
        const item = await updateSocialItem(id, result.value);
        refreshPublicPages();
        return NextResponse.json({ item });
    } catch (error) {
        return failure(error, "The post could not be updated.");
    }
}

export async function DELETE(_request: Request, context: Context) {
    if (!(await requireAdmin())) return sessionExpired();
    const id = await itemId(context);
    if (!id) return invalidId();
    try {
        const item = await deleteFeedItem(id);
        refreshPublicPages();
        return NextResponse.json({ item });
    } catch (error) {
        return failure(error, "The item could not be deleted.");
    }
}
