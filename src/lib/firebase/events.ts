import { createClient } from "./client";
import type { Event } from "./types";

// â”€â”€ GET ALL â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export async function getEvents(filter?: { status?: string }) {
    const firebase = await createClient();
    let query = firebase.from("events").select("*").order("date", { ascending: false });

    if (filter?.status && filter.status !== "all") {
        query = query.eq("status", filter.status);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data as Event[];
}

// â”€â”€ GET BY ID â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export async function getEventById(id: string) {
    const firebase = await createClient();
    const { data, error } = await firebase
        .from("events")
        .select("*")
        .eq("id", id)
        .single();

    if (error) throw error;
    return data as Event;
}

// â”€â”€ GET FEATURED â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export async function getFeaturedEvents() {
    const firebase = await createClient();
    const { data, error } = await firebase
        .from("events")
        .select("*")
        .eq("is_featured", true)
        .eq("status", "upcoming")
        .order("date", { ascending: true })
        .limit(3);

    if (error) throw error;
    return data as Event[];
}

// â”€â”€ CREATE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export async function createEvent(data: {
    title: string;
    description: string;
    date: string;
    time?: string;
    location?: string;
    category?: string;
    status?: string;
    image_url?: string;
    is_featured?: boolean;
    registration_url?: string;
}) {
    const firebase = await createClient();
    const { data: event, error } = await firebase
        .from("events")
        .insert(data)
        .select()
        .single();

    if (error) throw error;
    return event as Event;
}

// â”€â”€ UPDATE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export async function updateEvent(
    id: string,
    data: Partial<Omit<Event, "id" | "created_at">>
) {
    const firebase = await createClient();
    const { data: event, error } = await firebase
        .from("events")
        .update(data)
        .eq("id", id)
        .select()
        .single();

    if (error) throw error;
    return event as Event;
}

// â”€â”€ DELETE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export async function deleteEvent(id: string) {
    const firebase = await createClient();
    const { error } = await firebase.from("events").delete().eq("id", id);

    if (error) throw error;
}
