import { NextResponse } from "next/server";
import { getCachedEvents } from "@/lib/firebase/public-content";

export const runtime = "nodejs";

export async function GET() {
    try {
        return NextResponse.json(await getCachedEvents());
    } catch {
        return NextResponse.json({ error: "Events could not be loaded." }, { status: 503 });
    }
}
