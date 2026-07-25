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
    Plus,
    Trash2,
} from "lucide-react";
import { createClient } from "@/lib/firebase/client";
import { uploadImageAction, deleteImageAction } from "@/lib/firebase/storage";
import { notifications } from "@/components/ui/notification-provider";

export default function NewClassPage() {
    const router = useRouter();
    const [isSaving, setIsSaving] = useState(false);
    const setError = (message: string) => message && notifications.error(message, "Class not created");

    // Image state
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imageEditorSource, setImageEditorSource] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Form state
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [schedule, setSchedule] = useState("");
    const [time, setTime] = useState("");
    const [venue, setVenue] = useState("");
    const [fee, setFee] = useState("Free");
    const [studentsEnrolled, setStudentsEnrolled] = useState(0);
    const [isActive, setIsActive] = useState(true);
    const [objectives, setObjectives] = useState<string[]>([""]);
    const [registrationUrl, setRegistrationUrl] = useState("");

    const addObjective = () => setObjectives([...objectives, ""]);
    const removeObjective = (idx: number) => setObjectives(objectives.filter((_, i) => i !== idx));
    const updateObjective = (idx: number, val: string) => setObjectives(objectives.map((o, i) => (i === idx ? val : o)));

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
            const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

            // Upload directly to Firebase Storage if selected.
            if (imageFile) {
                const result = await uploadImageAction(imageFile, "classes");
                image_url = result.url;
            }

            // Clean empty objectives
            const cleanedObjectives = objectives.filter(obj => obj.trim() !== "");

            // Save to Firebase
            const firebase = createClient();
            const { error: dbError } = await firebase.from("classes").insert({
                slug,
                title,
                description,
                schedule,
                time,
                venue,
                fee,
                students_enrolled: studentsEnrolled,
                is_active: isActive,
                objectives: cleanedObjectives,
                image_url,
                registration_url: registrationUrl.trim(),
            });

            if (dbError) {
                await deleteImageAction(image_url).catch(() => undefined);
                throw new Error(dbError.message);
            }

            notifications.success("The class was created successfully.", "Class created");
            router.push("/club-console-alqisc-7q4m-test/admin/classes");
            router.refresh();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to create class");
        }

        setIsSaving(false);
    };

    return (
        <>
            <AdminTopbar title="Add New Class" />
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
                    <Link href="/club-console-alqisc-7q4m-test/admin/classes" className="text-[var(--primary)] hover:underline flex items-center gap-1">
                        <ArrowLeft className="w-4 h-4" />
                        Classes
                    </Link>
                    <span className="text-gray-400">/</span>
                    <span className="text-[var(--gray)]">Add New Class</span>
                </div>

                <form onSubmit={handleSubmit} className="max-w-5xl" data-tour="class-form">
                    <div className="grid lg:grid-cols-3 gap-6">
                        {/* Left Column — Main Fields */}
                        <div className="lg:col-span-2 space-y-5">
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-6 space-y-5">
                                <div>
                                    <label className="block text-sm font-medium text-[var(--dark)] mb-1.5">
                                        Class Title <span className="text-red-400">*</span>
                                    </label>
                                    <input type="text" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Arabic Language"
                                        className="w-full px-4 py-3 bg-[var(--light)] border border-gray-200 rounded-xl text-sm text-[var(--dark)] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30 focus:border-[var(--primary)] transition-all"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-[var(--dark)] mb-1.5">
                                        Description <span className="text-red-400">*</span>
                                    </label>
                                    <textarea required rows={4} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe the class..."
                                        className="w-full px-4 py-3 bg-[var(--light)] border border-gray-200 rounded-xl text-sm text-[var(--dark)] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30 focus:border-[var(--primary)] transition-all resize-none"
                                    />
                                </div>

                                <div className="grid sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-[var(--dark)] mb-1.5">
                                            Schedule <span className="text-red-400">*</span>
                                        </label>
                                        <input type="text" required value={schedule} onChange={(e) => setSchedule(e.target.value)} placeholder="e.g. Every Monday & Wednesday"
                                            className="w-full px-4 py-3 bg-[var(--light)] border border-gray-200 rounded-xl text-sm text-[var(--dark)] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30 focus:border-[var(--primary)] transition-all"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-[var(--dark)] mb-1.5">
                                            Time <span className="text-red-400">*</span>
                                        </label>
                                        <input type="text" required value={time} onChange={(e) => setTime(e.target.value)} placeholder="e.g. 7:00 PM - 9:00 PM"
                                            className="w-full px-4 py-3 bg-[var(--light)] border border-gray-200 rounded-xl text-sm text-[var(--dark)] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30 focus:border-[var(--primary)] transition-all"
                                        />
                                    </div>
                                </div>

                                <div className="grid sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-[var(--dark)] mb-1.5">
                                            Venue <span className="text-red-400">*</span>
                                        </label>
                                        <input type="text" required value={venue} onChange={(e) => setVenue(e.target.value)} placeholder="e.g. AIU Lecture Hall B"
                                            className="w-full px-4 py-3 bg-[var(--light)] border border-gray-200 rounded-xl text-sm text-[var(--dark)] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30 focus:border-[var(--primary)] transition-all"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-[var(--dark)] mb-1.5">
                                            Fee
                                        </label>
                                        <input type="text" value={fee} onChange={(e) => setFee(e.target.value)} placeholder="e.g. Free or RM50"
                                            className="w-full px-4 py-3 bg-[var(--light)] border border-gray-200 rounded-xl text-sm text-[var(--dark)] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30 focus:border-[var(--primary)] transition-all"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-[var(--dark)] mb-1.5">
                                        Students Enrolled
                                    </label>
                                    <input type="number" min="0" value={studentsEnrolled} onChange={(e) => setStudentsEnrolled(parseInt(e.target.value) || 0)}
                                        className="w-full max-w-[200px] px-4 py-3 bg-[var(--light)] border border-gray-200 rounded-xl text-sm text-[var(--dark)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30 focus:border-[var(--primary)] transition-all"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-[var(--dark)] mb-1.5">
                                        Registration / Enrollment Link
                                    </label>
                                    <input type="url" value={registrationUrl} onChange={(e) => setRegistrationUrl(e.target.value)} placeholder="https://forms.google.com/..."
                                        className="w-full px-4 py-3 bg-[var(--light)] border border-gray-200 rounded-xl text-sm text-[var(--dark)] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30 focus:border-[var(--primary)] transition-all"
                                    />
                                    <p className="text-xs text-gray-400 mt-1">Google Form, Typeform, or any registration URL</p>
                                </div>
                            </div>
                        </div>

                        {/* Right Column */}
                        <div className="space-y-5">
                            {/* Image Upload */}
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-6">
                                <label className="block text-sm font-medium text-[var(--dark)] mb-3">Class Image</label>
                                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
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
                                    <div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center hover:border-[var(--primary)]/40 transition-colors cursor-pointer">
                                        <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                                        <p className="text-sm text-[var(--gray)]">Drag & drop or <span className="text-[var(--primary)] font-medium">click to upload</span></p>
                                        <p className="text-xs text-gray-400 mt-1">PNG, JPG up to 5MB</p>
                                    </div>
                                )}
                            </div>

                            {/* Learning Objectives */}
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-6">
                                <label className="block text-sm font-medium text-[var(--dark)] mb-3">Learning Objectives</label>
                                <div className="space-y-2">
                                    {objectives.map((obj, idx) => (
                                        <div key={idx} className="flex gap-2">
                                            <input type="text" value={obj} onChange={(e) => updateObjective(idx, e.target.value)} placeholder={`Objective ${idx + 1}`}
                                                className="flex-1 px-3 py-2.5 bg-[var(--light)] border border-gray-200 rounded-lg text-sm text-[var(--dark)] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30 focus:border-[var(--primary)] transition-all"
                                            />
                                            {objectives.length > 1 && (
                                                <button type="button" onClick={() => removeObjective(idx)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                                <button type="button" onClick={addObjective} className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--primary)] hover:text-[var(--primary-dark)] transition-colors">
                                    <Plus className="w-3.5 h-3.5" />Add Objective
                                </button>
                            </div>

                            {/* Status */}
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-6">
                                <div className="flex items-center justify-between">
                                    <label className="text-sm font-medium text-[var(--dark)]">Active</label>
                                    <button type="button" onClick={() => setIsActive(!isActive)}
                                        className={`relative w-11 h-6 rounded-full transition-colors ${isActive ? "bg-[var(--primary)]" : "bg-gray-300"}`}
                                    >
                                        <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${isActive ? "left-[22px]" : "left-0.5"}`} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3 mt-6 pt-6 border-t border-gray-100">
                        <Link href="/club-console-alqisc-7q4m-test/admin/classes"
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
                                    Create Class
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </>
    );
}
