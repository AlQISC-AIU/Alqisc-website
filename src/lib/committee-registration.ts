// Shared types and validation for the committee registration form. Used by the
// public form, the public API routes and the admin review page.
//
// The questions follow the committee's official form, "New Committee
// Recruitment 2026/27 Session". Its unnamed dropdown (question 9) was added to
// the Google Form by accident and is left out at the committee's request.

export const EDUCATION_LEVELS = ["lc", "foundation", "bachelor"] as const;
export type EducationLevel = (typeof EDUCATION_LEVELS)[number];

export const EDUCATION_LEVEL_LABELS: Record<EducationLevel, string> = {
    lc: "LC",
    foundation: "Foundation",
    bachelor: "Bachelor Degree",
};

// Only asked of Bachelor Degree students.
export const YEARS_OF_STUDY = ["Year 1", "Year 2", "Year 3"] as const;

// ---------------------------------------------------------------------------
// Positions
//
// AL-QISC has two separate structures. The Top Committee is central and has no
// department. Each department has the same four position levels. One
// application gives a first and a second choice, each either a Top Committee
// position or a department, plus one department position when a department is
// among the choices.
// ---------------------------------------------------------------------------

// Top Committee positions that can be recruited through this form.
export const TOP_POSITIONS = ["general_secretary", "general_treasurer"] as const;
export type TopPosition = (typeof TOP_POSITIONS)[number];

export const DEPARTMENTS = [
    "exco_dawah",
    "exco_co_curricular",
    "exco_multimedia",
    "exco_education",
    "exco_ict",
    "exco_sister_affairs",
] as const;
export type Department = (typeof DEPARTMENTS)[number];

/** A first or second choice: a Top Committee position or a department. */
export type AppliedPosition = TopPosition | Department;
export const APPLIED_POSITIONS: readonly AppliedPosition[] = [...TOP_POSITIONS, ...DEPARTMENTS];

export const POSITION_LABELS: Record<AppliedPosition, string> = {
    general_secretary: "General Secretary",
    general_treasurer: "General Treasurer",
    exco_dawah: "EXCO Da'wah",
    exco_co_curricular: "EXCO Co-Curricular",
    exco_multimedia: "EXCO Multimedia, Design & Publication",
    exco_education: "EXCO Educational Development",
    exco_ict: "EXCO ICT & Technical",
    exco_sister_affairs: "EXCO Sister Affairs",
};

// The four positions every department has. A Department Secretary serves one
// department; the General Secretary and General Treasurer are Top Committee
// positions and are never offered here.
export const DEPARTMENT_POSITIONS = ["head", "first_deputy_head", "department_secretary", "exco_member"] as const;
export type DepartmentPosition = (typeof DEPARTMENT_POSITIONS)[number];

export const DEPARTMENT_POSITION_LABELS: Record<DepartmentPosition, string> = {
    head: "Head of Department",
    first_deputy_head: "1st Deputy Head",
    department_secretary: "Department Secretary",
    exco_member: "EXCO Member",
};


// Multimedia and ICT applicants are asked to share samples of their work.
export const WORK_SAMPLE_DEPARTMENTS: readonly Department[] = ["exco_multimedia", "exco_ict"];
// Shared Google Drive folder named in the official form. Uploads there happen
// outside this website, so they are not attached to the application record.
export const WORK_SAMPLES_URL = "https://drive.google.com/drive/folders/12Ju7HHONozGb3nETRvYUpjKQScr7YpS1?usp=sharing";

export const JOINED_PROGRAMS_OPTIONS = ["yes", "never"] as const;
export type JoinedPrograms = (typeof JOINED_PROGRAMS_OPTIONS)[number];
export const JOINED_PROGRAMS_LABELS: Record<JoinedPrograms, string> = { yes: "Yes", never: "Never" };

export const YES_NO_OPTIONS = ["yes", "no"] as const;
export type YesNo = (typeof YES_NO_OPTIONS)[number];
export const YES_NO_LABELS: Record<YesNo, string> = { yes: "Yes", no: "No" };

