import { describe, expect, it } from "vitest";
import {
    formatEventDate,
    formatEventTime,
    fromMalaysiaInput,
    isAppLink,
    isUpcoming,
    pickText,
    toFeedItem,
    toMalaysiaInput,
} from "@/lib/feed";
import { validateFeedInput, validateSocialUpdate } from "@/lib/feed-validation";

const BUCKET = "al-qisc-dev.firebasestorage.app";
const POSTER = `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/images%2Ffeed%2Fposter.jpg?alt=media&token=abc`;

const event = {
    kind: "event",
    status: "published",
    title: { en: "  Weekly Islamic Talk ", ar: "", ms: "Ceramah Mingguan" },
    summary: { en: "Join us." },
    priority: 0,
    thumbnail_url: POSTER,
    starts_at: "2026-11-05T12:00:00.000Z",
    ends_at: "2026-11-05T14:00:00.000Z",
    location: { en: "AIU Main Hall" },
    registration_url: "https://forms.gle/abc",
    category: "weekly",
};

describe("validateFeedInput", () => {
    it("accepts an event and trims text, dropping empty languages", () => {
        const result = validateFeedInput(event, BUCKET);
        expect(result.ok).toBe(true);
        if (!result.ok) return;
        expect(result.value.title).toEqual({ en: "Weekly Islamic Talk", ms: "Ceramah Mingguan" });
        expect(result.value.starts_at).toBe("2026-11-05T12:00:00.000Z");
        expect(result.value.category).toBe("weekly");
    });

    it("requires an English title", () => {
        const result = validateFeedInput({ ...event, title: { ar: "عنوان" } }, BUCKET);
        expect(result).toEqual({ ok: false, error: "An English title is required." });
    });

    it("requires a start time for events but not for announcements", () => {
        expect(validateFeedInput({ ...event, starts_at: "" }, BUCKET).ok).toBe(false);
        const announcement = validateFeedInput(
            { kind: "announcement", status: "draft", title: { en: "Hello" } },
            BUCKET,
        );
        expect(announcement.ok).toBe(true);
        if (announcement.ok) {
            expect(announcement.value.starts_at).toBe("");
            expect(announcement.value.registration_url).toBe("");
        }
    });

    it("drops event-only fields from announcements", () => {
        const result = validateFeedInput({ ...event, kind: "announcement" }, BUCKET);
        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.value.location).toEqual({});
            expect(result.value.registration_url).toBe("");
        }
    });

    it("rejects an end time before the start", () => {
        const result = validateFeedInput({ ...event, ends_at: "2026-11-05T11:00:00.000Z" }, BUCKET);
        expect(result).toEqual({ ok: false, error: "The event must end after it starts." });
    });

    it("rejects registration links the app would hide", () => {
        expect(validateFeedInput({ ...event, registration_url: "https://www.alqisc.com/join" }, BUCKET).ok).toBe(false);
        expect(validateFeedInput({ ...event, registration_url: "http://forms.gle/abc" }, BUCKET).ok).toBe(false);
        expect(validateFeedInput({ ...event, registration_url: "https://alqisc.com/join" }, BUCKET).ok).toBe(true);
    });

    it("accepts posters only from the configured bucket", () => {
        const other = POSTER.replace(BUCKET, "alqisc-a2999.firebasestorage.app");
        expect(validateFeedInput({ ...event, thumbnail_url: other }, BUCKET).ok).toBe(false);
        expect(validateFeedInput({ ...event, thumbnail_url: "" }, BUCKET).ok).toBe(true);
        expect(validateFeedInput({ ...event, thumbnail_url: POSTER }, "").ok).toBe(false);
    });

    it("rejects kinds the importers own and unknown statuses", () => {
        expect(validateFeedInput({ ...event, kind: "instagram" }, BUCKET).ok).toBe(false);
        expect(validateFeedInput({ ...event, status: "upcoming" }, BUCKET).ok).toBe(false);
    });

    it("limits priority to whole numbers from 0 to 100", () => {
        expect(validateFeedInput({ ...event, priority: 1.5 }, BUCKET).ok).toBe(false);
        expect(validateFeedInput({ ...event, priority: 101 }, BUCKET).ok).toBe(false);
        expect(validateFeedInput({ ...event, priority: 5 }, BUCKET).ok).toBe(true);
    });
});

