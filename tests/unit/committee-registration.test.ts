import { describe, expect, it } from "vitest";
import {
  APPLIED_POSITIONS,
  chosenDepartments,
  countOpenPositions,
  DEFAULT_REGISTRATION_CONFIG,
  DEPARTMENT_POSITION_LABELS,
  DEPARTMENT_POSITIONS,
  DEPARTMENTS,
  detectDocumentType,
  detectPhotoType,
  documentProblem,
  EDUCATION_LEVEL_LABELS,
  EDUCATION_LEVELS,
  formatDeadline,
  isAcceptingApplications,
  isPastDeadline,
  JOINED_PROGRAMS_LABELS,
  JOINED_PROGRAMS_OPTIONS,
  legacyOpenPositions,
  MAX_DOCUMENT_BYTES,
  MAX_PHOTO_BYTES,
  needsWorkSamples,
  normalizeApplicationInput,
  normalizeOpenPositions,
  openAppliedPositions,
  openDepartmentPositions,
  OTHER_CLUB_COMMITMENT_LABELS,
  OTHER_CLUB_COMMITMENTS,
  photoProblem,
  POSITION_LABELS,
  positionLabel,
  selectableDepartmentPositions,
  TOP_POSITIONS,
  validateApplicationInput,
  validateRegistrationConfig,
  WORK_SAMPLES_URL,
  YEARS_OF_STUDY,
  YES_NO_LABELS,
  YES_NO_OPTIONS,
  type Availability,
  type Department,
  type DepartmentPosition,
} from "@/lib/committee-registration";

const base = {
  student_email: "Aisha.Rahman@Student.AIU.edu.my ",
  full_name: "Aisha Rahman",
  student_id: "aiu21011234",
  education_level: "bachelor",
  year_of_study: "Year 2",
  programme: "SBSS & BBAM & Cohort 5",
  phone: "+60123456789",
  nationality: "Malaysian",
  about_alqisc: "It is the Al-Qur'an and Islamic Club at AIU.",
  joined_programs: "yes",
  programs_joined: "Weekly Islamic Talk",
  experience: "",
  first_choice: "exco_ict",
  second_choice: "general_secretary",
  department_position: "exco_member",
  motivation: "I want to serve the community.",
  accept_other_position: "yes",
  other_club_commitment: "",
};

/** Availability with the given positions open and everything else closed. */
function availability(top: string[], departments: Partial<Record<Department, DepartmentPosition[]>> = {}): Availability {
  return normalizeOpenPositions({ open_top_positions: top, open_department_positions: departments });
}

const everything = availability([...TOP_POSITIONS], Object.fromEntries(DEPARTMENTS.map((department) => [department, [...DEPARTMENT_POSITIONS]])));
const nothing = availability([]);

const labelsOf = <T extends string>(values: readonly T[], labels: Record<T, string>) => values.map((value) => labels[value]);

describe("the questions match the official recruitment form", () => {
  it("asks exactly the form's questions, without the accidental question 9", () => {
    expect(Object.keys(normalizeApplicationInput({}))).toEqual([
      "student_email", "full_name", "student_id", "education_level", "year_of_study", "programme", "phone", "nationality",
      "about_alqisc", "joined_programs", "programs_joined", "experience",
      "first_choice", "second_choice", "department_position",
      "motivation", "accept_other_position", "other_club_commitment",
    ]);
  });

  it("lists the level of education and year of study options", () => {
    expect(labelsOf(EDUCATION_LEVELS, EDUCATION_LEVEL_LABELS)).toEqual(["LC", "Foundation", "Bachelor Degree"]);
    expect(YEARS_OF_STUDY).toEqual(["Year 1", "Year 2", "Year 3"]);
  });

  it("lists the remaining single-choice answers", () => {
    expect(labelsOf(JOINED_PROGRAMS_OPTIONS, JOINED_PROGRAMS_LABELS)).toEqual(["Yes", "Never"]);
    expect(labelsOf(YES_NO_OPTIONS, YES_NO_LABELS)).toEqual(["Yes", "No"]);
    expect(labelsOf(OTHER_CLUB_COMMITMENTS, OTHER_CLUB_COMMITMENT_LABELS)).toEqual([
      "Yes, I can fully commit to both clubs",
      "Yes, but I may need to balance my responsibilities.",
      "No, I may not be able to fulfill both commitments",
    ]);
  });

  it("points Multimedia and ICT applicants to the committee's shared folder", () => {
    expect(WORK_SAMPLES_URL).toBe("https://drive.google.com/drive/folders/12Ju7HHONozGb3nETRvYUpjKQScr7YpS1?usp=sharing");
  });
});

