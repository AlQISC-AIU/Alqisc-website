import { readFile } from "node:fs/promises";
import { config } from "dotenv";
import { cert, deleteApp, initializeApp } from "firebase-admin/app";
import { getSecurityRules } from "firebase-admin/security-rules";

config({ path: ".env", quiet: true });

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
if (!projectId || !clientEmail || !privateKey || !storageBucket) {
    throw new Error("Firebase Admin environment variables are incomplete.");
}

const app = initializeApp({
    projectId,
    storageBucket,
    credential: cert({ projectId, clientEmail, privateKey }),
}, `rules-deploy-${Date.now()}`);

try {
    const [firestoreSource, storageSource] = await Promise.all([
        readFile("firestore.rules", "utf8"),
        readFile("storage.rules", "utf8"),
    ]);
    const rules = getSecurityRules(app);
    const firestoreRuleset = await rules.releaseFirestoreRulesetFromSource(firestoreSource);
    const storageRuleset = await rules.releaseStorageRulesetFromSource(storageSource, storageBucket);
    console.log(JSON.stringify({
        success: true,
        firestoreRuleset: firestoreRuleset.name,
        storageRuleset: storageRuleset.name,
    }));
} finally {
    await deleteApp(app);
}
