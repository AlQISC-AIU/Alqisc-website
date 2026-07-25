import { createClient } from "./client";
import type { Member } from "./types";

// â”€â”€ GET MEMBERS BY TEAM â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export async function getMembersByTeam(teamId: string) {
    const firebase = await createClient();
    const { data, error } = await firebase
        .from("members")
        .select("*")
        .eq("team_id", teamId)
        .order("display_order", { ascending: true });

    if (error) throw error;
    return data as Member[];
}

// â”€â”€ CREATE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export async function createMember(data: {
    team_id: string;
    name: string;
    role: string;
    image_url?: string;
    socials?: Record<string, string>;
}) {
    const firebase = await createClient();

    // Get max display_order in team
    const { data: existing } = await firebase
        .from("members")
        .select("display_order")
        .eq("team_id", data.team_id)
        .order("display_order", { ascending: false })
        .limit(1);

    const nextOrder = existing && existing.length > 0 ? existing[0].display_order + 1 : 0;

    const { data: member, error } = await firebase
        .from("members")
        .insert({ ...data, display_order: nextOrder })
        .select()
        .single();

    if (error) throw error;
    return member as Member;
}

// â”€â”€ UPDATE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export async function updateMember(
    id: string,
    data: Partial<Omit<Member, "id">>
) {
    const firebase = await createClient();
    const { data: member, error } = await firebase
        .from("members")
        .update(data)
        .eq("id", id)
        .select()
        .single();

    if (error) throw error;
    return member as Member;
}

// â”€â”€ DELETE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export async function deleteMember(id: string) {
    const firebase = await createClient();
    const { error } = await firebase.from("members").delete().eq("id", id);

    if (error) throw error;
}

// â”€â”€ CREATE TEAM â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export async function createTeam(data: {
    department_id: string;
    title: string;
}) {
    const firebase = await createClient();

    const { data: existing } = await firebase
        .from("teams")
        .select("display_order")
        .eq("department_id", data.department_id)
        .order("display_order", { ascending: false })
        .limit(1);

    const nextOrder = existing && existing.length > 0 ? existing[0].display_order + 1 : 0;

    const { data: team, error } = await firebase
        .from("teams")
        .insert({ ...data, display_order: nextOrder })
        .select()
        .single();

    if (error) throw error;
    return team;
}

// â”€â”€ DELETE TEAM â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export async function deleteTeam(id: string) {
    const firebase = await createClient();
    const { error } = await firebase.from("teams").delete().eq("id", id);

    if (error) throw error;
}
