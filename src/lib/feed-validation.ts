import {
    EVENT_CATEGORIES,
    FEED_LANGUAGES,
    isAppLink,
    isEditableKind,
    isFeedStatus,
    type EditableKind,
    type EventCategory,
    type FeedStatus,
    type LocalizedText,
} from "./feed";
import { isBucketFileUrl } from "./firebase/storage-origin";

type Row = Record<string, unknown>;

export const TITLE_MAX = 200;
export const SUMMARY_MAX = 2_000;
export const LOCATION_MAX = 200;
export const PRIORITY_MAX = 100;

// What the admin editor sends for an announcement or event.
export interface FeedInput {
    kind: EditableKind;
    status: FeedStatus;
    title: LocalizedText;
    summary: LocalizedText;
    priority: number;
    thumbnail_url: string;
    starts_at: string;
    ends_at: string;
    location: LocalizedText;
    registration_url: string;
    category: EventCategory;
}

// What the admin may change on an imported Instagram or YouTube item.
export interface SocialUpdate {
    status?: "published" | "archived";
    priority?: number;
    admin_locked?: boolean;
}

export type Validation<T> = { ok: true; value: T } | { ok: false; error: string };

function isRow(value: unknown): value is Row {
    return !!value && typeof value === "object" && !Array.isArray(value);
}

function localized(value: unknown, max: number, label: string): Validation<LocalizedText> {
    if (value === undefined || value === null) return { ok: true, value: {} };
    if (!isRow(value)) return { ok: false, error: `${label} must list text by language.` };
    const result: LocalizedText = {};
    for (const language of FEED_LANGUAGES) {
        const text = value[language];
        if (text === undefined || text === null) continue;
        if (typeof text !== "string") return { ok: false, error: `${label} (${language}) must be text.` };
        const trimmed = text.trim();
        if (trimmed.length > max) {
            return { ok: false, error: `${label} (${language}) must be ${max} characters or fewer.` };
        }
        if (trimmed) result[language] = trimmed;
    }
    return { ok: true, value: result };
}

function isoTimestamp(value: unknown): value is string {
    return typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value) && Number.isFinite(Date.parse(value));
}

export function validateFeedInput(raw: unknown, storageBucket: string): Validation<FeedInput> {
    if (!isRow(raw)) return { ok: false, error: "The content is missing." };

    if (!isEditableKind(raw.kind)) return { ok: false, error: "Choose announcement or event." };
    if (!isFeedStatus(raw.status)) return { ok: false, error: "Choose draft, published or archived." };

    const title = localized(raw.title, TITLE_MAX, "Title");
    if (!title.ok) return title;
    if (!title.value.en) return { ok: false, error: "An English title is required." };

    const summary = localized(raw.summary, SUMMARY_MAX, "Summary");
    if (!summary.ok) return summary;

    const priority = raw.priority ?? 0;
    if (!Number.isInteger(priority) || Number(priority) < 0 || Number(priority) > PRIORITY_MAX) {
        return { ok: false, error: `Priority must be a whole number from 0 to ${PRIORITY_MAX}.` };
    }

    const thumbnail = typeof raw.thumbnail_url === "string" ? raw.thumbnail_url.trim() : "";
    if (thumbnail && !isBucketFileUrl(thumbnail, storageBucket)) {
        return { ok: false, error: "Upload the poster again; its link is not from this site's storage." };
    }

    const value: FeedInput = {
        kind: raw.kind,
        status: raw.status,
        title: title.value,
        summary: summary.value,
        priority: Number(priority),
        thumbnail_url: thumbnail,
        starts_at: "",
        ends_at: "",
        location: {},
        registration_url: "",
        category: "special",
    };

    if (raw.kind === "announcement") return { ok: true, value };

    if (!isoTimestamp(raw.starts_at)) return { ok: false, error: "Set the event's start date and time." };
    value.starts_at = new Date(raw.starts_at).toISOString();

    if (raw.ends_at !== undefined && raw.ends_at !== null && raw.ends_at !== "") {
        if (!isoTimestamp(raw.ends_at)) return { ok: false, error: "The end time is not a valid date." };
        if (Date.parse(raw.ends_at) <= Date.parse(raw.starts_at)) {
            return { ok: false, error: "The event must end after it starts." };
        }
        value.ends_at = new Date(raw.ends_at).toISOString();
    }

    const location = localized(raw.location, LOCATION_MAX, "Location");
    if (!location.ok) return location;
    value.location = location.value;

    const registration = typeof raw.registration_url === "string" ? raw.registration_url.trim() : "";
    if (registration && !isAppLink(registration)) {
        return {
            ok: false,
            error: "The app only opens registration links on alqisc.com (without www), forms.gle, docs.google.com, Instagram or YouTube.",
        };
    }
    value.registration_url = registration;

    const category = raw.category ?? "special";
    if (!(EVENT_CATEGORIES as readonly unknown[]).includes(category)) {
        return { ok: false, error: "Choose weekly, monthly or special." };
    }
    value.category = category as EventCategory;

    return { ok: true, value };
}

export function validateSocialUpdate(raw: unknown): Validation<SocialUpdate> {
    if (!isRow(raw)) return { ok: false, error: "The change is missing." };
    const value: SocialUpdate = {};

    if (raw.status !== undefined) {
        if (raw.status !== "published" && raw.status !== "archived") {
            return { ok: false, error: "Imported posts can only be published or archived." };
        }
        value.status = raw.status;
    }
    if (raw.priority !== undefined) {
        if (!Number.isInteger(raw.priority) || Number(raw.priority) < 0 || Number(raw.priority) > PRIORITY_MAX) {
            return { ok: false, error: `Priority must be a whole number from 0 to ${PRIORITY_MAX}.` };
        }
        value.priority = Number(raw.priority);
    }
    if (raw.admin_locked !== undefined) {
        if (typeof raw.admin_locked !== "boolean") return { ok: false, error: "The lock setting is invalid." };
        value.admin_locked = raw.admin_locked;
    }
    if (Object.keys(value).length === 0) return { ok: false, error: "Nothing to change." };
    return { ok: true, value };
}
