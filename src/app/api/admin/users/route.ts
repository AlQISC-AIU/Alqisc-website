import { NextResponse } from "next/server";
import {
    AUTHORIZED_ADMINS_COLLECTION,
    getFirebaseAdminAuth,
    getFirebaseAdminDb,
    normalizeAdminEmail,
    PRIMARY_ADMIN_EMAIL,
    verifyAdminContext,
} from "@/lib/firebase/admin";
import { sendPasswordSetupEmail } from "@/lib/firebase/auth-email";
import {
    hasAdminPermission,
    normalizeAdminAccess,
    validateRoleAssignment,
} from "@/lib/admin-access";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function requireSuperAdministrator() {
    const context = await verifyAdminContext();
    if (!context || !hasAdminPermission(context.access, "administrators")) {
        return null;
    }
    return context;
}

async function validateDepartmentsExist(departmentIds: string[]): Promise<boolean> {
    const db = getFirebaseAdminDb();
    const snapshots = await Promise.all(
        departmentIds.map((id) => db.collection("departments").doc(id).get())
    );
    return snapshots.every((snapshot) => snapshot.exists);
}

export async function GET() {
    const context = await requireSuperAdministrator();
    if (!context) {
        return NextResponse.json(
            { error: "Only a super administrator can manage admin access." },
            { status: 403 }
        );
    }

    const db = getFirebaseAdminDb();
    const [snapshot, departmentSnapshot] = await Promise.all([
        db.collection(AUTHORIZED_ADMINS_COLLECTION).orderBy("created_at", "asc").get(),
        db.collection("departments").orderBy("display_order", "asc").get(),
    ]);
    const primaryAccess = normalizeAdminAccess(undefined, true);

    const admins = [
        {
            email: PRIMARY_ADMIN_EMAIL,
            display_name: "Primary administrator",
            status: "active",
            is_primary: true,
            created_at: null,
            last_signed_in_at: null,
            role: primaryAccess.role,
            permissions: primaryAccess.permissions,
            department_ids: primaryAccess.departmentIds,
            is_legacy: false,
        },
        ...snapshot.docs.filter((document) => document.id !== PRIMARY_ADMIN_EMAIL).map((document) => {
            const data = document.data();
            const access = normalizeAdminAccess(data, false);
            return {
                email: document.id,
                display_name: data.display_name || "",
                status: data.status || "invited",
                is_primary: false,
                created_at: data.created_at || null,
                last_signed_in_at: data.last_signed_in_at || null,
                role: access.role,
                permissions: access.permissions,
                department_ids: access.departmentIds,
                is_legacy: access.isLegacy,
            };
        }),
    ];

    const departments = departmentSnapshot.docs.map((document) => ({
        id: document.id,
        name: document.data().full_name || document.data().name || document.id,
    }));

    return NextResponse.json({ admins, departments });
}

export async function POST(request: Request) {
    const context = await requireSuperAdministrator();
    if (!context?.token.email) {
        return NextResponse.json(
            { error: "Only a super administrator can invite admins." },
            { status: 403 }
        );
    }

    const body = (await request.json().catch(() => null)) as
        | {
            email?: string;
            displayName?: string;
            role?: unknown;
            permissions?: unknown;
            departmentIds?: unknown;
        }
        | null;
    const email = normalizeAdminEmail(body?.email || "");
    const requestedDisplayName = body?.displayName?.trim() || "";
    if (!EMAIL_PATTERN.test(email) || email.length > 254) {
        return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    }
    if (email === PRIMARY_ADMIN_EMAIL) {
        return NextResponse.json(
            { error: "This email is already the primary administrator." },
            { status: 409 }
        );
    }
    if (requestedDisplayName.length < 2 || requestedDisplayName.length > 80) {
        return NextResponse.json(
            { error: "Enter the administrator's name (2 to 80 characters)." },
            { status: 400 }
        );
    }
    const assignment = validateRoleAssignment({
        role: body?.role,
        permissions: body?.permissions,
        departmentIds: body?.departmentIds,
    });
    if ("error" in assignment) {
        return NextResponse.json({ error: assignment.error }, { status: 400 });
    }
    if (!(await validateDepartmentsExist(assignment.departmentIds))) {
        return NextResponse.json({ error: "One or more selected departments no longer exist." }, { status: 400 });
    }

    const reference = getFirebaseAdminDb().collection(AUTHORIZED_ADMINS_COLLECTION).doc(email);
    if ((await reference.get()).exists) {
        return NextResponse.json(
            { error: "This email already has an invitation or admin access." },
            { status: 409 }
        );
    }

    let user;
    try {
        user = await getFirebaseAdminAuth().getUserByEmail(email);
        if (user.disabled) {
            return NextResponse.json(
                { error: "This Firebase account is disabled. Re-enable it explicitly before inviting it." },
                { status: 409 }
            );
        }
        if (!user.emailVerified) {
            return NextResponse.json(
                { error: "This existing Firebase account has not verified its email. Verify the account first, then invite it again." },
                { status: 409 }
            );
        }
    } catch (error) {
        const code = (error as { code?: string }).code;
        if (code !== "auth/user-not-found") throw error;
        user = await getFirebaseAdminAuth().createUser({
            email,
            displayName: requestedDisplayName,
            // A new account has no credential until the mailbox owner follows
            // the password-setup link. Existing users are never force-verified.
            emailVerified: true,
            disabled: false,
        });
    }

    const timestamp = new Date().toISOString();
    await reference.create({
        email,
        uid: user.uid,
        display_name: requestedDisplayName,
        status: "invited",
        role: assignment.role,
        permissions: assignment.permissions,
        department_ids: assignment.departmentIds,
        added_by: normalizeAdminEmail(context.token.email),
        created_at: timestamp,
        updated_at: timestamp,
        last_signed_in_at: null,
    });

    try {
        await sendPasswordSetupEmail(email);
    } catch (error) {
        return NextResponse.json(
            {
                error: error instanceof Error ? error.message : "The setup email could not be sent.",
                invitationCreated: true,
            },
            { status: 502 }
        );
    }

    return NextResponse.json({ success: true, email, status: "invited", emailSent: true }, { status: 201 });
}

