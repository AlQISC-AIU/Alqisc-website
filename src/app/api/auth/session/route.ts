import { NextResponse } from "next/server";
import {
    AUTHORIZED_ADMINS_COLLECTION,
    getFirebaseAdminAuth,
    getFirebaseAdminDb,
    isAdminEmailAuthorized,
    normalizeAdminEmail,
    PRIMARY_ADMIN_EMAIL,
    SESSION_COOKIE_NAME,
} from "@/lib/firebase/admin";

const SESSION_DURATION_MS = 5 * 24 * 60 * 60 * 1000;

export async function POST(request: Request) {
    try {
        const body = (await request.json()) as { idToken?: string };
        if (!body.idToken) {
            return NextResponse.json({ error: "Missing Firebase ID token." }, { status: 400 });
        }

        const auth = getFirebaseAdminAuth();
        const token = await auth.verifyIdToken(body.idToken, true);
        if (!token.email || token.email_verified !== true) {
            return NextResponse.json(
                { error: "This account is not authorized to access the admin panel." },
                { status: 403 }
            );
        }

        const normalizedEmail = normalizeAdminEmail(token.email);
        if (normalizedEmail !== PRIMARY_ADMIN_EMAIL) {
            const reference = getFirebaseAdminDb()
                .collection(AUTHORIZED_ADMINS_COLLECTION)
                .doc(normalizedEmail);
            const snapshot = await reference.get();
            const invitedAdmin = snapshot.data();
            const isBoundInvitation = snapshot.exists &&
                invitedAdmin?.email === normalizedEmail &&
                invitedAdmin?.uid === token.uid &&
                ["invited", "active"].includes(invitedAdmin?.status);

            if (!isBoundInvitation) {
                return NextResponse.json(
                    { error: "This account is not authorized to access the admin panel." },
                    { status: 403 }
                );
            }

            const timestamp = new Date().toISOString();
            await reference.set({
                    display_name: token.name || "",
                    status: "active",
                    last_signed_in_at: timestamp,
                    updated_at: timestamp,
                }, { merge: true });
        }

        if (!(await isAdminEmailAuthorized(normalizedEmail, token.uid))) {
            return NextResponse.json(
                { error: "This account is not authorized to access the admin panel." },
                { status: 403 }
            );
        }

        const sessionCookie = await auth.createSessionCookie(body.idToken, {
            expiresIn: SESSION_DURATION_MS,
        });
        const response = NextResponse.json({ success: true });
        response.cookies.set(SESSION_COOKIE_NAME, sessionCookie, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
            maxAge: SESSION_DURATION_MS / 1000,
        });
        return response;
    } catch (error) {
        console.error("Firebase session creation failed", error);
        return NextResponse.json({ error: "Unable to create the Firebase session." }, { status: 401 });
    }
}

export async function DELETE() {
    const response = NextResponse.json({ success: true });
    response.cookies.set(SESSION_COOKIE_NAME, "", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 0,
    });
    return response;
}
