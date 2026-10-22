import { NextResponse } from "next/server";
import { getFeedSources, setFeedSources } from "@/lib/firebase/feed-admin";
import { failure, readJson, requireAdmin, sessionExpired } from "@/lib/firebase/feed-route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
    if (!(await requireAdmin())) return sessionExpired();
    try {
        return NextResponse.json({ sources: await getFeedSources() });
    } catch (error) {
        return failure(error, "The import settings could not be loaded.");
    }
}

export async function PUT(request: Request) {
    if (!(await requireAdmin())) return sessionExpired();
    try {
        const body = await readJson(request) as Record<string, unknown> | null;
        if (typeof body?.youtube_enabled !== "boolean" || typeof body?.instagram_enabled !== "boolean") {
            return NextResponse.json({ error: "Both import switches must be on or off." }, { status: 400 });
        }
        const sources = await setFeedSources({
            youtube_enabled: body.youtube_enabled,
            instagram_enabled: body.instagram_enabled,
        });
        return NextResponse.json({ sources });
    } catch (error) {
        return failure(error, "The import settings could not be saved.");
    }
}
