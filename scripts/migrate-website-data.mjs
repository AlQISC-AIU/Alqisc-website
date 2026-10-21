// Copies the website's data from its old Firebase project into the shared
// AL-QISC project. It only reads from the source and never writes there.
//
//   node scripts/migrate-website-data.mjs --target al-qisc-dev            # dry run
//   node scripts/migrate-website-data.mjs --target al-qisc-dev --apply --events published
//
// Options:
//   --source <id>          old project (default alqisc-a2999)
//   --target <id>          al-qisc-dev, al-qisc-prod, or a demo-* emulator project
//   --apply                write; without it nothing is written
//   --confirm-prod         also required when --target is al-qisc-prod
//   --events <mode>        published | archived | skip   (required with --apply)
//   --admin <email>        also carry over this sign-in account and make it an
//                          active admin (repeatable), e.g. the old primary admin
//   --hash-config <file>   JSON with the source project's password hash
//                          parameters: { "key", "saltSeparator", "rounds", "memCost" }
//                          (Firebase console > Authentication > Users > ⋮).
//                          Needed only when a carried-over admin has a password.
//   --overwrite            replace records and files that already exist in the target
//   --source-bucket, --target-bucket   override <project>.firebasestorage.app
//
// Credentials: the Google account from `gcloud auth application-default login`,
// which must be Owner on both projects. Under the emulators (FIRESTORE_EMULATOR_HOST
// set) no real project is touched.
import { readFileSync } from "node:fs";
import { applicationDefault, deleteApp, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

// ---- Options ----------------------------------------------------------------

function parseArgs(argv) {
    const options = { admins: [] };
    for (let index = 0; index < argv.length; index += 1) {
        const arg = argv[index];
        const next = () => {
            const value = argv[++index];
            if (!value || value.startsWith("--")) throw new Error(`${arg} needs a value.`);
            return value;
        };
        if (arg === "--source") options.source = next();
        else if (arg === "--target") options.target = next();
        else if (arg === "--apply") options.apply = true;
        else if (arg === "--confirm-prod") options.confirmProd = true;
        else if (arg === "--events") options.events = next();
        else if (arg === "--admin") options.admins.push(next().trim().toLowerCase());
        else if (arg === "--hash-config") options.hashConfig = next();
        else if (arg === "--overwrite") options.overwrite = true;
        else if (arg === "--source-bucket") options.sourceBucket = next();
        else if (arg === "--target-bucket") options.targetBucket = next();
        else throw new Error(`Unknown option ${arg}.`);
    }
    return options;
}

function stop(message) {
    console.error(message);
    process.exit(1);
}

let options;
try {
    options = parseArgs(process.argv.slice(2));
} catch (error) {
    stop(error.message);
}
const EMULATED = !!process.env.FIRESTORE_EMULATOR_HOST;
const SOURCE = options.source || "alqisc-a2999";
const TARGET = options.target;
const ALLOWED_TARGETS = new Set(["al-qisc-dev", "al-qisc-prod"]);

if (!TARGET) stop("Pass --target.");
if (EMULATED ? !TARGET.startsWith("demo-") : !ALLOWED_TARGETS.has(TARGET)) {
    stop(EMULATED
        ? "Under the emulators the target must be a demo-* project."
        : `The target must be one of ${[...ALLOWED_TARGETS].join(", ")}.`);
}
if (SOURCE === TARGET) stop("Source and target must differ.");
if (TARGET === "al-qisc-prod" && options.apply && !options.confirmProd) {
    stop("Writing to al-qisc-prod also needs --confirm-prod.");
}
if (options.events && !["published", "archived", "skip"].includes(options.events)) {
    stop("--events must be published, archived or skip.");
}
if (options.apply && !options.events) {
    stop("Choose what happens to the old events: --events published | archived | skip.");
}
const EVENTS_MODE = options.events || "published";

const SOURCE_BUCKET = options.sourceBucket || `${SOURCE}.firebasestorage.app`;
const TARGET_BUCKET = options.targetBucket || `${TARGET}.firebasestorage.app`;
const STORAGE_ORIGIN = process.env.FIREBASE_STORAGE_EMULATOR_HOST
    ? `http://${process.env.FIREBASE_STORAGE_EMULATOR_HOST}`
    : "https://firebasestorage.googleapis.com";
const SOURCE_PREFIX = `${STORAGE_ORIGIN}/v0/b/${SOURCE_BUCKET}/o/`;
const TARGET_PREFIX = `${STORAGE_ORIGIN}/v0/b/${TARGET_BUCKET}/o/`;

// Collections copied unchanged (same document IDs).
const COPIED = [
    "departments", "teams", "members", "classes", "blog_posts", "site_settings",
    "committee_applications", "committee_registration_config",
];
// Collections handled specially.
const HANDLED = new Set([...COPIED, "events", "authorized_admins"]);
const EVENT_CATEGORIES = new Set(["weekly", "monthly", "special"]);
const APP_LINK_HOSTS = new Set([
    "alqisc.com", "www.instagram.com", "instagram.com", "www.youtube.com",
    "youtube.com", "youtu.be", "forms.gle", "docs.google.com",
]);

// ---- Setup --------------------------------------------------------------------

function app(projectId, bucket, name) {
    return initializeApp(
        EMULATED
            ? { projectId, storageBucket: bucket }
            : { projectId, storageBucket: bucket, credential: applicationDefault() },
        name,
    );
}

const sourceApp = app(SOURCE, SOURCE_BUCKET, "migration-source");
const targetApp = app(TARGET, TARGET_BUCKET, "migration-target");
const source = {
    db: getFirestore(sourceApp),
    auth: getAuth(sourceApp),
    bucket: getStorage(sourceApp).bucket(SOURCE_BUCKET),
};
const target = {
    db: getFirestore(targetApp),
    auth: getAuth(targetApp),
    bucket: getStorage(targetApp).bucket(TARGET_BUCKET),
};

const report = {
    mode: options.apply ? "apply" : "dry run",
    source: SOURCE,
    target: TARGET,
    collections: {},
    events: { mode: EVENTS_MODE, converted: 0, archived: 0, notes: [] },
    storage: { files: 0, bytes: 0, copied: 0, skipped_existing: 0 },
    admins: { kept: [], skipped: [], imported_users: [], linked_existing_users: [] },
    url_rewrites: 0,
    conflicts: [],
    problems: [],
    notes: [],
};

// ---- Helpers --------------------------------------------------------------------

// Rewrites every old-bucket download URL inside strings, arrays and maps,
// including image links inside blog HTML.
function rewriteUrls(value) {
    if (typeof value === "string") {
        if (!value.includes(SOURCE_PREFIX)) return value;
        report.url_rewrites += value.split(SOURCE_PREFIX).length - 1;
        return value.split(SOURCE_PREFIX).join(TARGET_PREFIX);
    }
    if (Array.isArray(value)) return value.map(rewriteUrls);
    if (value && typeof value === "object" && value.constructor === Object) {
        return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, rewriteUrls(item)]));
    }
    return value;
}

