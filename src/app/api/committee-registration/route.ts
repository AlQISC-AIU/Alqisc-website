import { NextResponse } from "next/server";
import { getFirebaseAdminDb } from "@/lib/firebase/admin";
import {
    APPLICATIONS_COLLECTION,
    deleteApplicationFile,
    getLegacyRegistrationInfo,
    getRegistrationConfig,
    saveApplicationDocument,
    saveApplicationPhoto,
    takeUploadedPhoto,
} from "@/lib/firebase/committee-registration";
import { checkRegistrationRequest, DUPLICATE_APPLICATION, registrationError } from "@/lib/firebase/registration-request";
import {
    APPLICATION_FORM_VERSION,
    detectDocumentType,
    isAcceptingApplications,
    MAX_DOCUMENT_BYTES,
    PHOTO_REQUIRED,
    positionLabel,
    type PublicRegistrationInfo,
} from "@/lib/committee-registration";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Reading and re-encoding a 10 MB photo can take a few seconds.
export const maxDuration = 60;

export async function GET() {
    const config = await getRegistrationConfig();
    const accepting = isAcceptingApplications(config);
    const legacy = await getLegacyRegistrationInfo(config);
    const info: PublicRegistrationInfo = {
        config: {
            is_open: config.is_open,
            term: config.term,
            deadline: config.deadline,
            intro: config.intro,
            open_top_positions: config.open_top_positions,
            open_department_positions: config.open_department_positions,
        },
        accepting,
    };
    return NextResponse.json(
        {
            ...info,
            // Kept for anything written against the earlier response.
            config: { ...info.config, open_positions: legacy.open_positions, open_departments: legacy.open_departments },
            departments: accepting ? legacy.departments : [],
            eligible_members: legacy.eligible_members,
        },
        { headers: { "Cache-Control": "no-store" } },
    );
}

export async function POST(request: Request) {
    const form = await request.formData().catch(() => null);
    if (!form) return registrationError("Invalid registration submission.");

    const checked = await checkRegistrationRequest(request, [...form.entries()].filter(([, value]) => typeof value === "string"));
    if (!checked.ok) return checked.response;
    const { config, application, id } = checked;

    // The supporting document is optional and small enough to travel with the form.
    const uploaded = form.get("document");
    const document = uploaded instanceof File && uploaded.size > 0 ? uploaded : null;
    if (document && document.size > MAX_DOCUMENT_BYTES) return registrationError("Your supporting document must be 3 MB or smaller.");
    const documentBytes = document ? Buffer.from(await document.arrayBuffer()) : null;
    const documentType = documentBytes ? detectDocumentType(documentBytes) : null;
    if (documentBytes && !documentType) return registrationError("Upload your supporting document as a PDF, JPG, PNG, or WebP file.");

    // The photo was uploaded to Storage beforehand; this is the id it was uploaded under.
    const uploadId = form.get("photo_upload_id");
    const photo = typeof uploadId === "string" && uploadId ? await takeUploadedPhoto(uploadId, id) : null;
    if (photo && !photo.ok) return registrationError(photo.error, 400, { code: "photo" });
    if (!photo && PHOTO_REQUIRED) return registrationError("Upload your formal picture.", 400, { code: "photo" });

    const reference = getFirebaseAdminDb().collection(APPLICATIONS_COLLECTION).doc(id);
    const timestamp = new Date().toISOString();
    try {
        // Creating the document first reserves the email for this term, so a
        // duplicate submission can never overwrite another applicant's files.
        await reference.create({
            ...application,
            form_version: APPLICATION_FORM_VERSION,
            term: config.term,
            first_choice_name: positionLabel(application.first_choice, application.department_position),
            second_choice_name: positionLabel(application.second_choice, application.department_position),
            photo_path: "",
            photo_type: photo ? photo.contentType : "",
            document_path: "",
            document_type: documentType || "",
            document_name: document ? document.name.slice(0, 200) : "",
            status: "pending",
            admin_notes: "",
            created_at: timestamp,
            updated_at: timestamp,
        });
    } catch (error) {
        // Firestore ALREADY_EXISTS
        if ((error as { code?: number }).code === 6) {
            await photo?.discard();
            return registrationError(DUPLICATE_APPLICATION, 409);
        }
        throw error;
    }

    const saved: string[] = [];
    try {
        const update: { photo_path?: string; document_path?: string } = {};
        if (photo) {
            update.photo_path = await saveApplicationPhoto(id, photo.bytes, photo.contentType);
            saved.push(update.photo_path);
        }
        if (documentBytes && documentType) {
            update.document_path = await saveApplicationDocument(id, documentBytes, documentType);
            saved.push(update.document_path);
        }
        if (saved.length > 0) await reference.update(update);
    } catch (error) {
        // Nothing is kept from a half-saved application, so the applicant can
        // retry. Their uploaded photo is left in place for that retry.
        console.error("Committee application file upload failed", error);
        await Promise.all(saved.map((path) => deleteApplicationFile(path).catch(() => undefined)));
        await reference.delete().catch(() => undefined);
        return registrationError("Your files could not be saved. Please try again.", 502);
    }

    // The application now holds its own copy of the photo.
    await photo?.discard();
    return NextResponse.json({ success: true }, { status: 201 });
}
