import { createClient } from "./client";
import type { BlogPost } from "./types";

// â”€â”€ GET ALL (admin â€” all statuses) â”€â”€â”€â”€â”€â”€
export async function getPosts(filter?: { status?: string }) {
    const firebase = await createClient();
    let query = firebase.from("blog_posts").select("*").order("created_at", { ascending: false });

    if (filter?.status && filter.status !== "all") {
        query = query.eq("status", filter.status);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data as BlogPost[];
}

// â”€â”€ GET PUBLISHED (public website) â”€â”€â”€â”€â”€â”€
export async function getPublishedPosts() {
    const firebase = await createClient();
    const { data, error } = await firebase
        .from("blog_posts")
        .select("*")
        .eq("status", "published")
        .order("published_at", { ascending: false });

    if (error) throw error;
    return data as BlogPost[];
}

// â”€â”€ GET BY ID â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export async function getPostById(id: string) {
    const firebase = await createClient();
    const { data, error } = await firebase
        .from("blog_posts")
        .select("*")
        .eq("id", id)
        .single();

    if (error) throw error;
    return data as BlogPost;
}

// â”€â”€ GET BY SLUG â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export async function getPostBySlug(slug: string) {
    const firebase = await createClient();
    const { data, error } = await firebase
        .from("blog_posts")
        .select("*")
        .eq("slug", slug)
        .single();

    if (error) throw error;
    return data as BlogPost;
}

// â”€â”€ CREATE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export async function createPost(data: {
    title: string;
    slug: string;
    excerpt?: string;
    content?: string;
    category?: string;
    author?: string;
    status?: string;
    featured_image_url?: string;
}) {
    const firebase = await createClient();

    const insertData = {
        ...data,
        published_at: data.status === "published" ? new Date().toISOString() : null,
    };

    const { data: post, error } = await firebase
        .from("blog_posts")
        .insert(insertData)
        .select()
        .single();

    if (error) throw error;
    return post as BlogPost;
}

// â”€â”€ UPDATE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export async function updatePost(
    id: string,
    data: Partial<Omit<BlogPost, "id" | "created_at" | "updated_at">>
) {
    const firebase = await createClient();

    // If status is changing to published, set published_at
    const updateData = {
        ...data,
        ...(data.status === "published" && !data.published_at
            ? { published_at: new Date().toISOString() }
            : {}),
    };

    const { data: post, error } = await firebase
        .from("blog_posts")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

    if (error) throw error;
    return post as BlogPost;
}

// â”€â”€ DELETE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export async function deletePost(id: string) {
    const firebase = await createClient();
    const { error } = await firebase.from("blog_posts").delete().eq("id", id);

    if (error) throw error;
}
