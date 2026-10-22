import { NextResponse } from "next/server";
import { getFirebaseAdminDb } from "@/lib/firebase/admin";
import {
    APPLICATIONS_COLLECTION,
    applicationId,
    filterOpenDepartments,
    getActiveRegistrationDepartments,
    getCommitteeMember,
    getCurrentCommitteeMembers,
    getRegistrationConfig,
    saveApplicationPhoto,
} from "@/lib/firebase/committee-registration";
import {
    detectPhotoType,
    isAcceptingApplications,
    isDepartmentPosition,
    isLeadershipPosition,
    LEADERSHIP_POSITIONS,
    MAX_PHOTO_BYTES,
    POSITION_LABELS,
    validateApplicationInput,
    type PublicRegistrationInfo,
} from "@/lib/committee-registration";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const attempts = new Map<string, number[]>();

function clientAddress(request: Request): string {
    return (request.headers.get("x-forwarded-for") || "unknown").split(",")[0].trim();
}

function isRateLimited(address: string): boolean {
    const cutoff = Date.now() - 10 * 60 * 1000;
    const recent = (attempts.get(address) || []).filter((time) => time > cutoff);
    recent.push(Date.now());
    attempts.set(address, recent);
    return recent.length > 5;
}

export async function GET() {
    const config = await getRegistrationConfig();
    const accepting = isAcceptingApplications(config);
    const leadershipOpen = config.open_positions.some((position) => LEADERSHIP_POSITIONS.includes(position));
    const [departments, members] = accepting
        ? await Promise.all([getActiveRegistrationDepartments(), leadershipOpen ? getCurrentCommitteeMembers() : []])
        : [[], []];

    const info: PublicRegistrationInfo = {
        config: {
            is_open: config.is_open,
            term: config.term,
            deadline: config.deadline,
            intro: config.intro,
            open_positions: config.open_positions,
            open_departments: config.open_departments,
        },
        accepting,
        departments: filterOpenDepartments(departments, config),
        // Only names and roles are exposed; both are already public on the About page.
        eligible_members: members,
    };
    return NextResponse.json(info, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
    if (isRateLimited(clientAddress(request))) {
        return NextResponse.json({ error: "Too many submissions. Please wait a few minutes and try again." }, { status: 429 });
    }

    const form = await request.formData().catch(() => null);
    if (!form || form.get("website")) {
        return NextResponse.json({ error: "Invalid registration submission." }, { status: 400 });
    }

    const config = await getRegistrationConfig();
    if (!isAcceptingApplications(config)) {
        return NextResponse.json({ error: "Committee registration is currently closed." }, { status: 403 });
    }

    const fields = Object.fromEntries([...form.entries()].filter(([, value]) => typeof value === "string"));
    const result = validateApplicationInput(fields);
    if (!result.ok) return NextResponse.json({ error: result.error, errors: result.errors }, { status: 400 });
    const application = result.value;

    if (!config.open_positions.includes(application.position)) {
        return NextResponse.json(
            { error: `Applications for ${POSITION_LABELS[application.position]} are closed.` },
            { status: 403 }
        );
    }

    const photo = form.get("photo");
    if (!(photo instanceof File) || photo.size === 0) {
        return NextResponse.json({ error: "Upload a photo of yourself." }, { status: 400 });
    }
    if (photo.size > MAX_PHOTO_BYTES) {
        return NextResponse.json({ error: "Your photo must be 4 MB or smaller." }, { status: 400 });
    }
    const photoBytes = Buffer.from(await photo.arrayBuffer());
    const photoType = detectPhotoType(photoBytes);
    if (!photoType) {
        return NextResponse.json({ error: "Upload your photo as a JPG, PNG, or WebP image." }, { status: 400 });
    }

    let currentMember = { name: "", role: "" };
    let firstChoiceName = "";
    let secondChoiceName = "";

    if (isLeadershipPosition(application.position)) {
        const member = await getCommitteeMember(application.current_member_id);
        if (!member) {
            return NextResponse.json(
                { error: "President and Vice President positions are only open to current committee members." },
                { status: 403 }
            );
        }
        currentMember = member;
    }

    if (isDepartmentPosition(application.position)) {
        const departments = filterOpenDepartments(await getActiveRegistrationDepartments(), config);
        const first = departments.find((department) => department.slug === application.first_choice);
        const second = departments.find((department) => department.slug === application.second_choice);
        if (!first) return NextResponse.json({ error: "Select a department that is open for registration." }, { status: 400 });
        if (application.second_choice && !second) {
            return NextResponse.json({ error: "Your second choice is not open for registration." }, { status: 400 });
        }
        firstChoiceName = first.name;
        secondChoiceName = second?.name || "";
    }

    const id = applicationId(config.term, application.student_email);
    const reference = getFirebaseAdminDb().collection(APPLICATIONS_COLLECTION).doc(id);
    const timestamp = new Date().toISOString();
    try {
        // Creating the document first reserves the email for this term, so a
        // duplicate submission can never overwrite another applicant's photo.
        await reference.create({
            ...application,
            term: config.term,
            current_member_name: currentMember.name,
            current_member_role: currentMember.role,
            first_choice_name: firstChoiceName,
            second_choice_name: secondChoiceName,
            photo_path: "",
            photo_type: photoType,
            status: "pending",
            admin_notes: "",
            created_at: timestamp,
            updated_at: timestamp,
        });
    } catch (error) {
        // Firestore ALREADY_EXISTS
        if ((error as { code?: number }).code === 6) {
            return NextResponse.json(
                { error: "An application with this student email has already been submitted for this term." },
                { status: 409 }
            );
        }
        throw error;
    }

    try {
        const photoPath = await saveApplicationPhoto(id, photoBytes, photoType);
        await reference.update({ photo_path: photoPath });
    } catch (error) {
        console.error("Committee application photo upload failed", error);
        await reference.delete().catch(() => undefined);
        return NextResponse.json({ error: "Your photo could not be uploaded. Please try again." }, { status: 502 });
    }

    return NextResponse.json({ success: true }, { status: 201 });
}
