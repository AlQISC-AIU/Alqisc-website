import { applicationDefault, cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const PRIMARY_ADMIN_EMAIL = normalizeAdminEmail(
    process.env.PRIMARY_ADMIN_EMAIL || ""
);
export const ADMIN_EMAIL = PRIMARY_ADMIN_EMAIL;
export const SESSION_COOKIE_NAME = "firebase-session";
export const AUTHORIZED_ADMINS_COLLECTION = "authorized_admins";

function getAdminApp() {
    const existingApp = getApps()[0];
    if (existingApp) return existingApp;

    const projectId = process.env.FIREBASE_PROJECT_ID || "alqisc-a2999";
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

    return initializeApp({
        projectId,
        storageBucket:
            process.env.FIREBASE_STORAGE_BUCKET ||
            process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
            "alqisc-a2999.firebasestorage.app",
        credential:
            clientEmail && privateKey
                ? cert({ projectId, clientEmail, privateKey })
                : applicationDefault(),
    });
}

export function getFirebaseAdminAuth() {
    return getAuth(getAdminApp());
}

export function getFirebaseAdminDb() {
    return getFirestore(getAdminApp());
}

export function getFirebaseAdminStorage() {
    return getStorage(getAdminApp());
}

export function normalizeAdminEmail(email: string): string {
    return email.trim().toLowerCase();
}

export async function isAdminEmailAuthorized(email: string, uid?: string): Promise<boolean> {
    const normalizedEmail = normalizeAdminEmail(email);
    if (PRIMARY_ADMIN_EMAIL && normalizedEmail === PRIMARY_ADMIN_EMAIL) return true;

    if (!uid) return false;

    const snapshot = await getFirebaseAdminDb()
        .collection(AUTHORIZED_ADMINS_COLLECTION)
        .doc(normalizedEmail)
        .get();
    const admin = snapshot.data();
    return snapshot.exists &&
        admin?.email === normalizedEmail &&
        admin?.uid === uid &&
        admin?.status === "active";
}

export async function verifyAdminSession() {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!sessionCookie) return null;

    try {
        const token = await getFirebaseAdminAuth().verifySessionCookie(sessionCookie, true);
        if (!token.email || token.email_verified !== true) return null;
        if (!(await isAdminEmailAuthorized(token.email, token.uid))) return null;
        return token;
    } catch {
        return null;
    }
}

export async function requireAdminSession() {
    const token = await verifyAdminSession();
    if (!token) redirect("/admin/login");
    return token;
}
