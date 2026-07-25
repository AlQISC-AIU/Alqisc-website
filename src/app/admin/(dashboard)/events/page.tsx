"use client";

import { useState, useEffect, useCallback } from "react";
import { AdminTopbar } from "@/components/admin/admin-layout";
import Image from "next/image";
import Link from "next/link";
import {
    Plus,
    Search,
    Edit3,
    Trash2,
    Star,
    Calendar,
    MapPin,
    Loader2,
} from "lucide-react";
import { createClient } from "@/lib/firebase/client";
import { deleteImageAction } from "@/lib/firebase/storage";
import type { Event } from "@/lib/firebase/types";
import { notifications } from "@/components/ui/notification-provider";

const filters = [
    { id: "all", label: "All" },
    { id: "upcoming", label: "Upcoming" },
    { id: "past", label: "Past" },
    { id: "cancelled", label: "Cancelled" },
];

function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString("en-MY", {
        day: "numeric",
        month: "short",
        year: "numeric",
    });
}

export default function EventsPage() {
    const [events, setEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeFilter, setActiveFilter] = useState("all");
    const [search, setSearch] = useState("");
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null);
    const [errorMessage, setErrorMessage] = useState("");

    const fetchEvents = useCallback(async () => {
        setLoading(true);
        setErrorMessage("");
        const firebase = createClient();
        const { data, error } = await firebase
            .from("events")
            .select("*")
            .order("date", { ascending: false });

        if (error) setErrorMessage(error.message);
        else if (data) setEvents(data as Event[]);
        setLoading(false);
    }, []);

    useEffect(() => {
        const timer = window.setTimeout(() => void fetchEvents(), 0);
        return () => window.clearTimeout(timer);
    }, [fetchEvents]);

    const handleDelete = async (id: string) => {
        setDeletingId(id);
        const event = events.find((e) => e.id === id);
        const firebase = createClient();

        // Keep the image available until the database deletion succeeds.
        const { error } = await firebase.from("events").delete().eq("id", id);
        if (!error) {
            if (event?.image_url) {
                await deleteImageAction(event.image_url).catch((imageError) =>
                    console.error("Failed to delete Firebase event image:", imageError)
                );
            }
            setEvents((prev) => prev.filter((e) => e.id !== id));
            notifications.success("The event was deleted successfully.", "Event deleted");
        } else {
            notifications.error(error.message, "Event not deleted");
            setDeletingId(null);
            return;
        }

        setDeletingId(null);
        setShowDeleteModal(null);
    };

    const filtered = events
        .filter((e) => activeFilter === "all" || e.status === activeFilter)
        .filter((e) => e.title.toLowerCase().includes(search.toLowerCase()));

    return (
        <>
            <AdminTopbar title="Events" />

            <div className="flex-1 p-4 sm:p-6 lg:p-8">
                {errorMessage && (
                    <div role="alert" className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        <span>{errorMessage}</span>
                        <button type="button" onClick={() => void fetchEvents()} className="font-semibold underline">Retry</button>
                    </div>
                )}
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
                    <div>
                        <h2 className="text-xl sm:text-2xl font-bold text-[var(--dark)]">
                            Manage Events
                        </h2>
                        <p className="text-sm text-[var(--gray)] mt-1">
                            {events.length} events total · {events.filter((e) => e.status === "upcoming").length} upcoming
                        </p>
                    </div>
                    <Link data-tour="event-add" href="/admin/events/new" className="inline-flex items-center gap-2 px-4 py-2.5 bg-[var(--primary)] text-white text-sm font-semibold rounded-xl hover:bg-[var(--primary-dark)] transition-all shadow-sm self-start sm:self-auto">
                        <Plus className="w-4 h-4" />
                        Add New Event
                    </Link>
                </div>

                {/* Filters & Search */}
                <div data-tour="event-filters" className="flex flex-col sm:flex-row gap-3 mb-6">
                    <div className="flex gap-1 bg-white rounded-xl p-1 border border-gray-100 shadow-sm">
                        {filters.map((f) => (
                            <button
                                key={f.id}
                                onClick={() => setActiveFilter(f.id)}
                                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${activeFilter === f.id
                                    ? "bg-[var(--primary)] text-white shadow-sm"
                                    : "text-[var(--gray)] hover:text-[var(--dark)] hover:bg-gray-50"
                                    }`}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search events..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30 focus:border-[var(--primary)] transition-all"
                        />
                    </div>
                </div>

                {/* Loading State */}
                {loading ? (
                    <div className="flex items-center justify-center py-16">
                        <Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" />
                    </div>
                ) : (
                    <>
                        {/* Events Table — Desktop */}
                        <div className="hidden md:block bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-gray-100">
                                        <th className="text-left text-xs font-semibold uppercase tracking-wider text-[var(--gray)] px-6 py-4">Event</th>
                                        <th className="text-left text-xs font-semibold uppercase tracking-wider text-[var(--gray)] px-4 py-4">Date</th>
                                        <th className="text-left text-xs font-semibold uppercase tracking-wider text-[var(--gray)] px-4 py-4">Location</th>
                                        <th className="text-left text-xs font-semibold uppercase tracking-wider text-[var(--gray)] px-4 py-4">Category</th>
                                        <th className="text-left text-xs font-semibold uppercase tracking-wider text-[var(--gray)] px-4 py-4">Status</th>
                                        <th className="text-right text-xs font-semibold uppercase tracking-wider text-[var(--gray)] px-6 py-4">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.map((event) => (
                                        <tr key={event.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors group">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                                                        {event.image_url ? (
                                                            <Image src={event.image_url} alt={event.title} fill className="object-cover" sizes="48px" />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                                                                <Calendar className="w-5 h-5" />
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-semibold text-[var(--dark)] truncate">{event.title}</p>
                                                        {event.is_featured && (
                                                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-md mt-0.5">
                                                                <Star className="w-3 h-3" /> Featured
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4">
                                                <span className="text-sm text-[var(--gray)]">{formatDate(event.date)}</span>
                                            </td>
                                            <td className="px-4 py-4">
                                                <span className="text-sm text-[var(--gray)]">{event.location}</span>
                                            </td>
                                            <td className="px-4 py-4">
                                                <span className={`inline-block px-2.5 py-1 text-xs font-semibold rounded-lg capitalize ${event.category === "special" ? "bg-purple-50 text-purple-600" : event.category === "monthly" ? "bg-blue-50 text-blue-600" : "bg-emerald-50 text-emerald-600"}`}>
                                                    {event.category}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4">
                                                <span className={`inline-block px-2.5 py-1 text-xs font-semibold rounded-lg ${event.status === "upcoming" ? "bg-green-50 text-green-600" : "bg-gray-100 text-gray-500"}`}>
                                                    {event.status === "upcoming" ? "Upcoming" : event.status === "cancelled" ? "Cancelled" : "Past"}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center justify-end gap-1">
                                                    <Link href={`/admin/events/${event.id}/edit`} className="p-2 text-[var(--gray)] hover:text-[var(--primary)] hover:bg-[var(--primary)]/10 rounded-lg transition-colors" title="Edit">
                                                        <Edit3 className="w-4 h-4" />
                                                    </Link>
                                                    <button onClick={() => setShowDeleteModal(event.id)} className="p-2 text-[var(--gray)] hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Delete">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            {filtered.length === 0 && (
                                <div className="text-center py-12">
                                    <p className="text-[var(--gray)]">No events found.</p>
                                </div>
                            )}
                        </div>

                        {/* Events Cards — Mobile */}
                        <div className="md:hidden space-y-3">
                            {filtered.map((event) => (
                                <div key={event.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                                    <div className="flex gap-3">
                                        <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                                            {event.image_url ? (
                                                <Image src={event.image_url} alt={event.title} fill className="object-cover" sizes="64px" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-gray-400">
                                                    <Calendar className="w-6 h-6" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-2">
                                                <p className="text-sm font-semibold text-[var(--dark)] leading-tight">{event.title}</p>
                                                <span className={`flex-shrink-0 px-2 py-0.5 text-[10px] font-semibold rounded-md ${event.status === "upcoming" ? "bg-green-50 text-green-600" : "bg-gray-100 text-gray-500"}`}>
                                                    {event.status === "upcoming" ? "Upcoming" : event.status === "cancelled" ? "Cancelled" : "Past"}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-3 mt-1.5 text-xs text-[var(--gray)]">
                                                <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{formatDate(event.date)}</span>
                                                <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{event.location}</span>
                                            </div>
                                            <div className="flex items-center justify-between mt-2">
                                                <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-md capitalize ${event.category === "special" ? "bg-purple-50 text-purple-600" : event.category === "monthly" ? "bg-blue-50 text-blue-600" : "bg-emerald-50 text-emerald-600"}`}>
                                                    {event.category}
                                                </span>
                                                <div className="flex gap-1">
                                                    <Link href={`/admin/events/${event.id}/edit`} className="p-1.5 text-[var(--gray)] hover:text-[var(--primary)] rounded-lg">
                                                        <Edit3 className="w-4 h-4" />
                                                    </Link>
                                                    <button onClick={() => setShowDeleteModal(event.id)} className="p-1.5 text-[var(--gray)] hover:text-red-500 rounded-lg">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {filtered.length === 0 && (
                                <div className="text-center py-12 bg-white rounded-xl">
                                    <p className="text-[var(--gray)]">No events found.</p>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>

            {/* Delete Confirmation Modal */}
            {showDeleteModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6">
                        <h3 className="text-lg font-bold text-[var(--dark)] mb-2">Delete Event?</h3>
                        <p className="text-sm text-[var(--gray)] mb-6">
                            Are you sure you want to delete &quot;{events.find((e) => e.id === showDeleteModal)?.title}&quot;? This action cannot be undone.
                        </p>
                        <div className="flex gap-3">
                            <button onClick={() => setShowDeleteModal(null)} className="flex-1 px-4 py-2.5 text-sm font-semibold text-[var(--gray)] bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors">
                                Cancel
                            </button>
                            <button
                                onClick={() => handleDelete(showDeleteModal)}
                                disabled={deletingId === showDeleteModal}
                                className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-red-500 rounded-xl hover:bg-red-600 transition-colors disabled:opacity-60"
                            >
                                {deletingId === showDeleteModal ? "Deleting..." : "Yes, Delete"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