export const OTHER_CLUB_COMMITMENTS = ["full", "balance", "unable"] as const;
export type OtherClubCommitment = (typeof OTHER_CLUB_COMMITMENTS)[number];
export const OTHER_CLUB_COMMITMENT_LABELS: Record<OtherClubCommitment, string> = {
    full: "Yes, I can fully commit to both clubs",
    balance: "Yes, but I may need to balance my responsibilities.",
    unable: "No, I may not be able to fulfill both commitments",
};

// Applications sent through the earlier version of the form stored one of
// these in `position`. Kept so the admin page can still label old records, and
// so the availability an admin sets can still be published in the old shape.
export const LEGACY_POSITION_LABELS: Record<string, string> = {
    president: "President",
    vice_president: "Vice President",
    secretary: "Secretary",
    treasurer: "Treasurer",
    head: "Head of Department",
    deputy_head: "Deputy Head",
    committee_member: "Committee Member",
};

// ---------------------------------------------------------------------------
// Uploads
// ---------------------------------------------------------------------------

export const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export type PhotoType = (typeof PHOTO_TYPES)[number];
// The formal picture goes straight from the browser to Firebase Storage, so it
// is not held to the 4.5 MB limit on requests to the website's own server.
export const MAX_PHOTO_BYTES = 10 * 1024 * 1024;
// The official form does not mark the formal picture as required. Set this to
// true to make it compulsory; the form and the server both follow it.
export const PHOTO_REQUIRED = false;
// How long an applicant has to finish uploading after the server allows it.
export const PHOTO_UPLOAD_MINUTES = 15;

// Optional supporting document (portfolio, certificates). It travels with the
// written answers in one request to the website's server, which Vercel caps at
// 4.5 MB, so it stays well below that.
export const DOCUMENT_TYPES = ["application/pdf", ...PHOTO_TYPES] as const;
export type DocumentType = (typeof DOCUMENT_TYPES)[number];
export const MAX_DOCUMENT_BYTES = 3 * 1024 * 1024;

export const APPLICATION_STATUSES = ["pending", "shortlisted", "accepted", "rejected"] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export const STATUS_LABELS: Record<ApplicationStatus, string> = {
    pending: "Pending",
    shortlisted: "Shortlisted",
    accepted: "Accepted",
    rejected: "Rejected",
};

// ---------------------------------------------------------------------------
// Registration settings
// ---------------------------------------------------------------------------

export type OpenDepartmentPositions = Record<Department, DepartmentPosition[]>;

export interface RegistrationConfig {
    is_open: boolean;
    term: string;
    deadline: string; // YYYY-MM-DD or ""
    intro: string;
    // Top Committee positions that currently accept applications.
    open_top_positions: TopPosition[];
    // Position levels that currently accept applications, set per department.
    open_department_positions: OpenDepartmentPositions;
    updated_at: string;
}

function noDepartmentPositions(): OpenDepartmentPositions {
    return Object.fromEntries(DEPARTMENTS.map((department) => [department, []])) as unknown as OpenDepartmentPositions;
}

// Nothing is open until an admin opens it.
export const DEFAULT_REGISTRATION_CONFIG: RegistrationConfig = {
    is_open: false,
    term: "",
    deadline: "",
    intro: "",
    open_top_positions: [],
    open_department_positions: noDepartmentPositions(),
    updated_at: "",
};

/** The registration info the public form loads. */
export interface PublicRegistrationInfo {
    config: Omit<RegistrationConfig, "updated_at">;
    accepting: boolean;
}

function includes<T extends string>(options: readonly T[], value: unknown): value is T {
    return (options as readonly unknown[]).includes(value);
}

/** Keeps only known positions, in their standard order, from untrusted input. */
export function normalizeOpenPositions(raw: { open_top_positions?: unknown; open_department_positions?: unknown }) {
    const top = Array.isArray(raw.open_top_positions) ? raw.open_top_positions : [];
    const byDepartment = (raw.open_department_positions && typeof raw.open_department_positions === "object"
        ? raw.open_department_positions
        : {}) as Record<string, unknown>;
    const open_department_positions = noDepartmentPositions();
    for (const department of DEPARTMENTS) {
        const positions = Array.isArray(byDepartment[department]) ? byDepartment[department] : [];
        open_department_positions[department] = DEPARTMENT_POSITIONS.filter((position) => positions.includes(position));
    }
    return {
        open_top_positions: TOP_POSITIONS.filter((position) => top.includes(position)),
        open_department_positions,
    };
}

