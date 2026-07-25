import { NextResponse } from "next/server";
import {
    getFirebaseAdminAuth,
    normalizeAdminEmail,
    PRIMARY_ADMIN_EMAIL,
    verifyAdminContext,
    verifyAdminSession,
} from "@/lib/firebase/admin";
import { sendPasswordSetupEmail } from "@/lib/firebase/auth-email";

export async function GET() {
    const context = await verifyAdminContext();
    if (!context?.token.uid) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    const user = await getFirebaseAdminAuth().getUser(context.token.uid);
    return NextResponse.json({
        profile: {
            email: user.email || context.token.email || "",
            displayName: user.displayName || "",
            photoUrl: user.photoURL || "",
            providers: user.providerData.map((provider) => provider.providerId),
            isPrimary: normalizeAdminEmail(user.email || context.token.email || "") === PRIMARY_ADMIN_EMAIL,
            role: context.access.role,
            permissions: context.access.permissions,
            departmentIds: context.access.departmentIds,
            isLegacy: context.access.isLegacy,
        },
    });
}

export async function PATCH(request: Request) {
    const token = await verifyAdminSession();
    if (!token?.uid) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    const body = (await request.json().catch(() => null)) as
        | { displayName?: string; photoUrl?: string }
        | null;
    const displayName = body?.displayName?.trim() || "";
    const photoUrl = body?.photoUrl?.trim() || "";
    if (displayName.length < 2 || displayName.length > 80) {
        return NextResponse.json({ error: "Your name must be 2 to 80 characters." }, { status: 400 });
    }
    if (photoUrl && !photoUrl.startsWith("https://firebasestorage.googleapis.com/")) {
        return NextResponse.json({ error: "Upload a profile photo before saving." }, { status: 400 });
    }
    const user = await getFirebaseAdminAuth().updateUser(token.uid, {
        displayName,
        photoURL: photoUrl || null,
    });
    return NextResponse.json({
        success: true,
        profile: { email: user.email || "", displayName: user.displayName || "", photoUrl: user.photoURL || "" },
    });
}

export async function POST() {
    const token = await verifyAdminSession();
    if (!token?.email) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    try {
        await sendPasswordSetupEmail(token.email);
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "The password email could not be sent." },
            { status: 502 }
        );
    }
}
