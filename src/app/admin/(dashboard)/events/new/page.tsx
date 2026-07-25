"use client";

import { useState, useRef } from "react";
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
} from "lucide-react";
import { createClient } from "@/lib/firebase/client";
import { uploadImageAction, deleteImageAction } from "@/lib/firebase/storage";
import { notifications } from "@/components/ui/notification-provider";

export default function NewEventPage() {
    const router = useRouter();
    const [isSaving, setIsSaving] = useState(false);
    const setError = (message: string) => message && notifications.error(message, "Event not created");
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imageEditorSource, setImageEditorSource] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

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

        try {
            let image_url = "";

            // Upload directly to Firebase Storage if selected.
            if (imageFile) {
                const result = await uploadImageAction(imageFile, "events");
                image_url = result.url;
            }

            // Save to Firebase
            const firebase = createClient();
            const { error: dbError } = await firebase.from("events").insert({
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
            });

            if (dbError) {
                await deleteImageAction(image_url).catch(() => undefined);
                throw new Error(dbError.message);
            }

            notifications.success("The event was created successfully.", "Event created");
            router.push("/admin/events");
            router.refresh();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to create event");
        }

        setIsSaving(false);
    };

    return (
        <>
            <AdminTopbar title="Add New Event" />
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
                    <span className="text-[var(--gray)]">Add New Event</span>
                </div>

                <form onSubmit={handleSubmit} className="max-w-5xl" data-tour="event-form">
                    <div className="grid lg:grid-cols-3 gap-6">
                        {/* Left Column — Main Fields */}
                        <div className="lg:col-span-2 space-y-5">
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-6 space-y-5">
                                {/* Title */}
                                <div>
                                    <label className="block text-sm font-medium text-[var(--dark)] mb-1.5">
                                        Event Title <span className="text-red-400">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        placeholder="e.g. Weekly Islamic Talk"
                                        className="w-full px-4 py-3 bg-[var(--light)] border border-gray-200 rounded-xl text-sm text-[var(--dark)] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30 focus:border-[var(--primary)] transition-all"
                                    />
                                </div>

                                {/* Description */}
                                <div>
                                    <label className="block text-sm font-medium text-[var(--dark)] mb-1.5">
                                        Description <span className="text-red-400">*</span>
                                    </label>
                                    <textarea
                                        required
                                        rows={5}
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        placeholder="Describe the event..."
                                        className="w-full px-4 py-3 bg-[var(--light)] border border-gray-200 rounded-xl text-sm text-[var(--dark)] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30 focus:border-[var(--primary)] transition-all resize-none"
                                    />
                                </div>

                                {/* Date & Time Row */}
                                <div className="grid sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-[var(--dark)] mb-1.5">
                                            <Calendar className="w-4 h-4 inline mr-1 text-[var(--primary)]" />
                                            Date <span className="text-red-400">*</span>
                                        </label>
                                        <input
                                            type="date"
                                            required
                                            value={date}
                                            onChange={(e) => setDate(e.target.value)}
                                            className="w-full px-4 py-3 bg-[var(--light)] border border-gray-200 rounded-xl text-sm text-[var(--dark)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30 focus:border-[var(--primary)] transition-all"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-[var(--dark)] mb-1.5">
                                            <Clock className="w-4 h-4 inline mr-1 text-[var(--primary)]" />
                                            Time
                                        </label>
                                        <input
                                            type="time"
                                            value={time}
                                            onChange={(e) => setTime(e.target.value)}
                                            className="w-full px-4 py-3 bg-[var(--light)] border border-gray-200 rounded-xl text-sm text-[var(--dark)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30 focus:border-[var(--primary)] transition-all"
                                        />
                                    </div>
                                </div>

                                {/* Location */}
                                <div>
                                    <label className="block text-sm font-medium text-[var(--dark)] mb-1.5">
                                        <MapPin className="w-4 h-4 inline mr-1 text-[var(--primary)]" />
                                        Location <span className="text-red-400">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={location}
                                        onChange={(e) => setLocation(e.target.value)}
                                        placeholder="e.g. AIU Main Hall"
                                        className="w-full px-4 py-3 bg-[var(--light)] border border-gray-200 rounded-xl text-sm text-[var(--dark)] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30 focus:border-[var(--primary)] transition-all"
                                    />
                                </div>

                                {/* Registration Link */}
                                <div>
                                    <label className="block text-sm font-medium text-[var(--dark)] mb-1.5">
                                        Registration Link
                                    </label>
                                    <input
                                        type="url"
                                        value={registrationUrl}
                                        onChange={(e) => setRegistrationUrl(e.target.value)}
                                        placeholder="https://forms.google.com/..."
                                        className="w-full px-4 py-3 bg-[var(--light)] border border-gray-200 rounded-xl text-sm text-[var(--dark)] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30 focus:border-[var(--primary)] transition-all"
                                    />
                                    <p className="text-xs text-gray-400 mt-1">Google Form, Typeform, or any registration URL</p>
                                </div>
                            </div>
                        </div>

                        {/* Right Column — Meta & Image */}
                        <div className="space-y-5">
                            {/* Category & Status */}
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-[var(--dark)] mb-1.5">Category</label>
                                    <select
                                        value={category}
                                        onChange={(e) => setCategory(e.target.value)}
                                        className="w-full px-4 py-3 bg-[var(--light)] border border-gray-200 rounded-xl text-sm text-[var(--dark)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30 focus:border-[var(--primary)] transition-all"
                                    >
                                        <option value="weekly">Weekly</option>
                                        <option value="monthly">Monthly</option>
                                        <option value="special">Special</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-[var(--dark)] mb-1.5">Status</label>
                                    <select
                                        value={status}
                                        onChange={(e) => setStatus(e.target.value)}
                                        className="w-full px-4 py-3 bg-[var(--light)] border border-gray-200 rounded-xl text-sm text-[var(--dark)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30 focus:border-[var(--primary)] transition-all"
                                    >
                                        <option value="upcoming">Upcoming</option>
                                        <option value="past">Past</option>
                                        <option value="cancelled">Cancelled</option>
                                    </select>
                                </div>

                                {/* Featured toggle */}
                                <div className="flex items-center justify-between py-2">
                                    <label className="text-sm font-medium text-[var(--dark)]">Featured Event</label>
                                    <button
                                        type="button"
                                        onClick={() => setIsFeatured(!isFeatured)}
                                        className={`relative w-11 h-6 rounded-full transition-colors ${isFeatured ? "bg-[var(--primary)]" : "bg-gray-300"}`}
                                    >
                                        <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${isFeatured ? "left-[22px]" : "left-0.5"}`} />
                                    </button>
                                </div>
                            </div>

                            {/* Image Upload */}
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-6">
                                <label className="block text-sm font-medium text-[var(--dark)] mb-3">
                                    Event Image
                                </label>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageSelect}
                                    className="hidden"
                                />
                                {imagePreview ? (
                                    <div className="space-y-3">
                                        <div className="relative w-full h-40 rounded-xl overflow-hidden bg-gray-100">
                                            <Image src={imagePreview} alt="Preview" fill sizes="(max-width: 1024px) 100vw, 33vw" className="object-cover" />
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setImagePreview(null);
                                                setImageFile(null);
                                                if (fileInputRef.current) fileInputRef.current.value = "";
                                            }}
                                            className="text-xs text-red-500 hover:text-red-600 font-medium"
                                        >
                                            Remove image
                                        </button>
                                    </div>
                                ) : (
                                    <div
                                        onClick={() => fileInputRef.current?.click()}
                                        className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center hover:border-[var(--primary)]/40 transition-colors cursor-pointer"
                                    >
                                        <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                                        <p className="text-sm text-[var(--gray)]">
                                            Drag & drop or{" "}
                                            <span className="text-[var(--primary)] font-medium">click to upload</span>
                                        </p>
                                        <p className="text-xs text-gray-400 mt-1">PNG, JPG up to 5MB</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3 mt-6 pt-6 border-t border-gray-100">
                        <Link
                            href="/admin/events"
                            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 text-sm font-semibold text-[var(--gray)] bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all"
                        >
                            <X className="w-4 h-4" />
                            Cancel
                        </Link>
                        <button
                            type="submit"
                            disabled={isSaving}
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
                                    Create Event
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </>
    );
}
