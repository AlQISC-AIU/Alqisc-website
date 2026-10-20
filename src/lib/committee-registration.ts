// Shared types and validation for the committee registration form. Used by the
// public form, the public API route and the admin review page.

export const COMMITTEE_POSITIONS = [
    "president", "vice_president", "secretary", "treasurer",
    "head", "deputy_head", "committee_member",
] as const;
export type CommitteePosition = (typeof COMMITTEE_POSITIONS)[number];

// Executive Committee roles belong to the exco itself, so no department is chosen.
export const EXCO_POSITIONS: readonly CommitteePosition[] = ["president", "vice_president", "secretary", "treasurer"];
// Roles shared by every department.
export const DEPARTMENT_POSITIONS: readonly CommitteePosition[] = ["head", "deputy_head", "committee_member"];

// President and Vice President are only open to people already serving on the
// current committee. Every other position is open to all students.
export const LEADERSHIP_POSITIONS: readonly CommitteePosition[] = ["president", "vice_president"];

// The Executive Committee is stored as a department but is applied to through
// the exco roles above, never as a department choice.
export const EXCO_DEPARTMENT_SLUG = "exco";

export const POSITION_LABELS: Record<CommitteePosition, string> = {
    president: "President",
    vice_president: "Vice President",
    secretary: "Secretary",
    treasurer: "Treasurer",
    head: "Head of Department",
    deputy_head: "Deputy Head",
    committee_member: "Committee Member",
};

export const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
// Uploads must stay under Vercel's 4.5 MB request limit. The form resizes
// larger photos in the browser, so people can still pick big phone photos.
export const MAX_PHOTO_BYTES = 4 * 1024 * 1024;
export const MAX_ORIGINAL_PHOTO_BYTES = 20 * 1024 * 1024;
export const MAX_PHOTO_DIMENSION = 1200;

export const APPLICATION_STATUSES = ["pending", "shortlisted", "accepted", "rejected"] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export const STATUS_LABELS: Record<ApplicationStatus, string> = {
    pending: "Pending",
    shortlisted: "Shortlisted",
    accepted: "Accepted",
    rejected: "Rejected",
};

export interface RegistrationConfig {
    is_open: boolean;
    term: string;
    deadline: string; // YYYY-MM-DD or ""
    intro: string;
    // Positions that currently accept applications.
    open_positions: CommitteePosition[];
    // Department slugs that accept committee members. Empty means all active departments.
    open_departments: string[];
    updated_at: string;
}

export const DEFAULT_REGISTRATION_CONFIG: RegistrationConfig = {
    is_open: false,
    term: "",
    deadline: "",
    intro: "",
    open_positions: [...COMMITTEE_POSITIONS],
    open_departments: [],
    updated_at: "",
};

export interface RegistrationDepartment {
    slug: string;
    name: string;
    full_name: string;
}

export interface EligibleMember {
    id: string;
    name: string;
    role: string;
}

export interface PublicRegistrationInfo {
    config: Omit<RegistrationConfig, "updated_at">;
    accepting: boolean;
    departments: RegistrationDepartment[];
    eligible_members: EligibleMember[];
}

export interface ApplicationInput {
    full_name: string;
    student_email: string;
    personal_email: string;
    phone: string;
    student_id: string;
    programme: string;
    year_of_study: string;
    position: CommitteePosition;
    current_member_id: string;
    first_choice: string;
    second_choice: string;
    motivation: string;
    experience: string;
}