describe("organisational structure", () => {
  it("keeps the Top Committee choices apart from the department choices", () => {
    expect(labelsOf(TOP_POSITIONS, POSITION_LABELS)).toEqual(["General Secretary", "General Treasurer"]);
    expect(labelsOf(DEPARTMENTS, POSITION_LABELS)).toEqual([
      "EXCO Da'wah",
      "EXCO Co-Curricular",
      "EXCO Multimedia, Design & Publication",
      "EXCO Educational Development",
      "EXCO ICT & Technical",
      "EXCO Sister Affairs",
    ]);
    expect(TOP_POSITIONS.filter((position) => (DEPARTMENTS as readonly string[]).includes(position))).toEqual([]);
    expect(APPLIED_POSITIONS).toEqual([...TOP_POSITIONS, ...DEPARTMENTS]);
  });

  it("gives every department exactly four positions and no Top Committee role", () => {
    const labels = labelsOf(DEPARTMENT_POSITIONS, DEPARTMENT_POSITION_LABELS);
    expect(labels).toEqual(["Head of Department", "1st Deputy Head", "Department Secretary", "EXCO Member"]);
    for (const label of labels) expect(label).not.toMatch(/general secretary|treasurer|president/i);
    // The department's own secretary is not the Top Committee's General Secretary.
    expect(DEPARTMENT_POSITIONS).not.toContain("general_secretary");
    expect(labelsOf(TOP_POSITIONS, POSITION_LABELS)).not.toContain("Department Secretary");
  });

  it("names a choice with its department position only when it is a department", () => {
    expect(positionLabel("general_secretary", "head")).toBe("General Secretary");
    expect(positionLabel("exco_dawah", "head")).toBe("EXCO Da'wah · Head of Department");
    expect(positionLabel("exco_ict", "")).toBe("EXCO ICT & Technical");
    expect(positionLabel("", "head")).toBe("");
  });
});

