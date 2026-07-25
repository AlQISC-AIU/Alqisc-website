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
    Clock,
    MapPin,
    Users,
    Loader2,
} from "lucide-react";
import { createClient } from "@/lib/firebase/client";
import { deleteImageAction } from "@/lib/firebase/storage";
import type { Class } from "@/lib/firebase/types";
import { notifications } from "@/components/ui/notification-provider";

export default function ClassesPage() {
    const [classes, setClasses] = useState<Class[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null);
    const [errorMessage, setErrorMessage] = useState("");

    const fetchClasses = useCallback(async () => {
        setLoading(true);
        setErrorMessage("");
        const firebase = createClient();
        const { data, error } = await firebase
            .from("classes")
            .select("*")
            .order("created_at", { ascending: false });

        if (error) setErrorMessage(error.message);
        else if (data) setClasses(data as Class[]);
        setLoading(false);
    }, []);

    useEffect(() => {
        const timer = window.setTimeout(() => void fetchClasses(), 0);
        return () => window.clearTimeout(timer);
    }, [fetchClasses]);

    const handleDelete = async (id: string) => {
        setDeletingId(id);
        const cls = classes.find((c) => c.id === id);
        const firebase = createClient();

        // Keep the image available until the database deletion succeeds.
        const { error } = await firebase.from("classes").delete().eq("id", id);
        if (!error) {
            if (cls?.image_url) {
                await deleteImageAction(cls.image_url).catch((imageError) =>
                    console.error("Failed to delete Firebase class image:", imageError)
                );
            }
            setClasses((prev) => prev.filter((c) => c.id !== id));
            notifications.success("The class was deleted successfully.", "Class deleted");
        } else {
            notifications.error(error.message, "Class not deleted");
            setDeletingId(null);
            return;
        }

        setDeletingId(null);
        setShowDeleteModal(null);
    };

    const toggleStatus = async (cls: Class) => {
        const firebase = createClient();
        const tempClasses = [...classes];
        const index = tempClasses.findIndex((c) => c.id === cls.id);

        // Optimistic update
        if (index > -1) {
            tempClasses[index] = { ...cls, is_active: !cls.is_active };
            setClasses(tempClasses);
        }

        const { error } = await firebase
            .from("classes")
            .update({ is_active: !cls.is_active })
            .eq("id", cls.id);

        // Revert on error
        if (error) {
            notifications.error(error.message, "Status not changed");
            fetchClasses();
        }
    };

    const filtered = classes.filter((c) =>
        c.title.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <>
            <AdminTopbar title="Classes" />

            <div className="flex-1 p-4 sm:p-6 lg:p-8">
                {errorMessage && (
                    <div role="alert" className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        <span>{errorMessage}</span>
                        <button type="button" onClick={() => void fetchClasses()} className="font-semibold underline">Retry</button>
                    </div>
                )}
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
                    <div>
                        <h2 className="text-xl sm:text-2xl font-bold text-[var(--dark)]">
                            Manage Classes
                        </h2>
                        <p className="text-sm text-[var(--gray)] mt-1">
                            {classes.length} classes ·{" "}
                            {classes.reduce((a, c) => a + (c.students_enrolled || 0), 0)} total students enrolled
                        </p>
                    </div>
                    <Link data-tour="class-add" href="/club-console-alqisc-7q4m-test/admin/classes/new" className="inline-flex items-center gap-2 px-4 py-2.5 bg-[var(--primary)] text-white text-sm font-semibold rounded-xl hover:bg-[var(--primary-dark)] transition-all shadow-sm self-start sm:self-auto">
                        <Plus className="w-4 h-4" />
                        Add New Class
                    </Link>
                </div>

                {/* Search */}
                <div className="mb-6">
                    <div className="relative max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search classes..."
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
                        {/* Classes Table — Desktop */}
                        <div className="hidden lg:block bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-gray-100">
                                        <th className="text-left text-xs font-semibold uppercase tracking-wider text-[var(--gray)] px-6 py-4">Class</th>
                                        <th className="text-left text-xs font-semibold uppercase tracking-wider text-[var(--gray)] px-4 py-4">Schedule</th>
                                        <th className="text-left text-xs font-semibold uppercase tracking-wider text-[var(--gray)] px-4 py-4">Venue</th>
                                        <th className="text-left text-xs font-semibold uppercase tracking-wider text-[var(--gray)] px-4 py-4">Students</th>
                                        <th className="text-left text-xs font-semibold uppercase tracking-wider text-[var(--gray)] px-4 py-4">Fee</th>
                                        <th className="text-left text-xs font-semibold uppercase tracking-wider text-[var(--gray)] px-4 py-4">Status</th>
                                        <th className="text-right text-xs font-semibold uppercase tracking-wider text-[var(--gray)] px-6 py-4">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.map((cls) => (
                                        <tr key={cls.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                                                        {cls.image_url ? (
                                                            <Image src={cls.image_url} alt={cls.title} fill className="object-cover" sizes="48px" />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                                                                <Clock className="w-5 h-5" />
                                                            </div>
                                                        )}
                                                    </div>
                                                    <p className="text-sm font-semibold text-[var(--dark)] max-w-[200px] truncate">{cls.title}</p>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4">
                                                <div className="text-sm text-[var(--gray)]">
                                                    <p>{cls.schedule}</p>
                                                    <p className="text-xs text-gray-400">{cls.time}</p>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4">
                                                <span className="text-sm text-[var(--gray)]">{cls.venue}</span>
                                            </td>
                                            <td className="px-4 py-4">
                                                <span className="text-sm font-medium text-[var(--dark)]">
                                                    {cls.students_enrolled || 0}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4">
                                                <span className="inline-block px-2.5 py-1 text-xs font-semibold rounded-lg bg-green-50 text-green-600">
                                                    {cls.fee}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4">
                                                <button
                                                    onClick={() => toggleStatus(cls)}
                                                    className={`relative w-10 h-5 rounded-full transition-colors ${cls.is_active ? "bg-[var(--primary)]" : "bg-gray-300"}`}
                                                >
                                                    <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${cls.is_active ? "left-5" : "left-0.5"}`} />
                                                </button>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center justify-end gap-1">
                                                    <Link href={`/club-console-alqisc-7q4m-test/admin/classes/${cls.id}/edit`} className="p-2 text-[var(--gray)] hover:text-[var(--primary)] hover:bg-[var(--primary)]/10 rounded-lg transition-colors">
                                                        <Edit3 className="w-4 h-4" />
                                                    </Link>
                                                    <button onClick={() => setShowDeleteModal(cls.id)} className="p-2 text-[var(--gray)] hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Classes Cards — Mobile & Tablet */}
                        <div className="lg:hidden grid sm:grid-cols-2 gap-3">
                            {filtered.map((cls) => (
                                <div key={cls.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                                    <div className="relative h-32 sm:h-36">
                                        {cls.image_url ? (
                                            <Image src={cls.image_url} alt={cls.title} fill className="object-cover" sizes="(max-width: 640px) 100vw, 50vw" />
                                        ) : (
                                            <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-400">
                                                <Clock className="w-8 h-8" />
                                            </div>
                                        )}
                                        <div className="absolute top-2 right-2">
                                            <span className="px-2 py-0.5 text-[10px] font-semibold rounded-md bg-green-50 text-green-600">
                                                {cls.fee}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="p-4">
                                        <h3 className="text-sm font-bold text-[var(--dark)] mb-2 truncate">{cls.title}</h3>
                                        <div className="space-y-1.5 text-xs text-[var(--gray)]">
                                            <div className="flex items-center gap-1.5">
                                                <Clock className="w-3 h-3 text-[var(--primary)] flex-shrink-0" />
                                                <span className="truncate">{cls.schedule} · {cls.time}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <MapPin className="w-3 h-3 text-[var(--primary)] flex-shrink-0" />
                                                <span className="truncate">{cls.venue}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <Users className="w-3 h-3 text-[var(--primary)] flex-shrink-0" />
                                                <span>{cls.students_enrolled || 0} students enrolled</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                                            <button
                                                onClick={() => toggleStatus(cls)}
                                                className={`relative w-10 h-5 rounded-full transition-colors ${cls.is_active ? "bg-[var(--primary)]" : "bg-gray-300"}`}
                                            >
                                                <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${cls.is_active ? "left-5" : "left-0.5"}`} />
                                            </button>
                                            <div className="flex gap-1">
                                                <Link href={`/club-console-alqisc-7q4m-test/admin/classes/${cls.id}/edit`} className="p-1.5 text-[var(--gray)] hover:text-[var(--primary)] rounded-lg">
                                                    <Edit3 className="w-4 h-4" />
                                                </Link>
                                                <button onClick={() => setShowDeleteModal(cls.id)} className="p-1.5 text-[var(--gray)] hover:text-red-500 rounded-lg">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {filtered.length === 0 && (
                            <div className="text-center py-12 bg-white rounded-xl">
                                <p className="text-[var(--gray)]">No classes found.</p>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Delete Confirmation Modal */}
            {showDeleteModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6">
                        <h3 className="text-lg font-bold text-[var(--dark)] mb-2">Delete Class?</h3>
                        <p className="text-sm text-[var(--gray)] mb-6">
                            Are you sure you want to delete &quot;{classes.find((c) => c.id === showDeleteModal)?.title}&quot;? This action cannot be undone.
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
