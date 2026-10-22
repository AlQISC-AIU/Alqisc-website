import { FirebaseError } from "firebase/app";
import {
    collection,
    doc,
    getDoc,
    getDocs,
    limit,
    orderBy,
    query,
    where,
} from "firebase/firestore/lite";
import { getFirestoreDb } from "./app";
import { toFeedItem, type FeedItem } from "@/lib/feed";

// The website's News page shows the app's feed without events, which have
// their own pages. It runs the app's own query, so both show the same posts.
const FEED_LIMIT = 240;

export async function getNews(): Promise<FeedItem[]> {
    const snapshot = await getDocs(query(
        collection(getFirestoreDb(), "public_content"),
        where("status", "==", "published"),
        orderBy("priority", "desc"),
        orderBy("published_at", "desc"),
        limit(FEED_LIMIT),
    ));
    return snapshot.docs
        .map((document) => toFeedItem(document.id, document.data()))
        .filter((item): item is FeedItem => item !== null && item.kind !== "event");
}

export async function getAnnouncementById(id: string): Promise<FeedItem | null> {
    try {
        const snapshot = await getDoc(doc(getFirestoreDb(), "public_content", id));
        if (!snapshot.exists()) return null;
        const item = toFeedItem(snapshot.id, snapshot.data());
        return item && item.kind === "announcement" && item.status === "published" ? item : null;
    } catch (error) {
        // Unpublished items are hidden by the rules, which reads as permission-denied.
        if (error instanceof FirebaseError && error.code === "permission-denied") return null;
        throw error;
    }
}