export type Availability = Pick<RegistrationConfig, "open_top_positions" | "open_department_positions">;

export function isDepartment(position: unknown): position is Department {
    return includes(DEPARTMENTS, position);
}

export function isTopPosition(position: unknown): position is TopPosition {
    return includes(TOP_POSITIONS, position);
}

/** Position levels currently open in one department. */
export function openDepartmentPositions(config: Availability, department: unknown): DepartmentPosition[] {
    return isDepartment(department) ? config.open_department_positions[department] || [] : [];
}

/** What an applicant can pick first: open Top Committee positions and departments with an open position. */
export function openAppliedPositions(config: Availability): AppliedPosition[] {
    return [
        ...TOP_POSITIONS.filter((position) => config.open_top_positions.includes(position)),
        ...DEPARTMENTS.filter((department) => openDepartmentPositions(config, department).length > 0),
    ];
}

export function countOpenPositions(config: Availability) {
    return config.open_top_positions.length
        + DEPARTMENTS.reduce((total, department) => total + openDepartmentPositions(config, department).length, 0);
}

/** e.g. "General Secretary" or "EXCO Da'wah · Head of Department". */
export function positionLabel(position: unknown, departmentPosition: unknown) {
    if (!includes(APPLIED_POSITIONS, position)) return "";
    const department = includes(DEPARTMENT_POSITIONS, departmentPosition) ? DEPARTMENT_POSITION_LABELS[departmentPosition] : "";
    return isDepartment(position) && department ? `${POSITION_LABELS[position]} · ${department}` : POSITION_LABELS[position];
}

/** Every way a choice can read, in display order; the admin page groups applications by these. */
export const ALL_POSITION_LABELS: readonly string[] = [
    ...TOP_POSITIONS.map((position) => positionLabel(position, "")),
    ...DEPARTMENTS.flatMap((department) => DEPARTMENT_POSITIONS.map((position) => positionLabel(department, position))),
];

/**
 * The open positions in the shape the earlier form used (one list for every
 * department). Stored next to the current settings so anything that still
 * reads the old field keeps getting a truthful answer.
 */
export function legacyOpenPositions(config: Availability): string[] {
    const anyDepartment = (position: DepartmentPosition) =>
        DEPARTMENTS.some((department) => openDepartmentPositions(config, department).includes(position));
    return [
        ...(config.open_top_positions.includes("general_secretary") ? ["secretary"] : []),
        ...(config.open_top_positions.includes("general_treasurer") ? ["treasurer"] : []),
        ...(anyDepartment("head") ? ["head"] : []),
        ...(anyDepartment("first_deputy_head") ? ["deputy_head"] : []),
        ...(anyDepartment("exco_member") ? ["committee_member"] : []),
    ];
}

// ---------------------------------------------------------------------------
// Applications
// ---------------------------------------------------------------------------

export interface ApplicationInput {
    // Applicant details
    student_email: string;
    full_name: string;
    student_id: string;
    education_level: EducationLevel;
    year_of_study: string; // Bachelor Degree only
    programme: string; // School, programme and cohort; Bachelor Degree only
    phone: string;
    nationality: string;
    // Getting to know you
    about_alqisc: string;
    joined_programs: JoinedPrograms;
    programs_joined: string;
    experience: string;
    // Line of leadership
    first_choice: AppliedPosition;
    // Required whenever more than one choice is open.
    second_choice: AppliedPosition | "";
    // Asked when either choice is a department.
    department_position: DepartmentPosition | "";
    // Motivation and commitment
    motivation: string;
    accept_other_position: YesNo;
    other_club_commitment: OtherClubCommitment | "";
}

export const APPLICATION_FORM_VERSION = 2;

/**
 * A stored application. Records from the earlier form have no `form_version`
 * and lack the newer answers, so every field added since is optional here.
 */
