import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore/lite";
import { getStorage, type FirebaseStorage } from "firebase/storage";

const firebaseConfig = {
    apiKey: "AIzaSyCY2fdiTk2QKrDq4B73Zx5hl8wsZS9AoyM",
    authDomain: "alqisc-a2999.firebaseapp.com",
    projectId: "alqisc-a2999",
    storageBucket: "alqisc-a2999.firebasestorage.app",
    messagingSenderId: "963678967644",
    appId: "1:963678967644:web:55fc37b8c1b6c5267cd399",
    measurementId: "G-W6JHZWHQCK",
};

export function getFirebaseApp(): FirebaseApp {
    return getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
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

export const firebaseProjectId = firebaseConfig.projectId;
