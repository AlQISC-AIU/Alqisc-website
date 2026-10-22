import { FirebaseError } from "firebase/app";
import { collection, doc, getDoc, getDocs, orderBy, query, where } from "firebase/firestore/lite";
import { getFirestoreDb } from "./app";
import { formatEventTime, isUpcoming, pickText, toFeedItem, type FeedItem } from "@/lib/feed";
import type { Event } from "./types";

// Events live in the app's feed (public_content, kind "event"), so the website
// and the mobile app show the same list. The admin edits them under App feed.

export function toWebsiteEvent(item: FeedItem, now = Date.now()): Event {
    return {
        id: item.id,
        title: pickText(item.title),
        description: pickText(item.summary),
        date: item.starts_at || "",
        time: formatEventTime(item.starts_at, item.ends_at),
        location: pickText(item.location),
        category: item.category || "special",
        status: isUpcoming(item, now) ? "upcoming" : "past",
        image_url: item.thumbnail_url || "",
        is_featured: item.priority > 0,
        registration_url: item.registration_url || "",
        created_at: item.created_at || item.published_at || "",
    };
}

export async function getEvents(): Promise<Event[]> {
    const snapshot = await getDocs(query(
        collection(getFirestoreDb(), "public_content"),
        where("kind", "==", "event"),
        where("status", "==", "published"),
        orderBy("starts_at", "desc"),
    ));
    const now = Date.now();
    return snapshot.docs
        .map((document) => toFeedItem(document.id, document.data()))
        .filter((item): item is FeedItem => item !== null && item.starts_at !== null)
        .map((item) => toWebsiteEvent(item, now));
}

export async function getEventById(id: string): Promise<Event | null> {
    try {
        const snapshot = await getDoc(doc(getFirestoreDb(), "public_content", id));
        if (!snapshot.exists()) return null;
        const item = toFeedItem(snapshot.id, snapshot.data());
        if (!item || item.kind !== "event" || item.status !== "published" || !item.starts_at) return null;
        return toWebsiteEvent(item);
    } catch (error) {
        // Rules hide drafts and archived items from the public, which reads as
        // permission-denied. Treat it like a missing event.
        if (error instanceof FirebaseError && error.code === "permission-denied") return null;
        throw error;
    }
}
