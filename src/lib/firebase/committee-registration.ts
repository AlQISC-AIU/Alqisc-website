import "server-only";

import { createHash, randomBytes } from "node:crypto";
import sharp from "sharp";
import { Timestamp } from "firebase-admin/firestore";
import { getFirebaseAdminDb, getFirebaseAdminStorage } from "./admin";
import {
    DEFAULT_REGISTRATION_CONFIG,
    detectPhotoType,
    legacyOpenPositions,
    MAX_PHOTO_BYTES,
    normalizeOpenPositions,
    PHOTO_UPLOAD_MINUTES,
    type DocumentType,
    type PhotoType,
    type RegistrationConfig,
} from "@/lib/committee-registration";

// Applications hold personal data, so these collections are only reachable
// through the Admin SDK (Firestore rules deny all browser access).
export const APPLICATIONS_COLLECTION = "committee_applications";
const CONFIG_DOCUMENT = "committee_registration_config/current";
// Permission slips for photo uploads. storage.rules reads them, so the
// collection name and the field names used there must stay in step.
export const UPLOAD_TICKETS_COLLECTION = "committee_upload_tickets";
// Applicant photos and supporting documents live outside the public images/
// folder, so Storage rules deny browser access; admins view them through
// authenticated routes.
const FILE_FOLDER = "committee-applications";
// Where browsers put a photo while its application is being submitted. Storage
// rules let a browser create a file here only against a live ticket, and never
// read, replace or delete one.
const UPLOAD_FOLDER = "committee-application-uploads";
// Mirrored into public site settings so the navbar can show the "Join" link.
export const REGISTRATION_OPEN_SETTING = "committee_registration_open";

const FILE_EXTENSIONS: Record<DocumentType, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "application/pdf": "pdf",
};

// Stored photos are re-encoded to this size at most. It keeps every photo small
// enough for the admin routes, which cannot return more than 4.5 MB on Vercel.
const STORED_PHOTO_EDGE = 2000;

function strings(value: unknown): string[] {
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

export async function getRegistrationConfig(): Promise<RegistrationConfig> {
    const data = (await getFirebaseAdminDb().doc(CONFIG_DOCUMENT).get()).data() || {};
    // Settings saved before positions were opened one by one have none of the
    // newer fields, so nothing is treated as open until an admin opens it.
    return {
        is_open: data.is_open === true,
        term: typeof data.term === "string" ? data.term : DEFAULT_REGISTRATION_CONFIG.term,
        deadline: typeof data.deadline === "string" ? data.deadline : DEFAULT_REGISTRATION_CONFIG.deadline,
        intro: typeof data.intro === "string" ? data.intro : DEFAULT_REGISTRATION_CONFIG.intro,
        ...normalizeOpenPositions(data),
        updated_at: typeof data.updated_at === "string" ? data.updated_at : DEFAULT_REGISTRATION_CONFIG.updated_at,
    };
}

export async function saveRegistrationConfig(config: Omit<RegistrationConfig, "updated_at">) {
    const db = getFirebaseAdminDb();
    const timestamp = new Date().toISOString();
    const batch = db.batch();
    // Merged, so the earlier form's `open_departments` setting is left as it
    // was. `open_positions` is rewritten in the earlier form's shape to match.
    batch.set(db.doc(CONFIG_DOCUMENT), {
        ...config,
        open_positions: legacyOpenPositions(config),
        updated_at: timestamp,
    }, { merge: true });
    batch.set(db.collection("site_settings").doc(REGISTRATION_OPEN_SETTING), {
        key: REGISTRATION_OPEN_SETTING,
        value: config.is_open ? "true" : "false",
        updated_at: timestamp,
    });
    await batch.commit();
    return { ...config, updated_at: timestamp };
}

/**
 * The parts of the public response that only the earlier form used. They are
 * still returned so that anything written against the old response keeps
 * working; the current form ignores them.
 */
export async function getLegacyRegistrationInfo(config: RegistrationConfig) {
    const db = getFirebaseAdminDb();
    const [stored, snapshot] = await Promise.all([
        db.doc(CONFIG_DOCUMENT).get(),
        db.collection("departments").where("is_active", "==", true).get(),
    ]);
    const open_departments = strings(stored.data()?.open_departments);
    const departments = snapshot.docs
        .map((document) => document.data())
        .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))
        .map((department) => ({
            slug: String(department.slug || ""),
            name: String(department.name || ""),
            full_name: String(department.full_name || department.name || ""),
        }))
        // The Executive Committee was never a department choice.
        .filter((department) => department.slug && department.slug !== "exco")
        .filter((department) => open_departments.length === 0 || open_departments.includes(department.slug));
    return {
        open_positions: legacyOpenPositions(config),
        open_departments,
        departments,
        // President and Vice President are not recruited through the form, so
        // there is no list of current members to choose from.
        eligible_members: [] as { id: string; name: string; role: string }[],
    };
}

/** One application per email per term; the document id enforces it. */
export function applicationId(term: string, email: string) {
    return createHash("sha256").update(`${term.trim().toLowerCase()}|${email.trim().toLowerCase()}`).digest("hex").slice(0, 40);
}

export async function applicationExists(id: string) {
    return (await getFirebaseAdminDb().collection(APPLICATIONS_COLLECTION).doc(id).get()).exists;
}

function storedFile(path: string) {
    return getFirebaseAdminStorage().bucket().file(path);
}

async function saveApplicationFile(path: string, bytes: Buffer, contentType: string) {
    await storedFile(path).save(bytes, {
        resumable: false,
        metadata: { contentType, cacheControl: "private, no-store" },
    });
    return path;
}

