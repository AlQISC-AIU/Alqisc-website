export const ADMIN_ROLES = [
    "super_admin",
    "department_head",
    "blog_editor",
    "events_manager",
    "classes_manager",
    "content_manager",
] as const;

export type AdminRole = typeof ADMIN_ROLES[number];

export const ADMIN_PERMISSIONS = [
    "departments",
    "events",
    "classes",
    "blog",
    "settings",
    "administrators",
] as const;

export type AdminPermission = typeof ADMIN_PERMISSIONS[number];

export type AdminAccess = {
    role: AdminRole;
    permissions: AdminPermission[];
    departmentIds: string[];
    isPrimary: boolean;
    isLegacy: boolean;
};

export const ROLE_LABELS: Record<AdminRole, string> = {
    super_admin: "Super admin",
    department_head: "Department head",
    blog_editor: "Blog editor",
    events_manager: "Events manager",
    classes_manager: "Classes manager",
    content_manager: "Content manager",
};

export const PERMISSION_LABELS: Record<AdminPermission, string> = {
    departments: "Departments and members",
    events: "Events",
    classes: "Classes",
    blog: "Blog",
    settings: "Website settings",
    administrators: "Administrators and roles",
};

const ALL_PERMISSIONS: AdminPermission[] = [...ADMIN_PERMISSIONS];
const CONTENT_MANAGER_PERMISSIONS: AdminPermission[] = ["events", "classes", "blog"];
const LEGACY_PERMISSIONS: AdminPermission[] = [
    "departments",
    "events",
    "classes",
    "blog",
    "settings",
];

export function isAdminRole(value: unknown): value is AdminRole {
    return typeof value === "string" &&
        (ADMIN_ROLES as readonly string[]).includes(value);
}

export function isAdminPermission(value: unknown): value is AdminPermission {
    return typeof value === "string" &&
        (ADMIN_PERMISSIONS as readonly string[]).includes(value);
}

function uniqueStrings(value: unknown, maxItems: number): string[] {
    if (!Array.isArray(value)) return [];
    return [...new Set(value.filter((item): item is string =>
        typeof item === "string" && item.length >= 1 && item.length <= 128
    ))].slice(0, maxItems);
}

export function permissionsForRole(
    role: AdminRole,
    requestedPermissions: unknown = [],
): AdminPermission[] {
    if (role === "super_admin") return [...ALL_PERMISSIONS];
    if (role === "department_head") return ["departments"];
    if (role === "blog_editor") return ["blog"];
    if (role === "events_manager") return ["events"];
    if (role === "classes_manager") return ["classes"];

    const requested = Array.isArray(requestedPermissions)
        ? requestedPermissions.filter(isAdminPermission)
        : [];
    return [...new Set(requested)].filter((permission) =>
        CONTENT_MANAGER_PERMISSIONS.includes(permission)
    );
}

export function normalizeAdminAccess(
    data: Record<string, unknown> | undefined,
    isPrimary: boolean,
): AdminAccess {
    if (isPrimary) {
        return {
            role: "super_admin",
            permissions: [...ALL_PERMISSIONS],
            departmentIds: [],
            isPrimary: true,
            isLegacy: false,
        };
    }

    const hasAccessFields = Boolean(data && (
        "role" in data || "permissions" in data || "department_ids" in data
    ));
    if (!hasAccessFields) {
        return {
            role: "content_manager",
            permissions: [...LEGACY_PERMISSIONS],
            departmentIds: [],
            isPrimary: false,
            isLegacy: true,
        };
    }

    const role = isAdminRole(data?.role) ? data.role : "content_manager";
    return {
        role,
        permissions: permissionsForRole(role, data?.permissions),
        departmentIds: role === "department_head"
            ? uniqueStrings(data?.department_ids, 20)
            : [],
        isPrimary: false,
        isLegacy: false,
    };
}

export function hasAdminPermission(
    access: AdminAccess,
    permission: AdminPermission,
): boolean {
    return access.permissions.includes(permission);
}

export function canManageDepartment(
    access: AdminAccess,
    departmentId: string,
): boolean {
    if (!hasAdminPermission(access, "departments")) return false;
    if (access.role !== "department_head") return true;
    return access.departmentIds.includes(departmentId);
}

export function validateRoleAssignment(input: {
    role?: unknown;
    permissions?: unknown;
    departmentIds?: unknown;
}): { role: AdminRole; permissions: AdminPermission[]; departmentIds: string[] } | { error: string } {
    if (!isAdminRole(input.role)) return { error: "Choose a valid administrator role." };

    const permissions = permissionsForRole(input.role, input.permissions);
    const departmentIds = input.role === "department_head"
        ? uniqueStrings(input.departmentIds, 20)
        : [];

    if (input.role === "department_head" && departmentIds.length === 0) {
        return { error: "Assign at least one department to the department head." };
    }
    if (input.role === "content_manager" && permissions.length === 0) {
        return { error: "Select at least one content section for the content manager." };
    }

    return { role: input.role, permissions, departmentIds };
}
