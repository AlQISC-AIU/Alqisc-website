"use client";

import { useState, useEffect } from "react";
import { AdminTopbar } from "@/components/admin/admin-layout";
import Link from "next/link";
import {
    Plus,
    Search,
    Edit3,
    Trash2,
    Eye,
    Calendar,
    User,
    Loader2
} from "lucide-react";
import { createClient } from "@/lib/firebase/client";
import type { BlogPost } from "@/lib/firebase/types";
import { deleteImageAction } from "@/lib/firebase/storage";
import { notifications } from "@/components/ui/notification-provider";

const filters = [
    { id: "all", label: "All" },
    { id: "published", label: "Published" },
    { id: "draft", label: "Drafts" },
    { id: "archived", label: "Archived" },
];

function statusLabel(status: string) {
    if (status === "published") return "Published";
    if (status === "archived") return "Archived";
    return "Draft";
}

function savePreview(post: BlogPost) {
    sessionStorage.setItem("blog_preview", JSON.stringify({
        title: post.title,
        excerpt: post.excerpt,
        content: post.content,
        category: post.category,
        author: post.author,
        image: post.featured_image_url,
    }));
}

const categoryColors: Record<string, string> = {
    Quran: "bg-emerald-50 text-emerald-600",
    Ramadan: "bg-amber-50 text-amber-600",
    Community: "bg-blue-50 text-blue-600",
};

