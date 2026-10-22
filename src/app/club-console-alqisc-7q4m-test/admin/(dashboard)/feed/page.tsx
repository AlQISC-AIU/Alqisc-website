"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
    Archive,
    ArchiveRestore,
    Calendar,
    Edit3,
    ExternalLink,
    Instagram,
    Loader2,
    Lock,
    Megaphone,
    Plus,
    Search,
    Settings2,
    Trash2,
    Youtube,
} from "lucide-react";
import { AdminTopbar } from "@/components/admin/admin-layout";
import { notifications } from "@/components/ui/notification-provider";
import { adminPath } from "@/lib/admin-routes";
import {
    formatEventDate,
    isSocialKind,
    isUpcoming,
    pickText,
    type FeedItem,
    type FeedKind,
    type FeedStatus,
} from "@/lib/feed";
import { deleteFeedItem, fetchFeed, updateSocialPost } from "@/lib/feed-client";
import { deleteImageAction } from "@/lib/firebase/storage";

const KIND_FILTERS: { id: "all" | FeedKind; label: string }[] = [
    { id: "all", label: "All" },
    { id: "event", label: "Events" },
    { id: "announcement", label: "Announcements" },
    { id: "instagram", label: "Instagram" },
    { id: "youtube", label: "YouTube" },
];

const STATUS_FILTERS: { id: "all" | FeedStatus; label: string }[] = [
    { id: "all", label: "Any status" },
    { id: "published", label: "Published" },
    { id: "draft", label: "Drafts" },
    { id: "archived", label: "Archived" },
];

const KIND_ICONS: Record<FeedKind, typeof Calendar> = {
    event: Calendar,
    announcement: Megaphone,
    instagram: Instagram,
    youtube: Youtube,
};

const KIND_LABELS: Record<FeedKind, string> = {
    event: "Event",
    announcement: "Announcement",
    instagram: "Instagram",
    youtube: "YouTube",
};

const STATUS_STYLES: Record<FeedStatus, string> = {
    published: "bg-green-50 text-green-700",
    draft: "bg-amber-50 text-amber-700",
    archived: "bg-gray-100 text-gray-500",
};

function itemDate(item: FeedItem): string {
    return formatEventDate(item.kind === "event" ? item.starts_at || "" : item.published_at || "");
}

function Thumbnail({ item, size }: { item: FeedItem; size: string }) {
    const Icon = KIND_ICONS[item.kind];
    return (
        <div className={`relative ${size} rounded-lg overflow-hidden bg-gray-100 flex-shrink-0`}>
            {item.thumbnail_url ? (
                // Instagram and YouTube thumbnails come from their own CDNs, which
                // next/image is not configured for, so use a plain img here.
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.thumbnail_url} alt="" loading="lazy" className="h-full w-full object-cover" />
            ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <Icon className="w-5 h-5" />
                </div>
            )}
        </div>
    );
}

