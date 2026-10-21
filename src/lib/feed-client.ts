"use client";

import type { FeedItem, FeedSources } from "./feed";
import type { FeedInput, SocialUpdate } from "./feed-validation";

// Browser helpers for the admin's /api/admin/feed routes.

async function call<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await fetch(path, {
        ...init,
        headers: init?.body ? { "Content-Type": "application/json" } : undefined,
        cache: "no-store",
    });
    const body = (await response.json().catch(() => null)) as (T & { error?: string }) | null;
    if (!response.ok || !body) throw new Error(body?.error || "The request failed. Please try again.");
    return body;
}

export async function fetchFeed(): Promise<{ items: FeedItem[]; limit: number }> {
    return call("/api/admin/feed");
}

export async function fetchFeedItem(id: string): Promise<FeedItem> {
    return (await call<{ item: FeedItem }>(`/api/admin/feed/${encodeURIComponent(id)}`)).item;
}

export async function createFeedItem(input: FeedInput): Promise<FeedItem> {
    return (await call<{ item: FeedItem }>("/api/admin/feed", {
        method: "POST",
        body: JSON.stringify(input),
    })).item;
}

export async function saveFeedItem(id: string, input: FeedInput): Promise<FeedItem> {
    return (await call<{ item: FeedItem }>(`/api/admin/feed/${encodeURIComponent(id)}`, {
        method: "PUT",
        body: JSON.stringify(input),
    })).item;
}

export async function updateSocialPost(id: string, update: SocialUpdate): Promise<FeedItem> {
    return (await call<{ item: FeedItem }>(`/api/admin/feed/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: JSON.stringify(update),
    })).item;
}

export async function deleteFeedItem(id: string): Promise<FeedItem> {
    return (await call<{ item: FeedItem }>(`/api/admin/feed/${encodeURIComponent(id)}`, {
        method: "DELETE",
    })).item;
}

export async function fetchFeedSources(): Promise<FeedSources> {
    return (await call<{ sources: FeedSources }>("/api/admin/feed/sources")).sources;
}

export async function saveFeedSources(sources: FeedSources): Promise<FeedSources> {
    return (await call<{ sources: FeedSources }>("/api/admin/feed/sources", {
        method: "PUT",
        body: JSON.stringify(sources),
    })).sources;
}
