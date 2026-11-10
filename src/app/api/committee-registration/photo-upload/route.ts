import { NextResponse } from "next/server";
import { applicationExists, createUploadTicket, discardExpiredUploads } from "@/lib/firebase/committee-registration";
import { checkRegistrationRequest, DUPLICATE_APPLICATION, registrationError } from "@/lib/firebase/registration-request";
import { MAX_PHOTO_BYTES, PHOTO_TYPES, type PhotoType } from "@/lib/committee-registration";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Allows the browser to upload one formal picture straight to Storage.
 *
 * The whole application is checked first, exactly as it will be on submission,
 * so only someone with a complete, valid application for an open position can
 * upload anything. The reply names the one Storage path they may write to.
 */
export async function POST(request: Request) {
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body || typeof body !== "object" || Array.isArray(body)) return registrationError("Invalid registration submission.");

    const checked = await checkRegistrationRequest(request, Object.entries(body));
    if (!checked.ok) return checked.response;

    const size = body.photo_size;
    const type = body.photo_type;
    if (typeof size !== "number" || !Number.isInteger(size) || size <= 0) {
        return registrationError("Choose a photo to upload.", 400, { code: "photo" });
    }
    if (size > MAX_PHOTO_BYTES) return registrationError("Your photo must be 10 MB or smaller.", 400, { code: "photo" });
    if (!(PHOTO_TYPES as readonly unknown[]).includes(type)) {
        return registrationError("Upload your photo as a JPG, PNG, or WebP image.", 400, { code: "photo" });
    }

    // Told now, before a large upload, rather than after it.
    if (await applicationExists(checked.id)) return registrationError(DUPLICATE_APPLICATION, 409);

    await discardExpiredUploads().catch((error) => console.error("Could not clear expired photo uploads", error));
    const ticket = await createUploadTicket(checked.id, size, type as PhotoType);
    return NextResponse.json(ticket, { status: 201, headers: { "Cache-Control": "no-store" } });
}
