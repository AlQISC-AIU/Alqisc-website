import { describe, expect, it } from "vitest";
import {
  DEFAULT_REGISTRATION_CONFIG,
  detectPhotoType,
  isAcceptingApplications,
  isPastDeadline,
  validateApplicationInput,
  validateRegistrationConfig,
} from "@/lib/committee-registration";

const base = {
  full_name: "Aisha Rahman",
  student_email: "Aisha.Rahman@Student.AIU.edu.my ",
  personal_email: "aisha@gmail.com",
  phone: "+60123456789",
  student_id: "AIU21011234",
  programme: "Computer Science",
  year_of_study: "Year 2",
  position: "committee_member",
  current_member_id: "",
  first_choice: "media",
  second_choice: "",
  motivation: "I want to serve the community, help organise events and learn from senior members.",
  experience: "",
};

describe("validateApplicationInput", () => {
  it("accepts a committee member application and normalizes the emails", () => {
    const result = validateApplicationInput(base);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.student_email).toBe("aisha.rahman@student.aiu.edu.my");
  });

  it("requires an AIU student email", () => {
    for (const student_email of ["aisha@gmail.com", "aisha@aiu.edu.my", "aisha@student.aiu.edu.my.evil.com", ""]) {
      const result = validateApplicationInput({ ...base, student_email });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.errors.student_email).toBeDefined();
    }
  });

  it("requires a separate, valid personal email", () => {
    expect(validateApplicationInput({ ...base, personal_email: "" }).ok).toBe(false);
    expect(validateApplicationInput({ ...base, personal_email: "not-an-email" }).ok).toBe(false);
    expect(validateApplicationInput({ ...base, personal_email: "aisha@student.aiu.edu.my" }).ok).toBe(false);
  });

  it("validates phone numbers, names and student IDs", () => {
    expect(validateApplicationInput({ ...base, phone: "12345" }).ok).toBe(false);
    expect(validateApplicationInput({ ...base, phone: "+60 12abc4567" }).ok).toBe(false);
    expect(validateApplicationInput({ ...base, phone: "+60 (12) 345-6789" }).ok).toBe(true);
    expect(validateApplicationInput({ ...base, full_name: "Aisha123" }).ok).toBe(false);
    expect(validateApplicationInput({ ...base, full_name: "Nur 'Aisyah Al-Hadi" }).ok).toBe(true);
    expect(validateApplicationInput({ ...base, student_id: "AIU 2101" }).ok).toBe(false);
  });

  it("reports every invalid field at once", () => {
    const result = validateApplicationInput({});
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(Object.keys(result.errors)).toEqual(expect.arrayContaining([
        "full_name", "student_email", "personal_email", "phone", "student_id", "position", "motivation",
      ]));
    }
  });

  it("requires a department for committee members", () => {
    expect(validateApplicationInput({ ...base, first_choice: "" }).ok).toBe(false);
  });

  it("rejects the same department as both choices", () => {
    expect(validateApplicationInput({ ...base, second_choice: "media" }).ok).toBe(false);
  });

  it("requires a current committee record for President and Vice President", () => {
    expect(validateApplicationInput({ ...base, position: "president" }).ok).toBe(false);
    expect(validateApplicationInput({ ...base, position: "vice_president" }).ok).toBe(false);
  });

  it("drops department choices for leadership applications", () => {
    const result = validateApplicationInput({ ...base, position: "president", current_member_id: "member-1" });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.first_choice).toBe("");
      expect(result.value.current_member_id).toBe("member-1");
    }
  });

  it("keeps department choices for head and deputy head", () => {
    for (const position of ["head", "deputy_head"]) {
      const result = validateApplicationInput({ ...base, position });
      expect(result.ok && result.value.first_choice).toBe("media");
      expect(validateApplicationInput({ ...base, position, first_choice: "" }).ok).toBe(false);
    }
  });

  it("opens secretary and treasurer to everyone without a department", () => {
    for (const position of ["secretary", "treasurer"]) {
      const result = validateApplicationInput({ ...base, position, first_choice: "", current_member_id: "member-1" });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.first_choice).toBe("");
        expect(result.value.current_member_id).toBe("");
      }
    }
  });

  it("rejects unknown positions and short motivations", () => {
    expect(validateApplicationInput({ ...base, position: "chairman" }).ok).toBe(false);
    expect(validateApplicationInput({ ...base, motivation: "short" }).ok).toBe(false);
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
  it("requires a term and at least one open position before opening", () => {
    expect(validateRegistrationConfig({ is_open: true, term: "", open_positions: ["head"] }).ok).toBe(false);
    expect(validateRegistrationConfig({ is_open: true, term: "2026/2027", open_positions: [] }).ok).toBe(false);
    expect(validateRegistrationConfig({ is_open: true, term: "2026/2027", open_positions: ["head"] }).ok).toBe(true);
  });

  it("keeps only known positions", () => {
    const result = validateRegistrationConfig({ is_open: false, open_positions: ["treasurer", "chairman", "head"] });
    expect(result.ok && result.value.open_positions).toEqual(["treasurer", "head"]);
  });

  it("filters invalid department slugs", () => {
    const result = validateRegistrationConfig({ is_open: false, open_departments: ["media", "Bad Slug", 3] });
    expect(result.ok && result.value.open_departments).toEqual(["media"]);
  });
});

describe("detectPhotoType", () => {
  it("recognises JPG, PNG and WebP by their bytes", () => {
    expect(detectPhotoType(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe("image/jpeg");
    expect(detectPhotoType(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a]))).toBe("image/png");
    expect(detectPhotoType(new TextEncoder().encode("RIFF\0\0\0\0WEBPVP8 "))).toBe("image/webp");
  });

  it("rejects other files", () => {
    expect(detectPhotoType(new TextEncoder().encode("<svg xmlns="))).toBeNull();
    expect(detectPhotoType(new Uint8Array([]))).toBeNull();
  });
});
