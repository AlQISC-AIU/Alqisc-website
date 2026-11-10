import { describe, expect, it } from "vitest";
import {
  appliesToDepartment,
  DEFAULT_REGISTRATION_CONFIG,
  DEPARTMENT_POSITION_LABELS,
  DEPARTMENT_POSITIONS,
  detectDocumentType,
  detectPhotoType,
  EDUCATION_LEVEL_LABELS,
  EDUCATION_LEVELS,
  FIRST_CHOICE_OPTIONS,
  isAcceptingApplications,
  isPastDeadline,
  JOINED_PROGRAMS_LABELS,
  JOINED_PROGRAMS_OPTIONS,
  LEADERSHIP_CHOICE_LABELS,
  needsWorkSamples,
  OTHER_CLUB_COMMITMENT_LABELS,
  OTHER_CLUB_COMMITMENTS,
  SECOND_CHOICE_OPTIONS,
  validateApplicationInput,
  validateRegistrationConfig,
  WORK_SAMPLES_URL,
  YEARS_OF_STUDY,
  YES_NO_LABELS,
  YES_NO_OPTIONS,
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
  department_position: "member",
  motivation: "I want to serve the community, help organise events and learn from senior members.",
  accept_other_position: "yes",
  other_club_commitment: "",
};

const labelsOf = <T extends string>(values: readonly T[], labels: Record<T, string>) => values.map((value) => labels[value]);

