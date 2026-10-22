"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Instagram, Loader2, Youtube } from "lucide-react";
import { AdminTopbar } from "@/components/admin/admin-layout";
import { notifications } from "@/components/ui/notification-provider";
import { adminPath } from "@/lib/admin-routes";
import type { FeedSources } from "@/lib/feed";
import { fetchFeedSources, saveFeedSources } from "@/lib/feed-client";

const SOURCES: { key: keyof FeedSources; label: string; icon: typeof Instagram; detail: string }[] = [
    {
        key: "instagram_enabled",
        label: "Instagram",
        icon: Instagram,
        detail: "Imports new posts and reels from the club's Instagram account every 15 minutes.",
    },
    {
        key: "youtube_enabled",
        label: "YouTube",
        icon: Youtube,
        detail: "Imports new videos from the club's YouTube channel every 15 minutes.",
    },
];

export default function FeedSourcesPage() {
    const [sources, setSources] = useState<FeedSources | null>(null);
    const [savingKey, setSavingKey] = useState<keyof FeedSources | null>(null);
    const [errorMessage, setErrorMessage] = useState("");

    useEffect(() => {
        fetchFeedSources()
            .then(setSources)
            .catch((error: unknown) => setErrorMessage(error instanceof Error ? error.message : "The settings could not be loaded."));
    }, []);

    async function toggle(key: keyof FeedSources) {
        if (!sources) return;
        const next = { ...sources, [key]: !sources[key] };
        setSavingKey(key);
        try {
            setSources(await saveFeedSources(next));
            notifications.success(next[key] ? "Importing is on." : "Importing is off.", "Saved");
        } catch (error) {
            notifications.error(error instanceof Error ? error.message : "The setting could not be saved.", "Not saved");
        }
        setSavingKey(null);
    }

    return (
        <>
            <AdminTopbar title="Instagram & YouTube" />
            <div className="flex-1 p-4 sm:p-6 lg:p-8 max-w-3xl">
                <div className="flex items-center gap-2 text-sm mb-6">
                    <Link href={adminPath("/feed")} className="text-[var(--primary)] hover:underline flex items-center gap-1">
                        <ArrowLeft className="w-4 h-4" />
                        Events &amp; Feed
                    </Link>
                    <span className="text-gray-400">/</span>
                    <span className="text-[var(--gray)]">Instagram &amp; YouTube</span>
                </div>

                <p className="text-sm text-[var(--gray)] mb-6">
                    Turning a source off stops new imports. Posts already in the app stay until you archive them from Events &amp; Feed.
                </p>

                {errorMessage ? (
                    <div role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{errorMessage}</div>
                ) : null}

                {!sources && !errorMessage ? (
                    <div className="flex items-center justify-center py-16">
                        <Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" />
                    </div>
                ) : null}

                {sources ? (
                    <div className="space-y-3">
                        {SOURCES.map(({ key, label, icon: Icon, detail }) => (
                            <div key={key} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-start justify-between gap-4">
                                <div className="flex gap-3">
                                    <Icon className="w-5 h-5 mt-0.5 text-[var(--primary)]" />
                                    <div>
                                        <p className="text-sm font-semibold text-[var(--dark)]">{label}</p>
                                        <p className="text-sm text-[var(--gray)] mt-0.5">{detail}</p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    role="switch"
                                    aria-checked={sources[key]}
                                    aria-label={`Import from ${label}`}
                                    disabled={savingKey !== null}
                                    onClick={() => void toggle(key)}
                                    className={`relative w-11 h-6 flex-shrink-0 rounded-full transition-colors disabled:opacity-60 ${sources[key] ? "bg-[var(--primary)]" : "bg-gray-300"}`}
                                >
                                    <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${sources[key] ? "left-[22px]" : "left-0.5"}`} />
                                </button>
                            </div>
                        ))}
                    </div>
                ) : null}
            </div>
        </>
    );
}
