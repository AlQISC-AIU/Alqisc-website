import { config } from "dotenv";
import { cert, deleteApp, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

config({ path: ".env", quiet: true });
const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
if (!projectId || !clientEmail || !privateKey || !storageBucket) throw new Error("Firebase Admin environment variables are incomplete.");

const app = initializeApp({ projectId, storageBucket, credential: cert({ projectId, clientEmail, privateKey }) }, `cleanup-check-${Date.now()}`);
try {
    const db = getFirestore(app);
    const [admins, classes, files, users] = await Promise.all([
        db.collection("authorized_admins").get(),
        db.collection("classes").get(),
        getStorage(app).bucket().getFiles({ prefix: "images/settings/codex-e2e-" }),
        getAuth(app).listUsers(1000),
    ]);
    const leftovers = {
        authorizedAdmins: admins.docs.filter((item) => item.id.includes("codex-e2e-")).length,
        classes: classes.docs.filter((item) => String(item.data().slug || "").startsWith("codex-e2e-")).length,
        storageObjects: files[0].length,
        authUsers: users.users.filter((user) => user.email?.includes("codex-e2e-")).length,
    };
    console.log(JSON.stringify(leftovers));
    if (Object.values(leftovers).some((count) => count !== 0)) process.exitCode = 1;
} finally {
    await deleteApp(app);
}