export interface CommitteeApplication extends ApplicationInput {
    id: string;
    term: string;
    current_member_name: string;
    current_member_role: string;
    first_choice_name: string;
    second_choice_name: string;
    photo_path: string;
    photo_type: string;
    status: ApplicationStatus;
    admin_notes: string;
    created_at: string;
    updated_at: string;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

export function isLeadershipPosition(position: CommitteePosition) {
    return LEADERSHIP_POSITIONS.includes(position);
}

export function isDepartmentPosition(position: CommitteePosition) {
    return DEPARTMENT_POSITIONS.includes(position);
}

/** Checks the file's leading bytes so a renamed non-image is rejected. */
export function detectPhotoType(bytes: Uint8Array): (typeof PHOTO_TYPES)[number] | null {
    if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
    if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "image/png";
    const ascii = (start: number, end: number) => String.fromCharCode(...bytes.slice(start, end));
    if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "image/webp";
    return null;
}

/** The form closes at the end of the deadline day, Malaysia time. */
export function isPastDeadline(deadline: string, now = new Date()) {
    if (!DATE.test(deadline)) return false;
    return now.getTime() > new Date(`${deadline}T23:59:59+08:00`).getTime();
}

export function isAcceptingApplications(config: RegistrationConfig, now = new Date()) {
    return config.is_open && !isPastDeadline(config.deadline, now);
}

function text(value: unknown, max: number) {
    return typeof value === "string" ? value.trim().slice(0, max + 1) : "";
}

export const STUDENT_EMAIL_DOMAIN = "student.aiu.edu.my";

export type ApplicationField = keyof ApplicationInput;
export type ApplicationErrors = Partial<Record<ApplicationField, string>>;

const NAME = /^[\p{L}\p{M}][\p{L}\p{M}' .-]*$/u;
const STUDENT_ID = /^[A-Za-z0-9-]{4,20}$/;

export function isStudentEmail(email: string) {
    return EMAIL.test(email) && email.toLowerCase().endsWith(`@${STUDENT_EMAIL_DOMAIN}`);
}

/** Phone numbers may contain +, spaces, dashes and brackets but need 8 to 15 digits. */
export function isValidPhone(phone: string) {
    if (!/^\+?[\d\s()-]+$/.test(phone)) return false;
    const digits = phone.replace(/\D/g, "").length;
    return digits >= 8 && digits <= 15;
}

export function normalizeApplicationInput(raw: unknown): ApplicationInput {
    const body = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
    const value: ApplicationInput = {
        full_name: text(body.full_name, 100).replace(/\s+/g, " "),
        student_email: text(body.student_email, 254).toLowerCase(),
        personal_email: text(body.personal_email, 254).toLowerCase(),
        phone: text(body.phone, 30),
        student_id: text(body.student_id, 30).toUpperCase(),
        programme: text(body.programme, 150),
        year_of_study: text(body.year_of_study, 30),
        position: body.position as CommitteePosition,
        current_member_id: text(body.current_member_id, 128),
        first_choice: text(body.first_choice, 100),
        second_choice: text(body.second_choice, 100),
        motivation: text(body.motivation, 3000),
        experience: text(body.experience, 3000),
    };
    // Choices that do not apply to the selected position are discarded.
    if (!isLeadershipPosition(value.position)) value.current_member_id = "";
    if (!isDepartmentPosition(value.position)) {
        value.first_choice = "";
        value.second_choice = "";
    }
    return value;
}

/**
 * Field-level validation shared by the form and the API. Checks that need the
 * database (current committee membership, open departments) are made by the API.
 */
export function getApplicationErrors(value: ApplicationInput): ApplicationErrors {
    const errors: ApplicationErrors = {};

    if (value.full_name.length < 3 || value.full_name.length > 100 || !NAME.test(value.full_name)) {
        errors.full_name = "Enter your full name using letters only (3 to 100 characters).";
    }
    if (!value.student_email) {
        errors.student_email = "Enter your student email.";
    } else if (!isStudentEmail(value.student_email)) {
        errors.student_email = `Use your AIU student email ending in @${STUDENT_EMAIL_DOMAIN}.`;
    }
    if (!value.personal_email) {
        errors.personal_email = "Enter your personal email.";
    } else if (!EMAIL.test(value.personal_email) || value.personal_email.length > 254) {
        errors.personal_email = "Enter a valid personal email address.";
    } else if (value.personal_email.endsWith(`@${STUDENT_EMAIL_DOMAIN}`)) {
        errors.personal_email = "Use a personal email that is different from your student email.";
    }
    if (!isValidPhone(value.phone)) {
        errors.phone = "Enter a valid phone number with country code, e.g. +60 12-345 6789.";
    }
    if (!STUDENT_ID.test(value.student_id)) {
        errors.student_id = "Enter your student ID (4 to 20 letters or numbers).";
    }
    if (value.programme.length < 2 || value.programme.length > 150) {
        errors.programme = "Enter your programme of study.";
    }
    if (value.year_of_study.length < 1 || value.year_of_study.length > 30) {
        errors.year_of_study = "Select your year of study.";
    }

    if (!COMMITTEE_POSITIONS.includes(value.position)) {
        errors.position = "Select the position you are applying for.";
    } else if (isLeadershipPosition(value.position) && !value.current_member_id) {
        errors.current_member_id = "Select your name from the current committee list.";
    } else if (isDepartmentPosition(value.position)) {
        if (!value.first_choice) errors.first_choice = "Select the department you would like to join.";
        if (value.second_choice && value.second_choice === value.first_choice) {
            errors.second_choice = "Your second choice must be a different department.";
        }
    }

    if (value.motivation.length < 50) {
        errors.motivation = `Tell us why you want to join (at least 50 characters, ${value.motivation.length} so far).`;
    } else if (value.motivation.length > 3000) {
        errors.motivation = "Keep your answer to 3000 characters or fewer.";
    }
    if (value.experience.length > 3000) {
        errors.experience = "Keep your answer to 3000 characters or fewer.";
    }

    return errors;
}

type ValidationResult =
    | { ok: true; value: ApplicationInput }
    | { ok: false; error: string; errors: ApplicationErrors };

export function validateApplicationInput(raw: unknown): ValidationResult {
    const value = normalizeApplicationInput(raw);
    const errors = getApplicationErrors(value);
    const first = Object.values(errors)[0];
    return first ? { ok: false, error: first, errors } : { ok: true, value };
}

type ConfigResult =
    | { ok: true; value: Omit<RegistrationConfig, "updated_at"> }
    | { ok: false; error: string };

export function validateRegistrationConfig(raw: unknown): ConfigResult {
    const body = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
    const openDepartments = Array.isArray(body.open_departments) ? body.open_departments : [];
    const openPositions = Array.isArray(body.open_positions) ? body.open_positions : [];
    const value = {
        is_open: body.is_open === true,
        term: text(body.term, 50),
        deadline: text(body.deadline, 10),
        intro: text(body.intro, 2000),
        open_positions: COMMITTEE_POSITIONS.filter((position) => openPositions.includes(position)),
        open_departments: openDepartments
            .filter((slug): slug is string => typeof slug === "string" && /^[a-z0-9-]{1,100}$/.test(slug))
            .slice(0, 50),
    };

    if (value.term.length > 50) return { ok: false, error: "The term label must be 50 characters or fewer." };
    if (value.is_open && value.term.length < 2) {
        return { ok: false, error: "Enter the committee term (for example 2026/2027) before opening registration." };
    }
    if (value.deadline && !DATE.test(value.deadline)) {
        return { ok: false, error: "The deadline must be a valid date." };
    }
    if (value.is_open && value.open_positions.length === 0) {
        return { ok: false, error: "Open at least one position before opening registration." };
    }
    if (value.intro.length > 2000) return { ok: false, error: "The introduction must be 2000 characters or fewer." };

    return { ok: true, value };
}
