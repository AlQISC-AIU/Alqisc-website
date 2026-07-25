"use client";

import { useState, useEffect } from "react";
import { AdminTopbar } from "@/components/admin/admin-layout";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Calendar, User, Tag, Edit3 } from "lucide-react";
import DOMPurify from "dompurify";

interface PreviewData {
    title: string;
    excerpt: string;
    content: string;
    category: string;
    author: string;
    image: string;
}

function PreviewContent() {
    const [data, setData] = useState<PreviewData | null>(null);

    useEffect(() => {
        const timer = window.setTimeout(() => {
            const stored = sessionStorage.getItem("blog_preview");
            if (stored) {
                try {
                    setData(JSON.parse(stored));
                } catch {
                    // Ignore invalid preview data.
                }
            }
        }, 0);
        return () => window.clearTimeout(timer);
    }, []);

    if (!data) {
        return (
            <div className="max-w-4xl mx-auto text-center py-20">
                <p className="text-[var(--gray)]">No preview data found. Go back to the editor and click &quot;Preview Post&quot;.</p>
                <Link href="/admin/blog" className="mt-4 inline-flex items-center gap-1.5 text-[var(--primary)] hover:underline text-sm font-semibold">
                    <ArrowLeft className="w-4 h-4" />
                    Back to Blog
                </Link>
            </div>
        );
    }

    const { title, excerpt, content, category, author, image } = data;

    const today = new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
    });

    return (
        <div className="max-w-4xl mx-auto">
            {/* Preview Banner */}
            <div className="bg-[var(--secondary)]/10 border border-[var(--secondary)]/30 rounded-xl p-3 mb-6 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[var(--secondary)] animate-pulse" />
                    <span className="text-sm font-medium text-[var(--dark)]">Preview Mode</span>
                    <span className="text-xs text-[var(--gray)]">— This is how your post will look to readers</span>
                </div>
                <Link
                    href="/admin/blog/new"
                    onClick={(e) => { e.preventDefault(); window.close(); }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[var(--primary)] bg-white rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                    <Edit3 className="w-3 h-3" />
                    Back to Editor
                </Link>
            </div>

            {/* Article Header */}
            <article className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                {/* Hero Image */}
                <div className="relative h-64 sm:h-80 bg-gray-100">
                    {image ? (
                        <Image
                            src={image}
                            alt={title}
                            fill
                            className="object-cover"
                            sizes="(max-width: 768px) 100vw, 800px"
                            unoptimized={image.startsWith("data:")}
                        />
                    ) : (
                        <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                            No featured image
                        </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8">
                        <span className="inline-block px-3 py-1 text-xs font-semibold bg-[var(--secondary)] text-[var(--dark)] rounded-full mb-3">
                            {category}
                        </span>
                        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white font-heading leading-tight">
                            {title}
                        </h1>
                    </div>
                </div>

                {/* Meta Info */}
                <div className="px-6 sm:px-8 py-4 border-b border-gray-100 flex flex-wrap items-center gap-4 text-sm text-[var(--gray)]">
                    <div className="flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-[var(--primary)]" />
                        <span>{today}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <User className="w-4 h-4 text-[var(--primary)]" />
                        <span>{author}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <Tag className="w-4 h-4 text-[var(--primary)]" />
                        <span>{category}</span>
                    </div>
                </div>

                {/* Excerpt */}
                {excerpt && (
                    <div className="px-6 sm:px-8 py-4 bg-[var(--light)] border-b border-gray-100">
                        <p className="text-base text-[var(--gray)] italic leading-relaxed">
                            {excerpt}
                        </p>
                    </div>
                )}

                {/* Content */}
                <div className="px-6 sm:px-8 py-8">
                    {content ? (
                        <div
                            className="blog-preview"
                            dangerouslySetInnerHTML={{
                                __html: DOMPurify.sanitize(content, {
                                    USE_PROFILES: { html: true },
                                    FORBID_TAGS: ["script", "style", "iframe", "object", "embed", "form"],
                                }),
                            }}
                        />
                    ) : (
                        <p className="text-center text-[var(--gray)] italic py-8">No content written yet.</p>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 sm:px-8 py-5 bg-gray-50 border-t border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[var(--primary)] flex items-center justify-center text-white font-bold text-sm">
                            {author.charAt(0)}
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-[var(--dark)]">{author}</p>
                            <p className="text-xs text-[var(--gray)]">AlQISC · {today}</p>
                        </div>
                    </div>
                </div>
            </article>
        </div>
    );
}

export default function BlogPreviewPage() {
    return (
        <>
            <AdminTopbar title="Preview Post" />
            <div className="flex-1 p-4 sm:p-6 lg:p-8">
                {/* Breadcrumb */}
                <div className="flex items-center gap-2 text-sm mb-6">
                    <Link href="/admin/blog" className="text-[var(--primary)] hover:underline flex items-center gap-1">
                        <ArrowLeft className="w-4 h-4" />
                        Blog
                    </Link>
                    <span className="text-gray-400">/</span>
                    <span className="text-[var(--gray)]">Preview</span>
                </div>

                <PreviewContent />
            </div>
        </>
    );
}
