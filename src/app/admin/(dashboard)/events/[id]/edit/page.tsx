"use client";

import { useState, useEffect, useRef, use } from "react";
import { useRouter } from "next/navigation";
import { AdminTopbar } from "@/components/admin/admin-layout";
import { ImageEditorDialog } from "@/components/admin/image-editor";
import Image from "next/image";
import Link from "next/link";
import {
    ArrowLeft,
    Upload,
    Save,
    X,
    Calendar,
    Clock,
    MapPin,
    Trash2,
    Loader2,
} from "lucide-react";
import { createClient } from "@/lib/firebase/client";
import { uploadImageAction, deleteImageAction } from "@/lib/firebase/storage";
import type { Event } from "@/lib/firebase/types";
import { notifications } from "@/components/ui/notification-provider";

export default function EditEventPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [event, setEvent] = useState<Event | null>(null);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const setError = (message: string) => message && notifications.error(message, "Event action failed");

    // Form state
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [date, setDate] = useState("");
    const [time, setTime] = useState("");
    const [location, setLocation] = useState("");
    const [category, setCategory] = useState("weekly");
    const [status, setStatus] = useState("upcoming");
    const [isFeatured, setIsFeatured] = useState(false);
    const [registrationUrl, setRegistrationUrl] = useState("");

    // Image state
    const [currentImageUrl, setCurrentImageUrl] = useState("");
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imageEditorSource, setImageEditorSource] = useState<File | string | null>(null);

    useEffect(() => {
        const fetchEvent = async () => {
            const firebase = createClient();
            const { data, error: fetchError } = await firebase
                .from("events")
                .select("*")
                .eq("id", id)
                .single();

            if (fetchError || !data) {
                setLoading(false);
                return;
            }

            const evt = data as Event;
            setEvent(evt);
            setTitle(evt.title);
            setDescription(evt.description || "");
            setDate(evt.date);
            setTime(evt.time || "");
            setLocation(evt.location || "");
            setCategory(evt.category || "weekly");
            setStatus(evt.status || "upcoming");
            setIsFeatured(evt.is_featured || false);
            setRegistrationUrl(evt.registration_url || "");
            setCurrentImageUrl(evt.image_url || "");
            setLoading(false);
        };

        fetchEvent();
    }, [id]);

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setImageEditorSource(file);
        e.target.value = "";
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setIsSaving(true);
        let uploadedImageUrl = "";

        try {
            let image_url = currentImageUrl;

            // Upload first; remove the previous object only after Firestore succeeds.
            if (imageFile) {
                const result = await uploadImageAction(imageFile, "events");
                image_url = result.url;
                uploadedImageUrl = result.url;
            }

            // Update in Firebase
            const firebase = createClient();
            const { error: dbError } = await firebase
                .from("events")
                .update({
                    title,
                    description,
                    date,
                    time,
                    location,
                    category,
                    status,
                    is_featured: isFeatured,
                    image_url,
                    registration_url: registrationUrl.trim(),
                })
                .eq("id", id);

            if (dbError) throw new Error(dbError.message);
            if (uploadedImageUrl) {
                await deleteImageAction(currentImageUrl).catch((imageError) =>
                    console.error("Failed to delete replaced Firebase image:", imageError)
                );
            }

            notifications.success("The event was updated successfully.", "Event updated");
            router.push("/admin/events");
            router.refresh();
        } catch (err) {
            if (uploadedImageUrl) await deleteImageAction(uploadedImageUrl).catch(() => undefined);
            setError(err instanceof Error ? err.message : "Failed to update event");
        }

        setIsSaving(false);
    };

    const handleDelete = async () => {
        setIsDeleting(true);

        try {
            // Delete Firestore first so a failed database operation never leaves a broken image URL.
            const firebase = createClient();
            const { error: dbError } = await firebase.from("events").delete().eq("id", id);
            if (dbError) throw new Error(dbError.message);
            await deleteImageAction(currentImageUrl).catch((imageError) =>
                console.error("Failed to delete Firebase image:", imageError)
            );

            notifications.success("The event was deleted successfully.", "Event deleted");
            router.push("/admin/events");
            router.refresh();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to delete event");
            setIsDeleting(false);
            setShowDeleteModal(false);
        }
    };

    if (loading) {
        return (
            <>
                <AdminTopbar title="Edit Event" />
                <div className="flex-1 flex items-center justify-center p-8">
                    <Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" />
                </div>
            </>
        );
    }

    if (!event) {
        return (
            <>
                <AdminTopbar title="Edit Event" />
                <div className="flex-1 p-8 text-center">
                    <p className="text-[var(--gray)]">Event not found.</p>
                    <Link href="/admin/events" className="text-[var(--primary)] hover:underline mt-2 inline-block">
                        ← Back to Events
                    </Link>
                </div>
            </>
        );
    }

    return (
        <>
            <AdminTopbar title="Edit Event" />
            <ImageEditorDialog
                source={imageEditorSource}
                aspectRatio={16 / 9}
                onCancel={() => setImageEditorSource(null)}
                onComplete={(file) => {
                    setImageFile(file);
                    setImagePreview(URL.createObjectURL(file));
                    setImageEditorSource(null);
                }}
            />

            <div className="flex-1 p-4 sm:p-6 lg:p-8">
                {/* Breadcrumb */}
                <div className="flex items-center gap-2 text-sm mb-6">
                    <Link href="/admin/events" className="text-[var(--primary)] hover:underline flex items-center gap-1">
                        <ArrowLeft className="w-4 h-4" />
                        Events
                    </Link>
                    <span className="text-gray-400">/</span>
                    <span className="text-[var(--gray)]">Edit Event</span>
                </div>

                <form onSubmit={handleSubmit} className="max-w-5xl">
                    <div className="grid lg:grid-cols-3 gap-6">
                        {/* Left Column */}
                        <div className="lg:col-span-2 space-y-5">
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-6 space-y-5">
                                <div>
                                    <label className="block text-sm font-medium text-[var(--dark)] mb-1.5">
                                        Event Title <span className="text-red-400">*</span>
                                    </label>
                                    <input type="text" required value={title} onChange={(e) => setTitle(e.target.value)}
                                        className="w-full px-4 py-3 bg-[var(--light)] border border-gray-200 rounded-xl text-sm text-[var(--dark)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30 focus:border-[var(--primary)] transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-[var(--dark)] mb-1.5">
                                        Description <span className="text-red-400">*</span>
                                    </label>
                                    <textarea required rows={5} value={description} onChange={(e) => setDescription(e.target.value)}
                                        className="w-full px-4 py-3 bg-[var(--light)] border border-gray-200 rounded-xl text-sm text-[var(--dark)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30 focus:border-[var(--primary)] transition-all resize-none"
                                    />
                                </div>
                                <div className="grid sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-[var(--dark)] mb-1.5">
                                            <Calendar className="w-4 h-4 inline mr-1 text-[var(--primary)]" />Date <span className="text-red-400">*</span>
                                        </label>
                                        <input type="date" required value={date} onChange={(e) => setDate(e.target.value)}
                                            className="w-full px-4 py-3 bg-[var(--light)] border border-gray-200 rounded-xl text-sm text-[var(--dark)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30 focus:border-[var(--primary)] transition-all"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-[var(--dark)] mb-1.5">
                                            <Clock className="w-4 h-4 inline mr-1 text-[var(--primary)]" />Time
                                        </label>
                                        <input type="time" value={time} onChange={(e) => setTime(e.target.value)}
                                            className="w-full px-4 py-3 bg-[var(--light)] border border-gray-200 rounded-xl text-sm text-[var(--dark)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30 focus:border-[var(--primary)] transition-all"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-[var(--dark)] mb-1.5">
                                        <MapPin className="w-4 h-4 inline mr-1 text-[var(--primary)]" />Location <span className="text-red-400">*</span>
                                    </label>
                                    <input type="text" required value={location} onChange={(e) => setLocation(e.target.value)}
                                        className="w-full px-4 py-3 bg-[var(--light)] border border-gray-200 rounded-xl text-sm text-[var(--dark)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30 focus:border-[var(--primary)] transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-[var(--dark)] mb-1.5">
                                        Registration Link
                                    </label>
                                    <input type="url" value={registrationUrl} onChange={(e) => setRegistrationUrl(e.target.value)}
                                        placeholder="https://forms.google.com/..."
                                        className="w-full px-4 py-3 bg-[var(--light)] border border-gray-200 rounded-xl text-sm text-[var(--dark)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30 focus:border-[var(--primary)] transition-all"
                                    />
                                    <p className="text-xs text-[var(--gray)] mt-1">Optional. Add Google Forms or any registration link.</p>
                                </div>
                            </div>
                        </div>

                        {/* Right Column */}
                        <div className="space-y-5">
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-[var(--dark)] mb-1.5">Category</label>
                                    <select value={category} onChange={(e) => setCategory(e.target.value)}
                                        className="w-full px-4 py-3 bg-[var(--light)] border border-gray-200 rounded-xl text-sm text-[var(--dark)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30 focus:border-[var(--primary)] transition-all"
                                    >
                                        <option value="weekly">Weekly</option>
                                        <option value="monthly">Monthly</option>
                                        <option value="special">Special</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-[var(--dark)] mb-1.5">Status</label>
                                    <select value={status} onChange={(e) => setStatus(e.target.value)}
                                        className="w-full px-4 py-3 bg-[var(--light)] border border-gray-200 rounded-xl text-sm text-[var(--dark)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30 focus:border-[var(--primary)] transition-all"
                                    >
                                        <option value="upcoming">Upcoming</option>
                                        <option value="past">Past</option>
                                        <option value="cancelled">Cancelled</option>
                                    </select>
                                </div>
                                <div className="flex items-center justify-between py-2">
                                    <label className="text-sm font-medium text-[var(--dark)]">Featured Event</label>
                                    <button type="button" onClick={() => setIsFeatured(!isFeatured)}
                                        className={`relative w-11 h-6 rounded-full transition-colors ${isFeatured ? "bg-[var(--primary)]" : "bg-gray-300"}`}
                                    >
                                        <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${isFeatured ? "left-[22px]" : "left-0.5"}`} />
                                    </button>
                                </div>
                            </div>

                            {/* Current Image */}
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-6">
                                <label className="block text-sm font-medium text-[var(--dark)] mb-3">Event Image</label>
                                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />

                                {(imagePreview || currentImageUrl) && (
                                    <div className="relative w-full h-40 rounded-xl overflow-hidden bg-gray-100 mb-3">
                                        <Image src={imagePreview || currentImageUrl} alt={title} fill className="object-cover" sizes="300px" />
                                    </div>
                                )}
                                <div
                                    onClick={() => fileInputRef.current?.click()}
                                    className="border-2 border-dashed border-gray-200 rounded-xl p-4 text-center hover:border-[var(--primary)]/40 transition-colors cursor-pointer"
                                >
                                    <Upload className="w-6 h-6 text-gray-400 mx-auto mb-1" />
                                    <p className="text-xs text-[var(--gray)]">
                                        <span className="text-[var(--primary)] font-medium">
                                            {currentImageUrl || imagePreview ? "Upload new image" : "Click to upload"}
                                        </span>
                                        {currentImageUrl ? " to replace" : ""}
                                    </p>
                                </div>
                                {(imagePreview || currentImageUrl) && (
                                    <button
                                        type="button"
                                        onClick={() => setImageEditorSource(imageFile || currentImageUrl)}
                                        className="mt-2 w-full rounded-lg bg-[var(--primary)]/10 px-3 py-2 text-xs font-semibold text-[var(--primary)] hover:bg-[var(--primary)]/20"
                                    >
                                        Edit current crop
                                    </button>
                                )}
                                {imagePreview && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setImagePreview(null);
                                            setImageFile(null);
                                            if (fileInputRef.current) fileInputRef.current.value = "";
                                        }}
                                        className="text-xs text-red-500 hover:text-red-600 font-medium mt-2"
                                    >
                                        Cancel new image
                                    </button>
                                )}
                            </div>

                            {/* Danger Zone */}
                            <div className="bg-red-50 rounded-2xl border border-red-100 p-5 sm:p-6">
                                <h4 className="text-sm font-semibold text-red-700 mb-2">Danger Zone</h4>
                                <p className="text-xs text-red-600/70 mb-3">
                                    Deleting this event is permanent and cannot be undone.
                                </p>
                                <button
                                    type="button"
                                    onClick={() => setShowDeleteModal(true)}
                                    className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    Delete Event
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3 mt-6 pt-6 border-t border-gray-100">
                        <Link href="/admin/events"
                            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 text-sm font-semibold text-[var(--gray)] bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all"
                        >
                            <X className="w-4 h-4" />Cancel
                        </Link>
                        <button type="submit" disabled={isSaving}
                            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-[var(--primary)] rounded-xl hover:bg-[var(--primary-dark)] transition-all shadow-sm disabled:opacity-60"
                        >
                            {isSaving ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save className="w-4 h-4" />
                                    Save Changes
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>

            {/* Delete Confirmation Modal */}
            {showDeleteModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6">
                        <h3 className="text-lg font-bold text-[var(--dark)] mb-2">Delete Event?</h3>
                        <p className="text-sm text-[var(--gray)] mb-6">
                            Are you sure you want to delete &quot;{title}&quot;? This action cannot be undone.
                        </p>
                        <div className="flex gap-3">
                            <button onClick={() => setShowDeleteModal(false)}
                                className="flex-1 px-4 py-2.5 text-sm font-semibold text-[var(--gray)] bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
                            >
                                Cancel
                            </button>
                            <button onClick={handleDelete} disabled={isDeleting}
                                className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-red-500 rounded-xl hover:bg-red-600 transition-colors disabled:opacity-60"
                            >
                                {isDeleting ? "Deleting..." : "Yes, Delete"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
