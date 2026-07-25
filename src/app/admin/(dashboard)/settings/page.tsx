"use client";

import { useState, useEffect } from "react";
import { AdminTopbar } from "@/components/admin/admin-layout";
import { ImageEditorField } from "@/components/admin/image-editor";
import {
    ChevronDown,
    ChevronUp,
    Save,
    Home,
    Info,
    Target,
    User,
    Phone,
    Heart,
    Loader2
} from "lucide-react";
import { getSettings, updateSettings } from "@/lib/firebase/settings";
import { uploadImageAction, deleteImageAction } from "@/lib/firebase/storage";
import { notifications } from "@/components/ui/notification-provider";

interface SettingsSection {
    id: string;
    title: string;
    icon: React.ElementType;
    fields: {
        key: string;
        label: string;
        type: "text" | "textarea" | "image";
        defaultValue: string;
        placeholder?: string;
    }[];
}

const settingsSections: SettingsSection[] = [
    {
        id: "hero",
        title: "Homepage Hero",
        icon: Home,
        fields: [
            {
                key: "hero_subtitle",
                label: "Subtitle",
                type: "text",
                defaultValue: "The Journey goes on!",
                placeholder: "Enter subtitle",
            },
            {
                key: "hero_title",
                label: "Title",
                type: "text",
                defaultValue: "AIU Al-Qur'an & Islamic Club",
                placeholder: "Enter title",
            },
            {
                key: "hero_description",
                label: "Description",
                type: "textarea",
                defaultValue:
                    "Official Al Quran and Islamic Club Account - Albukhary International University (AIU)",
                placeholder: "Enter description",
            },
            {
                key: "hero_image",
                label: "Background Image",
                type: "image",
                defaultValue: "/images/backround.JPG",
            },
        ],
    },
    {
        id: "about",
        title: "About Page",
        icon: Info,
        fields: [
            {
                key: "about_image",
                label: "Committee Image",
                type: "image",
                defaultValue: "/images/committee1.jpg",
            },
            {
                key: "about_text",
                label: "About Text",
                type: "textarea",
                defaultValue:
                    "ALQISC stands for Al-Qur'an and Islamic Club. Our aim is to encourage students to learn and teach the Holy Quran...",
                placeholder: "Enter about text",
            },
        ],
    },
    {
        id: "mission",
        title: "Mission & Vision",
        icon: Target,
        fields: [
            {
                key: "mission_text",
                label: "Mission",
                type: "textarea",
                defaultValue:
                    "To promote Islamic values and teachings through meaningful activities by enhancing understanding of the Quran...",
                placeholder: "Enter mission text",
            },
            {
                key: "vision_text",
                label: "Vision",
                type: "textarea",
                defaultValue:
                    "To become a distinguished platform for fostering Islamic education and community engagement...",
                placeholder: "Enter vision text",
            },
        ],
    },
    {
        id: "advisor",
        title: "Advisor",
        icon: User,
        fields: [
            {
                key: "advisor_name",
                label: "Name",
                type: "text",
                defaultValue: "Mr. Mohammad Osaid Al Shanti",
                placeholder: "Enter advisor name",
            },
            {
                key: "advisor_title",
                label: "Title",
                type: "text",
                defaultValue: "Advisor",
                placeholder: "Enter advisor title",
            },
            {
                key: "advisor_description",
                label: "Description",
                type: "textarea",
                defaultValue:
                    "Mr. Osaid provides invaluable guidance and mentorship to the Al-Qur'an and Islamic Club (AL-QISC)...",
                placeholder: "Enter advisor description",
            },
            {
                key: "advisor_image",
                label: "Photo",
                type: "image",
                defaultValue: "",
            },
        ],
    },
    {
        id: "contact",
        title: "Contact Information",
        icon: Phone,
        fields: [
            {
                key: "contact_phone",
                label: "Phone Number",
                type: "text",
                defaultValue: "+60 17-731 6088",
                placeholder: "Enter phone number",
            },
            {
                key: "contact_email",
                label: "Email Address",
                type: "text",
                defaultValue: "alqiscpersonal@gmail.com",
                placeholder: "Enter email address",
            },
            {
                key: "contact_address",
                label: "Address",
                type: "textarea",
                defaultValue:
                    "Albukhary International University, Jalan Tun Abdul Razak, 05200 Alor Setar, Kedah Darul Aman, Malaysia",
                placeholder: "Enter address",
            },
            {
                key: "contact_hours",
                label: "Office Hours",
                type: "text",
                defaultValue: "Sunday - Thursday: 9:00 AM - 5:00 PM",
                placeholder: "Enter office hours",
            },
        ],
    },
    {
        id: "donation",
        title: "Donation",
        icon: Heart,
        fields: [
            {
                key: "donation_phone",
                label: "Payment Phone Number",
                type: "text",
                defaultValue: "+60 17-731 6088",
                placeholder: "Enter payment phone number",
            },
            {
                key: "donation_qr",
                label: "QR Code Image",
                type: "image",
                defaultValue: "",
            },
        ],
    },
];