describe("validateApplicationInput", () => {
  it("accepts a complete application and normalizes email, name and student ID", () => {
    const result = validateApplicationInput(base, everything);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.student_email).toBe("aisha.rahman@student.aiu.edu.my");
      expect(result.value.full_name).toBe("AISHA RAHMAN");
      expect(result.value.student_id).toBe("AIU21011234");
    }
  });

  it("requires an AIU student email", () => {
    for (const student_email of ["aisha@gmail.com", "aisha@aiu.edu.my", "aisha@student.aiu.edu.my.evil.com", "not-an-email", ""]) {
      const result = validateApplicationInput({ ...base, student_email });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.errors.student_email).toBeDefined();
    }
  });

  it("validates contact numbers, names, student IDs and nationality", () => {
    expect(validateApplicationInput({ ...base, phone: "12345" }).ok).toBe(false);
    expect(validateApplicationInput({ ...base, phone: "+60 12abc4567" }).ok).toBe(false);
    expect(validateApplicationInput({ ...base, phone: "+60 (12) 345-6789" }).ok).toBe(true);
    // The example given in the official form.
    expect(validateApplicationInput({ ...base, phone: "+011-22335566" }).ok).toBe(true);
    expect(validateApplicationInput({ ...base, full_name: "Aisha123" }).ok).toBe(false);
    expect(validateApplicationInput({ ...base, full_name: "Nur 'Aisyah Al-Hadi" }).ok).toBe(true);
    expect(validateApplicationInput({ ...base, student_id: "AIU 2101" }).ok).toBe(false);
    expect(validateApplicationInput({ ...base, nationality: "" }).ok).toBe(false);
    expect(validateApplicationInput({ ...base, nationality: "12345" }).ok).toBe(false);
  });

  it("reports every missing required answer at once, and only those", () => {
    const result = validateApplicationInput({}, everything);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(Object.keys(result.errors).sort()).toEqual([
        "about_alqisc", "accept_other_position", "education_level", "first_choice", "full_name", "joined_programs",
        "motivation", "nationality", "phone", "second_choice", "student_email", "student_id",
      ]);
    }
  });

  it("leaves every optional question optional", () => {
    const result = validateApplicationInput({
      ...base,
      year_of_study: "",
      programme: "",
      programs_joined: "",
      experience: "",
      other_club_commitment: "",
    }, everything);
    expect(result.ok).toBe(true);
  });

  it("accepts every level of education and rejects unknown ones", () => {
    for (const education_level of EDUCATION_LEVELS) {
      expect(validateApplicationInput({ ...base, education_level }).ok).toBe(true);
    }
    expect(validateApplicationInput({ ...base, education_level: "postgraduate" }).ok).toBe(false);
  });

  it("keeps the Bachelor-only answers for Bachelor students", () => {
    const result = validateApplicationInput(base);
    expect(result.ok && result.value.year_of_study).toBe("Year 2");
    expect(result.ok && result.value.programme).toBe("SBSS & BBAM & Cohort 5");
    expect(validateApplicationInput({ ...base, year_of_study: "Year 4" }).ok).toBe(false);
  });

  it("drops the Bachelor-only answers for LC and Foundation students", () => {
    for (const education_level of ["lc", "foundation"]) {
      // An unlisted year would be rejected for a Bachelor student; here it is ignored.
      const result = validateApplicationInput({ ...base, education_level, year_of_study: "Year 4" });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.year_of_study).toBe("");
        expect(result.value.programme).toBe("");
      }
    }
  });

  it("keeps the programs joined only when the applicant has joined one", () => {
    const joined = validateApplicationInput(base);
    expect(joined.ok && joined.value.programs_joined).toBe("Weekly Islamic Talk");
    const never = validateApplicationInput({ ...base, joined_programs: "never" });
    expect(never.ok && never.value.programs_joined).toBe("");
    expect(validateApplicationInput({ ...base, joined_programs: "maybe" }).ok).toBe(false);
  });

  it("requires the motivation without a minimum length", () => {
    expect(validateApplicationInput({ ...base, motivation: "" }).ok).toBe(false);
    expect(validateApplicationInput({ ...base, motivation: "   " }).ok).toBe(false);
    expect(validateApplicationInput({ ...base, motivation: "To serve." }).ok).toBe(true);
  });

  it("requires the answers about Al-Qisc and about another position", () => {
    expect(validateApplicationInput({ ...base, about_alqisc: "  " }).ok).toBe(false);
    expect(validateApplicationInput({ ...base, accept_other_position: "" }).ok).toBe(false);
    expect(validateApplicationInput({ ...base, accept_other_position: "no" }).ok).toBe(true);
  });

  it("accepts each answer about serving another club and rejects unknown ones", () => {
    for (const other_club_commitment of OTHER_CLUB_COMMITMENTS) {
      expect(validateApplicationInput({ ...base, other_club_commitment }).ok).toBe(true);
    }
    expect(validateApplicationInput({ ...base, other_club_commitment: "perhaps" }).ok).toBe(false);
  });

  it("rejects answers that are too long", () => {
    const long = "a".repeat(3001);
    for (const field of ["about_alqisc", "programs_joined", "experience", "motivation"]) {
      expect(validateApplicationInput({ ...base, [field]: long }).ok, field).toBe(false);
    }
  });

  it("ignores unexpected input instead of storing it", () => {
    const result = validateApplicationInput({ ...base, status: "accepted", admin_notes: "hired", is_admin: true, nationality: ["x"] });
    expect(result.ok).toBe(false);
    const clean = validateApplicationInput({ ...base, status: "accepted", admin_notes: "hired", photo_path: "images/x.jpg" });
    expect(clean.ok && Object.keys(clean.value)).not.toContain("status");
    expect(clean.ok && Object.keys(clean.value)).not.toContain("photo_path");
  });
});

