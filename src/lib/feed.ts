// Shared model for `public_content`, the feed that the mobile app and the
// website both read. Field names, types and enum values are a contract with
// every installed app version, so change them only together with the app.

export const FEED_KINDS = ["announcement", "event", "instagram", "youtube"] as const;
export type FeedKind = (typeof FEED_KINDS)[number];

export const FEED_SOURCES = ["alqisc", "instagram", "youtube"] as const;
export type FeedSource = (typeof FEED_SOURCES)[number];

export const FEED_STATUSES = ["draft", "published", "archived"] as const;
export type FeedStatus = (typeof FEED_STATUSES)[number];

// Kinds the admin creates. Instagram and YouTube items come from the importers.
export const EDITABLE_KINDS = ["announcement", "event"] as const;
export type EditableKind = (typeof EDITABLE_KINDS)[number];

// Website-only field on events. The app ignores it.
export const EVENT_CATEGORIES = ["weekly", "monthly", "special"] as const;
export type EventCategory = (typeof EVENT_CATEGORIES)[number];

export const FEED_LANGUAGES = ["en", "ar", "ms"] as const;
export type FeedLanguage = (typeof FEED_LANGUAGES)[number];
export type LocalizedText = Partial<Record<FeedLanguage, string>>;

// Hosts the app accepts for registration and permalink links
// (lib/features/community/domain/public_content.dart in the app repo).
// A link to any other host is dropped by the app, so the admin rejects it.
export const APP_LINK_HOSTS = [
    "alqisc.com",
    "www.instagram.com",
    "instagram.com",
    "www.youtube.com",
    "youtube.com",
    "youtu.be",
    "forms.gle",
    "docs.google.com",
] as const;

// Club events happen at AIU, so dates and times are shown in Malaysian time.
export const CLUB_TIME_ZONE = "Asia/Kuala_Lumpur";

// A feed document with Timestamps converted to ISO strings for the browser.
export interface FeedItem {
    id: string;
    kind: FeedKind;
    source: FeedSource;
    source_id: string | null;
    status: FeedStatus;
    title: LocalizedText;
    summary: LocalizedText | null;
    priority: number;
    published_at: string | null;
    created_at: string | null;
    updated_at: string | null;
    starts_at: string | null;
    ends_at: string | null;
    location: LocalizedText | null;
    registration_url: string | null;
    thumbnail_url: string | null;
    media_type: string | null;
    media_urls: string[];
    video_url: string | null;
    permalink: string | null;
    category: EventCategory | null;
    // Set when an admin changes an imported item, so the importer keeps the
    // admin's status and priority instead of overwriting them.
    admin_locked: boolean;
}

export interface FeedSources {
    youtube_enabled: boolean;
    instagram_enabled: boolean;
}

export function isFeedKind(value: unknown): value is FeedKind {
    return typeof value === "string" && (FEED_KINDS as readonly string[]).includes(value);
}

export function isFeedStatus(value: unknown): value is FeedStatus {
    return typeof value === "string" && (FEED_STATUSES as readonly string[]).includes(value);
}

export function isEditableKind(value: unknown): value is EditableKind {
    return typeof value === "string" && (EDITABLE_KINDS as readonly string[]).includes(value);
}

export function isSocialKind(kind: FeedKind): boolean {
    return kind === "instagram" || kind === "youtube";
}

// Same fallback order as the app: English, then Arabic, then Malay.
export function pickText(text: LocalizedText | null | undefined): string {
    if (!text) return "";
    for (const language of FEED_LANGUAGES) {
        const value = text[language]?.trim();
        if (value) return value;
    }
    return "";
}

export function isAppLink(value: string): boolean {
    try {
        const url = new URL(value);
        return url.protocol === "https:" && (APP_LINK_HOSTS as readonly string[]).includes(url.hostname);
    } catch {
        return false;
    }
}