export interface CommitteeApplication extends Partial<ApplicationInput> {
    id: string;
    form_version?: number;
    term: string;
    full_name: string;
    student_email: string;
    phone: string;
    student_id: string;
    motivation: string;
    // Each choice as it was shown to the applicant, e.g. "EXCO Da'wah · Head of
    // Department". The earlier form stored a department name here.
    first_choice_name: string;
    second_choice_name: string;
    photo_path: string;
    photo_type: string;
    document_path?: string;
    document_type?: string;
    document_name?: string;
    status: ApplicationStatus;
    admin_notes: string;
    created_at: string;
    updated_at: string;
    // Earlier form only.
    position?: string;
    personal_email?: string;
    current_member_name?: string;
    current_member_role?: string;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

type Choices = { first_choice?: unknown; second_choice?: unknown };

/** The departments among an application's two choices. */
export function chosenDepartments(value: Choices): Department[] {
    return [value.first_choice, value.second_choice].filter(isDepartment);
}

/**
 * The department positions an applicant can pick: those open in every
 * department they chose. The form has one department position for the whole
 * application, so it has to be open wherever it would apply.
 */
export function selectableDepartmentPositions(config: Availability, value: Choices): DepartmentPosition[] {
    const departments = chosenDepartments(value);
    if (departments.length === 0) return [];
    return DEPARTMENT_POSITIONS.filter((position) =>
        departments.every((department) => openDepartmentPositions(config, department).includes(position)));
}

/** True when either choice is Multimedia or ICT, which ask for work samples. */
export function needsWorkSamples(value: Choices) {
    return includes(WORK_SAMPLE_DEPARTMENTS, value.first_choice) || includes(WORK_SAMPLE_DEPARTMENTS, value.second_choice);
}

/** Checks the file's leading bytes so a renamed non-image is rejected. */
export function detectPhotoType(bytes: Uint8Array): PhotoType | null {
    if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
    if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "image/png";
    const ascii = (start: number, end: number) => String.fromCharCode(...bytes.slice(start, end));
    if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "image/webp";
    return null;
}

/** Supporting documents may be a PDF or an image; checked by leading bytes. */
export function detectDocumentType(bytes: Uint8Array): DocumentType | null {
    if (String.fromCharCode(...bytes.slice(0, 5)) === "%PDF-") return "application/pdf";
    return detectPhotoType(bytes);
}

/** e.g. "850 KB" or "10.0 MB". */
export function formatFileSize(bytes: number) {
    return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/** Why a chosen photo cannot be used, or "" when it can. `head` is its first bytes. */
export function photoProblem(file: { size: number }, head: Uint8Array) {
    if (file.size > MAX_PHOTO_BYTES) {
        return `This photo is ${formatFileSize(file.size)}. The limit is ${formatFileSize(MAX_PHOTO_BYTES)}.`;
    }
    if (file.size === 0 || !detectPhotoType(head)) return "This file is not a JPG, PNG, or WebP image.";
    return "";
}

/** Why a chosen supporting document cannot be used, or "" when it can. */
export function documentProblem(file: { size: number }, head: Uint8Array) {
    if (file.size > MAX_DOCUMENT_BYTES) {
        return `This file is ${formatFileSize(file.size)}. The limit is ${formatFileSize(MAX_DOCUMENT_BYTES)}.`;
    }
    if (file.size === 0 || !detectDocumentType(head)) return "This file is not a PDF, JPG, PNG, or WebP file.";
    return "";
}

/** The form closes at the end of the deadline day, Malaysia time. */
export function isPastDeadline(deadline: string, now = new Date()) {
    if (!DATE.test(deadline)) return false;
    return now.getTime() > new Date(`${deadline}T23:59:59+08:00`).getTime();
}

/** e.g. "22 November 2026"; "" when no valid deadline is set. */
export function formatDeadline(deadline: string) {
    if (!DATE.test(deadline)) return "";
    const date = new Date(`${deadline}T00:00:00+08:00`);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleDateString("en-MY", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Kuala_Lumpur" });
}

/** Open, before the deadline, and with at least one position to apply for. */
export function isAcceptingApplications(config: RegistrationConfig, now = new Date()) {
    return config.is_open && !isPastDeadline(config.deadline, now) && countOpenPositions(config) > 0;
}

function text(value: unknown, max: number) {
    return typeof value === "string" ? value.trim().slice(0, max + 1) : "";
}

export const STUDENT_EMAIL_DOMAIN = "student.aiu.edu.my";

export type ApplicationField = keyof ApplicationInput;
export type ApplicationErrors = Partial<Record<ApplicationField, string>>;

const NAME = /^[\p{L}\p{M}][\p{L}\p{M}' .-]*$/u;
const STUDENT_ID = /^[A-Za-z0-9-]{4,20}$/;
const LONG_ANSWER = 3000;

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
        student_email: text(body.student_email, 254).toLowerCase(),
        // The official form asks for the name in capital letters.
        full_name: text(body.full_name, 100).replace(/\s+/g, " ").toUpperCase(),
        student_id: text(body.student_id, 30).toUpperCase(),
        education_level: text(body.education_level, 20) as EducationLevel,
        year_of_study: text(body.year_of_study, 30),
        programme: text(body.programme, 150),
        phone: text(body.phone, 30),
        nationality: text(body.nationality, 60).replace(/\s+/g, " "),
        about_alqisc: text(body.about_alqisc, LONG_ANSWER),
        joined_programs: text(body.joined_programs, 10) as JoinedPrograms,
        programs_joined: text(body.programs_joined, LONG_ANSWER),
        experience: text(body.experience, LONG_ANSWER),
        first_choice: text(body.first_choice, 40) as AppliedPosition,
        second_choice: text(body.second_choice, 40) as AppliedPosition | "",
        department_position: text(body.department_position, 40) as DepartmentPosition | "",
        motivation: text(body.motivation, LONG_ANSWER),
        accept_other_position: text(body.accept_other_position, 10) as YesNo,
        other_club_commitment: text(body.other_club_commitment, 20) as OtherClubCommitment | "",
    };
    // Answers to questions that do not apply are discarded.
    if (value.education_level !== "bachelor") {
        value.year_of_study = "";
        value.programme = "";
    }
    if (value.joined_programs !== "yes") value.programs_joined = "";
    if (chosenDepartments(value).length === 0) value.department_position = "";
    return value;
}

/**
 * Validation shared by the form and the API, so both apply the same rules.
 * `open` is what the admin has opened for applications; without it only the
 * rules that do not depend on those settings are checked.
 */
export function getApplicationErrors(value: ApplicationInput, open?: Availability): ApplicationErrors {
    const errors: ApplicationErrors = {};
    const tooLong = `Keep your answer to ${LONG_ANSWER} characters or fewer.`;

    if (!value.student_email) {
        errors.student_email = "Enter your student email.";
    } else if (!isStudentEmail(value.student_email)) {
        errors.student_email = `Use your AIU student email ending in @${STUDENT_EMAIL_DOMAIN}.`;
    }
    if (value.full_name.length < 3 || value.full_name.length > 100 || !NAME.test(value.full_name)) {
        errors.full_name = "Enter your full name using letters only (3 to 100 characters).";
    }
    if (!STUDENT_ID.test(value.student_id)) {
        errors.student_id = "Enter your student ID (4 to 20 letters or numbers).";
    }
    if (!includes(EDUCATION_LEVELS, value.education_level)) {
        errors.education_level = "Select your level of education.";
    }
    // Both Bachelor-only questions are optional in the official form.
    if (value.year_of_study && !includes(YEARS_OF_STUDY, value.year_of_study)) {
        errors.year_of_study = "Select your year of study from the list.";
    }
    if (value.programme.length > 150) {
        errors.programme = "Keep your school, programme and cohort to 150 characters or fewer.";
    }
    if (!isValidPhone(value.phone)) {
        errors.phone = "Enter a valid contact number with 8 to 15 digits, e.g. +60 11-2233 5566.";
    }
    if (value.nationality.length < 2 || value.nationality.length > 60 || !NAME.test(value.nationality)) {
        errors.nationality = "Enter your nationality using letters only.";
    }

    if (!value.about_alqisc) {
        errors.about_alqisc = "Tell us what you know about Al-Qisc.";
    } else if (value.about_alqisc.length > LONG_ANSWER) {
        errors.about_alqisc = tooLong;
    }
    if (!includes(JOINED_PROGRAMS_OPTIONS, value.joined_programs)) {
        errors.joined_programs = "Tell us whether you have joined any of our programs.";
    }
    if (value.programs_joined.length > LONG_ANSWER) errors.programs_joined = tooLong;
    if (value.experience.length > LONG_ANSWER) errors.experience = tooLong;

    const choices = open ? openAppliedPositions(open) : APPLIED_POSITIONS;
    const closed = (choice: AppliedPosition) => `${POSITION_LABELS[choice]} is not open for applications. Please choose another.`;
    if (!includes(APPLIED_POSITIONS, value.first_choice)) {
        errors.first_choice = "Select your first choice.";
    } else if (!choices.includes(value.first_choice)) {
        errors.first_choice = closed(value.first_choice);
    }
    // With a single choice open there is nothing left to pick as a second.
    if (!value.second_choice) {
        if (choices.length > 1) errors.second_choice = "Select your second choice.";
    } else if (!includes(APPLIED_POSITIONS, value.second_choice)) {
        errors.second_choice = "Select your second choice from the list.";
    } else if (value.second_choice === value.first_choice) {
        errors.second_choice = "Your second choice must be different from your first choice.";
    } else if (!choices.includes(value.second_choice)) {
        errors.second_choice = closed(value.second_choice);
    }

    const departments = chosenDepartments(value);
    if (departments.length > 0) {
        if (!includes(DEPARTMENT_POSITIONS, value.department_position)) {
            errors.department_position = "Select the department position you are applying for.";
        } else if (open) {
            const position = value.department_position;
            // A department that is closed altogether is already reported on its choice.
            const shut = departments.find((department) =>
                choices.includes(department) && !openDepartmentPositions(open, department).includes(position));
            if (shut) {
                errors.department_position = `${DEPARTMENT_POSITION_LABELS[position]} is not open for applications in ${POSITION_LABELS[shut]}.`;
            }
        }
    }

    if (!value.motivation) {
        errors.motivation = "Tell us what makes you suitable and motivates you to take this position.";
    } else if (value.motivation.length > LONG_ANSWER) {
        errors.motivation = tooLong;
    }
    if (!includes(YES_NO_OPTIONS, value.accept_other_position)) {
        errors.accept_other_position = "Tell us whether you would accept another position.";
    }
    if (value.other_club_commitment && !includes(OTHER_CLUB_COMMITMENTS, value.other_club_commitment)) {
        errors.other_club_commitment = "Select an answer from the list.";
    }

    return errors;
}

type ValidationResult =
    | { ok: true; value: ApplicationInput }
    | { ok: false; error: string; errors: ApplicationErrors };

export function validateApplicationInput(raw: unknown, open?: Availability): ValidationResult {
    const value = normalizeApplicationInput(raw);
    const errors = getApplicationErrors(value, open);
    const first = Object.values(errors)[0];
    return first ? { ok: false, error: first, errors } : { ok: true, value };
}

type ConfigResult =
    | { ok: true; value: Omit<RegistrationConfig, "updated_at"> }
    | { ok: false; error: string };

export function validateRegistrationConfig(raw: unknown): ConfigResult {
    const body = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
    const value = {
        is_open: body.is_open === true,
        term: text(body.term, 50),
        deadline: text(body.deadline, 10),
        intro: text(body.intro, 2000),
        ...normalizeOpenPositions(body),
    };

    if (value.term.length > 50) return { ok: false, error: "The term label must be 50 characters or fewer." };
    if (value.is_open && value.term.length < 2) {
        return { ok: false, error: "Enter the committee term (for example 2026/2027) before opening registration." };
    }
    if (value.deadline && !DATE.test(value.deadline)) {
        return { ok: false, error: "The deadline must be a valid date." };
    }
    if (value.is_open && countOpenPositions(value) === 0) {
        return { ok: false, error: "Open at least one position before opening registration." };
    }
    if (value.intro.length > 2000) return { ok: false, error: "The introduction must be 2000 characters or fewer." };

    return { ok: true, value };
}