describe("first and second choice", () => {
  it("requires both choices from the official list", () => {
    expect(validateApplicationInput({ ...base, first_choice: "" }, everything).ok).toBe(false);
    expect(validateApplicationInput({ ...base, second_choice: "" }, everything).ok).toBe(false);
    expect(validateApplicationInput({ ...base, first_choice: "president" }, everything).ok).toBe(false);
    expect(validateApplicationInput({ ...base, second_choice: "media" }, everything).ok).toBe(false);
  });

  it("refuses the same position as both choices, for every position", () => {
    for (const choice of APPLIED_POSITIONS) {
      const result = validateApplicationInput({ ...base, first_choice: choice, second_choice: choice }, everything);
      expect(result.ok, choice).toBe(false);
      if (!result.ok) expect(result.errors.second_choice).toMatch(/different from your first choice/);
    }
  });

  it("asks for a department position exactly when a choice is a department, for every pair of choices", () => {
    for (const first_choice of APPLIED_POSITIONS) {
      for (const second_choice of APPLIED_POSITIONS) {
        if (first_choice === second_choice) continue;
        const pair = `${first_choice} + ${second_choice}`;
        const hasDepartment = chosenDepartments({ first_choice, second_choice }).length > 0;

        const without = validateApplicationInput({ ...base, first_choice, second_choice, department_position: "" }, everything);
        expect(without.ok, `${pair} without a department position`).toBe(!hasDepartment);
        if (!without.ok) expect(Object.keys(without.errors)).toEqual(["department_position"]);

        const withOne = validateApplicationInput({ ...base, first_choice, second_choice, department_position: "head" }, everything);
        expect(withOne.ok, `${pair} with a department position`).toBe(true);
        // An answer to the hidden question is dropped, never stored.
        if (withOne.ok) expect(withOne.value.department_position, pair).toBe(hasDepartment ? "head" : "");
      }
    }
  });

  it("shows the department position when only the second choice is a department", () => {
    expect(chosenDepartments({ first_choice: "general_secretary", second_choice: "exco_multimedia" })).toEqual(["exco_multimedia"]);
    expect(chosenDepartments({ first_choice: "exco_ict", second_choice: "general_treasurer" })).toEqual(["exco_ict"]);
    expect(chosenDepartments({ first_choice: "general_treasurer", second_choice: "general_secretary" })).toEqual([]);
    expect(chosenDepartments({ first_choice: "exco_dawah", second_choice: "exco_multimedia" })).toEqual(["exco_dawah", "exco_multimedia"]);
  });

  it("accepts only the four department positions", () => {
    for (const department_position of DEPARTMENT_POSITIONS) {
      expect(validateApplicationInput({ ...base, department_position }, everything).ok, department_position).toBe(true);
    }
    for (const department_position of ["second_deputy_head", "member", "deputy_head", "general_secretary", "treasurer"]) {
      expect(validateApplicationInput({ ...base, department_position }, everything).ok, department_position).toBe(false);
    }
  });

  it("asks for work samples only from Multimedia and ICT applicants", () => {
    expect(needsWorkSamples({ first_choice: "exco_multimedia", second_choice: "general_secretary" })).toBe(true);
    expect(needsWorkSamples({ first_choice: "exco_dawah", second_choice: "exco_ict" })).toBe(true);
    expect(needsWorkSamples({ first_choice: "exco_dawah", second_choice: "exco_education" })).toBe(false);
  });
});

