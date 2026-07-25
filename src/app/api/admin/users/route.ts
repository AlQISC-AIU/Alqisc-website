import { NextResponse } from "next/server";
import {
    AUTHORIZED_ADMINS_COLLECTION,
    getFirebaseAdminAuth,
    getFirebaseAdminDb,
    normalizeAdminEmail,
    PRIMARY_ADMIN_EMAIL,
    verifyAdminSession,
} from "@/lib/firebase/admin";
import { sendPasswordSetupEmail } from "@/lib/firebase/auth-email";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function requirePrimaryAdministrator() {
    const token = await verifyAdminSession();
    if (!token?.email || normalizeAdminEmail(token.email) !== PRIMARY_ADMIN_EMAIL) {
        return null;
    }
    return token;
}

export async function GET() {
    const token = await requirePrimaryAdministrator();
    if (!token) {
        return NextResponse.json(
            { error: "Only the primary administrator can manage admin access." },
            { status: 403 }
        );
    }

    const snapshot = await getFirebaseAdminDb()
        .collection(AUTHORIZED_ADMINS_COLLECTION)
        .orderBy("created_at", "asc")
        .get();

    const admins = [
        {
            email: PRIMARY_ADMIN_EMAIL,
            display_name: "Primary administrator",
            status: "active",
            is_primary: true,
            created_at: null,
            last_signed_in_at: null,
        },
        ...snapshot.docs.filter((document) => document.id !== PRIMARY_ADMIN_EMAIL).map((document) => ({
            email: document.id,
            display_name: document.data().display_name || "",
            status: document.data().status || "invited",
            is_primary: false,
            created_at: document.data().created_at || null,
            last_signed_in_at: document.data().last_signed_in_at || null,
        })),
    ];

    return NextResponse.json({ admins });
}

export async function POST(request: Request) {
    const token = await requirePrimaryAdministrator();
    if (!token?.email) {
        return NextResponse.json(
            { error: "Only the primary administrator can invite admins." },
            { status: 403 }
        );
    }

    const body = (await request.json().catch(() => null)) as
        | { email?: string; displayName?: string }
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
        added_by: normalizeAdminEmail(token.email),
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
    const token = await requirePrimaryAdministrator();
    if (!token) {
        return NextResponse.json(
            { error: "Only the primary administrator can resend invitations." },
            { status: 403 }
        );
    }
    const body = (await request.json().catch(() => null)) as { email?: string } | null;
    const email = normalizeAdminEmail(body?.email || "");
    const reference = getFirebaseAdminDb().collection(AUTHORIZED_ADMINS_COLLECTION).doc(email);
    if (!EMAIL_PATTERN.test(email) || !(await reference.get()).exists) {
        return NextResponse.json({ error: "Administrator invitation not found." }, { status: 404 });
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
    const token = await requirePrimaryAdministrator();
    if (!token) {
        return NextResponse.json(
            { error: "Only the primary administrator can remove admins." },
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
