import { applicationDefault, cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth, type DecodedIdToken } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_LOGIN_PATH } from "@/lib/admin-routes";
import {
    hasAdminPermission,
    normalizeAdminAccess,
    type AdminAccess,
    type AdminPermission,
} from "@/lib/admin-access";

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

export async function getAdminAccess(
    email: string,
    uid: string,
): Promise<AdminAccess | null> {
    const normalizedEmail = normalizeAdminEmail(email);
    const isPrimary = Boolean(PRIMARY_ADMIN_EMAIL && normalizedEmail === PRIMARY_ADMIN_EMAIL);
    if (isPrimary) return normalizeAdminAccess(undefined, true);

    const snapshot = await getFirebaseAdminDb()
        .collection(AUTHORIZED_ADMINS_COLLECTION)
        .doc(normalizedEmail)
        .get();
    const admin = snapshot.data();
    if (
        !snapshot.exists ||
        admin?.email !== normalizedEmail ||
        admin?.uid !== uid ||
        admin?.status !== "active"
    ) {
        return null;
    }
    return normalizeAdminAccess(admin, false);
}

export type VerifiedAdminContext = {
    token: DecodedIdToken;
    access: AdminAccess;
};

export async function verifyAdminContext(): Promise<VerifiedAdminContext | null> {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!sessionCookie) return null;

    try {
        const token = await getFirebaseAdminAuth().verifySessionCookie(sessionCookie, true);
        if (!token.email || token.email_verified !== true) return null;
        const access = await getAdminAccess(token.email, token.uid);
        if (!access) return null;
        return { token, access };
    } catch {
        return null;
    }
}

export async function verifyAdminSession() {
    return (await verifyAdminContext())?.token || null;
}

export async function requireAdminSession() {
    const context = await verifyAdminContext();
    if (!context) redirect(ADMIN_LOGIN_PATH);
    return context.token;
}

export async function requireAdminContext() {
    const context = await verifyAdminContext();
    if (!context) redirect(ADMIN_LOGIN_PATH);
    return context;
}

export async function requireAdminPermission(permission: AdminPermission) {
    const context = await requireAdminContext();
    if (!hasAdminPermission(context.access, permission)) {
        redirect("/club-console-alqisc-7q4m-test/admin/dashboard");
    }
    return context;
}