describe("positions opened by the admin", () => {
  it("opens nothing by default", () => {
    expect(countOpenPositions(DEFAULT_REGISTRATION_CONFIG)).toBe(0);
    expect(openAppliedPositions(DEFAULT_REGISTRATION_CONFIG)).toEqual([]);
    expect(countOpenPositions(nothing)).toBe(0);
  });

  it("makes an open Top Committee position selectable and a closed one not", () => {
    const open = availability(["general_secretary"], { exco_dawah: ["head"] });
    expect(openAppliedPositions(open)).toEqual(["general_secretary", "exco_dawah"]);
    const application = { ...base, first_choice: "general_secretary", second_choice: "exco_dawah", department_position: "head" };
    expect(validateApplicationInput(application, open).ok).toBe(true);

    const closed = validateApplicationInput({ ...application, first_choice: "general_treasurer" }, open);
    expect(closed.ok).toBe(false);
    if (!closed.ok) expect(closed.errors.first_choice).toMatch(/General Treasurer is not open/);
  });

  it("makes an open department position selectable and a closed one not", () => {
    const open = availability(["general_secretary"], { exco_dawah: ["head"] });
    const application = { ...base, first_choice: "exco_dawah", second_choice: "general_secretary" };
    expect(validateApplicationInput({ ...application, department_position: "head" }, open).ok).toBe(true);

    const closed = validateApplicationInput({ ...application, department_position: "exco_member" }, open);
    expect(closed.ok).toBe(false);
    if (!closed.ok) expect(closed.errors.department_position).toBe("EXCO Member is not open for applications in EXCO Da'wah.");
  });

  it("does not open a position in every department when it is opened in one", () => {
    const open = availability([], { exco_dawah: ["head"], exco_multimedia: ["exco_member"] });
    expect(openDepartmentPositions(open, "exco_dawah")).toEqual(["head"]);
    expect(openDepartmentPositions(open, "exco_multimedia")).toEqual(["exco_member"]);
    for (const department of ["exco_co_curricular", "exco_education", "exco_ict", "exco_sister_affairs"]) {
      expect(openDepartmentPositions(open, department), department).toEqual([]);
    }
    // A department with nothing open cannot be chosen at all.
    expect(openAppliedPositions(open)).toEqual(["exco_dawah", "exco_multimedia"]);
    const result = validateApplicationInput({ ...base, first_choice: "exco_ict", second_choice: "exco_dawah", department_position: "head" }, open);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.first_choice).toMatch(/EXCO ICT & Technical is not open/);
  });

  it("offers only the department positions open in every chosen department", () => {
    const open = availability(["general_secretary"], {
      exco_dawah: ["head", "exco_member"],
      exco_multimedia: ["exco_member"],
      exco_ict: ["department_secretary"],
    });
    expect(selectableDepartmentPositions(open, { first_choice: "exco_dawah", second_choice: "general_secretary" })).toEqual(["head", "exco_member"]);
    expect(selectableDepartmentPositions(open, { first_choice: "exco_dawah", second_choice: "exco_multimedia" })).toEqual(["exco_member"]);
    expect(selectableDepartmentPositions(open, { first_choice: "exco_dawah", second_choice: "exco_ict" })).toEqual([]);
    expect(selectableDepartmentPositions(open, { first_choice: "general_secretary", second_choice: "" })).toEqual([]);

    const application = { ...base, first_choice: "exco_dawah", second_choice: "exco_multimedia" };
    expect(validateApplicationInput({ ...application, department_position: "exco_member" }, open).ok).toBe(true);
    const result = validateApplicationInput({ ...application, department_position: "head" }, open);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.department_position).toMatch(/not open for applications in EXCO Multimedia/);
  });

  it("refuses every application when nothing is open", () => {
    const result = validateApplicationInput(base, nothing);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.first_choice).toBeDefined();
  });

  it("does not ask for a second choice when only one choice is open", () => {
    const open = availability(["general_secretary"]);
    expect(validateApplicationInput({ ...base, first_choice: "general_secretary", second_choice: "" }, open).ok).toBe(true);
    expect(validateApplicationInput({ ...base, first_choice: "general_secretary", second_choice: "general_treasurer" }, open).ok).toBe(false);
  });

  it("keeps only known positions from untrusted settings", () => {
    const open = normalizeOpenPositions({
      open_top_positions: ["general_treasurer", "president", 7, "general_secretary"],
      open_department_positions: { exco_dawah: ["exco_member", "second_deputy_head", "head"], media: ["head"], exco_ict: "head" },
    });
    expect(open.open_top_positions).toEqual(["general_secretary", "general_treasurer"]);
    expect(open.open_department_positions.exco_dawah).toEqual(["head", "exco_member"]);
    expect(open.open_department_positions.exco_ict).toEqual([]);
    expect(Object.keys(open.open_department_positions)).toEqual([...DEPARTMENTS]);
  });

  it("can still describe what is open in the earlier form's terms", () => {
    expect(legacyOpenPositions(nothing)).toEqual([]);
    expect(legacyOpenPositions(availability(["general_treasurer"], { exco_ict: ["first_deputy_head"] }))).toEqual(["treasurer", "deputy_head"]);
    // The earlier form had no department secretary, so it has no old name.
    expect(legacyOpenPositions(availability([], { exco_ict: ["department_secretary"] }))).toEqual([]);
    expect(legacyOpenPositions(everything)).toEqual(["secretary", "treasurer", "head", "deputy_head", "committee_member"]);
  });
});

