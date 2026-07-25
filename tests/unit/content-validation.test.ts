import { describe, expect, it } from "vitest";
import { validateContentDocument } from "@/lib/firebase/content-validation";

const now = new Date().toISOString();

describe("content validation", () => {
    it("accepts a complete valid class", () => {
        expect(validateContentDocument("classes", {
            slug: "safe-test-class",
            title: "Safe test class",
            description: "A valid class",
            schedule: "Sunday",
            time: "10:00",
            venue: "Hall",
            fee: "Free",
            students_enrolled: 0,
            image_url: "",
            objectives: ["Learn safely"],
            registration_url: "https://example.com/register",
            is_active: true,
            created_at: now,
        })).toBeNull();
    });

    it.each([
        ["extra fields", { extraData: "pollution" }],
        ["negative enrollment", { students_enrolled: -1 }],
        ["unsafe URL", { registration_url: "javascript:alert(1)" }],
        ["invalid date", { created_at: "2026-99-99" }],
        ["oversized objective", { objectives: ["x".repeat(501)] }],
    ])("rejects %s", (_name, changed) => {
        const result = validateContentDocument("classes", {
            slug: "safe-test-class",
            title: "Safe test class",
            description: "A valid class",
            schedule: "Sunday",
            time: "10:00",
            venue: "Hall",
            fee: "Free",
            students_enrolled: 0,
            image_url: "",
            objectives: ["Learn safely"],
            registration_url: "https://example.com/register",
            is_active: true,
            created_at: now,
            ...changed,
        });
        expect(result).toEqual(expect.any(String));
    });

    it("rejects non-string values inside lists", () => {
        expect(validateContentDocument("departments", {
            slug: "safe-department",
            name: "Safe",
            full_name: "Safe Department",
            description: "",
            image_url: "",
            objectives: [123],
            responsibilities: [],
            is_active: true,
            display_order: 0,
            created_at: now,
            updated_at: now,
        })).toMatch(/lists/i);
    });
});
