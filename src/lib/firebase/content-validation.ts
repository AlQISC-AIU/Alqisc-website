type Row = Record<string, unknown>;

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const IMAGE_SETTING_KEYS = new Set(["hero_image", "advisor_image", "donation_qr"]);
const SOCIAL_KEYS = new Set([
    "instagram", "facebook", "twitter", "linkedin", "github", "email", "phone", "website",
]);

function exactKeys(data: Row, required: string[]): boolean {
    const keys = Object.keys(data);
    return required.every((key) => key in data) && keys.every((key) => required.includes(key));
}

function string(value: unknown, min: number, max: number): value is string {
    return typeof value === "string" && value.length >= min && value.length <= max;
}

function integer(value: unknown, min: number, max: number): value is number {
    return Number.isInteger(value) && Number(value) >= min && Number(value) <= max;
}

function isoDate(value: unknown): value is string {
    return string(value, 10, 40) && /^\d{4}-\d{2}-\d{2}/.test(value) && Number.isFinite(Date.parse(value));
}

function externalUrl(value: unknown): value is string {
    if (value === "") return true;
    if (!string(value, 1, 2048)) return false;
    try {
        return new URL(value).protocol === "https:";
    } catch {
        return false;
    }
}

function imageUrl(value: unknown): value is string {
    if (value === "") return true;
    if (!string(value, 1, 2048)) return false;
    if (value.startsWith("/images/")) return true;
    try {
        const url = new URL(value);
        return url.protocol === "https:" &&
            url.hostname === "firebasestorage.googleapis.com" &&
            url.pathname.startsWith("/v0/b/alqisc-a2999.firebasestorage.app/o/");
    } catch {
        return false;
    }
}

function stringList(value: unknown, maxItems: number, maxItemLength = 500): value is string[] {
    return Array.isArray(value) && value.length <= maxItems &&
        value.every((item) => string(item, 1, maxItemLength));
}

function socials(value: unknown): boolean {
    if (!value || typeof value !== "object" || Array.isArray(value)) return false;
    const entries = Object.entries(value);
    return entries.length <= 4 && entries.every(([key, item]) => {
        if (!SOCIAL_KEYS.has(key) || !string(item, 1, 300)) return false;
        if (key === "email") return EMAIL.test(item) && item.length <= 254;
        if (["instagram", "facebook", "twitter", "linkedin", "github", "website"].includes(key)) {
            return externalUrl(item);
        }
        return item.length <= 50;
    });
}

export const CONTENT_COLLECTIONS = [
    "departments", "teams", "members", "events", "classes", "blog_posts", "site_settings",
] as const;

export type ContentCollection = typeof CONTENT_COLLECTIONS[number];

export function isContentCollection(value: string): value is ContentCollection {
    return (CONTENT_COLLECTIONS as readonly string[]).includes(value);
}