describe("registration window", () => {
  const open = { ...DEFAULT_REGISTRATION_CONFIG, ...availability(["general_secretary"]), is_open: true, term: "2026/2027", deadline: "2026-11-22" };

  it("closes after the end of the deadline day in Malaysia", () => {
    expect(isPastDeadline("2026-11-22", new Date("2026-11-22T15:00:00Z"))).toBe(false);
    expect(isPastDeadline("2026-11-22", new Date("2026-11-22T16:30:00Z"))).toBe(true);
    expect(isPastDeadline("", new Date())).toBe(false);
  });

  it("writes the deadline the same way everywhere", () => {
    expect(formatDeadline("2026-11-22")).toBe("22 November 2026");
    expect(formatDeadline("")).toBe("");
    expect(formatDeadline("22 Nov")).toBe("");
  });

  it("only accepts applications when open, before the deadline, and with a position open", () => {
    expect(isAcceptingApplications(open, new Date("2026-11-21T00:00:00Z"))).toBe(true);
    expect(isAcceptingApplications(open, new Date("2026-11-23T00:00:00Z"))).toBe(false);
    expect(isAcceptingApplications({ ...open, is_open: false }, new Date("2026-11-21T00:00:00Z"))).toBe(false);
    expect(isAcceptingApplications({ ...open, ...nothing }, new Date("2026-11-21T00:00:00Z"))).toBe(false);
  });
});