describe("options match the official recruitment form", () => {
  it("lists the level of education and year of study options", () => {
    expect(labelsOf(EDUCATION_LEVELS, EDUCATION_LEVEL_LABELS)).toEqual(["LC", "Foundation", "Bachelor Degree"]);
    expect(YEARS_OF_STUDY).toEqual(["Year 1", "Year 2", "Year 3"]);
  });

  it("lists the first choice options in the form's order", () => {
    expect(labelsOf(FIRST_CHOICE_OPTIONS, LEADERSHIP_CHOICE_LABELS)).toEqual([
      "General Secretary",
      "General Treasurer",
      "EXCO Da'wah",
      "EXCO Co-Curricular",
      "EXCO Multimedia, Design & Publication",
      "EXCO Educational Development",
      "EXCO ICT & Technical",
      "EXCO Sister Affairs",
    ]);
  });

  it("lists the second choice options in the form's order", () => {
    expect(labelsOf(SECOND_CHOICE_OPTIONS, LEADERSHIP_CHOICE_LABELS)).toEqual([
      "General Secretary",
      "General Treasurer",
      "EXCO Co-Curricular",
      "EXCO Educational Development",
      "EXCO ICT & Technical",
      "EXCO Sister Affairs",
      "EXCO Multimedia, Design & Publication",
      "EXCO Da'wah",
    ]);
    expect([...SECOND_CHOICE_OPTIONS].sort()).toEqual([...FIRST_CHOICE_OPTIONS].sort());
  });

  it("lists the department positions", () => {
    expect(labelsOf(DEPARTMENT_POSITIONS, DEPARTMENT_POSITION_LABELS)).toEqual([
      "Head of Department", "Deputy Head of Department", "Department Secretary", "Member",
    ]);
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

describe("validateApplicationInput", () => {
  it("accepts a complete application and normalizes email, name and student ID", () => {
    const result = validateApplicationInput(base);
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
    const result = validateApplicationInput({});
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
      department_position: "",
      other_club_commitment: "",
    });
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

  it("requires both choices from the official list", () => {
    expect(validateApplicationInput({ ...base, first_choice: "" }).ok).toBe(false);
    expect(validateApplicationInput({ ...base, second_choice: "" }).ok).toBe(false);
    expect(validateApplicationInput({ ...base, first_choice: "president" }).ok).toBe(false);
    expect(validateApplicationInput({ ...base, second_choice: "media" }).ok).toBe(false);
  });

  it("keeps a department position only when a department is chosen", () => {
    const department = validateApplicationInput(base);
    expect(department.ok && department.value.department_position).toBe("member");

    const clubWide = validateApplicationInput({ ...base, first_choice: "general_secretary", second_choice: "general_treasurer" });
    expect(clubWide.ok && clubWide.value.department_position).toBe("");

    expect(validateApplicationInput({ ...base, department_position: "chairman" }).ok).toBe(false);
  });

  it("requires the motivation and the answer about another position", () => {
    expect(validateApplicationInput({ ...base, motivation: "short" }).ok).toBe(false);
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
      const result = validateApplicationInput({ ...base, [field]: long });
      expect(result.ok, field).toBe(false);
    }
  });
});

describe("conditional sections", () => {
  it("offers a department position when either choice is a department", () => {
    expect(appliesToDepartment({ first_choice: "exco_dawah", second_choice: "general_secretary" })).toBe(true);
    expect(appliesToDepartment({ first_choice: "general_secretary", second_choice: "exco_sister_affairs" })).toBe(true);
    expect(appliesToDepartment({ first_choice: "general_secretary", second_choice: "general_treasurer" })).toBe(false);
    expect(appliesToDepartment({ first_choice: "", second_choice: "" })).toBe(false);
  });

  it("asks for work samples only from Multimedia and ICT applicants", () => {
    expect(needsWorkSamples({ first_choice: "exco_multimedia", second_choice: "general_secretary" })).toBe(true);
    expect(needsWorkSamples({ first_choice: "exco_dawah", second_choice: "exco_ict" })).toBe(true);
    expect(needsWorkSamples({ first_choice: "exco_dawah", second_choice: "exco_education" })).toBe(false);
  });
});

describe("registration window", () => {
  it("closes after the end of the deadline day in Malaysia", () => {
    expect(isPastDeadline("2026-10-20", new Date("2026-10-20T15:00:00Z"))).toBe(false);
    expect(isPastDeadline("2026-10-20", new Date("2026-10-20T16:30:00Z"))).toBe(true);
    expect(isPastDeadline("", new Date())).toBe(false);
  });

  it("only accepts applications when open and before the deadline", () => {
    const config = { ...DEFAULT_REGISTRATION_CONFIG, is_open: true, term: "2026/2027", deadline: "2026-10-20" };
    expect(isAcceptingApplications(config, new Date("2026-10-19T00:00:00Z"))).toBe(true);
    expect(isAcceptingApplications(config, new Date("2026-10-21T00:00:00Z"))).toBe(false);
    expect(isAcceptingApplications({ ...config, is_open: false }, new Date("2026-10-19T00:00:00Z"))).toBe(false);
  });
});

describe("validateRegistrationConfig", () => {
  it("requires a term before opening", () => {
    expect(validateRegistrationConfig({ is_open: true, term: "" }).ok).toBe(false);
    expect(validateRegistrationConfig({ is_open: true, term: "2026/2027" }).ok).toBe(true);
    expect(validateRegistrationConfig({ is_open: false, term: "" }).ok).toBe(true);
  });

  it("rejects an invalid deadline", () => {
    expect(validateRegistrationConfig({ is_open: false, deadline: "22 Nov" }).ok).toBe(false);
    expect(validateRegistrationConfig({ is_open: false, deadline: "2026-11-22" }).ok).toBe(true);
  });

  it("drops settings the earlier form used", () => {
    const result = validateRegistrationConfig({ is_open: false, term: "2026/2027", open_positions: ["head"], open_departments: ["media"] });
    expect(result.ok && Object.keys(result.value).sort()).toEqual(["deadline", "intro", "is_open", "term"]);
  });
});

describe("uploaded file detection", () => {
  it("recognises JPG, PNG and WebP photos by their bytes", () => {
    expect(detectPhotoType(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe("image/jpeg");
    expect(detectPhotoType(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a]))).toBe("image/png");
    expect(detectPhotoType(new TextEncoder().encode("RIFF\0\0\0\0WEBPVP8 "))).toBe("image/webp");
  });

  it("rejects other files as photos", () => {
    expect(detectPhotoType(new TextEncoder().encode("<svg xmlns="))).toBeNull();
    expect(detectPhotoType(new TextEncoder().encode("%PDF-1.7"))).toBeNull();
    expect(detectPhotoType(new Uint8Array([]))).toBeNull();
  });

  it("accepts PDFs and images as supporting documents", () => {
    expect(detectDocumentType(new TextEncoder().encode("%PDF-1.7"))).toBe("application/pdf");
    expect(detectDocumentType(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe("image/jpeg");
    expect(detectDocumentType(new TextEncoder().encode("<html><script>"))).toBeNull();
    expect(detectDocumentType(new TextEncoder().encode("PK\u0003\u0004"))).toBeNull();
  });
});
