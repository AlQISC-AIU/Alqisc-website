"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { AdminTopbar } from "@/components/admin/admin-layout";
import { ChevronDown, Download, ExternalLink, FileDown, ImageDown, Loader2, Save, Search, Trash2, UserPlus } from "lucide-react";
import { notifications } from "@/components/ui/notification-provider";
import { cn } from "@/lib/utils";
import {
    ALL_POSITION_LABELS,
    APPLICATION_STATUSES,
    APPLIED_POSITIONS,
    countOpenPositions,
    DEFAULT_REGISTRATION_CONFIG,
    DEPARTMENT_POSITION_LABELS,
    DEPARTMENT_POSITIONS,
    DEPARTMENTS,
    EDUCATION_LEVEL_LABELS,
    isPastDeadline,
    JOINED_PROGRAMS_LABELS,
    LEGACY_POSITION_LABELS,
    OTHER_CLUB_COMMITMENT_LABELS,
    POSITION_LABELS,
    STATUS_LABELS,
    TOP_POSITIONS,
    YES_NO_LABELS,
    type ApplicationStatus,
    type CommitteeApplication,
    type Department,
    type DepartmentPosition,
    type RegistrationConfig,
    type TopPosition,
} from "@/lib/committee-registration";

const STATUS_STYLES: Record<ApplicationStatus, string> = {
    pending: "bg-amber-50 text-amber-700",
    shortlisted: "bg-blue-50 text-blue-700",
    accepted: "bg-green-50 text-green-700",
    rejected: "bg-red-50 text-red-600",
};

const inputClassName = "w-full min-w-0 rounded-xl border border-gray-200 bg-[var(--light)] px-4 py-3 text-sm text-[var(--dark)] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20";

async function readError(response: Response, fallback: string): Promise<string> {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    return body?.error || fallback;
}

function formatDate(value: string) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleString("en-MY", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
}

function photoUrl(application: CommitteeApplication, download = false) {
    return `/api/admin/committee-registration/photo?id=${application.id}${download ? "&download" : ""}`;
}

function documentUrl(application: CommitteeApplication) {
    return `/api/admin/committee-registration/document?id=${application.id}`;
}

/** The display label for a stored answer, or "" when it was not given. */
function label(labels: Record<string, string>, value: string | undefined) {
    return value ? labels[value] || value : "";
}

/**
 * The applicant's first choice, e.g. "EXCO ICT & Technical · EXCO Member".
 * Records from the earlier form show their old position, e.g. "Deputy Head · Media".
 */
function roleLabel(application: CommitteeApplication) {
    const legacy = label(LEGACY_POSITION_LABELS, application.position);
    return [legacy, application.first_choice_name].filter(Boolean).join(" · ") || "No choice recorded";
}

/** Applications under the position each one put first, in the order positions are listed. */
function groupByFirstChoice(applications: CommitteeApplication[]) {
    const groups = new Map<string, CommitteeApplication[]>();
    for (const application of applications) {
        const key = roleLabel(application);
        groups.set(key, [...(groups.get(key) || []), application]);
    }
    const order = (key: string) => {
        const index = ALL_POSITION_LABELS.indexOf(key);
        return index === -1 ? ALL_POSITION_LABELS.length : index;
    };
    return [...groups.entries()]
        .sort(([a], [b]) => order(a) - order(b) || a.localeCompare(b))
        .map(([position, items]) => ({ position, applications: items }));
}

const checkboxChipClassName = "inline-flex min-h-9 cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition";

function chipClassName(open: boolean) {
    return cn(checkboxChipClassName, open ? "border-[var(--primary)] bg-[var(--primary)]/5 text-[var(--primary)]" : "border-gray-200 text-[var(--gray)]");
}