export default function BlogPage() {
    const [posts, setPosts] = useState<BlogPost[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeFilter, setActiveFilter] = useState("all");
    const [search, setSearch] = useState("");
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null);
    const [error, setError] = useState("");

    const fetchPosts = async () => {
        setLoading(true);
        const firebase = createClient();
        const { data, error } = await firebase
            .from("blog_posts")
            .select("*")
            .order("created_at", { ascending: false });

        if (error) {
            setError(error.message);
        } else {
            setPosts(data as BlogPost[]);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchPosts();
    }, []);

    const handleDelete = async (id: string, imageUrl: string | null) => {
        setDeletingId(id);
        try {
            const firebase = createClient();
            const { error: dbError } = await firebase.from("blog_posts").delete().eq("id", id);
            if (dbError) throw new Error(dbError.message);
            if (imageUrl) {
                await deleteImageAction(imageUrl).catch((imageError) =>
                    console.error("Failed to delete Firebase cover image", imageError)
                );
            }

            setPosts((prev) => prev.filter((p) => p.id !== id));
            notifications.success("The post was deleted successfully.", "Post deleted");
        } catch (err) {
            notifications.error(err instanceof Error ? err.message : "Failed to delete post", "Post not deleted");
        }
        setDeletingId(null);
        setShowDeleteModal(null);
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric"
        });
    };

    const filtered = posts
        .filter((p) => activeFilter === "all" || p.status === activeFilter)
        .filter((p) => p.title.toLowerCase().includes(search.toLowerCase()) || (p.category && p.category.toLowerCase().includes(search.toLowerCase())));

    return (
        <>
            <AdminTopbar title="Blog" />

            <div className="flex-1 p-4 sm:p-6 lg:p-8">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
                    <div>
                        <h2 className="text-xl sm:text-2xl font-bold text-[var(--dark)]">
                            Manage Blog Posts
                        </h2>
                        <p className="text-sm text-[var(--gray)] mt-1">
                            {posts.length} posts ·{" "}
                            {posts.filter((p) => p.status === "published").length} published ·{" "}
                            {posts.filter((p) => p.status === "draft").length} drafts
                        </p>
                    </div>
                    <Link data-tour="blog-add" href="/admin/blog/new" className="inline-flex items-center gap-2 px-4 py-2.5 bg-[var(--primary)] text-white text-sm font-semibold rounded-xl hover:bg-[var(--primary-dark)] transition-all shadow-sm self-start sm:self-auto">
                        <Plus className="w-4 h-4" />
                        Write New Post
                    </Link>
                </div>

                {error && (
                    <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
                        {error}
                    </div>
                )}

                {/* Filters & Search */}
                <div data-tour="blog-filters" className="flex flex-col sm:flex-row gap-3 mb-6">
                    <div className="flex gap-1 bg-white rounded-xl p-1 border border-gray-100 shadow-sm overflow-x-auto max-w-full">
                        {filters.map((f) => (
                            <button
                                key={f.id}
                                onClick={() => setActiveFilter(f.id)}
                                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all whitespace-nowrap ${activeFilter === f.id
                                    ? "bg-[var(--primary)] text-white shadow-sm"
                                    : "text-[var(--gray)] hover:text-[var(--dark)] hover:bg-gray-50"
                                    }`}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search posts..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30 focus:border-[var(--primary)] transition-all"
                        />
                    </div>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-16">
                        <Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" />
                    </div>
                ) : (
                    <>
                        {/* Blog Posts Table — Desktop */}
                        <div className="hidden lg:block bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-gray-100 bg-gray-50/50">
                                        <th className="text-left text-xs font-semibold uppercase tracking-wider text-[var(--gray)] px-6 py-4">Title</th>
                                        <th className="text-left text-xs font-semibold uppercase tracking-wider text-[var(--gray)] px-4 py-4">Category</th>
                                        <th className="text-left text-xs font-semibold uppercase tracking-wider text-[var(--gray)] px-4 py-4">Author</th>
                                        <th className="text-left text-xs font-semibold uppercase tracking-wider text-[var(--gray)] px-4 py-4">Date</th>
                                        <th className="text-left text-xs font-semibold uppercase tracking-wider text-[var(--gray)] px-4 py-4">Status</th>
                                        <th className="text-right text-xs font-semibold uppercase tracking-wider text-[var(--gray)] px-6 py-4">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.map((post) => (
                                        <tr key={post.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="max-w-sm">
                                                    <p className="text-sm font-semibold text-[var(--dark)] truncate" title={post.title}>{post.title}</p>
                                                    <p className="text-xs text-[var(--gray)] truncate mt-0.5" title={post.excerpt}>{post.excerpt || "No excerpt"}</p>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4">
                                                <span className={`inline-block px-2.5 py-1 text-xs font-semibold rounded-lg whitespace-nowrap ${categoryColors[post.category] || "bg-gray-100 text-gray-600"}`}>
                                                    {post.category || "Uncategorized"}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4">
                                                <span className="text-sm text-[var(--gray)] whitespace-nowrap">{post.author || "Admin"}</span>
                                            </td>
                                            <td className="px-4 py-4">
                                                <span className="text-sm text-[var(--gray)] whitespace-nowrap">
                                                    {formatDate(post.published_at || post.created_at)}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4">
                                                <span className={`inline-block px-2.5 py-1 text-xs font-semibold rounded-lg whitespace-nowrap ${post.status === "published" ? "bg-green-50 text-green-600" : "bg-orange-50 text-orange-500"}`}>
                                                    {statusLabel(post.status)}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center justify-end gap-1">
                                                    <Link
                                                        href="/admin/blog/preview"
                                                        onClick={() => savePreview(post)}
                                                        className="p-2 text-[var(--gray)] hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors" title="Preview"
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                    </Link>
                                                    <Link
                                                        href={`/admin/blog/${post.id}/edit`}
                                                        className="p-2 text-[var(--gray)] hover:text-[var(--primary)] hover:bg-[var(--primary)]/10 rounded-lg transition-colors" title="Edit"
                                                    >
                                                        <Edit3 className="w-4 h-4" />
                                                    </Link>
                                                    <button onClick={() => setShowDeleteModal(post.id)} className="p-2 text-[var(--gray)] hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Delete">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {filtered.length === 0 && (
                                <div className="text-center py-12">
                                    <p className="text-[var(--gray)]">No posts found.</p>
                                </div>
                            )}
                        </div>

                        {/* Blog Cards — Mobile */}
                        <div className="lg:hidden space-y-3">
                            {filtered.map((post) => (
                                <div key={post.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                                    <div className="flex items-start justify-between gap-2 mb-2">
                                        <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-md ${categoryColors[post.category] || "bg-gray-100 text-gray-600"}`}>
                                            {post.category || "Uncategorized"}
                                        </span>
                                        <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-md ${post.status === "published" ? "bg-green-50 text-green-600" : "bg-orange-50 text-orange-500"}`}>
                                            {statusLabel(post.status)}
                                        </span>
                                    </div>
                                    <h3 className="text-sm font-bold text-[var(--dark)] mb-1 leading-tight">{post.title}</h3>
                                    <p className="text-xs text-[var(--gray)] line-clamp-2 mb-3">{post.excerpt}</p>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3 text-xs text-[var(--gray)]">
                                            <span className="flex items-center gap-1"><User className="w-3 h-3" />{post.author || "Admin"}</span>
                                            <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{formatDate(post.published_at || post.created_at)}</span>
                                        </div>
                                        <div className="flex gap-1">
                                            <Link href="/admin/blog/preview" onClick={() => savePreview(post)} className="p-1.5 text-[var(--gray)] hover:text-blue-500 rounded-lg" title="Preview">
                                                <Eye className="w-4 h-4" />
                                            </Link>
                                            <Link href={`/admin/blog/${post.id}/edit`} className="p-1.5 text-[var(--gray)] hover:text-[var(--primary)] rounded-lg">
                                                <Edit3 className="w-4 h-4" />
                                            </Link>
                                            <button onClick={() => setShowDeleteModal(post.id)} className="p-1.5 text-[var(--gray)] hover:text-red-500 rounded-lg">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {filtered.length === 0 && (
                                <div className="text-center py-12 bg-white rounded-xl">
                                    <p className="text-[var(--gray)]">No posts found.</p>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>

            {/* Delete Confirmation Modal */}
            {showDeleteModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6">
                        <h3 className="text-lg font-bold text-[var(--dark)] mb-2">Delete Post?</h3>
                        <p className="text-sm text-[var(--gray)] mb-6">
                            Are you sure you want to delete &quot;{posts.find((p) => p.id === showDeleteModal)?.title}&quot;? This action cannot be undone.
                        </p>
                        <div className="flex gap-3">
                            <button onClick={() => setShowDeleteModal(null)} className="flex-1 px-4 py-2.5 text-sm font-semibold text-[var(--gray)] bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors">
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    const post = posts.find(p => p.id === showDeleteModal);
                                    if (post) handleDelete(post.id, post.featured_image_url);
                                }}
                                disabled={deletingId === showDeleteModal}
                                className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-red-500 rounded-xl hover:bg-red-600 transition-colors disabled:opacity-60"
                            >
                                {deletingId === showDeleteModal ? "Deleting..." : "Yes, Delete"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
