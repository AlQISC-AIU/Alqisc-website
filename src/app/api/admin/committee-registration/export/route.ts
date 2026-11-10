import ExcelJS from "exceljs";
import sharp from "sharp";
import { NextResponse } from "next/server";
import { getFirebaseAdminDb, verifyAdminSession } from "@/lib/firebase/admin";
import { APPLICATIONS_COLLECTION, readApplicationFile } from "@/lib/firebase/committee-registration";
import {
    DEPARTMENT_POSITION_LABELS,
    EDUCATION_LEVEL_LABELS,
    JOINED_PROGRAMS_LABELS,
    LEGACY_POSITION_LABELS,
    OTHER_CLUB_COMMITMENT_LABELS,
    POSITION_TYPE_LABELS,
    STATUS_LABELS,
    YES_NO_LABELS,
    type CommitteeApplication,
} from "@/lib/committee-registration";

export const runtime = "nodejs";
export const maxDuration = 60;

const ID_PATTERN = /^[a-f0-9]{40}$/;
const MAX_ROWS = 1000;
// Thumbnails keep the workbook small; Vercel caps function responses at 4.5 MB.
const THUMB_WIDTH = 120;
const THUMB_HEIGHT = 150;
const PHOTO_CONCURRENCY = 8;

async function thumbnail(path: string): Promise<Buffer | null> {
    try {
        const original = await readApplicationFile(path);
        if (!original) return null;
        return await sharp(original)
            .rotate()
            // Slightly above display size so photos stay sharp when zoomed, at ~10 KB each.
            .resize(Math.round(THUMB_WIDTH * 4 / 3), Math.round(THUMB_HEIGHT * 4 / 3), { fit: "cover", position: "attention" })
            .jpeg({ quality: 70 })
            .toBuffer();
    } catch (error) {
        console.error("Could not prepare applicant photo for export", path, error);
        return null;
    }
}

/** The display label for a stored answer, or an empty cell when it was not given. */
function label(labels: Record<string, string>, value: string | undefined) {
    return value ? labels[value] || value : "";
}

/** Runs `task` over `items` with at most `limit` in flight. */
async function mapWithLimit<T, R>(items: T[], limit: number, task: (item: T) => Promise<R>): Promise<R[]> {
    const results = new Array<R>(items.length);
    let next = 0;
    await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
        while (next < items.length) {
            const index = next++;
            results[index] = await task(items[index]);
        }
    }));
    return results;
}