function timestampFrom(value, label) {
    const millis = Date.parse(String(value || ""));
    if (!Number.isFinite(millis)) throw new Error(`${label} has no valid date (${value}).`);
    return Timestamp.fromMillis(millis);
}

function isAppLink(value) {
    try {
        const url = new URL(value);
        return url.protocol === "https:" && APP_LINK_HOSTS.has(url.hostname);
    } catch {
        return false;
    }
}

function isTestAdmin(email) {
    return email.includes("codex-e2e-") || email.endsWith("@example.com");
}

// The website's event in the app's feed format (see src/lib/feed.ts).
function toFeedEvent(id, event) {
    const start = timestampFrom(event.date, `Event ${id}`);
    const title = String(event.title || "").trim();
    const description = String(event.description || "").trim();
    const location = String(event.location || "").trim();
    const image = rewriteUrls(String(event.image_url || ""));
    const registration = String(event.registration_url || "").trim();

    if (!title) throw new Error(`Event ${id} has no title.`);
    if (title.length > 200) report.problems.push(`Event ${id}: title is over 200 characters.`);
    if (description.length > 2000) report.problems.push(`Event ${id}: description is over 2,000 characters.`);
    if (String(event.time || "").trim()) {
        report.events.notes.push(`Event ${id}: free-text time "${event.time}" is not kept; the start time comes from its date.`);
    }
    if (registration && !isAppLink(registration)) {
        report.events.notes.push(`Event ${id}: registration link ${registration} is dropped because the app cannot open it.`);
    }

    const archived = EVENTS_MODE === "archived" || event.status === "cancelled";
    if (archived) report.events.archived += 1;
    return {
        kind: "event",
        source: "alqisc",
        source_id: null,
        status: archived ? "archived" : "published",
        title: { en: title },
        summary: description ? { en: description } : null,
        priority: event.is_featured === true ? 1 : 0,
        // Sorted by the event's own date in the app, not by migration day.
        published_at: start,
        created_at: event.created_at ? timestampFrom(event.created_at, `Event ${id} created_at`) : start,
        updated_at: Timestamp.now(),
        starts_at: start,
        ends_at: null,
        location: location ? { en: location } : null,
        registration_url: registration && isAppLink(registration) ? registration : null,
        thumbnail_url: image || null,
        media_type: image ? "image" : "none",
        category: EVENT_CATEGORIES.has(event.category) ? event.category : "special",
    };
}