export default function SettingsPage() {
    const [expandedSection, setExpandedSection] = useState<string>("hero");

    // settings form data state
    const [settings, setSettings] = useState<Record<string, string>>({});
    const [persistedSettings, setPersistedSettings] = useState<Record<string, string>>({});
    // image file handles
    const [imageFiles, setImageFiles] = useState<Record<string, File>>({});
    // image preview links
    const [imagePreviews, setImagePreviews] = useState<Record<string, string>>({});

    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const data = await getSettings();
                // Initialize settings falling back to defined defaults if missing
                const initial: Record<string, string> = {};
                settingsSections.forEach(sec => sec.fields.forEach(f => {
                    initial[f.key] = data[f.key] !== undefined ? data[f.key] : f.defaultValue;
                }));
                // Add any extra fetched keys
                const loadedSettings = { ...initial, ...data };
                setSettings(loadedSettings);
                setPersistedSettings(loadedSettings);
            } catch (err) {
                console.error(err);
                notifications.error("Failed to load settings from server.", "Settings unavailable");
            }
            setLoading(false);
        };
        fetchSettings();
    }, []);

    const handleChange = (key: string, value: string) => {
        setSettings(prev => ({ ...prev, [key]: value }));
    };

    const handleImageSelect = (key: string, file: File) => {
        setImageFiles(prev => ({ ...prev, [key]: file }));
        setImagePreviews(prev => ({ ...prev, [key]: URL.createObjectURL(file) }));
    };

    const handleSave = async () => {
        setIsSaving(true);
        const uploadedUrls: string[] = [];
        const replacedUrls: string[] = [];
        try {
            const newSettings = { ...settings };

            // Upload all new images
            for (const [key, file] of Object.entries(imageFiles)) {
                const uploadResult = await uploadImageAction(file, "settings");
                uploadedUrls.push(uploadResult.url);

                // Keep track of old URL to delete later
                const oldUrl = persistedSettings[key];

                newSettings[key] = uploadResult.url;
                if (oldUrl) replacedUrls.push(oldUrl);
            }

            for (const section of settingsSections) {
                for (const field of section.fields) {
                    if (field.type === "image" && persistedSettings[field.key] && !newSettings[field.key]) {
                        replacedUrls.push(persistedSettings[field.key]);
                    }
                }
            }

            // Save atomically, then remove replaced Firebase Storage objects.
            await updateSettings(newSettings);
            await Promise.allSettled(replacedUrls.map(deleteImageAction));

            // clear file queues since they are now synced
            setImageFiles({});
            setImagePreviews({});
            setSettings(newSettings);
            setPersistedSettings(newSettings);

            notifications.success("All website settings were saved successfully.", "Settings saved");
        } catch (err) {
            console.error(err);
            await Promise.allSettled(uploadedUrls.map(deleteImageAction));
            notifications.error(err instanceof Error ? err.message : "An error occurred while saving settings.", "Settings not saved");
        }
        setIsSaving(false);
    };

    if (loading) {
        return (
            <>
                <AdminTopbar title="Settings" />
                <div className="flex-1 flex items-center justify-center p-8">
                    <Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" />
                </div>
            </>
        );
    }

    return (
        <>
            <AdminTopbar title="Settings" />

            <div className="flex-1 p-4 sm:p-6 lg:p-8">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6 bg-white p-4 sm:p-6 rounded-2xl border border-gray-100 shadow-sm sticky top-0 z-10 lg:static">
                    <div className="flex-1">
                        <h2 className="text-xl font-bold text-[var(--dark)]">
                            Website Configuration
                        </h2>
                        <p className="text-sm text-[var(--gray)] mt-0.5">
                            Changes here will reflect instantly on the public website.
                        </p>
                    </div>

                    <button
                        data-tour="settings-save"
                        onClick={handleSave}
                        disabled={isSaving}
                        className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-[var(--primary)] text-white text-sm font-semibold rounded-xl hover:bg-[var(--primary-dark)] transition-all shadow-sm disabled:opacity-60 w-full sm:w-auto flex-shrink-0"
                    >
                        {isSaving ? (
                            <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving...</>
                        ) : (
                            <><Save className="w-4 h-4" /> Save All Changes</>
                        )}
                    </button>
                </div>

                {/* Settings Sections */}
                <div data-tour="settings-sections" className="space-y-4 max-w-4xl">
                    {settingsSections.map((section) => {
                        const isExpanded = expandedSection === section.id;
                        const Icon = section.icon;

                        return (
                            <div
                                key={section.id}
                                className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden transition-all duration-200"
                            >
                                {/* Section Header */}
                                <button
                                    onClick={() =>
                                        setExpandedSection(isExpanded ? "" : section.id)
                                    }
                                    className={`w-full flex items-center gap-4 px-5 sm:px-6 py-4 sm:py-5 text-left transition-colors ${isExpanded ? "bg-[var(--light)]" : "hover:bg-gray-50/50"}`}
                                >
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${isExpanded ? "bg-[var(--primary)] text-white shadow-md shadow-[var(--primary)]/20" : "bg-[var(--primary)]/10 text-[var(--primary)]"}`}>
                                        <Icon className="w-5 h-5" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-heading text-base sm:text-lg font-bold text-[var(--dark)] truncate">
                                            {section.title}
                                        </h3>
                                    </div>
                                    <span className="text-xs font-semibold text-[var(--gray)] bg-white px-2.5 py-1 rounded-lg border border-gray-100 hidden sm:inline-block">
                                        {section.fields.length} settings
                                    </span>
                                    <div className={`p-1.5 rounded-lg transition-colors ${isExpanded ? "bg-white text-[var(--primary)] shadow-sm" : "text-gray-400"}`}>
                                        {isExpanded ? (
                                            <ChevronUp className="w-4 h-4" />
                                        ) : (
                                            <ChevronDown className="w-4 h-4" />
                                        )}
                                    </div>
                                </button>

                                {/* Section Fields */}
                                <div
                                    className={`grid transition-all duration-300 ease-in-out ${isExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}
                                >
                                    <div className="overflow-hidden">
                                        <div className="border-t border-gray-100 p-5 sm:p-6 space-y-5 bg-white">
                                            {section.fields.map((field) => (
                                                <div key={field.key} className="max-w-3xl">
                                                    <label className="block text-sm font-bold text-[var(--dark)] mb-2">
                                                        {field.label}
                                                    </label>

                                                    {field.type === "text" && (
                                                        <input
                                                            type="text"
                                                            value={settings[field.key] || ""}
                                                            onChange={(e) => handleChange(field.key, e.target.value)}
                                                            placeholder={field.placeholder}
                                                            className="w-full px-4 py-3 bg-[var(--light)] border border-gray-200 rounded-xl text-sm text-[var(--dark)] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30 focus:border-[var(--primary)] transition-all"
                                                        />
                                                    )}

                                                    {field.type === "textarea" && (
                                                        <textarea
                                                            value={settings[field.key] || ""}
                                                            onChange={(e) => handleChange(field.key, e.target.value)}
                                                            placeholder={field.placeholder}
                                                            rows={4}
                                                            className="w-full px-4 py-3 bg-[var(--light)] border border-gray-200 rounded-xl text-sm text-[var(--dark)] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30 focus:border-[var(--primary)] transition-all resize-none leading-relaxed"
                                                        />
                                                    )}

                                                    {field.type === "image" && (
                                                        <ImageEditorField
                                                            label={field.label}
                                                            value={imagePreviews[field.key] || settings[field.key] || ""}
                                                            aspectRatio={field.key === "hero_image" ? 16 / 9 : field.key === "about_image" ? 5 / 4 : 1}
                                                            previewClassName={field.key === "hero_image" ? "h-32 w-56" : field.key === "about_image" ? "h-40 w-52" : "h-32 w-32"}
                                                            onEdited={(file) => handleImageSelect(field.key, file)}
                                                            onRemove={() => {
                                                                setImageFiles((current) => {
                                                                    const next = { ...current };
                                                                    delete next[field.key];
                                                                    return next;
                                                                });
                                                                setImagePreviews((current) => {
                                                                    const next = { ...current };
                                                                    delete next[field.key];
                                                                    return next;
                                                                });
                                                                handleChange(field.key, "");
                                                            }}
                                                        />
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </>
    );
}
