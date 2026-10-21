import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore/lite";
import { getStorage, type FirebaseStorage } from "firebase/storage";

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
    return initializeApp(firebaseConfig);
}

export function getFirebaseAuth(): Auth {
    return getAuth(getFirebaseApp());
}

export function getFirestoreDb(): Firestore {
    return getFirestore(getFirebaseApp());
}

export function getFirebaseStorage(): FirebaseStorage {
    return getStorage(getFirebaseApp());
}

