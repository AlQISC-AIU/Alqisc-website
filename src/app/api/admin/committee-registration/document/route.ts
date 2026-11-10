import { NextResponse } from "next/server";
import { getFirebaseAdminDb, verifyAdminSession } from "@/lib/firebase/admin";
import { APPLICATIONS_COLLECTION, readApplicationFile } from "@/lib/firebase/committee-registration";

export const runtime = "nodejs";

const ID_PATTERN = /^[a-f0-9]{40}$/;

/** Downloads the supporting document an applicant attached, for signed-in admins only. */
export async function GET(request: Request) {
    if (!(await verifyAdminSession())) {
        return NextResponse.json({ error: "Your admin session expired. Please sign in again." }, { status: 401 });
    }

    const id = new URL(request.url).searchParams.get("id") || "";
    if (!ID_PATTERN.test(id)) return NextResponse.json({ error: "Document not found." }, { status: 404 });

    const data = (await getFirebaseAdminDb().collection(APPLICATIONS_COLLECTION).doc(id).get()).data();
    const path = String(data?.document_path || "");
    const contents = path ? await readApplicationFile(path).catch(() => null) : null;
    if (!contents) return NextResponse.json({ error: "Document not found." }, { status: 404 });

    const name = String(data?.full_name || "applicant").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "") || "applicant";
    const extension = path.split(".").pop();
    return new NextResponse(new Uint8Array(contents), {
        headers: {
            "Content-Type": String(data?.document_type || "application/octet-stream"),
            // Always a download, so an uploaded file is never rendered on this origin.
            "Content-Disposition": `attachment; filename="${name}-supporting-document.${extension}"`,
            "Cache-Control": "private, no-store",
            "X-Content-Type-Options": "nosniff",
        },
    });
}