// Upcoming while the event has not ended; events without an end time count
// as over once they start. Matches the app's "Upcoming" rail.
export function isUpcoming(item: Pick<FeedItem, "starts_at" | "ends_at">, now = Date.now()): boolean {
    const end = item.ends_at || item.starts_at;
    if (!end) return false;
    return Date.parse(end) > now;
}

function formatClock(iso: string): string {
    return new Date(iso).toLocaleTimeString("en-MY", {
        hour: "numeric",
        minute: "2-digit",
        timeZone: CLUB_TIME_ZONE,
    });
}

export function formatEventTime(startsAt: string | null, endsAt: string | null): string {
    if (!startsAt) return "";
    const start = formatClock(startsAt);
    if (!endsAt) return start;
    const sameDay =
        new Date(startsAt).toLocaleDateString("en-CA", { timeZone: CLUB_TIME_ZONE }) ===
        new Date(endsAt).toLocaleDateString("en-CA", { timeZone: CLUB_TIME_ZONE });
    return sameDay ? `${start} – ${formatClock(endsAt)}` : start;
}

type TimestampLike = { toDate(): Date };

function toIso(value: unknown): string | null {
    if (value && typeof value === "object" && typeof (value as TimestampLike).toDate === "function") {
        return (value as TimestampLike).toDate().toISOString();
    }
    if (typeof value === "string" && Number.isFinite(Date.parse(value))) {
        return new Date(value).toISOString();
    }
    return null;
}

function toLocalized(value: unknown): LocalizedText | null {
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    const result: LocalizedText = {};
    for (const language of FEED_LANGUAGES) {
        const text = (value as Record<string, unknown>)[language];
        if (typeof text === "string" && text.trim()) result[language] = text;
    }
    return Object.keys(result).length > 0 ? result : null;
}

function toText(value: unknown): string | null {
    return typeof value === "string" && value ? value : null;
}

// Reads a public_content document from either Firebase SDK. Returns null for
// documents the app would also skip (unknown kind, source or status, no title).
export function toFeedItem(id: string, data: Record<string, unknown>): FeedItem | null {
    const title = toLocalized(data.title);
    if (!isFeedKind(data.kind) || !isFeedStatus(data.status) || !title) return null;
    if (!(FEED_SOURCES as readonly unknown[]).includes(data.source)) return null;

    return {
        id,
        kind: data.kind,
        source: data.source as FeedSource,
        source_id: toText(data.source_id),
        status: data.status,
        title,
        summary: toLocalized(data.summary),
        priority: typeof data.priority === "number" && Number.isFinite(data.priority) ? Math.trunc(data.priority) : 0,
        published_at: toIso(data.published_at),
        created_at: toIso(data.created_at),
        updated_at: toIso(data.updated_at),
        starts_at: toIso(data.starts_at),
        ends_at: toIso(data.ends_at),
        location: toLocalized(data.location),
        registration_url: toText(data.registration_url),
        thumbnail_url: toText(data.thumbnail_url),
        media_type: toText(data.media_type),
        media_urls: Array.isArray(data.media_urls)
            ? data.media_urls.filter((url): url is string => typeof url === "string")
            : [],
        video_url: toText(data.video_url),
        permalink: toText(data.permalink),
        category: (EVENT_CATEGORIES as readonly unknown[]).includes(data.category)
            ? (data.category as EventCategory)
            : null,
        admin_locked: data.admin_locked === true,
    };
}

export function formatEventDate(iso: string): string {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleDateString("en-MY", {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: CLUB_TIME_ZONE,
    });
}

// Malaysia is UTC+8 all year (no daylight saving), so the admin's date and
// time inputs are read and shown in club time whatever the browser's zone.
const MALAYSIA_OFFSET_MS = 8 * 60 * 60 * 1000;

export function toMalaysiaInput(iso: string | null): string {
    if (!iso) return "";
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return "";
    return new Date(date.getTime() + MALAYSIA_OFFSET_MS).toISOString().slice(0, 16);
}

export function fromMalaysiaInput(value: string): string {
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return "";
    const date = new Date(`${value}:00+08:00`);
    return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}
