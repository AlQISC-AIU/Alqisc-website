import ExcelJS from "exceljs";
import sharp from "sharp";
import { NextResponse } from "next/server";
import { getFirebaseAdminDb, verifyAdminSession } from "@/lib/firebase/admin";
import { APPLICATIONS_COLLECTION, readApplicationPhoto } from "@/lib/firebase/committee-registration";
import {
    isDepartmentPosition,
    isLeadershipPosition,
    POSITION_LABELS,
    STATUS_LABELS,
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
        const original = await readApplicationPhoto(path);
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
    sheet.columns = [
        { header: "Photo", key: "photo", width: 18 },
        { header: "Name", key: "name", width: 26 },
        { header: "Position", key: "position", width: 22 },
        { header: "Department (1st)", key: "first", width: 22 },
        { header: "Department (2nd)", key: "second", width: 22 },
        { header: "Status", key: "status", width: 13 },
        { header: "Student email", key: "student_email", width: 32 },
        { header: "Personal email", key: "personal_email", width: 30 },
        { header: "Phone", key: "phone", width: 18 },
        { header: "Student ID", key: "student_id", width: 16 },
        { header: "Programme", key: "programme", width: 28 },
        { header: "Year", key: "year", width: 13 },
        { header: "Current committee record", key: "current_member", width: 28 },
        { header: "Why they want to join", key: "motivation", width: 60 },
        { header: "Experience & skills", key: "experience", width: 50 },
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
            position: POSITION_LABELS[application.position] || application.position,
            first: isDepartmentPosition(application.position) ? application.first_choice_name : "",
            second: isDepartmentPosition(application.position) ? application.second_choice_name : "",
            status: STATUS_LABELS[application.status] || application.status,
            student_email: application.student_email || "",
            personal_email: application.personal_email || "",
            phone: application.phone,
            student_id: application.student_id,
            programme: application.programme,
            year: application.year_of_study,
            current_member: isLeadershipPosition(application.position)
                ? [application.current_member_name, application.current_member_role].filter(Boolean).join(" · ")
                : "",
            motivation: application.motivation,
            experience: application.experience,
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
