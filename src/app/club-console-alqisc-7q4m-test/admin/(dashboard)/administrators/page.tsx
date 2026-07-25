"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { AdminTopbar } from "@/components/admin/admin-layout";
import { CheckCircle2, Clock3, Loader2, MailPlus, RefreshCw, Save, ShieldCheck, Trash2 } from "lucide-react";
import { notifications } from "@/components/ui/notification-provider";
import {
    ADMIN_ROLES,
    PERMISSION_LABELS,
    ROLE_LABELS,
    permissionsForRole,
    type AdminPermission,
    type AdminRole,
} from "@/lib/admin-access";

interface Administrator {
    email: string;
    display_name: string;
    status: "active" | "invited";
    is_primary: boolean;
    created_at: string | null;
    last_signed_in_at: string | null;
    role: AdminRole;
    permissions: AdminPermission[];
    department_ids: string[];
    is_legacy: boolean;
}

interface DepartmentOption {
    id: string;
    name: string;
}

type AccessDraft = {
    role: AdminRole;
    permissions: AdminPermission[];
    departmentIds: string[];
};

async function readError(response: Response, fallback: string): Promise<string> {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    return body?.error || fallback;
}

export default function AdministratorsPage() {
    const [admins, setAdmins] = useState<Administrator[]>([]);
    const [email, setEmail] = useState("");
    const [displayName, setDisplayName] = useState("");
    const [role, setRole] = useState<AdminRole>("department_head");
    const [permissions, setPermissions] = useState<AdminPermission[]>([]);
    const [departmentIds, setDepartmentIds] = useState<string[]>([]);
    const [departments, setDepartments] = useState<DepartmentOption[]>([]);
    const [accessDrafts, setAccessDrafts] = useState<Record<string, AccessDraft>>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [removing, setRemoving] = useState("");
    const [resending, setResending] = useState("");
    const [updatingAccess, setUpdatingAccess] = useState("");
    const setError = (message: string) => message && notifications.error(message, "Administrator action failed");
    const setNotice = (message: string) => message && notifications.success(message, "Administrator updated");

    const loadAdmins = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const response = await fetch("/api/admin/users", { cache: "no-store" });
            if (!response.ok) throw new Error(await readError(response, "Unable to load administrators."));
            const body = (await response.json()) as {
                admins: Administrator[];
                departments: DepartmentOption[];
            };
            setAdmins(body.admins);
            setDepartments(body.departments);
            setAccessDrafts(Object.fromEntries(body.admins.map((administrator) => [
                administrator.email,
                {
                    role: administrator.role,
                    permissions: administrator.permissions,
                    departmentIds: administrator.department_ids,
                },
            ])));
        } catch (loadError) {
            setError(loadError instanceof Error ? loadError.message : "Unable to load administrators.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void loadAdmins();
    }, [loadAdmins]);

    const inviteAdministrator = async (event: FormEvent) => {
        event.preventDefault();
        setSaving(true);
        setError("");
        setNotice("");
        try {
            const response = await fetch("/api/admin/users", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, displayName, role, permissions, departmentIds }),
            });
            if (!response.ok) throw new Error(await readError(response, "Unable to invite administrator."));
            const body = (await response.json()) as { email: string };
            setNotice(`Invitation sent to ${body.email}. They can create a password from the email or use Google.`);
            setEmail("");
            setDisplayName("");
            setRole("department_head");
            setPermissions([]);
            setDepartmentIds([]);
            await loadAdmins();
        } catch (inviteError) {
            setError(inviteError instanceof Error ? inviteError.message : "Unable to invite administrator.");
        } finally {
            setSaving(false);
        }
    };

    const resendInvitation = async (administrator: Administrator) => {
        setResending(administrator.email);
        setError("");
        setNotice("");
        try {
            const response = await fetch("/api/admin/users", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "resend", email: administrator.email }),
            });
            if (!response.ok) throw new Error(await readError(response, "Unable to resend invitation."));
            setNotice(`A new password setup email was sent to ${administrator.email}.`);
        } catch (resendError) {
            setError(resendError instanceof Error ? resendError.message : "Unable to resend invitation.");
        } finally {
            setResending("");
        }
    };

    const updateAdministratorAccess = async (administrator: Administrator) => {
        const draft = accessDrafts[administrator.email];
        if (!draft) return;
        setUpdatingAccess(administrator.email);
        setError("");
        setNotice("");
        try {
            const response = await fetch("/api/admin/users", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "access",
                    email: administrator.email,
                    role: draft.role,
                    permissions: draft.permissions,
                    departmentIds: draft.departmentIds,
                }),
            });
            if (!response.ok) throw new Error(await readError(response, "Unable to update administrator access."));
            setNotice(`Access updated for ${administrator.email}.`);
            await loadAdmins();
        } catch (accessError) {
            setError(accessError instanceof Error ? accessError.message : "Unable to update administrator access.");
        } finally {
            setUpdatingAccess("");
        }
    };

    const setDraftRole = (emailAddress: string, nextRole: AdminRole) => {
        setAccessDrafts((current) => ({
            ...current,
            [emailAddress]: {
                role: nextRole,
                permissions: permissionsForRole(nextRole, current[emailAddress]?.permissions),
                departmentIds: nextRole === "department_head"
                    ? current[emailAddress]?.departmentIds || []
                    : [],
            },
        }));
    };

    const toggleDraftPermission = (emailAddress: string, permission: AdminPermission) => {
        setAccessDrafts((current) => {
            const draft = current[emailAddress];
            if (!draft) return current;
            const permissions = draft.permissions.includes(permission)
                ? draft.permissions.filter((item) => item !== permission)
                : [...draft.permissions, permission];
            return { ...current, [emailAddress]: { ...draft, permissions } };
        });
    };

    const toggleDraftDepartment = (emailAddress: string, departmentId: string) => {
        setAccessDrafts((current) => {
            const draft = current[emailAddress];
            if (!draft) return current;
            const departmentIds = draft.departmentIds.includes(departmentId)
                ? draft.departmentIds.filter((item) => item !== departmentId)
                : [...draft.departmentIds, departmentId];
            return { ...current, [emailAddress]: { ...draft, departmentIds } };
        });
    };

    const removeAdministrator = async (administrator: Administrator) => {
        if (!window.confirm(`Remove admin access for ${administrator.email}?`)) return;
        setRemoving(administrator.email);
        setError("");
        setNotice("");
        try {
            const response = await fetch("/api/admin/users", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: administrator.email }),
            });
            if (!response.ok) throw new Error(await readError(response, "Unable to remove administrator."));
            setNotice(`${administrator.email} no longer has admin access.`);
            await loadAdmins();
        } catch (removeError) {
            setError(removeError instanceof Error ? removeError.message : "Unable to remove administrator.");
        } finally {
            setRemoving("");
        }
    };

    return (
        <>
            <AdminTopbar title="Administrators" />
            <div className="flex-1 p-4 sm:p-6 lg:p-8">
                <div className="max-w-4xl space-y-6">
                    <div>
                        <h2 className="text-xl font-bold text-[var(--dark)]">Admin access</h2>
                        <p className="mt-1 text-sm text-[var(--gray)]">
                            Only invited emails can open the admin panel. Super admins control which sections each person can manage.
                        </p>
                    </div>


                    <form onSubmit={inviteAdministrator} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:p-6">
                        <div className="flex items-start gap-3">
                            <div className="rounded-xl bg-[var(--primary)]/10 p-2.5 text-[var(--primary)]">
                                <MailPlus className="h-5 w-5" />
                            </div>
                            <div>
                                <h3 className="font-bold text-[var(--dark)]">Invite an administrator</h3>
                                <p className="mt-0.5 text-xs text-[var(--gray)]">
                                    They receive a secure password-setup email and can also sign in with Google using the same invited email.
                                </p>
                            </div>
                        </div>
                        <div className="mt-5 grid gap-3 sm:grid-cols-2">
                            <input
                                type="text"
                                required
                                minLength={2}
                                maxLength={80}
                                value={displayName}
                                onChange={(event) => setDisplayName(event.target.value)}
                                placeholder="Full name"
                                className="min-w-0 rounded-xl border border-gray-200 bg-[var(--light)] px-4 py-3 text-sm text-[var(--dark)] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
                            />
                            <input
                                type="email"
                                required
                                maxLength={254}
                                value={email}
                                onChange={(event) => setEmail(event.target.value)}
                                placeholder="person@example.com"
                                className="min-w-0 flex-1 rounded-xl border border-gray-200 bg-[var(--light)] px-4 py-3 text-sm text-[var(--dark)] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
                            />
                            <div className="sm:col-span-2">
                                <label className="mb-1.5 block text-xs font-semibold text-[var(--dark)]">
                                    Role
                                </label>
                                <select
                                    value={role}
                                    onChange={(event) => {
                                        const nextRole = event.target.value as AdminRole;
                                        setRole(nextRole);
                                        setPermissions(permissionsForRole(nextRole, permissions));
                                        if (nextRole !== "department_head") setDepartmentIds([]);
                                    }}
                                    className="w-full rounded-xl border border-gray-200 bg-[var(--light)] px-4 py-3 text-sm text-[var(--dark)] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
                                >
                                    {ADMIN_ROLES.map((item) => (
                                        <option key={item} value={item}>{ROLE_LABELS[item]}</option>
                                    ))}
                                </select>
                                <p className="mt-1.5 text-xs text-[var(--gray)]">
                                    {role === "super_admin" && "Full access, including invitations, roles, and settings."}
                                    {role === "department_head" && "Can edit only the assigned department, its teams, and members."}
                                    {role === "blog_editor" && "Can create and manage blog posts only."}
                                    {role === "events_manager" && "Can create and manage events only."}
                                    {role === "classes_manager" && "Can create and manage classes only."}
                                    {role === "content_manager" && "Can manage the selected content sections."}
                                </p>
                            </div>

                            {role === "content_manager" && (
                                <fieldset className="sm:col-span-2">
                                    <legend className="mb-2 text-xs font-semibold text-[var(--dark)]">Allowed sections</legend>
                                    <div className="grid gap-2 sm:grid-cols-3">
                                        {(["events", "classes", "blog"] as AdminPermission[]).map((permission) => (
                                            <label key={permission} className="flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2.5 text-sm">
                                                <input
                                                    type="checkbox"
                                                    checked={permissions.includes(permission)}
                                                    onChange={() => setPermissions((current) =>
                                                        current.includes(permission)
                                                            ? current.filter((item) => item !== permission)
                                                            : [...current, permission]
                                                    )}
                                                    className="h-4 w-4 accent-[var(--primary)]"
                                                />
                                                {PERMISSION_LABELS[permission]}
                                            </label>
                                        ))}
                                    </div>
                                </fieldset>
                            )}

                            {role === "department_head" && (
                                <fieldset className="sm:col-span-2">
                                    <legend className="mb-2 text-xs font-semibold text-[var(--dark)]">Assigned departments</legend>
                                    <div className="grid gap-2 sm:grid-cols-2">
                                        {departments.map((department) => (
                                            <label key={department.id} className="flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2.5 text-sm">
                                                <input
                                                    type="checkbox"
                                                    checked={departmentIds.includes(department.id)}
                                                    onChange={() => setDepartmentIds((current) =>
                                                        current.includes(department.id)
                                                            ? current.filter((item) => item !== department.id)
                                                            : [...current, department.id]
                                                    )}
                                                    className="h-4 w-4 accent-[var(--primary)]"
                                                />
                                                {department.name}
                                            </label>
                                        ))}
                                    </div>
                                </fieldset>
                            )}
                            <button
                                type="submit"
                                disabled={saving}
                                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--primary-dark)] disabled:opacity-60 sm:col-span-2"
                            >
                                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <MailPlus className="h-4 w-4" />}
                                Invite admin
                            </button>
                        </div>
                    </form>

                    <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
                        <div className="border-b border-gray-100 px-5 py-4 sm:px-6">
                            <h3 className="font-bold text-[var(--dark)]">Authorized administrators</h3>
                        </div>
                        {loading ? (
                            <div className="flex items-center justify-center p-12"><Loader2 className="h-6 w-6 animate-spin text-[var(--primary)]" /></div>
                        ) : (
                            <div className="divide-y divide-gray-100">
                                {admins.map((administrator) => (
                                    <div key={administrator.email} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:flex-wrap sm:items-center sm:px-6">
                                        <div className="flex min-w-0 flex-1 items-center gap-3">
                                            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[var(--primary)]/10 text-[var(--primary)]">
                                                {administrator.is_primary ? <ShieldCheck className="h-5 w-5" /> : administrator.status === "active" ? <CheckCircle2 className="h-5 w-5" /> : <Clock3 className="h-5 w-5" />}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="truncate text-sm font-semibold text-[var(--dark)]">{administrator.display_name || administrator.email}</p>
                                                {administrator.display_name && <p className="truncate text-xs text-[var(--gray)]">{administrator.email}</p>}
                                                <p className="text-xs text-[var(--gray)]">
                                                    {administrator.is_primary ? "Primary administrator · cannot be removed" : administrator.status === "active" ? "Active administrator" : "Invited · waiting for first sign-in"}
                                                </p>
                                                <p className="mt-1 text-xs font-semibold text-[var(--primary)]">
                                                    {ROLE_LABELS[administrator.role]}
                                                    {administrator.is_legacy ? " · legacy access" : ""}
                                                </p>
                                            </div>
                                        </div>
                                        {!administrator.is_primary && (
                                            <div className="flex flex-col gap-2 sm:flex-row">
                                            <button
                                                type="button"
                                                onClick={() => void resendInvitation(administrator)}
                                                disabled={resending === administrator.email}
                                                className="inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--primary)]/30 px-3 py-2 text-xs font-semibold text-[var(--primary)] transition hover:bg-[var(--primary)]/5 disabled:opacity-60"
                                            >
                                                {resending === administrator.email ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                                                Send setup email
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => void removeAdministrator(administrator)}
                                                disabled={removing === administrator.email}
                                                className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-60"
                                            >
                                                {removing === administrator.email ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                                Remove access
                                            </button>
                                            </div>
                                        )}
                                        {!administrator.is_primary && accessDrafts[administrator.email] && (
                                            <div className="w-full rounded-xl border border-gray-100 bg-[var(--light)] p-4">
                                                <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                                                    <div>
                                                        <label className="mb-1.5 block text-xs font-semibold text-[var(--dark)]">
                                                            Access role
                                                        </label>
                                                        <select
                                                            value={accessDrafts[administrator.email].role}
                                                            onChange={(event) =>
                                                                setDraftRole(administrator.email, event.target.value as AdminRole)
                                                            }
                                                            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--primary)]"
                                                        >
                                                            {ADMIN_ROLES.map((item) => (
                                                                <option key={item} value={item}>{ROLE_LABELS[item]}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => void updateAdministratorAccess(administrator)}
                                                        disabled={updatingAccess === administrator.email}
                                                        className="inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-[var(--primary-dark)] disabled:opacity-60"
                                                    >
                                                        {updatingAccess === administrator.email
                                                            ? <Loader2 className="h-4 w-4 animate-spin" />
                                                            : <Save className="h-4 w-4" />}
                                                        Save access
                                                    </button>
                                                </div>

                                                {accessDrafts[administrator.email].role === "content_manager" && (
                                                    <div className="mt-3 grid gap-2 sm:grid-cols-3">
                                                        {(["events", "classes", "blog"] as AdminPermission[]).map((permission) => (
                                                            <label key={permission} className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={accessDrafts[administrator.email].permissions.includes(permission)}
                                                                    onChange={() => toggleDraftPermission(administrator.email, permission)}
                                                                    className="h-4 w-4 accent-[var(--primary)]"
                                                                />
                                                                {PERMISSION_LABELS[permission]}
                                                            </label>
                                                        ))}
                                                    </div>
                                                )}

                                                {accessDrafts[administrator.email].role === "department_head" && (
                                                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                                                        {departments.map((department) => (
                                                            <label key={department.id} className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={accessDrafts[administrator.email].departmentIds.includes(department.id)}
                                                                    onChange={() => toggleDraftDepartment(administrator.email, department.id)}
                                                                    className="h-4 w-4 accent-[var(--primary)]"
                                                                />
                                                                {department.name}
                                                            </label>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