describe("validateSocialUpdate", () => {
    it("allows archive, republish, priority and the lock", () => {
        expect(validateSocialUpdate({ status: "archived", admin_locked: true })).toEqual({
            ok: true,
            value: { status: "archived", admin_locked: true },
        });
        expect(validateSocialUpdate({ priority: 3 }).ok).toBe(true);
    });

    it("rejects drafts and empty changes", () => {
        expect(validateSocialUpdate({ status: "draft" }).ok).toBe(false);
        expect(validateSocialUpdate({}).ok).toBe(false);
    });
});

describe("feed helpers", () => {
    it("falls back from English to Arabic to Malay", () => {
        expect(pickText({ ar: "مرحبا", ms: "Hai" })).toBe("مرحبا");
        expect(pickText({ en: " ", ms: "Hai" })).toBe("Hai");
        expect(pickText(null)).toBe("");
    });

    it("matches the app's link allowlist exactly", () => {
        expect(isAppLink("https://alqisc.com/events")).toBe(true);
        expect(isAppLink("https://www.alqisc.com/events")).toBe(false);
        expect(isAppLink("https://forms.gle/x")).toBe(true);
    });

    it("treats an event as upcoming until it ends", () => {
        const now = Date.parse("2026-11-05T13:00:00.000Z");
        expect(isUpcoming({ starts_at: "2026-11-05T12:00:00.000Z", ends_at: "2026-11-05T14:00:00.000Z" }, now)).toBe(true);
        expect(isUpcoming({ starts_at: "2026-11-05T12:00:00.000Z", ends_at: null }, now)).toBe(false);
        expect(isUpcoming({ starts_at: null, ends_at: null }, now)).toBe(false);
    });

    it("shows times in Malaysian time", () => {
        expect(formatEventTime("2026-11-05T12:00:00.000Z", "2026-11-05T14:00:00.000Z")).toBe("8:00 pm – 10:00 pm");
        expect(formatEventTime(null, null)).toBe("");
    });

    it("reads and writes admin date inputs in Malaysian time", () => {
        expect(fromMalaysiaInput("2026-11-05T20:00")).toBe("2026-11-05T12:00:00.000Z");
        expect(toMalaysiaInput("2026-11-05T12:00:00.000Z")).toBe("2026-11-05T20:00");
        expect(toMalaysiaInput("2026-11-05T17:30:00.000Z")).toBe("2026-11-06T01:30");
        expect(fromMalaysiaInput("not a date")).toBe("");
        expect(formatEventDate("2026-11-05T17:30:00.000Z")).toBe("6 Nov 2026");
    });
});

describe("toFeedItem", () => {
    const timestamp = (iso: string) => ({ toDate: () => new Date(iso) });

    it("reads a stored document with Firestore timestamps", () => {
        const item = toFeedItem("abc", {
            kind: "event",
            source: "alqisc",
            status: "published",
            title: { en: "Talk", fr: "ignored" },
            priority: 2,
            published_at: timestamp("2026-11-01T00:00:00.000Z"),
            starts_at: timestamp("2026-11-05T12:00:00.000Z"),
            ends_at: null,
            category: "weekly",
        });
        expect(item?.title).toEqual({ en: "Talk" });
        expect(item?.starts_at).toBe("2026-11-05T12:00:00.000Z");
        expect(item?.ends_at).toBeNull();
        expect(item?.admin_locked).toBe(false);
    });

    it("skips documents the app would also skip", () => {
        expect(toFeedItem("a", { kind: "poll", source: "alqisc", status: "published", title: { en: "x" } })).toBeNull();
        expect(toFeedItem("a", { kind: "event", source: "alqisc", status: "published", title: "x" })).toBeNull();
        expect(toFeedItem("a", { kind: "event", source: "tiktok", status: "published", title: { en: "x" } })).toBeNull();
    });
});
