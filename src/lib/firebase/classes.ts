import { createClient } from "./client";
import type { Class } from "./types";

// â”€â”€ GET ALL â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export async function getClasses(filter?: { active_only?: boolean }) {
    const firebase = await createClient();
    let query = firebase.from("classes").select("*").order("created_at", { ascending: false });

    if (filter?.active_only) {
        query = query.eq("is_active", true);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data as Class[];
}

// â”€â”€ GET BY ID â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export async function getClassById(id: string) {
    const firebase = await createClient();
    const { data, error } = await firebase
        .from("classes")
        .select("*")
        .eq("id", id)
        .single();

    if (error) throw error;
    return data as Class;
}

// â”€â”€ GET BY SLUG â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export async function getClassBySlug(slug: string) {
    const firebase = await createClient();
    const { data, error } = await firebase
        .from("classes")
        .select("*")
        .eq("slug", slug)
        .single();

    if (error) throw error;
    return data as Class;
}

// â”€â”€ CREATE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export async function createClass(data: {
    slug: string;
    title: string;
    description: string;
    schedule?: string;
    time?: string;
    venue?: string;
    fee?: string;
    students_enrolled?: number;
    image_url?: string;
    objectives?: string[];
    registration_url?: string;
}) {
    const firebase = await createClient();
    const { data: cls, error } = await firebase
        .from("classes")
        .insert(data)
        .select()
        .single();

    if (error) throw error;
    return cls as Class;
}

// â”€â”€ UPDATE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export async function updateClass(
    id: string,
    data: Partial<Omit<Class, "id" | "created_at">>
) {
    const firebase = await createClient();
    const { data: cls, error } = await firebase
        .from("classes")
        .update(data)
        .eq("id", id)
        .select()
        .single();

    if (error) throw error;
    return cls as Class;
}

// â”€â”€ DELETE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export async function deleteClass(id: string) {
    const firebase = await createClient();
    const { error } = await firebase.from("classes").delete().eq("id", id);

    if (error) throw error;
}
