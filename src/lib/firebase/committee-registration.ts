import "server-only";

import { createHash } from "node:crypto";
import { getFirebaseAdminDb, getFirebaseAdminStorage } from "./admin";
import { getMemberIdentity } from "@/lib/member-identity";
import {
    DEFAULT_REGISTRATION_CONFIG,
    EXCO_DEPARTMENT_SLUG,
    type EligibleMember,
    type RegistrationConfig,
    type RegistrationDepartment,
} from "@/lib/committee-registration";

// Applications hold personal data, so both collections are only reachable
// through the Admin SDK (Firestore rules deny all browser access).
export const APPLICATIONS_COLLECTION = "committee_applications";
const CONFIG_DOCUMENT = "committee_registration_config/current";
// Applicant photos live outside the public images/ folder, so Storage rules
// deny browser access; admins view them through an authenticated route.
const PHOTO_FOLDER = "committee-applications";
// Mirrored into public site settings so the navbar can show the "Join" link.
export const REGISTRATION_OPEN_SETTING = "committee_registration_open";

export async function getRegistrationConfig(): Promise<RegistrationConfig> {
    const snapshot = await getFirebaseAdminDb().doc(CONFIG_DOCUMENT).get();
    return { ...DEFAULT_REGISTRATION_CONFIG, ...(snapshot.data() as Partial<RegistrationConfig> | undefined) };
}

export async function saveRegistrationConfig(config: Omit<RegistrationConfig, "updated_at">) {
    const db = getFirebaseAdminDb();
    const timestamp = new Date().toISOString();
    const batch = db.batch();
    batch.set(db.doc(CONFIG_DOCUMENT), { ...config, updated_at: timestamp });
    batch.set(db.collection("site_settings").doc(REGISTRATION_OPEN_SETTING), {
        key: REGISTRATION_OPEN_SETTING,
        value: config.is_open ? "true" : "false",
        updated_at: timestamp,
    });
    await batch.commit();
    return { ...config, updated_at: timestamp };
}

/** Active departments that people can apply to join (the exco has its own roles). */
export async function getActiveRegistrationDepartments(): Promise<RegistrationDepartment[]> {
    const snapshot = await getFirebaseAdminDb()
        .collection("departments")
        .where("is_active", "==", true)
        .get();
    return snapshot.docs
        .map((document) => document.data())
        .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))
        .map((department) => ({
            slug: String(department.slug || ""),
            name: String(department.name || ""),
            full_name: String(department.full_name || department.name || ""),
        }))
        .filter((department) => department.slug && department.slug !== EXCO_DEPARTMENT_SLUG);
}

/** Departments that currently accept committee members. */
export function filterOpenDepartments(departments: RegistrationDepartment[], config: RegistrationConfig) {
    if (config.open_departments.length === 0) return departments;
    return departments.filter((department) => config.open_departments.includes(department.slug));
}

/**
 * Current committee members, one entry per person. A person can appear in more
 * than one team, so records are merged by name.
 */
export async function getCurrentCommitteeMembers(): Promise<EligibleMember[]> {
    const snapshot = await getFirebaseAdminDb().collection("members").get();
    const unique = new Map<string, EligibleMember>();
    for (const document of snapshot.docs) {
        const data = document.data();
        const name = String(data.name || "").trim();
        if (!name) continue;
        const key = getMemberIdentity({ id: document.id, name });
        if (!unique.has(key)) {
            unique.set(key, { id: document.id, name, role: String(data.role || "") });
        }
    }
    return [...unique.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export async function getCommitteeMember(id: string): Promise<EligibleMember | null> {
    if (!id || id.includes("/")) return null;
    const snapshot = await getFirebaseAdminDb().collection("members").doc(id).get();
    if (!snapshot.exists) return null;
    const data = snapshot.data() || {};
    return { id: snapshot.id, name: String(data.name || ""), role: String(data.role || "") };
}

/** One application per email per term; the document id enforces it. */
export function applicationId(term: string, email: string) {
    return createHash("sha256").update(`${term.trim().toLowerCase()}|${email.trim().toLowerCase()}`).digest("hex").slice(0, 40);
}

function photoFile(path: string) {
    return getFirebaseAdminStorage().bucket().file(path);
}

export async function saveApplicationPhoto(id: string, bytes: Buffer, contentType: string) {
    const extension = contentType === "image/png" ? "png" : contentType === "image/webp" ? "webp" : "jpg";
    const path = `${PHOTO_FOLDER}/${id}.${extension}`;
    await photoFile(path).save(bytes, {
        resumable: false,
        metadata: { contentType, cacheControl: "private, no-store" },
    });
    return path;
}

export async function readApplicationPhoto(path: string) {
    if (!path.startsWith(`${PHOTO_FOLDER}/`)) return null;
    const [contents] = await photoFile(path).download();
    return contents;
}

export async function deleteApplicationPhoto(path: string) {
    if (!path.startsWith(`${PHOTO_FOLDER}/`)) return;
    await photoFile(path).delete({ ignoreNotFound: true });
}
