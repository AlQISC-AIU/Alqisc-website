"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AdminTopbar } from "@/components/admin/admin-layout";
import { ImageEditorField } from "@/components/admin/image-editor";
import Link from "next/link";
import {
    ArrowLeft,
    Save,
    X,
    Plus,
    Trash2,
} from "lucide-react";
import { uploadImageAction, deleteImageAction } from "@/lib/firebase/storage";
import { notifications } from "@/components/ui/notification-provider";

export default function NewDepartmentPage() {
    const router = useRouter();
    const [isSaving, setIsSaving] = useState(false);
    const setError = (message: string) => message && notifications.error(message, "Department not created");

    const [name, setName] = useState("");
    const [fullName, setFullName] = useState("");
    const [description, setDescription] = useState("");
    const [objectives, setObjectives] = useState([""]);
    const [responsibilities, setResponsibilities] = useState([""]);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [imageFile, setImageFile] = useState<File | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setIsSaving(true);

        try {
            const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

            // Clean empty strings
            const cleanedObjectives = objectives.filter((o) => o.trim() !== "");
            const cleanedResponsibilities = responsibilities.filter((r) => r.trim() !== "");

            let image_url = "";
            if (imageFile) {
                const result = await uploadImageAction(imageFile, "departments");
                image_url = result.url;
            }

            // Call server action
            const { createDepartment } = await import("@/lib/firebase/departments");
            try {
                await createDepartment({
                    slug,
                    name,
                    full_name: fullName,
                    description,
                    image_url,
                    objectives: cleanedObjectives,
                    responsibilities: cleanedResponsibilities,
                });
            } catch (databaseError) {
                await deleteImageAction(image_url).catch(() => undefined);
                throw databaseError;
            }

            notifications.success("The department was created successfully.", "Department created");
            router.push("/admin/departments");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to create department");
        }

        setIsSaving(false);
    };

    return (
        <>
            <AdminTopbar title="Add Department" />

            <div className="flex-1 p-4 sm:p-6 lg:p-8">
                {/* Breadcrumb */}
                <div className="flex items-center gap-2 text-sm mb-6">
                    <Link href="/admin/departments" className="text-[var(--primary)] hover:underline flex items-center gap-1">
                        <ArrowLeft className="w-4 h-4" />
                        Departments
                    </Link>
                    <span className="text-gray-400">/</span>
                    <span className="text-[var(--gray)]">Add New Department</span>
                </div>

                <form onSubmit={handleSubmit} className="max-w-4xl" data-tour="dept-form">
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-6 space-y-5">
                        <div className="grid sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-[var(--dark)] mb-1.5">
                                    Short Name <span className="text-red-400">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="e.g. EXCO, IT, Media"
                                    className="w-full px-4 py-3 bg-[var(--light)] border border-gray-200 rounded-xl text-sm text-[var(--dark)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30 focus:border-[var(--primary)] transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-[var(--dark)] mb-1.5">
                                    Full Name <span className="text-red-400">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    placeholder="e.g. Executive Committee"
                                    className="w-full px-4 py-3 bg-[var(--light)] border border-gray-200 rounded-xl text-sm text-[var(--dark)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30 focus:border-[var(--primary)] transition-all"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-[var(--dark)] mb-1.5">
                                Description <span className="text-red-400">*</span>
                            </label>
                            <textarea
                                required
                                rows={4}
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="What does this department do?"
                                className="w-full px-4 py-3 bg-[var(--light)] border border-gray-200 rounded-xl text-sm text-[var(--dark)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30 focus:border-[var(--primary)] transition-all resize-none"
                            />
                        </div>

                        {/* Department Image */}
                        <div>
                            <label className="block text-sm font-medium text-[var(--dark)] mb-1.5">Department Photo</label>
                            <ImageEditorField
                                label="Department photo"
                                value={imagePreview || ""}
                                aspectRatio={16 / 9}
                                previewClassName="h-40 w-full sm:w-72"
                                onEdited={(file) => {
                                    setImageFile(file);
                                    setImagePreview(URL.createObjectURL(file));
                                }}
                                onRemove={() => {
                                    setImagePreview(null);
                                    setImageFile(null);
                                }}
                            />
                        </div>

                        {/* Objectives */}
                        <div>
                            <label className="block text-sm font-medium text-[var(--dark)] mb-2">Objectives</label>
                            <div className="space-y-2">
                                {objectives.map((obj, idx) => (
                                    <div key={idx} className="flex gap-2">
                                        <input
                                            type="text"
                                            value={obj}
                                            onChange={(e) => {
                                                const n = [...objectives];
                                                n[idx] = e.target.value;
                                                setObjectives(n);
                                            }}
                                            placeholder={`Objective ${idx + 1}`}
                                            className="flex-1 px-3 py-2.5 bg-[var(--light)] border border-gray-200 rounded-lg text-sm text-[var(--dark)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30 focus:border-[var(--primary)] transition-all"
                                        />
                                        {objectives.length > 1 && (
                                            <button type="button" onClick={() => setObjectives(objectives.filter((_, i) => i !== idx))} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                            <button type="button" onClick={() => setObjectives([...objectives, ""])} className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--primary)] hover:text-[var(--primary-dark)]">
                                <Plus className="w-3.5 h-3.5" /> Add Objective
                            </button>
                        </div>

                        {/* Responsibilities */}
                        <div>
                            <label className="block text-sm font-medium text-[var(--dark)] mb-2">Responsibilities</label>
                            <div className="space-y-2">
                                {responsibilities.map((resp, idx) => (
                                    <div key={idx} className="flex gap-2">
                                        <input
                                            type="text"
                                            value={resp}
                                            onChange={(e) => {
                                                const n = [...responsibilities];
                                                n[idx] = e.target.value;
                                                setResponsibilities(n);
                                            }}
                                            placeholder={`Responsibility ${idx + 1}`}
                                            className="flex-1 px-3 py-2.5 bg-[var(--light)] border border-gray-200 rounded-lg text-sm text-[var(--dark)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30 focus:border-[var(--primary)] transition-all"
                                        />
                                        {responsibilities.length > 1 && (
                                            <button type="button" onClick={() => setResponsibilities(responsibilities.filter((_, i) => i !== idx))} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                            <button type="button" onClick={() => setResponsibilities([...responsibilities, ""])} className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--primary)] hover:text-[var(--primary-dark)]">
                                <Plus className="w-3.5 h-3.5" /> Add Responsibility
                            </button>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3 mt-6 pt-6 border-t border-gray-100">
                        <Link href="/admin/departments" className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 text-sm font-semibold text-[var(--gray)] bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all">
                            <X className="w-4 h-4" /> Cancel
                        </Link>
                        <button type="submit" disabled={isSaving} className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-[var(--primary)] rounded-xl hover:bg-[var(--primary-dark)] transition-all shadow-sm disabled:opacity-60">
                            {isSaving ? (
                                <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving...</>
                            ) : (
                                <><Save className="w-4 h-4" /> Save Department</>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </>
    );
}
