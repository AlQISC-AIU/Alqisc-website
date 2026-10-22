import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { connectAuthEmulator, getAuth, type Auth } from "firebase/auth";
import { connectFirestoreEmulator, getFirestore, type Firestore } from "firebase/firestore/lite";
import { connectStorageEmulator, getStorage, type FirebaseStorage } from "firebase/storage";

// Optional. Analytics stays off when it is not set.
export const ANALYTICS_MEASUREMENT_ID = process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || undefined;

// NEXT_PUBLIC_* values are inlined at build time, so each one is read by its full name.
const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export function getFirebaseApp(): FirebaseApp {
    if (getApps().length > 0) return getApp();

    const missing = Object.entries(firebaseConfig)
        .filter(([, value]) => !value)
        .map(([key]) => key);
    if (missing.length > 0) {
        throw new Error(`Firebase web config is missing ${missing.join(", ")}. Set the NEXT_PUBLIC_FIREBASE_* environment variables.`);
    }
    return initializeApp({ ...firebaseConfig, measurementId: ANALYTICS_MEASUREMENT_ID });
}

// Set by `npm run dev:emulators` to run against local Firebase emulators.
const EMULATOR_HOST = process.env.NEXT_PUBLIC_FIREBASE_EMULATOR_HOST;
const connected = { auth: false, firestore: false, storage: false };

export function getFirebaseAuth(): Auth {
    const auth = getAuth(getFirebaseApp());
    if (EMULATOR_HOST && !connected.auth) {
        connectAuthEmulator(auth, `http://${EMULATOR_HOST}:9099`, { disableWarnings: true });
        connected.auth = true;
    }
    return auth;
}

export function getFirestoreDb(): Firestore {
    const db = getFirestore(getFirebaseApp());
    if (EMULATOR_HOST && !connected.firestore) {
        connectFirestoreEmulator(db, EMULATOR_HOST, 8080);
        connected.firestore = true;
    }
    return db;
}

export function getFirebaseStorage(): FirebaseStorage {
    const storage = getStorage(getFirebaseApp());
    if (EMULATOR_HOST && !connected.storage) {
        connectStorageEmulator(storage, EMULATOR_HOST, 9199);
        connected.storage = true;
    }
    return storage;
}