async function existingIds(collection, ids) {
    if (ids.length === 0) return [];
    const refs = ids.map((id) => target.db.collection(collection).doc(id));
    const snapshots = await target.db.getAll(...refs);
    return snapshots.filter((snapshot) => snapshot.exists).map((snapshot) => snapshot.id);
}

async function commitInBatches(writes) {
    for (let start = 0; start < writes.length; start += 400) {
        const batch = target.db.batch();
        for (const { ref, data } of writes.slice(start, start + 400)) batch.set(ref, data);
        await batch.commit();
    }
}

function hashOptions() {
    if (!options.hashConfig) return null;
    const config = JSON.parse(readFileSync(options.hashConfig, "utf8"));
    for (const field of ["key", "saltSeparator", "rounds", "memCost"]) {
        if (config[field] === undefined || config[field] === "") {
            throw new Error(`The hash config is missing "${field}".`);
        }
    }
    return {
        algorithm: "SCRYPT",
        key: Buffer.from(config.key, "base64"),
        saltSeparator: Buffer.from(config.saltSeparator, "base64"),
        rounds: Number(config.rounds),
        memoryCost: Number(config.memCost),
    };
}

// ---- Steps --------------------------------------------------------------------

async function checkCollections() {
    const collections = (await source.db.listCollections()).map((collection) => collection.id);
    const unknown = collections.filter((id) => !HANDLED.has(id));
    if (unknown.length > 0) {
        throw new Error(`The source has collections this script does not know: ${unknown.join(", ")}. Nothing was written.`);
    }
}

async function planStorage() {
    const [files] = await source.bucket.getFiles();
    const plan = [];
    for (const file of files) {
        const [exists] = await target.bucket.file(file.name).exists();
        report.storage.files += 1;
        report.storage.bytes += Number(file.metadata.size || 0);
        if (exists && !options.overwrite) {
            report.storage.skipped_existing += 1;
            report.conflicts.push(`Storage file already in target: ${file.name}`);
            continue;
        }
        plan.push(file);
    }
    return plan;
}

// Downloads and re-uploads each file with its metadata, including the
// download token, so rewritten links keep working.
async function copyFiles(files) {
    for (const file of files) {
        const [metadata] = await file.getMetadata();
        const [contents] = await file.download();
        await target.bucket.file(file.name).save(contents, {
            resumable: false,
            metadata: {
                contentType: metadata.contentType,
                cacheControl: metadata.cacheControl,
                contentDisposition: metadata.contentDisposition,
                metadata: metadata.metadata || {},
            },
        });
        const [copied] = await target.bucket.file(file.name).getMetadata();
        if (copied.md5Hash !== metadata.md5Hash) throw new Error(`Copy check failed for ${file.name}.`);
        if ((copied.metadata?.firebaseStorageDownloadTokens || "") !== (metadata.metadata?.firebaseStorageDownloadTokens || "")) {
            throw new Error(`Download token was not kept for ${file.name}.`);
        }
        report.storage.copied += 1;
    }
}

async function planDocuments() {
    const writes = [];
    for (const collection of COPIED) {
        const snapshot = await source.db.collection(collection).get();
        const ids = snapshot.docs.map((doc) => doc.id);
        const clashes = await existingIds(collection, ids);
        report.collections[collection] = { documents: ids.length, already_in_target: clashes.length };
        for (const id of clashes) report.conflicts.push(`${collection}/${id} already in target`);
        for (const doc of snapshot.docs) {
            if (clashes.includes(doc.id) && !options.overwrite) continue;
            writes.push({ ref: target.db.collection(collection).doc(doc.id), data: rewriteUrls(doc.data()) });
        }
    }

    const registration = await source.db.doc("committee_registration_config/current").get();
    if (registration.data()?.is_open === true) {
        report.notes.push("Committee registration is switched ON in the source. It stays on after the move, so the Join page and navbar link go live at cutover.");
    }

    const events = await source.db.collection("events").get();
    report.collections.events = { documents: events.size, moved_to: "public_content" };
    if (EVENTS_MODE !== "skip") {
        const clashes = await existingIds("public_content", events.docs.map((doc) => doc.id));
        for (const id of clashes) report.conflicts.push(`public_content/${id} already in target`);
        for (const doc of events.docs) {
            if (clashes.includes(doc.id) && !options.overwrite) continue;
            writes.push({ ref: target.db.collection("public_content").doc(doc.id), data: toFeedEvent(doc.id, doc.data()) });
            report.events.converted += 1;
        }
    }
    return writes;
}

