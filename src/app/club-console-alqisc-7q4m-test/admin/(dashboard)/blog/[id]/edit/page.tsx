"use client";

import { useState, useEffect, useRef, use } from "react";
import { useRouter } from "next/navigation";
import { AdminTopbar } from "@/components/admin/admin-layout";
import { ImageEditorDialog } from "@/components/admin/image-editor";
import Link from "next/link";
import Image from "next/image";
import dynamic from "next/dynamic";
import {
    ArrowLeft,
    Save,
    Eye,
    Upload,
    X,
    Trash2,
    Loader2
} from "lucide-react";
import { createClient } from "@/lib/firebase/client";
import { uploadImageAction, deleteImageAction } from "@/lib/firebase/storage";
import type { BlogPost } from "@/lib/firebase/types";
import { notifications } from "@/components/ui/notification-provider";

const RichTextEditor = dynamic(() => import("@/components/admin/rich-text-editor"), {
    ssr: false,
    loading: () => (
        <div className="border border-gray-200 rounded-xl bg-white p-8 text-center text-sm text-[var(--gray)]">
            <Loader2 className="w-5 h-5 animate-spin mx-auto text-[var(--primary)]" />
            <p className="mt-2 text-gray-400">Loading editor...</p>
        </div>
    ),
});

export default function EditBlogPostPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [post, setPost] = useState<BlogPost | null>(null);
    const [loading, setLoading] = useState(true);
    const [fetchError, setFetchError] = useState("");

    const [title, setTitle] = useState("");
    const [excerpt, setExcerpt] = useState("");
    const [content, setContent] = useState("");
    const [status, setStatus] = useState("draft");
    const [category, setCategory] = useState("Quran");
    const [author, setAuthor] = useState("EXCO");

    const [imageUrl, setImageUrl] = useState("");
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [imageEditorSource, setImageEditorSource] = useState<File | string | null>(null);

    const [isSaving, setIsSaving] = useState(false);
    const setSaveError = (message: string) => message && notifications.error(message, "Post action failed");

    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        const fetchPost = async () => {
            const firebase = createClient();
            const { data, error } = await firebase
                .from("blog_posts")
                .select("*")
                .eq("id", id)
                .single();

            if (error) {
                setFetchError(error.message);
            } else if (data) {
                const p = data as BlogPost;
                setPost(p);
                setTitle(p.title);
                setExcerpt(p.excerpt || "");
                setContent(p.content || "");
                setStatus(p.status);
                setCategory(p.category || "Quran");
                setAuthor(p.author || "Admin");
                setImageUrl(p.featured_image_url || "");
            }
            setLoading(false);
        };

        fetchPost();
    }, [id]);

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setImageEditorSource(file);
        e.target.value = "";
    };

    const handleSave = async () => {
        if (!title.trim() || !excerpt.trim() || !content.trim()) {
            setSaveError("Title, Excerpt, and Content are required.");
            return;
        }

        setIsSaving(true);
        setSaveError("");
        let uploadedImageUrl = "";

        try {
            let finalImageUrl = imageUrl;

            // Upload new image if selected
            if (imageFile) {
                const uploadResult = await uploadImageAction(imageFile, "blog");
                finalImageUrl = uploadResult.url;
                uploadedImageUrl = uploadResult.url;
            }

            const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

            // Handle publishing
            let published_at = post?.published_at;
            if (status === "published" && post?.status !== "published") {
                published_at = new Date().toISOString();
            }

            const firebase = createClient();
            const { error: dbError } = await firebase
                .from("blog_posts")
                .update({
                    title,
                    slug,
                    excerpt,
                    content,
                    category,
                    author,
                    status,
                    featured_image_url: finalImageUrl,
                    published_at,
                })
                .eq("id", id);

            if (dbError) throw new Error(dbError.message);
            if (uploadedImageUrl) {
                await deleteImageAction(imageUrl).catch((imageError) =>
                    console.error("Failed to delete replaced Firebase image", imageError)
                );
            }

            notifications.success("The post was updated successfully.", "Post updated");
            router.push("/club-console-alqisc-7q4m-test/admin/blog");
            router.refresh();
        } catch (err) {
            if (uploadedImageUrl) await deleteImageAction(uploadedImageUrl).catch(() => undefined);
            setSaveError(err instanceof Error ? err.message : "Failed to update internal post");
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        setIsDeleting(true);
        try {
            const firebase = createClient();
            const { error } = await firebase.from("blog_posts").delete().eq("id", id);
            if (error) throw new Error(error.message);
            await deleteImageAction(imageUrl).catch((imageError) =>
                console.error("Failed to delete Firebase image", imageError)
            );

            notifications.success("The post was deleted successfully.", "Post deleted");
            router.push("/club-console-alqisc-7q4m-test/admin/blog");
            router.refresh();
        } catch (err) {
            setSaveError(err instanceof Error ? err.message : "Failed to delete post");
            setIsDeleting(false);
            setShowDeleteModal(false);
        }
    };

    if (loading) {
        return (
            <>
                <AdminTopbar title="Edit Post" />
                <div className="flex-1 flex items-center justify-center p-8">
                    <Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" />
                </div>
            </>
        );
    }

    if (fetchError || !post) {
        return (
            <>
                <AdminTopbar title="Edit Post" />
                <div className="flex-1 p-8 text-center">
                    <p className="text-[var(--gray)]">{fetchError || "Post not found."}</p>
                    <Link href="/club-console-alqisc-7q4m-test/admin/blog" className="text-[var(--primary)] hover:underline mt-2 inline-block">
                        ← Back to Blog
                    </Link>
                </div>
            </>
        );
    }

    return (
        <>
            <AdminTopbar title="Edit Post" />
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
                    <Link href="/club-console-alqisc-7q4m-test/admin/blog" className="text-[var(--primary)] hover:underline flex items-center gap-1">
                        <ArrowLeft className="w-4 h-4" />
                        Blog
                    </Link>
                    <span className="text-gray-400">/</span>
                    <span className="text-[var(--gray)] truncate max-w-[200px]">{post.title}</span>
                </div>

                <div className="max-w-6xl">
                    <div className="grid lg:grid-cols-3 gap-6 flex-col-reverse lg:flex-row">
                        {/* Left Column */}
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
                                    placeholder="A short summary..."
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
                                    placeholder="Write your content here..."
                                />
                            </div>
                        </div>

                        {/* Right Column */}
                        <div className="space-y-5">
                            {/* Publishing */}
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

                                {(imagePreview || imageUrl) ? (
                                    <div className="space-y-3">
                                        <div className="relative aspect-video rounded-xl overflow-hidden border border-gray-100">
                                            <Image src={imagePreview || imageUrl} alt="Preview" fill className="object-cover" sizes="300px" />
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => fileInputRef.current?.click()}
                                                className="flex-1 text-xs font-semibold text-[var(--primary)] bg-[var(--primary)]/10 py-2 rounded-lg hover:bg-[var(--primary)]/20 transition-colors"
                                            >
                                                Change
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setImageEditorSource(imageFile || imageUrl)}
                                                className="flex-1 text-xs font-semibold text-[var(--primary)] bg-[var(--primary)]/10 py-2 rounded-lg hover:bg-[var(--primary)]/20 transition-colors"
                                            >
                                                Edit crop
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setImagePreview(null);
                                                    setImageFile(null);
                                                    setImageUrl("");
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
                                        className="border-2 border-dashed border-gray-200 rounded-xl p-4 text-center hover:border-[var(--primary)]/40 transition-colors cursor-pointer group"
                                    >
                                        <Upload className="w-6 h-6 text-gray-300 mx-auto mb-1 group-hover:text-[var(--primary)]/60 transition-colors" />
                                        <p className="text-xs text-[var(--gray)]">
                                            <span className="text-[var(--primary)] font-medium">Click to upload image</span>
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Preview Button */}
                            <button
                                type="button"
                                onClick={() => {
                                    sessionStorage.setItem("blog_preview", JSON.stringify({
                                        title,
                                        excerpt,
                                        content,
                                        category,
                                        author,
                                        image: imagePreview || imageUrl || "",
                                    }));
                                    window.open("/club-console-alqisc-7q4m-test/admin/blog/preview", "_blank");
                                }}
                                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-[var(--primary)] bg-[var(--primary)]/10 border border-[var(--primary)]/20 rounded-xl hover:bg-[var(--primary)]/20 transition-all cursor-pointer"
                            >
                                <Eye className="w-4 h-4" />
                                Preview Post
                            </button>

                            {/* Danger Zone */}
                            <div className="bg-red-50 rounded-2xl border border-red-100 p-5">
                                <h4 className="text-sm font-semibold text-red-700 mb-2">Danger Zone</h4>
                                <p className="text-xs text-red-600/70 mb-3">Deleting this post is permanent.</p>
                                <button
                                    type="button"
                                    onClick={() => setShowDeleteModal(true)}
                                    className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    Delete Post
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Bottom Actions */}
                    <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3 mt-8 pt-6 border-t border-gray-100">
                        <Link
                            href="/club-console-alqisc-7q4m-test/admin/blog"
                            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 text-sm font-semibold text-[var(--gray)] bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all disabled:opacity-50"
                        >
                            <X className="w-4 h-4" />
                            Cancel
                        </Link>
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-[var(--primary)] rounded-xl hover:bg-[var(--primary-dark)] transition-all shadow-sm disabled:opacity-60"
                        >
                            {isSaving ? (
                                <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
                            ) : (
                                <><Save className="w-4 h-4" /> Save Changes</>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Delete Modal */}
            {showDeleteModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6">
                        <h3 className="text-lg font-bold text-[var(--dark)] mb-2">Delete Post?</h3>
                        <p className="text-sm text-[var(--gray)] mb-6">
                            Are you sure you want to delete &quot;{post.title}&quot;? This cannot be undone.
                        </p>
                        <div className="flex gap-3">
                            <button onClick={() => setShowDeleteModal(false)} className="flex-1 px-4 py-2.5 text-sm font-semibold text-[var(--gray)] bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors">
                                Cancel
                            </button>
                            <button onClick={handleDelete} disabled={isDeleting} className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-red-500 rounded-xl hover:bg-red-600 transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
                                {isDeleting && <Loader2 className="w-4 h-4 animate-spin" />}
                                {isDeleting ? "Deleting..." : "Yes, Delete"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
