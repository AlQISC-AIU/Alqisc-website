import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { getFirebaseAdminDb, verifyAdminSession } from "@/lib/firebase/admin";
import {
    APPLICATIONS_COLLECTION,
    deleteApplicationPhoto,
    getActiveRegistrationDepartments,
    getRegistrationConfig,
    saveRegistrationConfig,
} from "@/lib/firebase/committee-registration";
import {
    APPLICATION_STATUSES,
    validateRegistrationConfig,
    type ApplicationStatus,
    type CommitteeApplication,
} from "@/lib/committee-registration";

export const runtime = "nodejs";

const ID_PATTERN = /^[a-f0-9]{40}$/;

function unauthorized() {
    return NextResponse.json({ error: "Your admin session expired. Please sign in again." }, { status: 401 });
}

export async function GET() {
    if (!(await verifyAdminSession())) return unauthorized();

    const [config, departments, snapshot] = await Promise.all([
        getRegistrationConfig(),
        getActiveRegistrationDepartments(),
        getFirebaseAdminDb().collection(APPLICATIONS_COLLECTION).orderBy("created_at", "desc").get(),
    ]);
    const applications = snapshot.docs.map((document) => ({ id: document.id, ...document.data() }) as CommitteeApplication);

    return NextResponse.json({ config, departments, applications }, { headers: { "Cache-Control": "no-store" } });
}

export async function PUT(request: Request) {
    if (!(await verifyAdminSession())) return unauthorized();

    const result = validateRegistrationConfig(await request.json().catch(() => null));
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });

    const config = await saveRegistrationConfig(result.value);
    revalidateTag("site-settings", { expire: 0 });
    return NextResponse.json({ config });
}

export async function PATCH(request: Request) {
    if (!(await verifyAdminSession())) return unauthorized();

    const body = (await request.json().catch(() => null)) as
        | { id?: unknown; status?: unknown; admin_notes?: unknown }
        | null;
    const id = typeof body?.id === "string" ? body.id : "";
    if (!ID_PATTERN.test(id)) return NextResponse.json({ error: "Application not found." }, { status: 404 });

    const update: { status?: ApplicationStatus; admin_notes?: string; updated_at: string } = {
        updated_at: new Date().toISOString(),
    };
    if (body?.status !== undefined) {
        if (!APPLICATION_STATUSES.includes(body.status as ApplicationStatus)) {
            return NextResponse.json({ error: "Invalid application status." }, { status: 400 });
        }
        update.status = body.status as ApplicationStatus;
    }
    if (body?.admin_notes !== undefined) {
        if (typeof body.admin_notes !== "string" || body.admin_notes.length > 3000) {
            return NextResponse.json({ error: "Notes must be 3000 characters or fewer." }, { status: 400 });
        }
        update.admin_notes = body.admin_notes.trim();
    }

    const reference = getFirebaseAdminDb().collection(APPLICATIONS_COLLECTION).doc(id);
    if (!(await reference.get()).exists) {
        return NextResponse.json({ error: "Application not found." }, { status: 404 });
    }
    await reference.update(update);
    return NextResponse.json({ success: true, ...update });
}

export async function DELETE(request: Request) {
    if (!(await verifyAdminSession())) return unauthorized();

    const body = (await request.json().catch(() => null)) as { id?: unknown } | null;
    const id = typeof body?.id === "string" ? body.id : "";
    if (!ID_PATTERN.test(id)) return NextResponse.json({ error: "Application not found." }, { status: 404 });

    const reference = getFirebaseAdminDb().collection(APPLICATIONS_COLLECTION).doc(id);
    const photoPath = String((await reference.get()).data()?.photo_path || "");
    await reference.delete();
    if (photoPath) await deleteApplicationPhoto(photoPath);
    return NextResponse.json({ success: true });
}
