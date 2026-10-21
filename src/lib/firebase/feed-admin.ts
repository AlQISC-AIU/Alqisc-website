import "server-only";

import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { getFirebaseAdminDb } from "./admin";
import {
    isSocialKind,
    toFeedItem,
    type FeedItem,
    type FeedSources,
    type LocalizedText,
} from "@/lib/feed";
import type { FeedInput, SocialUpdate } from "@/lib/feed-validation";

const FEED_COLLECTION = "public_content";
const SOURCES_DOC = "public_config/sources";
// The admin list loads the newest documents. Archived social posts pile up
// over time, so very old ones drop off the list but stay in the database.
export const FEED_LIST_LIMIT = 500;

export class FeedError extends Error {
    constructor(message: string, readonly status: number) {
        super(message);
    }
}

function hasText(text: LocalizedText): boolean {
    return Object.values(text).some((value) => !!value);
}

function feed() {
    return getFirebaseAdminDb().collection(FEED_COLLECTION);
}

export async function listFeedItems(): Promise<FeedItem[]> {
    const snapshot = await feed().orderBy("published_at", "desc").limit(FEED_LIST_LIMIT).get();
    return snapshot.docs
        .map((document) => toFeedItem(document.id, document.data()))
        .filter((item): item is FeedItem => item !== null);
}

export async function getFeedItem(id: string): Promise<FeedItem | null> {
    const snapshot = await feed().doc(id).get();
    return snapshot.exists ? toFeedItem(snapshot.id, snapshot.data() || {}) : null;
}

// Builds the stored document in the shape the app reads. published_at is set
// when the item is created and refreshed when a draft is first published, so
// new posts reach the top of the app's feed.
function toDocument(input: FeedInput, existing: FeedItem | null): Record<string, unknown> {
    const now = FieldValue.serverTimestamp();
    const data: Record<string, unknown> = {
        kind: input.kind,
        source: "alqisc",
        source_id: null,
        status: input.status,
        title: input.title,
        summary: hasText(input.summary) ? input.summary : null,
        priority: input.priority,
        thumbnail_url: input.thumbnail_url || null,
        media_type: input.thumbnail_url ? "image" : "none",
        updated_at: now,
    };

    if (!existing) {
        data.created_at = now;
        data.published_at = now;
    } else if (input.status === "published" && existing.status === "draft") {
        data.published_at = now;
    }

    if (input.kind === "event") {
        data.starts_at = Timestamp.fromDate(new Date(input.starts_at));
        data.ends_at = input.ends_at ? Timestamp.fromDate(new Date(input.ends_at)) : null;
        data.location = hasText(input.location) ? input.location : null;
        data.registration_url = input.registration_url || null;
        data.category = input.category;
    }
    return data;
}

export async function createFeedItem(input: FeedInput): Promise<FeedItem> {
    const reference = feed().doc();
    await reference.set(toDocument(input, null));
    const created = await getFeedItem(reference.id);
    if (!created) throw new FeedError("The item was saved but could not be read back.", 500);
    return created;
}

export async function updateFeedItem(id: string, input: FeedInput): Promise<FeedItem> {
    const existing = await getFeedItem(id);
    if (!existing) throw new FeedError("This item no longer exists.", 404);
    if (existing.source !== "alqisc") {
        throw new FeedError("Instagram and YouTube posts can only be archived, republished or reordered.", 400);
    }
    if (existing.kind !== input.kind) {
        throw new FeedError("An announcement cannot become an event, or the other way round.", 400);
    }
    // update() replaces each field whole, so a cleared language is removed.
    // set(..., { merge: true }) would deep-merge the text maps and keep it.
    await feed().doc(id).update(toDocument(input, existing));
    const updated = await getFeedItem(id);
    if (!updated) throw new FeedError("The item was saved but could not be read back.", 500);
    return updated;
}

// Changing an imported post locks it, so the importer keeps the admin's status
// and priority instead of restoring its own every 15 minutes.
export async function updateSocialItem(id: string, update: SocialUpdate): Promise<FeedItem> {
    const existing = await getFeedItem(id);
    if (!existing) throw new FeedError("This item no longer exists.", 404);
    if (!isSocialKind(existing.kind)) {
        throw new FeedError("Edit announcements and events from their edit page.", 400);
    }

    const changesContent = update.status !== undefined || update.priority !== undefined;
    const data: Record<string, unknown> = {
        updated_at: FieldValue.serverTimestamp(),
        admin_locked: update.admin_locked ?? (changesContent ? true : existing.admin_locked),
    };
    if (update.status !== undefined) data.status = update.status;
    if (update.priority !== undefined) data.priority = update.priority;

    await feed().doc(id).update(data);
    const updated = await getFeedItem(id);
    if (!updated) throw new FeedError("The item was saved but could not be read back.", 500);
    return updated;
}

export async function deleteFeedItem(id: string): Promise<FeedItem> {
    const existing = await getFeedItem(id);
    if (!existing) throw new FeedError("This item no longer exists.", 404);
    if (existing.source !== "alqisc") {
        throw new FeedError("Imported posts cannot be deleted. Archive them instead.", 400);
    }
    await feed().doc(id).delete();
    return existing;
}

export async function getFeedSources(): Promise<FeedSources> {
    const snapshot = await getFirebaseAdminDb().doc(SOURCES_DOC).get();
    const data = snapshot.data() || {};
    // The importers treat a missing switch as on.
    return {
        youtube_enabled: data.youtube_enabled !== false,
        instagram_enabled: data.instagram_enabled !== false,
    };
}

export async function setFeedSources(sources: FeedSources): Promise<FeedSources> {
    await getFirebaseAdminDb().doc(SOURCES_DOC).set(
        { ...sources, updated_at: FieldValue.serverTimestamp() },
        { merge: true },
    );
    return getFeedSources();
}
