// Fills the local emulators with sample data. Run through dev-emulators.mjs,
// which points firebase-admin at the emulators; refuses to run otherwise.
import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, Timestamp } from "firebase-admin/firestore";

if (!process.env.FIRESTORE_EMULATOR_HOST || !process.env.FIREBASE_AUTH_EMULATOR_HOST) {
    throw new Error("seed-emulators only runs against the Firebase emulators.");
}

// Emulator-only sign-in for the admin console. It exists nowhere else.
const ADMIN = { email: "admin@alqisc.test", password: "emulator-only-password" };

const app = initializeApp({ projectId: process.env.FIREBASE_PROJECT_ID });
const auth = getAuth(app);
const db = getFirestore(app);

const days = (count) => Timestamp.fromMillis(Date.now() + count * 24 * 60 * 60 * 1000);
const now = new Date().toISOString();

await auth.createUser({ ...ADMIN, emailVerified: true, displayName: "Local Admin" }).catch((error) => {
    if (error.code !== "auth/email-already-exists") throw error;
});

const batch = db.batch();
const set = (path, data) => batch.set(db.doc(path), data);

set("site_settings/hero_title", { key: "hero_title", value: "AL-QISC (local emulator)", updated_at: now });
set("site_settings/contact_email", { key: "contact_email", value: "club@alqisc.test", updated_at: now });
set("departments/exco", {
    slug: "exco", name: "EXCO", full_name: "Executive Committee", description: "Sample department.",
    image_url: "", objectives: [], responsibilities: [], is_active: true, display_order: 0,
    created_at: now, updated_at: now,
});
set("teams/top", { department_id: "exco", title: "Top Management", display_order: 0 });
set("members/president", {
    team_id: "top", name: "Sample President", role: "President", image_url: "", socials: {}, display_order: 0,
});

// The app's admin allowlist, so the Flutter-admin rules have a document to read.
set("admin_config/allowlist", { emails: [ADMIN.email] });
set("public_config/sources", { youtube_enabled: true, instagram_enabled: true });

const feed = [
    ["sample-event-upcoming", {
        kind: "event", source: "alqisc", source_id: null, status: "published", priority: 1,
        title: { en: "Weekly Islamic Talk", ms: "Ceramah Mingguan" },
        summary: { en: "Sample upcoming event, featured on the home page." },
        published_at: days(-1), created_at: days(-1), updated_at: days(-1),
        starts_at: days(3), ends_at: Timestamp.fromMillis(days(3).toMillis() + 2 * 60 * 60 * 1000),
        location: { en: "AIU Main Hall" }, registration_url: "https://forms.gle/example",
        thumbnail_url: null, media_type: "none", category: "weekly",
    }],
    ["sample-event-past", {
        kind: "event", source: "alqisc", source_id: null, status: "published", priority: 0,
        title: { en: "Quran Competition" }, summary: { en: "Sample past event." },
        published_at: days(-30), created_at: days(-30), updated_at: days(-30),
        starts_at: days(-20), ends_at: null, location: { en: "AIU Auditorium" },
        registration_url: null, thumbnail_url: null, media_type: "none", category: "special",
    }],
    ["sample-announcement-draft", {
        kind: "announcement", source: "alqisc", source_id: null, status: "draft", priority: 0,
        title: { en: "Draft announcement" }, summary: null,
        published_at: days(-2), created_at: days(-2), updated_at: days(-2),
        thumbnail_url: null, media_type: "none",
    }],
    ["sample-announcement", {
        kind: "announcement", source: "alqisc", source_id: null, status: "published", priority: 0,
        title: { en: "Ramadan timetable is out", ar: "جدول رمضان" },
        summary: { en: "Sample published announcement.\n\nIt has two paragraphs." },
        published_at: days(-1), created_at: days(-1), updated_at: days(-1),
        thumbnail_url: null, media_type: "none",
    }],
    ["instagram_sample", {
        kind: "instagram", source: "instagram", source_id: "sample", status: "published", priority: 0,
        title: { en: "Sample Instagram post" }, summary: { en: "Imported caption." },
        published_at: days(-4), created_at: days(-4), updated_at: days(-4),
        thumbnail_url: null, media_type: "image", media_urls: [], video_url: null,
        permalink: "https://www.instagram.com/p/sample/",
    }],
];
for (const [id, data] of feed) set(`public_content/${id}`, data);

await batch.commit();
console.log(`\nEmulator data ready. Admin sign-in: ${ADMIN.email} (password in scripts/seed-emulators.mjs)\n`);