export default function FeedPage() {
    const [items, setItems] = useState<FeedItem[]>([]);
    const [limit, setLimit] = useState(0);
    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState("");
    const [kindFilter, setKindFilter] = useState<"all" | FeedKind>("all");
    const [statusFilter, setStatusFilter] = useState<"all" | FeedStatus>("all");
    const [search, setSearch] = useState("");
    const [busyId, setBusyId] = useState<string | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<FeedItem | null>(null);
    const [priorityTarget, setPriorityTarget] = useState<FeedItem | null>(null);
    const [priorityValue, setPriorityValue] = useState("0");

    const load = useCallback(async () => {
        setLoading(true);
        setErrorMessage("");
        try {
            const result = await fetchFeed();
            setItems(result.items);
            setLimit(result.limit);
        } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : "The feed could not be loaded.");
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        const timer = window.setTimeout(() => void load(), 0);
        return () => window.clearTimeout(timer);
    }, [load]);

    const filtered = useMemo(() => {
        const query = search.trim().toLowerCase();
        return items.filter((item) =>
            (kindFilter === "all" || item.kind === kindFilter) &&
            (statusFilter === "all" || item.status === statusFilter) &&
            (!query || pickText(item.title).toLowerCase().includes(query))
        );
    }, [items, kindFilter, statusFilter, search]);

    const counts = useMemo(() => ({
        published: items.filter((item) => item.status === "published").length,
        drafts: items.filter((item) => item.status === "draft").length,
        upcoming: items.filter((item) => item.kind === "event" && item.status === "published" && isUpcoming(item)).length,
    }), [items]);

    function replaceItem(updated: FeedItem) {
        setItems((current) => current.map((item) => (item.id === updated.id ? updated : item)));
    }

    async function setSocialStatus(item: FeedItem, status: "published" | "archived") {
        setBusyId(item.id);
        try {
            replaceItem(await updateSocialPost(item.id, { status }));
            notifications.success(
                status === "archived" ? "Hidden from the app. The importer will leave it archived." : "Back in the app.",
                status === "archived" ? "Archived" : "Republished",
            );
        } catch (error) {
            notifications.error(error instanceof Error ? error.message : "The post could not be updated.", "Not updated");
        }
        setBusyId(null);
    }

    async function unlock(item: FeedItem) {
        setBusyId(item.id);
        try {
            replaceItem(await updateSocialPost(item.id, { admin_locked: false }));
            notifications.success("The importer manages this post again.", "Unlocked");
        } catch (error) {
            notifications.error(error instanceof Error ? error.message : "The post could not be updated.", "Not updated");
        }
        setBusyId(null);
    }

    async function savePriority() {
        if (!priorityTarget) return;
        const value = Number.parseInt(priorityValue, 10);
        setBusyId(priorityTarget.id);
        try {
            replaceItem(await updateSocialPost(priorityTarget.id, { priority: Number.isFinite(value) ? value : 0 }));
            notifications.success("Priority saved.", "Saved");
            setPriorityTarget(null);
        } catch (error) {
            notifications.error(error instanceof Error ? error.message : "The priority could not be saved.", "Not saved");
        }
        setBusyId(null);
    }

    async function confirmDelete() {
        if (!deleteTarget) return;
        setBusyId(deleteTarget.id);
        try {
            const removed = await deleteFeedItem(deleteTarget.id);
            if (removed.thumbnail_url) await deleteImageAction(removed.thumbnail_url).catch(() => undefined);
            setItems((current) => current.filter((item) => item.id !== removed.id));
            notifications.success("Removed from the website and the app.", "Deleted");
            setDeleteTarget(null);
        } catch (error) {
            notifications.error(error instanceof Error ? error.message : "The item could not be deleted.", "Not deleted");
        }
        setBusyId(null);
    }

    function actionsFor(item: FeedItem) {
        const busy = busyId === item.id;
        const button = "p-2 text-[var(--gray)] rounded-lg transition-colors disabled:opacity-50";
        if (!isSocialKind(item.kind)) {
            return (
                <div className="flex items-center justify-end gap-1">
                    <Link href={adminPath(`/feed/${item.id}/edit`)} className={`${button} hover:text-[var(--primary)] hover:bg-[var(--primary)]/10`} title="Edit">
                        <Edit3 className="w-4 h-4" />
                    </Link>
                    <button type="button" onClick={() => setDeleteTarget(item)} disabled={busy} className={`${button} hover:text-red-500 hover:bg-red-50`} title="Delete">
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            );
        }
        return (
            <div className="flex items-center justify-end gap-1">
                {item.permalink ? (
                    <a href={item.permalink} target="_blank" rel="noreferrer" className={`${button} hover:text-[var(--primary)] hover:bg-[var(--primary)]/10`} title="Open post">
                        <ExternalLink className="w-4 h-4" />
                    </a>
                ) : null}
                <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                        setPriorityTarget(item);
                        setPriorityValue(String(item.priority));
                    }}
                    className={`${button} text-xs font-semibold hover:text-[var(--primary)] hover:bg-[var(--primary)]/10`}
                    title="Change priority"
                >
                    P{item.priority}
                </button>
                {item.status === "archived" ? (
                    <button type="button" disabled={busy} onClick={() => void setSocialStatus(item, "published")} className={`${button} hover:text-green-600 hover:bg-green-50`} title="Republish">
                        <ArchiveRestore className="w-4 h-4" />
                    </button>
                ) : (
                    <button type="button" disabled={busy} onClick={() => void setSocialStatus(item, "archived")} className={`${button} hover:text-red-500 hover:bg-red-50`} title="Archive">
                        <Archive className="w-4 h-4" />
                    </button>
                )}
                {item.admin_locked ? (
                    <button type="button" disabled={busy} onClick={() => void unlock(item)} className={`${button} hover:text-[var(--primary)] hover:bg-[var(--primary)]/10`} title="Let the importer manage this post again">
                        <Lock className="w-4 h-4" />
                    </button>
                ) : null}
            </div>
        );
    }

    function badgesFor(item: FeedItem) {
        return (
            <div className="flex flex-wrap items-center gap-1.5 mt-1">
                <span className="text-[11px] font-medium text-[var(--gray)]">{KIND_LABELS[item.kind]}</span>
                <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-md capitalize ${STATUS_STYLES[item.status]}`}>{item.status}</span>
                {item.priority > 0 ? (
                    <span className="px-2 py-0.5 text-[10px] font-semibold rounded-md bg-[var(--secondary)]/20 text-[var(--dark)]">Pinned · {item.priority}</span>
                ) : null}
                {item.admin_locked ? (
                    <span className="px-2 py-0.5 text-[10px] font-semibold rounded-md bg-blue-50 text-blue-700">Kept by admin</span>
                ) : null}
            </div>
        );
    }

    return (
        <>
            <AdminTopbar title="Events & Feed" />

            <div className="flex-1 p-4 sm:p-6 lg:p-8">
                {errorMessage ? (
                    <div role="alert" className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        <span>{errorMessage}</span>
                        <button type="button" onClick={() => void load()} className="font-semibold underline">Retry</button>
                    </div>
                ) : null}

                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 mb-6">
                    <div>
                        <h2 className="text-xl sm:text-2xl font-bold text-[var(--dark)]">Events &amp; Feed</h2>
                        <p className="text-sm text-[var(--gray)] mt-1">
                            Everything published here shows in the mobile app and on the website.
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2" data-tour="feed-add">
                        <Link href={adminPath("/feed/new?kind=event")} className="inline-flex items-center gap-2 px-4 py-2.5 bg-[var(--primary)] text-white text-sm font-semibold rounded-xl hover:bg-[var(--primary-dark)] transition-all shadow-sm">
                            <Plus className="w-4 h-4" />
                            New event
                        </Link>
                        <Link href={adminPath("/feed/new?kind=announcement")} className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-[var(--dark)] text-sm font-semibold rounded-xl hover:bg-gray-50 transition-all">
                            <Megaphone className="w-4 h-4" />
                            New announcement
                        </Link>
                        <Link href={adminPath("/feed/sources")} className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-[var(--dark)] text-sm font-semibold rounded-xl hover:bg-gray-50 transition-all">
                            <Settings2 className="w-4 h-4" />
                            Instagram &amp; YouTube
                        </Link>
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-3 mb-6">
                    {[
                        { label: "Published", value: counts.published },
                        { label: "Drafts", value: counts.drafts },
                        { label: "Upcoming events", value: counts.upcoming },
                    ].map((card) => (
                        <div key={card.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3">
                            <p className="text-xs font-medium text-[var(--gray)]">{card.label}</p>
                            <p className="text-2xl font-bold text-[var(--dark)] tabular-nums">{loading ? "–" : card.value}</p>
                        </div>
                    ))}
                </div>

                <div data-tour="feed-filters" className="flex flex-col xl:flex-row gap-3 mb-6">
                    <div className="flex flex-wrap gap-1 bg-white rounded-xl p-1 border border-gray-100 shadow-sm">
                        {KIND_FILTERS.map((filter) => (
                            <button
                                key={filter.id}
                                type="button"
                                onClick={() => setKindFilter(filter.id)}
                                className={`px-3 py-2 text-sm font-medium rounded-lg transition-all ${kindFilter === filter.id ? "bg-[var(--primary)] text-white shadow-sm" : "text-[var(--gray)] hover:text-[var(--dark)] hover:bg-gray-50"}`}
                            >
                                {filter.label}
                            </button>
                        ))}
                    </div>
                    <select
                        aria-label="Filter by status"
                        value={statusFilter}
                        onChange={(event) => setStatusFilter(event.target.value as "all" | FeedStatus)}
                        className="px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm"
                    >
                        {STATUS_FILTERS.map((filter) => (
                            <option key={filter.id} value={filter.id}>{filter.label}</option>
                        ))}
                    </select>
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            aria-label="Search by title"
                            placeholder="Search by title..."
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30 focus:border-[var(--primary)] transition-all"
                        />
                    </div>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-16">
                        <Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" />
                    </div>
                ) : (
                    <>
                        <div className="hidden md:block bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-gray-100">
                                        <th className="text-left text-xs font-semibold uppercase tracking-wider text-[var(--gray)] px-6 py-4">Item</th>
                                        <th className="text-left text-xs font-semibold uppercase tracking-wider text-[var(--gray)] px-4 py-4">Date</th>
                                        <th className="text-right text-xs font-semibold uppercase tracking-wider text-[var(--gray)] px-6 py-4">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.map((item) => (
                                        <tr key={item.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
                                            <td className="px-6 py-3">
                                                <div className="flex items-center gap-3">
                                                    <Thumbnail item={item} size="w-12 h-12" />
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-semibold text-[var(--dark)] line-clamp-1">{pickText(item.title)}</p>
                                                        {badgesFor(item)}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-[var(--gray)] whitespace-nowrap">{itemDate(item)}</td>
                                            <td className="px-6 py-3">{actionsFor(item)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {filtered.length === 0 ? (
                                <div className="text-center py-12">
                                    <p className="text-[var(--gray)]">Nothing matches these filters.</p>
                                </div>
                            ) : null}
                        </div>

                        <div className="md:hidden space-y-3">
                            {filtered.map((item) => (
                                <div key={item.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                                    <div className="flex gap-3">
                                        <Thumbnail item={item} size="w-16 h-16" />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-[var(--dark)] leading-tight line-clamp-2">{pickText(item.title)}</p>
                                            {badgesFor(item)}
                                            <div className="flex items-center justify-between mt-2">
                                                <span className="text-xs text-[var(--gray)]">{itemDate(item)}</span>
                                                {actionsFor(item)}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {filtered.length === 0 ? (
                                <div className="text-center py-12 bg-white rounded-xl">
                                    <p className="text-[var(--gray)]">Nothing matches these filters.</p>
                                </div>
                            ) : null}
                        </div>

                        {items.length >= limit && limit > 0 ? (
                            <p className="mt-4 text-xs text-[var(--gray)]">Showing the newest {limit} items. Older archived posts are kept but not listed.</p>
                        ) : null}
                    </>
                )}
            </div>

            {deleteTarget ? (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="feed-delete-title">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6">
                        <h3 id="feed-delete-title" className="text-lg font-bold text-[var(--dark)] mb-2">Delete this {KIND_LABELS[deleteTarget.kind].toLowerCase()}?</h3>
                        <p className="text-sm text-[var(--gray)] mb-6">
                            &quot;{pickText(deleteTarget.title)}&quot; will be removed from the website and the app. To hide it but keep it, edit it and choose Archived.
                        </p>
                        <div className="flex gap-3">
                            <button type="button" onClick={() => setDeleteTarget(null)} className="flex-1 px-4 py-2.5 text-sm font-semibold text-[var(--gray)] bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors">
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={() => void confirmDelete()}
                                disabled={busyId === deleteTarget.id}
                                className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-red-500 rounded-xl hover:bg-red-600 transition-colors disabled:opacity-60"
                            >
                                {busyId === deleteTarget.id ? "Deleting..." : "Delete"}
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}

            {priorityTarget ? (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="feed-priority-title">
                    <form
                        className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6"
                        onSubmit={(event) => {
                            event.preventDefault();
                            void savePriority();
                        }}
                    >
                        <h3 id="feed-priority-title" className="text-lg font-bold text-[var(--dark)] mb-2">Priority</h3>
                        <p className="text-sm text-[var(--gray)] mb-4">
                            0 is normal. Higher numbers pin the post to the top of the app. The importer will keep your choice.
                        </p>
                        <label htmlFor="feed-priority-input" className="sr-only">Priority</label>
                        <input
                            id="feed-priority-input"
                            type="number"
                            min={0}
                            max={100}
                            step={1}
                            value={priorityValue}
                            onChange={(event) => setPriorityValue(event.target.value)}
                            className="w-full px-4 py-3 bg-[var(--light)] border border-gray-200 rounded-xl text-sm mb-6"
                        />
                        <div className="flex gap-3">
                            <button type="button" onClick={() => setPriorityTarget(null)} className="flex-1 px-4 py-2.5 text-sm font-semibold text-[var(--gray)] bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors">
                                Cancel
                            </button>
                            <button type="submit" disabled={busyId === priorityTarget.id} className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-[var(--primary)] rounded-xl hover:bg-[var(--primary-dark)] transition-colors disabled:opacity-60">
                                Save
                            </button>
                        </div>
                    </form>
                </div>
            ) : null}
        </>
    );
}