describe("validateRegistrationConfig", () => {
  const positions = { open_top_positions: ["general_secretary"] };

  it("requires a term and at least one open position before opening", () => {
    expect(validateRegistrationConfig({ is_open: true, term: "", ...positions }).ok).toBe(false);
    expect(validateRegistrationConfig({ is_open: true, term: "2026/2027" }).ok).toBe(false);
    expect(validateRegistrationConfig({ is_open: true, term: "2026/2027", ...positions }).ok).toBe(true);
    expect(validateRegistrationConfig({ is_open: true, term: "2026/2027", open_department_positions: { exco_ict: ["head"] } }).ok).toBe(true);
    expect(validateRegistrationConfig({ is_open: false, term: "" }).ok).toBe(true);
  });

  it("rejects an invalid deadline", () => {
    expect(validateRegistrationConfig({ is_open: false, deadline: "22 Nov" }).ok).toBe(false);
    expect(validateRegistrationConfig({ is_open: false, deadline: "2026-11-22" }).ok).toBe(true);
  });

  it("stores each department's open positions separately", () => {
    const result = validateRegistrationConfig({
      is_open: false,
      open_department_positions: { exco_dawah: ["head"], exco_multimedia: ["exco_member"] },
    });
    expect(result.ok && result.value.open_department_positions.exco_dawah).toEqual(["head"]);
    expect(result.ok && result.value.open_department_positions.exco_multimedia).toEqual(["exco_member"]);
    expect(result.ok && result.value.open_department_positions.exco_ict).toEqual([]);
  });
});

describe("uploaded files", () => {
  const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]);
  const pdf = new TextEncoder().encode("%PDF-1.7");

  it("recognises JPG, PNG and WebP photos by their bytes", () => {
    expect(detectPhotoType(jpeg)).toBe("image/jpeg");
    expect(detectPhotoType(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a]))).toBe("image/png");
    expect(detectPhotoType(new TextEncoder().encode("RIFF\0\0\0\0WEBPVP8 "))).toBe("image/webp");
  });

  it("rejects other files as photos, whatever they are called", () => {
    expect(detectPhotoType(new TextEncoder().encode("<svg xmlns="))).toBeNull();
    expect(detectPhotoType(pdf)).toBeNull();
    expect(detectPhotoType(new TextEncoder().encode("GIF89a"))).toBeNull();
    expect(detectPhotoType(new Uint8Array([]))).toBeNull();
  });

  it("accepts a photo up to exactly 10 MB and refuses anything larger", () => {
    expect(MAX_PHOTO_BYTES).toBe(10 * 1024 * 1024);
    expect(photoProblem({ size: 1024 }, jpeg)).toBe("");
    expect(photoProblem({ size: MAX_PHOTO_BYTES }, jpeg)).toBe("");
    expect(photoProblem({ size: MAX_PHOTO_BYTES + 1 }, jpeg)).toMatch(/The limit is 10\.0 MB/);
  });

  it("refuses a photo that is empty or not really an image", () => {
    expect(photoProblem({ size: 0 }, new Uint8Array([]))).toMatch(/not a JPG, PNG, or WebP image/);
    expect(photoProblem({ size: 2048 }, new TextEncoder().encode("<html><script>"))).toMatch(/not a JPG, PNG, or WebP image/);
    expect(photoProblem({ size: 2048 }, pdf)).toMatch(/not a JPG, PNG, or WebP image/);
  });

  it("accepts PDFs and images as supporting documents up to exactly 3 MB", () => {
    expect(detectDocumentType(pdf)).toBe("application/pdf");
    expect(detectDocumentType(jpeg)).toBe("image/jpeg");
    expect(documentProblem({ size: MAX_DOCUMENT_BYTES }, pdf)).toBe("");
    expect(documentProblem({ size: MAX_DOCUMENT_BYTES + 1 }, pdf)).toMatch(/The limit is 3\.0 MB/);
  });

  it("refuses other files as supporting documents", () => {
    expect(detectDocumentType(new TextEncoder().encode("<html><script>"))).toBeNull();
    expect(detectDocumentType(new TextEncoder().encode("PK\u0003\u0004"))).toBeNull();
    expect(documentProblem({ size: 500 }, new TextEncoder().encode("MZ\u0090\u0000"))).toMatch(/not a PDF/);
    expect(documentProblem({ size: 0 }, new Uint8Array([]))).toMatch(/not a PDF/);
  });
});
