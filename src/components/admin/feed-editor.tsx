"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Calendar, Link2, Save, Upload, X } from "lucide-react";
import { AdminTopbar } from "@/components/admin/admin-layout";
import { ImageEditorDialog } from "@/components/admin/image-editor";
import { notifications } from "@/components/ui/notification-provider";
import { adminPath } from "@/lib/admin-routes";
import {
    EVENT_CATEGORIES,
    FEED_LANGUAGES,
    fromMalaysiaInput,
    toMalaysiaInput,
    type EditableKind,
    type EventCategory,
    type FeedItem,
    type FeedLanguage,
    type FeedStatus,
    type LocalizedText,
} from "@/lib/feed";
import { createFeedItem, saveFeedItem } from "@/lib/feed-client";
import {
    LOCATION_MAX,
    PRIORITY_MAX,
    SUMMARY_MAX,
    TITLE_MAX,
    type FeedInput,
} from "@/lib/feed-validation";
import { deleteImageAction, uploadImageAction } from "@/lib/firebase/storage";

const FEED_LIST_PATH = adminPath("/feed");

const LANGUAGE_LABELS: Record<FeedLanguage, string> = {
    en: "English",
    ar: "Arabic",
    ms: "Malay",
};

const STATUS_OPTIONS: { value: FeedStatus; label: string; hint: string }[] = [
    { value: "published", label: "Published", hint: "Visible to everyone." },
    { value: "draft", label: "Draft", hint: "Only admins can see it." },
    { value: "archived", label: "Archived", hint: "Hidden everywhere, kept for the record." },
];

const inputClass =
    "w-full px-4 py-3 bg-[var(--light)] border border-gray-200 rounded-xl text-sm text-[var(--dark)] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30 focus:border-[var(--primary)] transition-all";
const cardClass = "bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-6";
const labelClass = "block text-sm font-medium text-[var(--dark)] mb-1.5";

function emptyText(): Record<FeedLanguage, string> {
    return { en: "", ar: "", ms: "" };
}

function fromText(text: LocalizedText | null | undefined): Record<FeedLanguage, string> {
    return { ...emptyText(), ...(text || {}) };
}

function isStoredUpload(url: string): boolean {
    return url.includes("/o/images%2F");
}

function LanguageFields({
    label,
    values,
    onChange,
    max,
    multiline = false,
    requiredLanguage,
    placeholder,
}: {
    label: string;
    values: Record<FeedLanguage, string>;
    onChange: (values: Record<FeedLanguage, string>) => void;
    max: number;
    multiline?: boolean;
    requiredLanguage?: FeedLanguage;
    placeholder?: string;
}) {
    return (
        <fieldset className="space-y-3">
            <legend className={labelClass}>{label}</legend>
            {FEED_LANGUAGES.map((language) => {
                const id = `${label.toLowerCase().replace(/\s+/g, "-")}-${language}`;
                const common = {
                    id,
                    value: values[language],
                    maxLength: max,
                    required: language === requiredLanguage,
                    dir: language === "ar" ? "rtl" : "ltr",
                    lang: language,
                    placeholder: language === "en" ? placeholder : undefined,
                    className: `${inputClass}${multiline ? " resize-y" : ""}`,
                };
                return (
                    <div key={language}>
                        <label htmlFor={id} className="mb-1 block text-xs font-semibold text-[var(--gray)]">
                            {LANGUAGE_LABELS[language]}
                            {language === requiredLanguage ? <span className="text-red-400"> *</span> : " (optional)"}
                        </label>
                        {multiline ? (
                            <textarea
                                {...common}
                                rows={4}
                                onChange={(event) => onChange({ ...values, [language]: event.target.value })}
                            />
                        ) : (
                            <input
                                {...common}
                                type="text"
                                onChange={(event) => onChange({ ...values, [language]: event.target.value })}
                            />
                        )}
                    </div>
                );
            })}
        </fieldset>
    );
}