export async function PATCH(request: Request) {
    const context = await requireSuperAdministrator();
    if (!context) {
        return NextResponse.json(
            { error: "Only a super administrator can update admin access." },
            { status: 403 }
        );
    }
    const body = (await request.json().catch(() => null)) as {
        action?: "resend" | "access";
        email?: string;
        role?: unknown;
        permissions?: unknown;
        departmentIds?: unknown;
    } | null;
    const email = normalizeAdminEmail(body?.email || "");
    const reference = getFirebaseAdminDb().collection(AUTHORIZED_ADMINS_COLLECTION).doc(email);
    if (!EMAIL_PATTERN.test(email) || !(await reference.get()).exists) {
        return NextResponse.json({ error: "Administrator invitation not found." }, { status: 404 });
    }
    if (email === PRIMARY_ADMIN_EMAIL) {
        return NextResponse.json({ error: "The primary administrator's access cannot be changed." }, { status: 400 });
    }
    if (body?.action === "access") {
        const assignment = validateRoleAssignment({
            role: body.role,
            permissions: body.permissions,
            departmentIds: body.departmentIds,
        });
        if ("error" in assignment) {
            return NextResponse.json({ error: assignment.error }, { status: 400 });
        }
        if (!(await validateDepartmentsExist(assignment.departmentIds))) {
            return NextResponse.json({ error: "One or more selected departments no longer exist." }, { status: 400 });
        }
        await reference.set({
            role: assignment.role,
            permissions: assignment.permissions,
            department_ids: assignment.departmentIds,
            updated_at: new Date().toISOString(),
        }, { merge: true });
        return NextResponse.json({ success: true, accessUpdated: true });
    }
    if (body?.action !== "resend") {
        return NextResponse.json({ error: "Choose a valid administrator action." }, { status: 400 });
    }
    try {
        await getFirebaseAdminAuth().getUserByEmail(email);
        await sendPasswordSetupEmail(email);
        await reference.set({ invitation_sent_at: new Date().toISOString() }, { merge: true });
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "The setup email could not be sent." },
            { status: 502 }
        );
    }
}

export async function DELETE(request: Request) {
    const context = await requireSuperAdministrator();
    if (!context) {
        return NextResponse.json(
            { error: "Only a super administrator can remove admins." },
            { status: 403 }
        );
    }

    const body = (await request.json().catch(() => null)) as { email?: string } | null;
    const email = normalizeAdminEmail(body?.email || "");
    if (!EMAIL_PATTERN.test(email)) {
        return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    }
    if (email === PRIMARY_ADMIN_EMAIL) {
        return NextResponse.json(
            { error: "The primary administrator cannot be removed." },
            { status: 400 }
        );
    }

    const reference = getFirebaseAdminDb().collection(AUTHORIZED_ADMINS_COLLECTION).doc(email);
    if (!(await reference.get()).exists) {
        return NextResponse.json({ error: "Administrator not found." }, { status: 404 });
    }
    await reference.delete();

    try {
        const user = await getFirebaseAdminAuth().getUserByEmail(email);
        await getFirebaseAdminAuth().revokeRefreshTokens(user.uid);
    } catch (error) {
        const code = (error as { code?: string }).code;
        if (code !== "auth/user-not-found") throw error;
    }

    return NextResponse.json({ success: true });
}
