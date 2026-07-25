"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { AdminTopbar } from "@/components/admin/admin-layout";
import { ImageEditorDialog } from "@/components/admin/image-editor";
import Link from "next/link";
import dynamic from "next/dynamic";
import Image from "next/image";
import {
    ArrowLeft,
    Save,
    Eye,
    Upload,
    X,
    Loader2
} from "lucide-react";
import { createClient } from "@/lib/firebase/client";
import { uploadImageAction, deleteImageAction } from "@/lib/firebase/storage";
import { notifications } from "@/components/ui/notification-provider";
// We don't necessarily need the server action if we just do client side insert, but using the existing `createPost` would also be fine. 
// However, using the firebase client directly here gives us better error handling control.

// Dynamic import to avoid SSR issues with TipTap
const RichTextEditor = dynamic(() => import("@/components/admin/rich-text-editor"), {
    ssr: false,
    loading: () => (
        <div className="border border-gray-200 rounded-xl bg-white p-8 text-center text-sm text-[var(--gray)]">
            <Loader2 className="w-5 h-5 animate-spin mx-auto text-[var(--primary)]" />
            <p className="mt-2 text-gray-400">Loading editor...</p>
        </div>
    ),
});

export default function NewBlogPostPage() {
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [title, setTitle] = useState("");
    const [excerpt, setExcerpt] = useState("");
    const [content, setContent] = useState("");
    const [status, setStatus] = useState("draft");
    const [category, setCategory] = useState("Quran");
    const [author, setAuthor] = useState("EXCO");

    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [imageEditorSource, setImageEditorSource] = useState<File | null>(null);

    const [isSaving, setIsSaving] = useState(false);
    const setError = (message: string) => message && notifications.error(message, "Post not created");

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setImageEditorSource(file);
        e.target.value = "";
    };

    const handleSave = async (savedStatus: string) => {
        if (!title.trim() || !excerpt.trim() || !content.trim()) {
            setError("Title, Excerpt, and Content are required.");
            return;
        }

        setIsSaving(true);
        setError("");

        try {
            let featured_image_url = "";

            if (imageFile) {
                const uploadResult = await uploadImageAction(imageFile, "blog");
                featured_image_url = uploadResult.url;
            }

            const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

            const firebase = createClient();
            const { error: dbError } = await firebase.from("blog_posts").insert({
                title,
                slug,
                excerpt,
                content,
                category,
                author,
                status: savedStatus,
                featured_image_url,
                published_at: savedStatus === "published" ? new Date().toISOString() : null,
            });

            if (dbError) {
                await deleteImageAction(featured_image_url).catch(() => undefined);
                throw new Error(dbError.message);
            }

            notifications.success(savedStatus === "published" ? "The post was published." : "The post was saved as a draft.", "Post created");
            router.push("/admin/blog");
            router.refresh();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to create post");
            setIsSaving(false);
        }
    };

    return (
        <>
            <AdminTopbar title="Write New Post" />
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
                    <Link href="/admin/blog" className="text-[var(--primary)] hover:underline flex items-center gap-1">
                        <ArrowLeft className="w-4 h-4" />
                        Blog
                    </Link>
                    <span className="text-gray-400">/</span>
                    <span className="text-[var(--gray)]">Write New Post</span>
                </div>

                <div className="max-w-6xl" data-tour="blog-form">
                    <div className="grid lg:grid-cols-3 gap-6 flex-col-reverse lg:flex-row">
                        {/* Left Column — Editor */}
                        <div className="lg:col-span-2 space-y-5">
                            {/* Title */}
                            <div>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="Enter a compelling title..."
                                    className="w-full px-0 py-3 text-2xl sm:text-3xl font-bold text-[var(--dark)] placeholder:text-gray-300 border-0 border-b-2 border-gray-100 focus:border-[var(--primary)] focus:outline-none bg-transparent transition-colors font-heading"
                                />
                            </div>

                            {/* Excerpt */}
                            <div>
                                <label className="block text-sm font-medium text-[var(--dark)] mb-1.5">
                                    Excerpt <span className="text-red-400">*</span>
                                </label>
                                <textarea
                                    value={excerpt}
                                    onChange={(e) => setExcerpt(e.target.value)}
                                    rows={2}
                                    placeholder="A short summary of the post..."
                                    className="w-full px-4 py-3 bg-[var(--light)] border border-gray-200 rounded-xl text-sm text-[var(--dark)] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30 focus:border-[var(--primary)] transition-all resize-none"
                                />
                            </div>

                            {/* Content Editor */}
                            <div>
                                <label className="block text-sm font-medium text-[var(--dark)] mb-2">
                                    Content <span className="text-red-400">*</span>
                                </label>
                                <RichTextEditor
                                    content={content}
                                    onChange={setContent}
                                    placeholder="Start writing your blog post... Use the toolbar above to format text, add headings, insert images, and more."
                                />
                            </div>
                        </div>

                        {/* Right Column — Sidebar */}
                        <div className="space-y-5">
                            {/* Publishing Options */}
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                                <h3 className="text-sm font-bold text-[var(--dark)] mb-4">Publishing</h3>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-medium text-[var(--gray)] mb-1.5">Status</label>
                                        <select
                                            value={status}
                                            onChange={(e) => setStatus(e.target.value)}
                                            className="w-full px-3 py-2.5 bg-[var(--light)] border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30 focus:border-[var(--primary)] text-[var(--dark)]"
                                        >
                                            <option value="draft">Draft</option>
                                            <option value="published">Published</option>
                                            <option value="archived">Archived</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-[var(--gray)] mb-1.5">Category</label>
                                        <select
                                            value={category}
                                            onChange={(e) => setCategory(e.target.value)}
                                            className="w-full px-3 py-2.5 bg-[var(--light)] border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30 focus:border-[var(--primary)] text-[var(--dark)]"
                                        >
                                            <option>Quran</option>
                                            <option>Hadith</option>
                                            <option>Islamic Studies</option>
                                            <option>Community</option>
                                            <option>Events</option>
                                            <option>Education</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-[var(--gray)] mb-1.5">Author</label>
                                        <select
                                            value={author}
                                            onChange={(e) => setAuthor(e.target.value)}
                                            className="w-full px-3 py-2.5 bg-[var(--light)] border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30 focus:border-[var(--primary)] text-[var(--dark)]"
                                        >
                                            <option>Admin</option>
                                            <option>EXCO</option>
                                            <option>Education Dept</option>
                                            <option>Da&apos;wah Dept</option>
                                            <option>Media Dept</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Featured Image */}
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                                <h3 className="text-sm font-bold text-[var(--dark)] mb-3">Featured Image</h3>
                                <input
                                    type="file"
                                    accept="image/*"
                                    ref={fileInputRef}
                                    className="hidden"
                                    onChange={handleImageSelect}
                                />

                                {imagePreview ? (
                                    <div className="space-y-3">
                                        <div className="relative aspect-video rounded-xl overflow-hidden border border-gray-100">
                                            <Image src={imagePreview} alt="Preview" fill className="object-cover" sizes="300px" />
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => fileInputRef.current?.click()}
                                                className="flex-1 text-xs font-semibold text-[var(--primary)] bg-[var(--primary)]/10 py-2 rounded-lg hover:bg-[var(--primary)]/20 transition-colors"
                                            >
                                                Change
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setImagePreview(null);
                                                    setImageFile(null);
                                                    if (fileInputRef.current) fileInputRef.current.value = "";
                                                }}
                                                className="flex-1 text-xs font-semibold text-red-500 bg-red-50 py-2 rounded-lg hover:bg-red-100 transition-colors"
                                            >
                                                Remove
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div
                                        onClick={() => fileInputRef.current?.click()}
                                        className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center hover:border-[var(--primary)]/40 transition-colors cursor-pointer group"
                                    >
                                        <Upload className="w-8 h-8 text-gray-300 mx-auto mb-2 group-hover:text-[var(--primary)]/60 transition-colors" />
                                        <p className="text-sm text-[var(--gray)]">
                                            Drag & drop or <span className="text-[var(--primary)] font-medium">click to upload</span>
                                        </p>
                                        <p className="text-xs text-gray-400 mt-1">PNG, JPG up to 5MB</p>
                                    </div>
                                )}
                            </div>

                            {/* Preview Button */}
                            <button
                                type="button"
                                onClick={() => {
                                    sessionStorage.setItem("blog_preview", JSON.stringify({
                                        title: title || "Untitled Post",
                                        excerpt,
                                        content,
                                        category,
                                        author,
                                        image: imagePreview || "",
                                    }));
                                    window.open("/admin/blog/preview", "_blank");
                                }}
                                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-[var(--primary)] bg-[var(--primary)]/10 border border-[var(--primary)]/20 rounded-xl hover:bg-[var(--primary)]/20 transition-all cursor-pointer"
                            >
                                <Eye className="w-4 h-4" />
                                Preview Post
                            </button>
                        </div>
                    </div>

                    {/* Bottom Actions */}
                    <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3 mt-8 pt-6 border-t border-gray-100">
                        <Link
                            href="/admin/blog"
                            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 text-sm font-semibold text-[var(--gray)] bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all disabled:opacity-50"
                        >
                            <X className="w-4 h-4" />
                            Cancel
                        </Link>
                        <button
                            onClick={() => handleSave("draft")}
                            disabled={isSaving}
                            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 text-sm font-semibold text-[var(--dark)] bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all disabled:opacity-60"
                        >
                            {isSaving && status === "draft" ? (
                                <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
                            ) : (
                                <><Save className="w-4 h-4" /> Save Draft</>
                            )}
                        </button>
                        <button
                            onClick={() => handleSave("published")}
                            disabled={isSaving}
                            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-[var(--primary)] rounded-xl hover:bg-[var(--primary-dark)] transition-all shadow-sm disabled:opacity-60"
                        >
                            {isSaving && status === "published" ? (
                                <><Loader2 className="w-4 h-4 animate-spin" /> Publishing...</>
                            ) : (
                                <><Save className="w-4 h-4" /> Publish Post</>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}
