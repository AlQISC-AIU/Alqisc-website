import { config } from "dotenv";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

config({ path: ".env" });

const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
const configuredPrimaryAdminEmail = process.env.PRIMARY_ADMIN_EMAIL?.trim().toLowerCase();

if (!projectId || !clientEmail || !privateKey || !apiKey || !configuredPrimaryAdminEmail) {
    throw new Error("Firebase E2E environment variables are incomplete.");
}
// These tests create and delete real accounts, documents and files. The live
// project is shared with the mobile app, so never run them against it.
if (projectId === "al-qisc-prod") {
    throw new Error("E2E tests must not run against al-qisc-prod. Point .env at al-qisc-dev.");
}
const firebaseApiKey = apiKey;
export const primaryAdminEmail = configuredPrimaryAdminEmail;

const app = getApps().find((item) => item.name === "alqisc-e2e") || initializeApp({
    projectId,
    credential: cert({ projectId, clientEmail, privateKey }),
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
}, "alqisc-e2e");

export const adminAuth = getAuth(app);
export const adminDb = getFirestore(app);
export const adminBucket = getStorage(app).bucket();
export const uniqueRun = `codex-e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export async function idTokenForUid(uid: string): Promise<string> {
    const customToken = await adminAuth.createCustomToken(uid);
    const response = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${encodeURIComponent(firebaseApiKey)}`,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token: customToken, returnSecureToken: true }),
        },
    );
    const body = await response.json() as { idToken?: string; error?: { message?: string } };
    if (!response.ok || !body.idToken) throw new Error(body.error?.message || "Could not exchange custom token.");
    return body.idToken;
}

export async function createAddedAdmin() {
    const email = `${uniqueRun}@example.com`;
    const user = await adminAuth.createUser({
        email,
        emailVerified: true,
        displayName: "Codex E2E Admin",
    });
    const timestamp = new Date().toISOString();
    await adminDb.collection("authorized_admins").doc(email).set({
        email,
        uid: user.uid,
        display_name: "Codex E2E Admin",
        status: "active",
        added_by: "e2e-harness",
        created_at: timestamp,
        updated_at: timestamp,
        last_signed_in_at: null,
    });
    return { email, uid: user.uid, idToken: await idTokenForUid(user.uid) };
}

export async function cleanupIdentity(email: string, uid: string) {
    await adminDb.collection("authorized_admins").doc(email).delete().catch(() => undefined);
    await adminAuth.deleteUser(uid).catch(() => undefined);
}
