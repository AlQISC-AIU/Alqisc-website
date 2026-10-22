// Runs the site against local Firebase emulators (Auth, Firestore, Storage)
// with throwaway sample data. Nothing here touches a real Firebase project.
//
//   npm run dev:emulators
//   node scripts/dev-emulators.mjs next build    (any other command)
//
// Needs Java 11+ for the emulators. Sign in to the admin with the account
// printed by scripts/seed-emulators.mjs.
import { spawn } from "node:child_process";

const PROJECT_ID = "demo-alqisc";
const command = process.argv.slice(2).join(" ") || "next dev";

const env = {
    ...process.env,
    NEXT_PUBLIC_FIREBASE_EMULATOR_HOST: "127.0.0.1",
    NEXT_PUBLIC_FIREBASE_API_KEY: "demo-api-key",
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: `${PROJECT_ID}.firebaseapp.com`,
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: PROJECT_ID,
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: `${PROJECT_ID}.appspot.com`,
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: "0",
    NEXT_PUBLIC_FIREBASE_APP_ID: "1:0:web:0",
    FIREBASE_PROJECT_ID: PROJECT_ID,
    FIREBASE_STORAGE_BUCKET: `${PROJECT_ID}.appspot.com`,
    // Empty values stop .env.local from pointing the server at a real project.
    FIREBASE_CLIENT_EMAIL: "",
    FIREBASE_PRIVATE_KEY: "",
    PRIMARY_ADMIN_EMAIL: "admin@alqisc.test",
    RESEND_API_KEY: "",
};

const child = spawn(
    "firebase",
    [
        "emulators:exec",
        "--only", "auth,firestore,storage",
        "--project", PROJECT_ID,
        `node scripts/seed-emulators.mjs && ${command}`,
    ],
    { env, stdio: "inherit", shell: process.platform === "win32" },
);
child.on("exit", (code) => process.exit(code ?? 1));