function Toggle({ checked, onChange, label, description }: { checked: boolean; onChange: (value: boolean) => void; label: string; description: string }) {
    return (
        <label className="flex cursor-pointer items-start justify-between gap-4 rounded-xl border border-gray-100 bg-[var(--light)] p-4">
            <span>
                <span className="block text-sm font-semibold text-[var(--dark)]">{label}</span>
                <span className="mt-0.5 block text-xs text-[var(--gray)]">{description}</span>
            </span>
            <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="peer sr-only" />
            <span className="relative mt-0.5 h-6 w-11 flex-shrink-0 rounded-full bg-gray-300 transition peer-checked:bg-[var(--primary)] peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--primary)]/30 after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow after:transition peer-checked:after:translate-x-5" />
        </label>
    );
}

export default function RegistrationsPage() {
    const [config, setConfig] = useState<RegistrationConfig>(DEFAULT_REGISTRATION_CONFIG);
    const [applications, setApplications] = useState<CommitteeApplication[]>([]);
    const [loading, setLoading] = useState(true);
    const [savingConfig, setSavingConfig] = useState(false);
    const [busyId, setBusyId] = useState("");
    const [expandedId, setExpandedId] = useState("");
    const [notesDraft, setNotesDraft] = useState<Record<string, string>>({});
    const [search, setSearch] = useState("");
    const [termFilter, setTermFilter] = useState("");
    const [choiceFilter, setChoiceFilter] = useState("");
    const [departmentPositionFilter, setDepartmentPositionFilter] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [exporting, setExporting] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const response = await fetch("/api/admin/committee-registration", { cache: "no-store" });
            if (!response.ok) throw new Error(await readError(response, "Unable to load registrations."));
            const body = (await response.json()) as {
                config: RegistrationConfig;
                applications: CommitteeApplication[];
            };
            setConfig(body.config);
            setApplications(body.applications);
            setTermFilter((current) => current || body.config.term);
        } catch (error) {
            notifications.error(error instanceof Error ? error.message : "Unable to load registrations.", "Registrations unavailable");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void load();
    }, [load]);

    const saveConfig = async (event: FormEvent) => {
        event.preventDefault();
        setSavingConfig(true);
        try {
            const response = await fetch("/api/admin/committee-registration", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(config),
            });
            if (!response.ok) throw new Error(await readError(response, "Unable to save registration settings."));
            const body = (await response.json()) as { config: RegistrationConfig };
            setConfig(body.config);
            setTermFilter(body.config.term);
            notifications.success(body.config.is_open ? "Registration form is open to the public." : "Registration form is closed.", "Settings saved");
        } catch (error) {
            notifications.error(error instanceof Error ? error.message : "Unable to save registration settings.", "Save failed");
        } finally {
            setSavingConfig(false);
        }
    };

    const updateApplication = async (application: CommitteeApplication, update: { status?: ApplicationStatus; admin_notes?: string }) => {
        setBusyId(application.id);
        try {
            const response = await fetch("/api/admin/committee-registration", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: application.id, ...update }),
            });
            if (!response.ok) throw new Error(await readError(response, "Unable to update application."));
            const body = (await response.json()) as Partial<CommitteeApplication>;
            setApplications((current) => current.map((item) => item.id === application.id ? { ...item, ...update, updated_at: body.updated_at || item.updated_at } : item));
            notifications.success(`${application.full_name}'s application was updated.`, "Application updated");
        } catch (error) {
            notifications.error(error instanceof Error ? error.message : "Unable to update application.", "Update failed");
        } finally {
            setBusyId("");
        }
    };

    const deleteApplication = async (application: CommitteeApplication) => {
        if (!window.confirm(`Delete the application from ${application.full_name}? This cannot be undone.`)) return;
        setBusyId(application.id);
        try {
            const response = await fetch("/api/admin/committee-registration", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: application.id }),
            });
            if (!response.ok) throw new Error(await readError(response, "Unable to delete application."));
            setApplications((current) => current.filter((item) => item.id !== application.id));
            notifications.success("The application was deleted.", "Application deleted");
        } catch (error) {
            notifications.error(error instanceof Error ? error.message : "Unable to delete application.", "Delete failed");
        } finally {
            setBusyId("");
        }
    };

    const terms = useMemo(() => [...new Set(applications.map((application) => application.term))].filter(Boolean), [applications]);

    const filtered = useMemo(() => {
        const query = search.trim().toLowerCase();
        return applications.filter((application) => {
            if (termFilter && application.term !== termFilter) return false;
            if (choiceFilter && application.first_choice !== choiceFilter && application.second_choice !== choiceFilter) return false;
            if (statusFilter && application.status !== statusFilter) return false;
            if (departmentPositionFilter && application.department_position !== departmentPositionFilter) return false;
            if (!query) return true;
            return [application.full_name, application.student_email, application.personal_email, application.student_id, application.phone, application.programme, application.nationality]
                .some((value) => (value || "").toLowerCase().includes(query));
        });
    }, [applications, search, termFilter, choiceFilter, statusFilter, departmentPositionFilter]);

    const grouped = useMemo(() => groupByFirstChoice(filtered), [filtered]);

    const counts = useMemo(() => {
        const scoped = applications.filter((application) => !termFilter || application.term === termFilter);
        return {
            total: scoped.length,
            shortlisted: scoped.filter((application) => application.status === "shortlisted").length,
            pending: scoped.filter((application) => application.status === "pending").length,
            accepted: scoped.filter((application) => application.status === "accepted").length,
        };
    }, [applications, termFilter]);

    const exportExcel = async () => {
        setExporting(true);
        try {
            const response = await fetch("/api/admin/committee-registration/export", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                // Export exactly what the filters show, in the same order.
                body: JSON.stringify({ ids: grouped.flatMap((group) => group.applications.map((application) => application.id)), term: termFilter }),
            });
            if (!response.ok) throw new Error(await readError(response, "Unable to export applications."));
            const fileName = /filename="([^"]+)"/.exec(response.headers.get("Content-Disposition") || "")?.[1] || "committee-applications.xlsx";
            const url = URL.createObjectURL(await response.blob());
            const link = document.createElement("a");
            link.href = url;
            link.download = fileName;
            link.click();
            URL.revokeObjectURL(url);
        } catch (error) {
            notifications.error(error instanceof Error ? error.message : "Unable to export applications.", "Export failed");
        } finally {
            setExporting(false);
        }
    };

    const toggleTopPosition = (position: TopPosition, open: boolean) => {
        setConfig((current) => ({
            ...current,
            open_top_positions: TOP_POSITIONS.filter((item) => item === position ? open : current.open_top_positions.includes(item)),
        }));
    };

    // Each department keeps its own list, so opening a position in one
    // department leaves every other department as it was.
    const toggleDepartmentPosition = (department: Department, position: DepartmentPosition, open: boolean) => {
        setConfig((current) => ({
            ...current,
            open_department_positions: {
                ...current.open_department_positions,
                [department]: DEPARTMENT_POSITIONS.filter((item) =>
                    item === position ? open : current.open_department_positions[department].includes(item)),
            },
        }));
    };

    const deadlinePassed = isPastDeadline(config.deadline);
    const openCount = countOpenPositions(config);

    return (
        <>
            <AdminTopbar title="Committee Registration" />
            <div className="flex-1 p-4 sm:p-6 lg:p-8">
                <div className="max-w-6xl space-y-6">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                            <h2 className="text-xl font-bold text-[var(--dark)]">New committee registration</h2>
                            <p className="mt-1 text-sm text-[var(--gray)]">
                                Open or close the public form, choose which positions take applications, and review everyone who applied. Applicants are listed under their first choice.
                            </p>
                        </div>
                        <a href="/join" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--primary)] hover:underline">
                            View public form <ExternalLink className="h-4 w-4" />
                        </a>
                    </div>

                    {loading ? (
                        <div className="flex items-center justify-center rounded-2xl border border-gray-100 bg-white p-12 shadow-sm"><Loader2 className="h-6 w-6 animate-spin text-[var(--primary)]" /></div>
                    ) : (
                        <>
                            <form onSubmit={saveConfig} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:p-6">
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                    <h3 className="font-bold text-[var(--dark)]">Form settings</h3>
                                    <span className={cn("rounded-full px-3 py-1 text-xs font-semibold", config.is_open && !deadlinePassed && openCount > 0 ? "bg-green-50 text-green-700" : "bg-gray-100 text-[var(--gray)]")}>
                                        {config.is_open ? (deadlinePassed ? "Open but deadline passed" : openCount > 0 ? "Accepting applications" : "Open but no positions open") : "Closed"}
                                    </span>
                                </div>

                                <div className="mt-5 grid gap-3 lg:grid-cols-2">
                                    <Toggle
                                        checked={config.is_open}
                                        onChange={(is_open) => setConfig((current) => ({ ...current, is_open }))}
                                        label="Open registration to the public"
                                        description="Shows the form at /join and a “Join Us” link in the site menu."
                                    />
                                </div>

                                <fieldset className="mt-5">
                                    <legend className="text-sm font-bold text-[var(--dark)]">
                                        Positions open for applications <span className="font-normal text-[var(--gray)]">({openCount} open)</span>
                                    </legend>
                                    <p className="mt-1 text-xs text-[var(--gray)]">
                                        Applicants can only choose what is ticked here. Nothing is open until you open it, and each department is set on its own.
                                    </p>

                                    <p className="mb-2 mt-4 text-xs font-semibold text-[var(--dark)]">Top Committee</p>
                                    <div className="flex flex-wrap gap-2">
                                        {TOP_POSITIONS.map((position) => {
                                            const open = config.open_top_positions.includes(position);
                                            return (
                                                <label key={position} className={chipClassName(open)}>
                                                    <input type="checkbox" checked={open} onChange={(event) => toggleTopPosition(position, event.target.checked)} className="accent-[var(--primary)]" />
                                                    {POSITION_LABELS[position]}
                                                </label>
                                            );
                                        })}
                                    </div>

                                    <p className="mb-2 mt-4 text-xs font-semibold text-[var(--dark)]">Departments</p>
                                    <div className="divide-y divide-gray-100 rounded-xl border border-gray-100">
                                        {DEPARTMENTS.map((department) => (
                                            <fieldset key={department} className="flex flex-col gap-2 p-3 lg:flex-row lg:items-center lg:gap-4">
                                                <legend className="sr-only">{POSITION_LABELS[department]}</legend>
                                                <p aria-hidden="true" className="text-xs font-semibold text-[var(--dark)] lg:w-64 lg:flex-shrink-0">{POSITION_LABELS[department]}</p>
                                                <div className="flex flex-wrap gap-2">
                                                    {DEPARTMENT_POSITIONS.map((position) => {
                                                        const open = config.open_department_positions[department].includes(position);
                                                        return (
                                                            <label key={position} className={chipClassName(open)}>
                                                                <input type="checkbox" checked={open} onChange={(event) => toggleDepartmentPosition(department, position, event.target.checked)} className="accent-[var(--primary)]" />
                                                                {DEPARTMENT_POSITION_LABELS[position]}
                                                            </label>
                                                        );
                                                    })}
                                                </div>
                                            </fieldset>
                                        ))}
                                    </div>
                                </fieldset>

                                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                                    <div>
                                        <label htmlFor="term" className="mb-1.5 block text-xs font-semibold text-[var(--dark)]">Committee term</label>
                                        <input id="term" value={config.term} maxLength={50} onChange={(event) => setConfig((current) => ({ ...current, term: event.target.value }))} placeholder="e.g. 2026/2027" className={inputClassName} />
                                    </div>
                                    <div>
                                        <label htmlFor="deadline" className="mb-1.5 block text-xs font-semibold text-[var(--dark)]">Deadline (optional)</label>
                                        <input id="deadline" type="date" value={config.deadline} onChange={(event) => setConfig((current) => ({ ...current, deadline: event.target.value }))} className={inputClassName} />
                                    </div>
                                    <div className="sm:col-span-2">
                                        <label htmlFor="intro" className="mb-1.5 block text-xs font-semibold text-[var(--dark)]">Introduction shown on the form (optional)</label>
                                        <textarea id="intro" rows={3} maxLength={2000} value={config.intro} onChange={(event) => setConfig((current) => ({ ...current, intro: event.target.value }))} placeholder="Explain the term, expectations and the selection process." className={`${inputClassName} resize-y`} />
                                    </div>
                                </div>

                                <button type="submit" disabled={savingConfig} className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--primary-dark)] disabled:opacity-60">
                                    {savingConfig ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                    Save settings
                                </button>
                            </form>

                            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                                {[
                                    { label: "Applications", value: counts.total },
                                    { label: "Pending review", value: counts.pending },
                                    { label: "Shortlisted", value: counts.shortlisted },
                                    { label: "Accepted", value: counts.accepted },
                                ].map((stat) => (
                                    <div key={stat.label} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                                        <p className="text-2xl font-bold text-[var(--dark)]">{stat.value}</p>
                                        <p className="text-xs text-[var(--gray)]">{stat.label}</p>
                                    </div>
                                ))}
                            </div>

                            <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
                                <div className="flex flex-col gap-3 border-b border-gray-100 px-5 py-4 sm:px-6">
                                    <div className="flex items-center justify-between gap-3">
                                        <h3 className="font-bold text-[var(--dark)]">Applicants <span className="font-normal text-[var(--gray)]">({filtered.length})</span></h3>
                                        <button type="button" onClick={() => void exportExcel()} disabled={filtered.length === 0 || exporting} className="inline-flex items-center gap-2 rounded-lg border border-[var(--primary)]/30 px-3 py-2 text-xs font-semibold text-[var(--primary)] transition hover:bg-[var(--primary)]/5 disabled:opacity-50">
                                            {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                                            {exporting ? "Preparing Excel..." : "Export Excel (with photos)"}
                                        </button>
                                    </div>
                                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
                                        <div className="relative lg:col-span-1">
                                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--gray)]" />
                                            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, email, ID" className={`${inputClassName} py-2.5 pl-9`} />
                                        </div>
                                        <select value={termFilter} onChange={(event) => setTermFilter(event.target.value)} className={`${inputClassName} py-2.5`} aria-label="Filter by term">
                                            <option value="">All terms</option>
                                            {[...new Set([config.term, ...terms])].filter(Boolean).map((term) => <option key={term} value={term}>{term}</option>)}
                                        </select>
                                        <select value={choiceFilter} onChange={(event) => setChoiceFilter(event.target.value)} className={`${inputClassName} py-2.5`} aria-label="Filter by first or second choice">
                                            <option value="">All choices</option>
                                            {APPLIED_POSITIONS.map((choice) => <option key={choice} value={choice}>{POSITION_LABELS[choice]}</option>)}
                                        </select>
                                        <select value={departmentPositionFilter} onChange={(event) => setDepartmentPositionFilter(event.target.value)} className={`${inputClassName} py-2.5`} aria-label="Filter by department position">
                                            <option value="">All department positions</option>
                                            {DEPARTMENT_POSITIONS.map((position) => <option key={position} value={position}>{DEPARTMENT_POSITION_LABELS[position]}</option>)}
                                        </select>
                                        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className={`${inputClassName} py-2.5`} aria-label="Filter by status">
                                            <option value="">All statuses</option>
                                            {APPLICATION_STATUSES.map((status) => <option key={status} value={status}>{STATUS_LABELS[status]}</option>)}
                                        </select>
                                    </div>
                                </div>

                                {filtered.length === 0 ? (
                                    <div className="flex flex-col items-center gap-2 p-12 text-center">
                                        <UserPlus className="h-8 w-8 text-gray-300" />
                                        <p className="text-sm text-[var(--gray)]">{applications.length ? "No applications match these filters." : "No applications yet."}</p>
                                    </div>
                                ) : (
                                    <div>
                                        {grouped.map((group) => (
                                        <section key={group.position} aria-label={group.position}>
                                        <h4 className="border-y border-gray-100 bg-[var(--light)] px-5 py-2 text-xs font-bold uppercase tracking-wide text-[var(--dark)] sm:px-6">
                                            {group.position} <span className="font-normal text-[var(--gray)]">({group.applications.length})</span>
                                        </h4>
                                        <div className="divide-y divide-gray-100">
                                        {group.applications.map((application) => {
                                            const expanded = expandedId === application.id;
                                            const notes = notesDraft[application.id] ?? application.admin_notes;
                                            return (
                                                <div key={application.id}>
                                                    <button type="button" onClick={() => setExpandedId(expanded ? "" : application.id)} className="flex w-full flex-col gap-2 px-5 py-4 text-left transition hover:bg-[var(--light)]/60 sm:flex-row sm:items-center sm:gap-4 sm:px-6" aria-expanded={expanded}>
                                                        <div className="flex min-w-0 flex-1 items-center gap-3">
                                                            <div className="relative flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--primary)]/10 font-bold text-[var(--primary)]">
                                                                {application.photo_path ? (
                                                                    // eslint-disable-next-line @next/next/no-img-element -- private, session-authenticated image route
                                                                    <img src={photoUrl(application)} alt="" loading="lazy" className="h-full w-full object-cover" />
                                                                ) : application.full_name.charAt(0).toUpperCase()}
                                                            </div>
                                                            <div className="min-w-0">
                                                                <p className="truncate text-sm font-semibold text-[var(--dark)]">{application.full_name}</p>
                                                                <p className="truncate text-xs text-[var(--gray)]">{application.student_email} · {application.phone}</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex flex-wrap items-center gap-2 text-xs sm:justify-end">
                                                            <span className="rounded-full bg-gray-100 px-2.5 py-1 font-medium text-[var(--dark)]">
                                                                {roleLabel(application)}
                                                            </span>
                                                            <span className={cn("rounded-full px-2.5 py-1 font-semibold", STATUS_STYLES[application.status])}>{STATUS_LABELS[application.status]}</span>
                                                            <ChevronDown className={cn("h-4 w-4 text-[var(--gray)] transition", expanded && "rotate-180")} />
                                                        </div>
                                                    </button>

                                                    {expanded && (
                                                        <div className="space-y-5 bg-[var(--light)]/50 px-5 pb-5 pt-1 sm:px-6">
                                                            <div className="flex flex-col gap-5 sm:flex-row">
                                                            {application.photo_path && (
                                                                <div className="flex flex-shrink-0 flex-col items-start gap-2">
                                                                    <a href={photoUrl(application)} target="_blank" rel="noopener noreferrer" className="block h-36 w-28 overflow-hidden rounded-xl border border-gray-200 bg-white">
                                                                        {/* eslint-disable-next-line @next/next/no-img-element -- private, session-authenticated image route */}
                                                                        <img src={photoUrl(application)} alt={`Photo of ${application.full_name}`} className="h-full w-full object-cover" />
                                                                    </a>
                                                                    <a href={photoUrl(application, true)} className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--primary)] hover:underline">
                                                                        <ImageDown className="h-4 w-4" /> Download photo
                                                                    </a>
                                                                </div>
                                                            )}
                                                            <dl className="grid flex-1 content-start gap-x-6 gap-y-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
                                                                {/* Answers that were not given, or that an earlier form never asked, are left out. */}
                                                                {[
                                                                    ["Student email", application.student_email],
                                                                    ["Personal email", application.personal_email],
                                                                    ["Contact number", application.phone],
                                                                    ["Student ID", application.student_id],
                                                                    ["Nationality", application.nationality],
                                                                    ["Level of education", label(EDUCATION_LEVEL_LABELS, application.education_level)],
                                                                    ["Year of study", application.year_of_study],
                                                                    ["School, programme & cohort", application.programme],
                                                                    ["Position (earlier form)", label(LEGACY_POSITION_LABELS, application.position)],
                                                                    ["Current committee record", [application.current_member_name, application.current_member_role].filter(Boolean).join(" · ")],
                                                                    ["First choice", application.first_choice_name],
                                                                    ["Second choice", application.second_choice_name],
                                                                    ["Department position", label(DEPARTMENT_POSITION_LABELS, application.department_position)],
                                                                    ["Joined our programs", label(JOINED_PROGRAMS_LABELS, application.joined_programs)],
                                                                    ["Accepts another position", label(YES_NO_LABELS, application.accept_other_position)],
                                                                    ["If also serving another club", label(OTHER_CLUB_COMMITMENT_LABELS, application.other_club_commitment)],
                                                                    ["Term", application.term],
                                                                    ["Submitted", formatDate(application.created_at)],
                                                                ].filter(([, value]) => value).map(([name, value]) => (
                                                                    <div key={name}>
                                                                        <dt className="text-xs font-medium text-[var(--gray)]">{name}</dt>
                                                                        <dd className="mt-0.5 break-words text-[var(--dark)]">{value}</dd>
                                                                    </div>
                                                                ))}
                                                            </dl>
                                                            </div>
                                                            {[
                                                                ["What they know about Al-Qisc", application.about_alqisc],
                                                                ["Al-Qisc programs they joined", application.programs_joined],
                                                                ["Committee experience", application.experience],
                                                                ["What makes them suitable and motivates them", application.motivation],
                                                            ].filter(([, value]) => value).map(([name, value]) => (
                                                                <div key={name}>
                                                                    <p className="text-xs font-medium text-[var(--gray)]">{name}</p>
                                                                    <p className="mt-1 whitespace-pre-line break-words text-sm leading-6 text-[var(--dark)]">{value}</p>
                                                                </div>
                                                            ))}
                                                            {application.document_path && (
                                                                <a href={documentUrl(application)} className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--primary)] hover:underline">
                                                                    <FileDown className="h-4 w-4" /> Download supporting document{application.document_name ? ` (${application.document_name})` : ""}
                                                                </a>
                                                            )}
                                                            <div className="grid gap-3 lg:grid-cols-[200px_1fr]">
                                                                <div>
                                                                    <label htmlFor={`status-${application.id}`} className="mb-1.5 block text-xs font-semibold text-[var(--dark)]">Status</label>
                                                                    <select id={`status-${application.id}`} value={application.status} disabled={busyId === application.id} onChange={(event) => void updateApplication(application, { status: event.target.value as ApplicationStatus })} className={`${inputClassName} bg-white py-2.5`}>
                                                                        {APPLICATION_STATUSES.map((status) => <option key={status} value={status}>{STATUS_LABELS[status]}</option>)}
                                                                    </select>
                                                                </div>
                                                                <div>
                                                                    <label htmlFor={`notes-${application.id}`} className="mb-1.5 block text-xs font-semibold text-[var(--dark)]">Internal notes</label>
                                                                    <textarea id={`notes-${application.id}`} rows={2} maxLength={3000} value={notes} onChange={(event) => setNotesDraft((current) => ({ ...current, [application.id]: event.target.value }))} placeholder="Interview notes, follow-ups..." className={`${inputClassName} resize-y bg-white`} />
                                                                </div>
                                                            </div>
                                                            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                                                                <button type="button" onClick={() => void deleteApplication(application)} disabled={busyId === application.id} className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-60">
                                                                    <Trash2 className="h-4 w-4" /> Delete
                                                                </button>
                                                                <button type="button" onClick={() => void updateApplication(application, { admin_notes: notes })} disabled={busyId === application.id || notes === application.admin_notes} className="inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--primary)] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[var(--primary-dark)] disabled:opacity-60">
                                                                    {busyId === application.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save notes
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                        </div>
                                        </section>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </>
    );
}