export function saveApplicationPhoto(id: string, bytes: Buffer, contentType: PhotoType) {
    return saveApplicationFile(`${FILE_FOLDER}/${id}.${FILE_EXTENSIONS[contentType]}`, bytes, contentType);
}

export function saveApplicationDocument(id: string, bytes: Buffer, contentType: DocumentType) {
    return saveApplicationFile(`${FILE_FOLDER}/${id}-document.${FILE_EXTENSIONS[contentType]}`, bytes, contentType);
}

export async function readApplicationFile(path: string) {
    if (!path.startsWith(`${FILE_FOLDER}/`)) return null;
    const [contents] = await storedFile(path).download();
    return contents;
}

export async function deleteApplicationFile(path: string) {
    if (!path.startsWith(`${FILE_FOLDER}/`)) return;
    await storedFile(path).delete({ ignoreNotFound: true });
}

// ---------------------------------------------------------------------------
// Photo uploads
//
// A formal picture can be up to 10 MB, more than the website's server accepts
// in one request, so the browser sends it straight to Storage:
//   1. the server checks the whole application and issues a ticket;
//   2. Storage rules let the browser create one file against that ticket;
//   3. on submission the server reads that file, checks it really is an image,
//      re-encodes it and files it with the application, then removes the upload.
// ---------------------------------------------------------------------------

export function uploadPath(ticketId: string) {
    return `${UPLOAD_FOLDER}/${ticketId}/photo`;
}

interface UploadTicket {
    application_id: string;
    size: number;
    content_type: PhotoType;
    expires_at: Timestamp;
}

async function discardUpload(ticketId: string) {
    await storedFile(uploadPath(ticketId)).delete({ ignoreNotFound: true }).catch(() => undefined);
    await getFirebaseAdminDb().collection(UPLOAD_TICKETS_COLLECTION).doc(ticketId).delete().catch(() => undefined);
}

/** Removes uploads that were started and never submitted. */
export async function discardExpiredUploads() {
    const expired = await getFirebaseAdminDb()
        .collection(UPLOAD_TICKETS_COLLECTION)
        .where("expires_at", "<", Timestamp.now())
        .limit(20)
        .get();
    await Promise.all(expired.docs.map((document) => discardUpload(document.id)));
}

/**
 * Allows one photo upload for an application. An earlier, unfinished upload
 * for the same application is discarded, so each applicant has at most one.
 */
export async function createUploadTicket(applicationIdValue: string, size: number, contentType: PhotoType) {
    const tickets = getFirebaseAdminDb().collection(UPLOAD_TICKETS_COLLECTION);
    const earlier = await tickets.where("application_id", "==", applicationIdValue).get();
    await Promise.all(earlier.docs.map((document) => discardUpload(document.id)));

    const id = randomBytes(20).toString("hex");
    const expires = Timestamp.fromMillis(Date.now() + PHOTO_UPLOAD_MINUTES * 60 * 1000);
    const ticket: UploadTicket = { application_id: applicationIdValue, size, content_type: contentType, expires_at: expires };
    await tickets.doc(id).set(ticket);
    return { upload_id: id, path: uploadPath(id), expires_at: expires.toDate().toISOString() };
}

type UploadedPhoto =
    | { ok: true; bytes: Buffer; contentType: PhotoType; discard: () => Promise<void> }
    | { ok: false; error: string };

/**
 * Reads the photo a browser uploaded against a ticket and returns it ready to
 * store. Anything that is not a real JPG, PNG or WebP image is removed.
 */
export async function takeUploadedPhoto(ticketId: string, applicationIdValue: string): Promise<UploadedPhoto> {
    if (!/^[a-f0-9]{40}$/.test(ticketId)) return { ok: false, error: "Your photo upload was not recognised. Please attach it again." };
    const snapshot = await getFirebaseAdminDb().collection(UPLOAD_TICKETS_COLLECTION).doc(ticketId).get();
    const ticket = snapshot.data() as UploadTicket | undefined;
    // A ticket only ever serves the application it was issued for.
    if (!ticket || ticket.application_id !== applicationIdValue) {
        return { ok: false, error: "Your photo upload was not recognised. Please attach it again." };
    }
    if (ticket.expires_at.toMillis() < Date.now()) {
        await discardUpload(ticketId);
        return { ok: false, error: "Your photo upload has expired. Please attach it again." };
    }

    const file = storedFile(uploadPath(ticketId));
    const [exists] = await file.exists();
    if (!exists) return { ok: false, error: "Your photo did not finish uploading. Please try again." };

    const [metadata] = await file.getMetadata();
    if (Number(metadata.size) > MAX_PHOTO_BYTES) {
        await discardUpload(ticketId);
        return { ok: false, error: "Your photo must be 10 MB or smaller." };
    }
    const [original] = await file.download();
    const bytes = await normalizePhoto(original);
    if (!bytes) {
        await discardUpload(ticketId);
        return { ok: false, error: "Upload your photo as a JPG, PNG, or WebP image." };
    }
    return { ok: true, bytes, contentType: "image/jpeg", discard: () => discardUpload(ticketId) };
}

/**
 * Decodes the image and re-encodes it as a JPEG: proof that the file really is
 * an image, with any embedded location or camera details left behind. Returns
 * null for anything else.
 */
export async function normalizePhoto(original: Buffer): Promise<Buffer | null> {
    // Checked first so formats the image library can open but the form does
    // not accept (SVG, GIF, TIFF) never reach it.
    if (!detectPhotoType(original)) return null;
    try {
        return await sharp(original)
            .rotate()
            .resize({ width: STORED_PHOTO_EDGE, height: STORED_PHOTO_EDGE, fit: "inside", withoutEnlargement: true })
            .flatten({ background: "#ffffff" })
            .jpeg({ quality: 88 })
            .toBuffer();
    } catch {
        return null;
    }
}
