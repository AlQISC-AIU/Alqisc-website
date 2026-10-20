import { NextResponse } from "next/server";
import { getFirebaseAdminDb, verifyAdminSession } from "@/lib/firebase/admin";
import { APPLICATIONS_COLLECTION, readApplicationPhoto } from "@/lib/firebase/committee-registration";

export const runtime = "nodejs";

const ID_PATTERN = /^[a-f0-9]{40}$/;

export async function GET(request: Request) {
    if (!(await verifyAdminSession())) {
        return NextResponse.json({ error: "Your admin session expired. Please sign in again." }, { status: 401 });
    }

    const url = new URL(request.url);
    const id = url.searchParams.get("id") || "";
    if (!ID_PATTERN.test(id)) return NextResponse.json({ error: "Photo not found." }, { status: 404 });

    const data = (await getFirebaseAdminDb().collection(APPLICATIONS_COLLECTION).doc(id).get()).data();
    const path = String(data?.photo_path || "");
    const contents = path ? await readApplicationPhoto(path).catch(() => null) : null;
    if (!contents) return NextResponse.json({ error: "Photo not found." }, { status: 404 });

    const name = String(data?.full_name || "applicant").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "") || "applicant";
    const extension = path.split(".").pop();
    return new NextResponse(new Uint8Array(contents), {
        headers: {
            "Content-Type": String(data?.photo_type || "application/octet-stream"),
            "Content-Disposition": `${url.searchParams.has("download") ? "attachment" : "inline"}; filename="${name}.${extension}"`,
            "Cache-Control": "private, no-store",
            "X-Content-Type-Options": "nosniff",
        },
    });
}