// Carries over the real, active admins and their sign-in accounts. Accounts
// keep their UID and password; an email that already has an account in the
// target is linked to that account instead of duplicated.
async function planAdmins() {
    const snapshot = await source.db.collection("authorized_admins").get();
    const admins = [];
    for (const doc of snapshot.docs) {
        const data = doc.data();
        const email = String(data.email || doc.id).toLowerCase();
        if (isTestAdmin(email)) report.admins.skipped.push(`${email} (test account)`);
        else if (data.status !== "active") report.admins.skipped.push(`${email} (${data.status || "no status"}, never signed in)`);
        else admins.push({ email, record: data });
    }
    for (const email of options.admins) {
        if (!admins.some((admin) => admin.email === email)) admins.push({ email, record: null });
    }

    const plan = [];
    for (const admin of admins) {
        let user;
        try {
            user = await source.auth.getUserByEmail(admin.email);
        } catch {
            report.problems.push(`${admin.email}: no sign-in account in ${SOURCE}.`);
            continue;
        }
        let existing = null;
        try {
            existing = await target.auth.getUserByEmail(admin.email);
        } catch (error) {
            if (error.code !== "auth/user-not-found") throw error;
        }
        if (!existing) {
            try {
                const sameUid = await target.auth.getUser(user.uid);
                report.conflicts.push(`UID ${user.uid} of ${admin.email} belongs to ${sameUid.email || "another account"} in ${TARGET}.`);
                continue;
            } catch (error) {
                if (error.code !== "auth/user-not-found") throw error;
            }
        }
        plan.push({ ...admin, user, existing });
        report.admins.kept.push(admin.email);
        if (existing) report.admins.linked_existing_users.push(admin.email);
        else report.admins.imported_users.push(admin.email);
    }
    return plan;
}

// Builds the account import before anything is written, so a missing hash
// file stops the run instead of leaving a half-finished copy.
function prepareAdminImport(plan) {
    const toImport = plan.filter((admin) => !admin.existing);
    const needsHash = toImport.some((admin) => admin.user.passwordHash);
    const hash = needsHash ? hashOptions() : null;
    if (needsHash && !hash) {
        throw new Error("Some admins sign in with a password. Pass --hash-config with the source project's password hash parameters. Nothing was written.");
    }
    const records = toImport.map(({ user }) => ({
        uid: user.uid,
        email: user.email,
        emailVerified: user.emailVerified,
        displayName: user.displayName,
        photoURL: user.photoURL ? rewriteUrls(user.photoURL) : undefined,
        disabled: user.disabled,
        metadata: {
            creationTime: user.metadata.creationTime,
            lastSignInTime: user.metadata.lastSignInTime,
        },
        providerData: user.providerData
            .filter((provider) => provider.providerId !== "password")
            .map((provider) => ({
                uid: provider.uid,
                email: provider.email,
                displayName: provider.displayName,
                photoURL: provider.photoURL,
                providerId: provider.providerId,
            })),
        ...(user.passwordHash
            ? {
                passwordHash: Buffer.from(user.passwordHash, "base64"),
                passwordSalt: Buffer.from(user.passwordSalt, "base64"),
            }
            : {}),
    }));
    return { records, hash };
}

async function applyAdmins(plan, { records, hash }) {
    if (records.length > 0) {
        const result = await target.auth.importUsers(records, hash ? { hash } : undefined);
        if (result.failureCount > 0) {
            const reasons = result.errors.map((error) => `${records[error.index].email}: ${error.error.message}`);
            throw new Error(`Some admin accounts could not be imported: ${reasons.join("; ")}`);
        }
    }

    const now = new Date().toISOString();
    const writes = plan.map(({ email, record, user, existing }) => ({
        ref: target.db.collection("authorized_admins").doc(email),
        data: {
            email,
            uid: existing ? existing.uid : user.uid,
            display_name: record?.display_name || user.displayName || "",
            status: "active",
            added_by: record?.added_by || "migration",
            created_at: record?.created_at || now,
            updated_at: now,
            last_signed_in_at: record?.last_signed_in_at || null,
        },
    }));
    await commitInBatches(writes);
}

// ---- Run ----------------------------------------------------------------------

try {
    await checkCollections();
    const files = await planStorage();
    const writes = await planDocuments();
    const admins = await planAdmins();

    if (options.apply) {
        if (report.conflicts.length > 0 && !options.overwrite) {
            throw new Error("The target already has some of this data (see conflicts). Nothing was written. Re-run with --overwrite to replace it.");
        }
        if (report.problems.length > 0) {
            throw new Error("Fix the problems listed first. Nothing was written.");
        }
        const accounts = prepareAdminImport(admins);
        await copyFiles(files);
        await commitInBatches(writes);
        await applyAdmins(admins, accounts);
    }
} catch (error) {
    report.error = error instanceof Error ? error.message : String(error);
    process.exitCode = 1;
} finally {
    console.log(JSON.stringify(report, null, 2));
    await Promise.all([deleteApp(sourceApp), deleteApp(targetApp)]);
}
