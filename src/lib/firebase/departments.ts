import { createClient } from "./client";
import type { Department, Team } from "./types";

// â”€â”€ GET ALL â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export async function getDepartments() {
    const firebase = await createClient();
    const { data, error } = await firebase
        .from("departments")
        .select("*")
        .order("display_order", { ascending: true });

    if (error) throw error;
    return data as Department[];
}

// â”€â”€ GET ACTIVE ONLY (for public navbar / pages) â”€â”€
export async function getActiveDepartments() {
    const firebase = await createClient();
    const { data, error } = await firebase
        .from("departments")
        .select("*")
        .eq("is_active", true)
        .order("display_order", { ascending: true });

    if (error) throw error;
    return data as Department[];
}

// â”€â”€ GET BY SLUG (with teams & members) â”€â”€
export async function getDepartmentBySlug(slug: string) {
    const firebase = await createClient();

    // Get department
    const { data: dept, error: deptError } = await firebase
        .from("departments")
        .select("*")
        .eq("slug", slug)
        .single();

    if (deptError) throw deptError;

    // Get teams with members
    const { data: teams, error: teamsError } = await firebase
        .from("teams")
        .select("*, members(*)")
        .eq("department_id", dept.id)
        .order("display_order", { ascending: true });

    if (teamsError) throw teamsError;

    // Sort members within each team
    const sortedTeams = (teams || []).map((team: Team) => ({
        ...team,
        members: (team.members || []).sort(
            (a: { display_order: number }, b: { display_order: number }) =>
                a.display_order - b.display_order
        ),
    }));

    return { ...dept, teams: sortedTeams } as Department;
}

// â”€â”€ CREATE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export async function createDepartment(data: {
    slug: string;
    name: string;
    full_name: string;
    description: string;
    image_url?: string;
    objectives: string[];
    responsibilities: string[];
}) {
    const firebase = await createClient();

    // Get max display_order
    const { data: existing } = await firebase
        .from("departments")
        .select("display_order")
        .order("display_order", { ascending: false })
        .limit(1);

    const nextOrder = existing && existing.length > 0 ? existing[0].display_order + 1 : 0;

    const { data: dept, error } = await firebase
        .from("departments")
        .insert({ ...data, display_order: nextOrder })
        .select()
        .single();

    if (error) throw error;
    return dept as Department;
}

// â”€â”€ UPDATE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export async function updateDepartment(
    id: string,
    data: Partial<Omit<Department, "id" | "created_at" | "updated_at">>
) {
    const firebase = await createClient();
    const { data: dept, error } = await firebase
        .from("departments")
        .update(data)
        .eq("id", id)
        .select()
        .single();

    if (error) throw error;
    return dept as Department;
}

// â”€â”€ DELETE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export async function deleteDepartment(id: string) {
    const firebase = await createClient();
    const { error } = await firebase.from("departments").delete().eq("id", id);

    if (error) throw error;
}
