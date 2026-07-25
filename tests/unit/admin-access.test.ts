import { describe, expect, it } from "vitest";
import {
    canManageDepartment,
    hasAdminPermission,
    normalizeAdminAccess,
    permissionsForRole,
    validateRoleAssignment,
} from "../../src/lib/admin-access";

describe("admin role access", () => {
    it("gives the primary administrator every permission", () => {
        const access = normalizeAdminAccess(undefined, true);
        expect(access.role).toBe("super_admin");
        expect(hasAdminPermission(access, "administrators")).toBe(true);
        expect(hasAdminPermission(access, "settings")).toBe(true);
    });

    it("limits content managers to selected content sections", () => {
        expect(permissionsForRole("content_manager", ["events", "settings", "blog"]))
            .toEqual(["events", "blog"]);
    });

    it("requires and enforces department assignments", () => {
        const assignment = validateRoleAssignment({
            role: "department_head",
            departmentIds: ["education"],
        });
        expect("error" in assignment).toBe(false);

        const access = normalizeAdminAccess({
            role: "department_head",
            permissions: ["departments"],
            department_ids: ["education"],
        }, false);
        expect(canManageDepartment(access, "education")).toBe(true);
        expect(canManageDepartment(access, "media")).toBe(false);
    });

    it("preserves pre-RBAC admins without granting administrator management", () => {
        const access = normalizeAdminAccess({
            email: "legacy@example.com",
            status: "active",
        }, false);
        expect(access.isLegacy).toBe(true);
        expect(hasAdminPermission(access, "settings")).toBe(true);
        expect(hasAdminPermission(access, "administrators")).toBe(false);
    });
});