export async function POST(request: Request) {
    if (!(await verifyAdminSession())) {
        return NextResponse.json({ error: "Your admin session expired. Please sign in again." }, { status: 401 });
    }

    const body = (await request.json().catch(() => null)) as { ids?: unknown; term?: unknown } | null;
    const ids = Array.isArray(body?.ids)
        ? body.ids.filter((id): id is string => typeof id === "string" && ID_PATTERN.test(id)).slice(0, MAX_ROWS)
        : [];
    if (ids.length === 0) return NextResponse.json({ error: "There are no applications to export." }, { status: 400 });

    const collection = getFirebaseAdminDb().collection(APPLICATIONS_COLLECTION);
    const snapshots = await getFirebaseAdminDb().getAll(...ids.map((id) => collection.doc(id)));
    const applications = snapshots
        .filter((snapshot) => snapshot.exists)
        .map((snapshot) => ({ id: snapshot.id, ...snapshot.data() }) as CommitteeApplication);
    const photos = await mapWithLimit(applications, PHOTO_CONCURRENCY, (application) =>
        application.photo_path ? thumbnail(application.photo_path) : Promise.resolve(null)
    );

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "AL-QISC Admin";
    workbook.created = new Date();
    const sheet = workbook.addWorksheet("Applications", { views: [{ state: "frozen", ySplit: 1 }] });
    // Records from the earlier form carry two answers the current form no
    // longer asks; their columns appear only when such records are exported.
    const hasLegacy = applications.some((application) => application.position || application.personal_email);
    sheet.columns = [
        { header: "Photo", key: "photo", width: 18 },
        { header: "Name", key: "name", width: 28 },
        { header: "Position applied for", key: "position", width: 44 },
        { header: "Top Committee or department", key: "position_type", width: 26 },
        { header: "Department position", key: "department_position", width: 22 },
        { header: "Status", key: "status", width: 13 },
        { header: "Student email", key: "student_email", width: 32 },
        { header: "Contact number", key: "phone", width: 18 },
        { header: "Student ID", key: "student_id", width: 16 },
        { header: "Nationality", key: "nationality", width: 16 },
        { header: "Level of education", key: "education_level", width: 18 },
        { header: "Year of study", key: "year", width: 13 },
        { header: "School, programme & cohort", key: "programme", width: 30 },
        { header: "What they know about Al-Qisc", key: "about_alqisc", width: 50 },
        { header: "Joined our programs", key: "joined_programs", width: 18 },
        { header: "Programs joined", key: "programs_joined", width: 40 },
        { header: "Committee experience", key: "experience", width: 50 },
        { header: "Suitability & motivation", key: "motivation", width: 60 },
        { header: "Accepts another position", key: "accept_other_position", width: 22 },
        { header: "If also serving another club", key: "other_club_commitment", width: 40 },
        { header: "Supporting document", key: "document", width: 20 },
        ...(hasLegacy ? [
            { header: "Position (earlier form)", key: "legacy_position", width: 22 },
            { header: "Department choices (earlier form)", key: "legacy_choices", width: 30 },
            { header: "Personal email (earlier form)", key: "personal_email", width: 30 },
        ] : []),
        { header: "Admin notes", key: "notes", width: 40 },
        { header: "Term", key: "term", width: 12 },
        { header: "Submitted", key: "submitted", width: 20 },
    ];

    const header = sheet.getRow(1);
    header.font = { bold: true, color: { argb: "FFFFFFFF" } };
    header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF205870" } };
    header.alignment = { vertical: "middle" };
    header.height = 22;

    applications.forEach((application, index) => {
        const row = sheet.addRow({
            name: application.full_name,
            position: application.position_label || "",
            position_type: label(POSITION_TYPE_LABELS, application.position_type),
            department_position: label(DEPARTMENT_POSITION_LABELS, application.department_position),
            status: STATUS_LABELS[application.status] || application.status,
            student_email: application.student_email || "",
            phone: application.phone,
            student_id: application.student_id,
            nationality: application.nationality || "",
            education_level: label(EDUCATION_LEVEL_LABELS, application.education_level),
            year: application.year_of_study || "",
            programme: application.programme || "",
            about_alqisc: application.about_alqisc || "",
            joined_programs: label(JOINED_PROGRAMS_LABELS, application.joined_programs),
            programs_joined: application.programs_joined || "",
            experience: application.experience || "",
            motivation: application.motivation,
            accept_other_position: label(YES_NO_LABELS, application.accept_other_position),
            other_club_commitment: label(OTHER_CLUB_COMMITMENT_LABELS, application.other_club_commitment),
            document: application.document_path ? "Attached (download in admin)" : "None",
            legacy_position: label(LEGACY_POSITION_LABELS, application.position),
            legacy_choices: [application.first_choice_name, application.second_choice_name].filter(Boolean).join(", "),
            personal_email: application.personal_email || "",
            notes: application.admin_notes,
            term: application.term,
            submitted: application.created_at ? new Date(application.created_at) : "",
        });
        row.alignment = { vertical: "top", wrapText: true };
        row.getCell("submitted").numFmt = "dd mmm yyyy hh:mm";
        // Points; tall enough for the photo (pixels ≈ points × 4/3).
        row.height = THUMB_HEIGHT * 0.75 + 8;

        const photo = photos[index];
        if (photo) {
            const imageId = workbook.addImage({ buffer: photo as unknown as ExcelJS.Buffer, extension: "jpeg" });
            // tl uses zero-based column/row indexes; the header occupies row 0.
            sheet.addImage(imageId, {
                tl: { col: 0.08, row: row.number - 1 + 0.04 },
                ext: { width: THUMB_WIDTH, height: THUMB_HEIGHT },
                editAs: "oneCell",
            });
        } else {
            row.getCell("photo").value = "No photo";
        }
    });

    sheet.autoFilter = { from: { row: 1, column: 2 }, to: { row: 1, column: sheet.columns.length } };

    const buffer = await workbook.xlsx.writeBuffer();
    const term = typeof body?.term === "string" ? body.term.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") : "";
    return new NextResponse(new Uint8Array(buffer as ArrayBuffer), {
        headers: {
            "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "Content-Disposition": `attachment; filename="committee-applications${term ? `-${term}` : ""}.xlsx"`,
            "Cache-Control": "private, no-store",
        },
    });
}