export function validateContentDocument(
    collection: ContentCollection,
    data: Row,
    documentId?: string,
): string | null {
    switch (collection) {
        case "departments": {
            const keys = ["slug", "name", "full_name", "description", "image_url", "objectives", "responsibilities", "is_active", "display_order", "created_at", "updated_at"];
            if (!exactKeys(data, keys)) return "Department fields do not match the allowed schema.";
            if (!string(data.slug, 1, 100) || !SLUG.test(data.slug)) return "Department slug is invalid.";
            if (!string(data.name, 1, 100) || !string(data.full_name, 1, 200)) return "Department name is invalid.";
            if (!string(data.description, 0, 20_000) || !imageUrl(data.image_url)) return "Department description or image is invalid.";
            if (!stringList(data.objectives, 50) || !stringList(data.responsibilities, 50)) return "Department lists contain invalid values.";
            if (typeof data.is_active !== "boolean" || !integer(data.display_order, 0, 10_000)) return "Department state or display order is invalid.";
            if (!isoDate(data.created_at) || !isoDate(data.updated_at)) return "Department timestamps are invalid.";
            return null;
        }
        case "teams": {
            const keys = ["department_id", "title", "display_order"];
            if (!exactKeys(data, keys)) return "Team fields do not match the allowed schema.";
            if (!string(data.department_id, 1, 128) || !string(data.title, 1, 200) || !integer(data.display_order, 0, 10_000)) return "Team data is invalid.";
            return null;
        }
        case "members": {
            const keys = ["team_id", "name", "role", "image_url", "socials", "display_order"];
            if (!exactKeys(data, keys)) return "Member fields do not match the allowed schema.";
            if (!string(data.team_id, 1, 128) || !string(data.name, 1, 150) || !string(data.role, 0, 150)) return "Member identity fields are invalid.";
            if (!imageUrl(data.image_url) || !socials(data.socials) || !integer(data.display_order, 0, 10_000)) return "Member image, contacts, or display order is invalid.";
            return null;
        }
        case "events": {
            const keys = ["title", "description", "date", "time", "location", "category", "status", "image_url", "is_featured", "registration_url", "created_at"];
            if (!exactKeys(data, keys)) return "Event fields do not match the allowed schema.";
            if (!string(data.title, 1, 250) || !string(data.description, 0, 30_000)) return "Event title or description is invalid.";
            if (!isoDate(data.date) || !string(data.time, 0, 100) || !string(data.location, 0, 300)) return "Event date, time, or location is invalid.";
            if (!["weekly", "monthly", "special"].includes(String(data.category)) || !["upcoming", "past", "cancelled"].includes(String(data.status))) return "Event category or status is invalid.";
            if (!imageUrl(data.image_url) || typeof data.is_featured !== "boolean" || !externalUrl(data.registration_url) || !isoDate(data.created_at)) return "Event image, registration URL, or metadata is invalid.";
            return null;
        }
        case "classes": {
            const keys = ["slug", "title", "description", "schedule", "time", "venue", "fee", "students_enrolled", "image_url", "objectives", "registration_url", "is_active", "created_at"];
            if (!exactKeys(data, keys)) return "Class fields do not match the allowed schema.";
            if (!string(data.slug, 1, 100) || !SLUG.test(data.slug) || !string(data.title, 1, 250)) return "Class slug or title is invalid.";
            if (!string(data.description, 0, 30_000) || !string(data.schedule, 0, 200) || !string(data.time, 0, 100) || !string(data.venue, 0, 300) || !string(data.fee, 0, 100)) return "Class details are invalid.";
            if (!integer(data.students_enrolled, 0, 100_000) || !imageUrl(data.image_url) || !stringList(data.objectives, 50) || !externalUrl(data.registration_url)) return "Class enrollment, image, objectives, or URL is invalid.";
            if (typeof data.is_active !== "boolean" || !isoDate(data.created_at)) return "Class state or timestamp is invalid.";
            return null;
        }
        case "blog_posts": {
            const keys = ["slug", "title", "excerpt", "content", "category", "author", "status", "featured_image_url", "published_at", "created_at", "updated_at"];
            if (!exactKeys(data, keys)) return "Blog fields do not match the allowed schema.";
            if (!string(data.slug, 1, 150) || !SLUG.test(data.slug) || !string(data.title, 1, 300)) return "Blog slug or title is invalid.";
            if (!string(data.excerpt, 0, 2_000) || !string(data.content, 0, 500_000) || !string(data.category, 1, 100) || !string(data.author, 1, 150)) return "Blog content metadata is invalid.";
            if (!["draft", "published", "archived"].includes(String(data.status)) || !imageUrl(data.featured_image_url)) return "Blog status or image is invalid.";
            if (!(data.published_at === null || isoDate(data.published_at)) || !isoDate(data.created_at) || !isoDate(data.updated_at)) return "Blog timestamps are invalid.";
            if (data.status === "published" && data.published_at === null) return "Published posts require a publication date.";
            return null;
        }
        case "site_settings": {
            const keys = ["key", "value", "updated_at"];
            if (!exactKeys(data, keys)) return "Setting fields do not match the allowed schema.";
            if (!string(data.key, 1, 100) || (documentId && data.key !== documentId)) return "Setting key is invalid.";
            if (!string(data.value, 0, 10_000) || !isoDate(data.updated_at)) return "Setting value or timestamp is invalid.";
            if (IMAGE_SETTING_KEYS.has(data.key) && !imageUrl(data.value)) return "Setting image URL is invalid.";
            if (data.key === "contact_email" && data.value !== "" && (!EMAIL.test(data.value) || data.value.length > 254)) return "Contact email is invalid.";
            return null;
        }
    }
}