export function FeedEditor({ kind, initial }: { kind: EditableKind; initial?: FeedItem }) {
    const router = useRouter();
    const isEvent = kind === "event";
    const noun = isEvent ? "Event" : "Announcement";
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [title, setTitle] = useState(() => fromText(initial?.title));
    const [summary, setSummary] = useState(() => fromText(initial?.summary));
    const [location, setLocation] = useState(() => fromText(initial?.location));
    const [startsAt, setStartsAt] = useState(() => toMalaysiaInput(initial?.starts_at ?? null));
    const [endsAt, setEndsAt] = useState(() => toMalaysiaInput(initial?.ends_at ?? null));
    const [registrationUrl, setRegistrationUrl] = useState(initial?.registration_url || "");
    const [category, setCategory] = useState<EventCategory>(initial?.category || "special");
    const [status, setStatus] = useState<FeedStatus>(initial?.status || "published");
    const [priority, setPriority] = useState(String(initial?.priority ?? 0));
    const [thumbnailUrl, setThumbnailUrl] = useState(initial?.thumbnail_url || "");
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [imageEditorSource, setImageEditorSource] = useState<File | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    const shownImage = imagePreview || thumbnailUrl;

    async function handleSubmit(event: React.FormEvent) {
        event.preventDefault();
        if (isEvent && !fromMalaysiaInput(startsAt)) {
            notifications.error("Set the event's start date and time.", `${noun} not saved`);
            return;
        }
        setIsSaving(true);
        let uploadedUrl = "";
        try {
            if (imageFile) uploadedUrl = (await uploadImageAction(imageFile, "feed")).url;
            const input: FeedInput = {
                kind,
                status,
                title,
                summary,
                priority: Number.parseInt(priority, 10) || 0,
                thumbnail_url: uploadedUrl || thumbnailUrl,
                starts_at: isEvent ? fromMalaysiaInput(startsAt) : "",
                ends_at: isEvent ? fromMalaysiaInput(endsAt) : "",
                location: isEvent ? location : {},
                registration_url: isEvent ? registrationUrl.trim() : "",
                category,
            };
            const saved = initial ? await saveFeedItem(initial.id, input) : await createFeedItem(input);

            // Remove a poster this site uploaded once nothing points at it.
            const previous = initial?.thumbnail_url || "";
            if (previous && previous !== saved.thumbnail_url && isStoredUpload(previous)) {
                await deleteImageAction(previous).catch(() => undefined);
            }
            notifications.success(
                status === "published" ? `${noun} published.` : `${noun} saved.`,
                initial ? "Saved" : "Created",
            );
            router.push(FEED_LIST_PATH);
            router.refresh();
        } catch (error) {
            if (uploadedUrl) await deleteImageAction(uploadedUrl).catch(() => undefined);
            notifications.error(error instanceof Error ? error.message : "The item could not be saved.", `${noun} not saved`);
            setIsSaving(false);
        }
    }

    return (
        <>
            <AdminTopbar title={initial ? `Edit ${noun}` : `New ${noun}`} />
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
                <div className="flex items-center gap-2 text-sm mb-6">
                    <Link href={FEED_LIST_PATH} className="text-[var(--primary)] hover:underline flex items-center gap-1">
                        <ArrowLeft className="w-4 h-4" />
                        Events &amp; Feed
                    </Link>
                    <span className="text-gray-400">/</span>
                    <span className="text-[var(--gray)]">{initial ? `Edit ${noun}` : `New ${noun}`}</span>
                </div>

                <form onSubmit={handleSubmit} className="max-w-5xl" data-tour="feed-form">
                    <div className="grid lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 space-y-5">
                            <div className={`${cardClass} space-y-6`}>
                                <LanguageFields
                                    label="Title"
                                    values={title}
                                    onChange={setTitle}
                                    max={TITLE_MAX}
                                    requiredLanguage="en"
                                    placeholder={isEvent ? "e.g. Weekly Islamic Talk" : "e.g. Ramadan timetable is out"}
                                />
                                <LanguageFields
                                    label="Summary"
                                    values={summary}
                                    onChange={setSummary}
                                    max={SUMMARY_MAX}
                                    multiline
                                    placeholder="A few plain sentences. Shown on the card and the detail page."
                                />
                            </div>

                            {isEvent ? (
                                <div className={`${cardClass} space-y-5`}>
                                    <p className="text-xs text-[var(--gray)]">Dates and times are in Malaysian time.</p>
                                    <div className="grid sm:grid-cols-2 gap-4">
                                        <div>
                                            <label htmlFor="feed-starts-at" className={labelClass}>
                                                <Calendar className="w-4 h-4 inline mr-1 text-[var(--primary)]" />
                                                Starts <span className="text-red-400">*</span>
                                            </label>
                                            <input
                                                id="feed-starts-at"
                                                type="datetime-local"
                                                required
                                                value={startsAt}
                                                onChange={(event) => setStartsAt(event.target.value)}
                                                className={inputClass}
                                            />
                                        </div>
                                        <div>
                                            <label htmlFor="feed-ends-at" className={labelClass}>Ends (optional)</label>
                                            <input
                                                id="feed-ends-at"
                                                type="datetime-local"
                                                min={startsAt || undefined}
                                                value={endsAt}
                                                onChange={(event) => setEndsAt(event.target.value)}
                                                className={inputClass}
                                            />
                                        </div>
                                    </div>
                                    <LanguageFields
                                        label="Location"
                                        values={location}
                                        onChange={setLocation}
                                        max={LOCATION_MAX}
                                        placeholder="e.g. AIU Main Hall"
                                    />
                                    <div>
                                        <label htmlFor="feed-registration" className={labelClass}>
                                            <Link2 className="w-4 h-4 inline mr-1 text-[var(--primary)]" />
                                            Registration link
                                        </label>
                                        <input
                                            id="feed-registration"
                                            type="url"
                                            value={registrationUrl}
                                            onChange={(event) => setRegistrationUrl(event.target.value)}
                                            placeholder="https://forms.gle/..."
                                            className={inputClass}
                                        />
                                        <p className="text-xs text-gray-400 mt-1">
                                            The app opens links on alqisc.com (without www), forms.gle, docs.google.com, Instagram and YouTube.
                                        </p>
                                    </div>
                                </div>
                            ) : null}
                        </div>

                        <div className="space-y-5">
                            <div className={`${cardClass} space-y-4`}>
                                <fieldset>
                                    <legend className={labelClass}>Visibility</legend>
                                    <div className="space-y-2">
                                        {STATUS_OPTIONS.map((option) => (
                                            <label
                                                key={option.value}
                                                className={`flex cursor-pointer gap-3 rounded-xl border px-3 py-2.5 transition-colors ${status === option.value ? "border-[var(--primary)] bg-[var(--primary)]/5" : "border-gray-200 hover:bg-gray-50"}`}
                                            >
                                                <input
                                                    type="radio"
                                                    name="feed-status"
                                                    value={option.value}
                                                    checked={status === option.value}
                                                    onChange={() => setStatus(option.value)}
                                                    className="mt-1 accent-[var(--primary)]"
                                                />
                                                <span>
                                                    <span className="block text-sm font-semibold text-[var(--dark)]">{option.label}</span>
                                                    <span className="block text-xs text-[var(--gray)]">{option.hint}</span>
                                                </span>
                                            </label>
                                        ))}
                                    </div>
                                </fieldset>
                                <p className="text-xs text-[var(--gray)]">
                                    {isEvent
                                        ? "Published events appear on the website's Events page and in the mobile app."
                                        : "Published announcements appear in the mobile app."}
                                </p>

                                {isEvent ? (
                                    <div>
                                        <label htmlFor="feed-category" className={labelClass}>Category (website)</label>
                                        <select
                                            id="feed-category"
                                            value={category}
                                            onChange={(event) => setCategory(event.target.value as EventCategory)}
                                            className={`${inputClass} capitalize`}
                                        >
                                            {EVENT_CATEGORIES.map((value) => (
                                                <option key={value} value={value}>{value}</option>
                                            ))}
                                        </select>
                                    </div>
                                ) : null}

                                <div>
                                    <label htmlFor="feed-priority" className={labelClass}>Priority</label>
                                    <input
                                        id="feed-priority"
                                        type="number"
                                        min={0}
                                        max={PRIORITY_MAX}
                                        step={1}
                                        value={priority}
                                        onChange={(event) => setPriority(event.target.value)}
                                        className={inputClass}
                                    />
                                    <p className="text-xs text-gray-400 mt-1">
                                        0 is normal. Higher numbers pin the item to the top of the app
                                        {isEvent ? " and feature the event on the website's home page." : "."}
                                    </p>
                                </div>
                            </div>

                            <div className={cardClass}>
                                <span className="block text-sm font-medium text-[var(--dark)] mb-3">Poster</span>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(event) => {
                                        const file = event.target.files?.[0];
                                        if (file) setImageEditorSource(file);
                                        event.target.value = "";
                                    }}
                                />
                                {shownImage ? (
                                    <div className="space-y-3">
                                        <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-gray-100">
                                            <Image src={shownImage} alt="Poster preview" fill sizes="(max-width: 1024px) 100vw, 33vw" className="object-cover" unoptimized={!!imagePreview} />
                                        </div>
                                        <div className="flex gap-4">
                                            <button type="button" onClick={() => fileInputRef.current?.click()} className="text-xs font-medium text-[var(--primary)] hover:underline">
                                                Replace
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setImageFile(null);
                                                    setImagePreview(null);
                                                    setThumbnailUrl("");
                                                }}
                                                className="text-xs font-medium text-red-500 hover:text-red-600"
                                            >
                                                Remove
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        className="w-full border-2 border-dashed border-gray-200 rounded-xl p-6 text-center hover:border-[var(--primary)]/40 transition-colors"
                                    >
                                        <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                                        <span className="block text-sm text-[var(--primary)] font-medium">Choose an image</span>
                                        <span className="block text-xs text-gray-400 mt-1">PNG, JPG or WebP. Cropped to 16:9.</span>
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3 mt-6 pt-6 border-t border-gray-100">
                        <Link
                            href={FEED_LIST_PATH}
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
                                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save className="w-4 h-4" />
                                    {status === "published" && initial?.status !== "published" ? "Publish" : "Save"}
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </>
    );
}
