"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { AdminTopbar } from "@/components/admin/admin-layout";
import { CheckCircle2, Clock3, Loader2, MailPlus, RefreshCw, ShieldCheck, Trash2 } from "lucide-react";
import { notifications } from "@/components/ui/notification-provider";

interface Administrator {
    email: string;
    display_name: string;
    status: "active" | "invited";
    is_primary: boolean;
    created_at: string | null;
    last_signed_in_at: string | null;
}

async function readError(response: Response, fallback: string): Promise<string> {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    return body?.error || fallback;
}

export default function AdministratorsPage() {
    const [admins, setAdmins] = useState<Administrator[]>([]);
    const [email, setEmail] = useState("");
    const [displayName, setDisplayName] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [removing, setRemoving] = useState("");
    const [resending, setResending] = useState("");
    const setError = (message: string) => message && notifications.error(message, "Administrator action failed");
    const setNotice = (message: string) => message && notifications.success(message, "Administrator updated");

    const loadAdmins = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const response = await fetch("/api/admin/users", { cache: "no-store" });
            if (!response.ok) throw new Error(await readError(response, "Unable to load administrators."));
            const body = (await response.json()) as { admins: Administrator[] };
            setAdmins(body.admins);
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
                body: JSON.stringify({ email, displayName }),
            });
            if (!response.ok) throw new Error(await readError(response, "Unable to invite administrator."));
            const body = (await response.json()) as { email: string };
            setNotice(`Invitation sent to ${body.email}. They can create a password from the email or use Google.`);
            setEmail("");
            setDisplayName("");
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
                body: JSON.stringify({ email: administrator.email }),
            });
            if (!response.ok) throw new Error(await readError(response, "Unable to resend invitation."));
            setNotice(`A new password setup email was sent to ${administrator.email}.`);
        } catch (resendError) {
            setError(resendError instanceof Error ? resendError.message : "Unable to resend invitation.");
        } finally {
            setResending("");
        }
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
                            Only emails listed here can open the admin panel. Google sign-in by itself never grants access.
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
                                    <div key={administrator.email} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:px-6">
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
