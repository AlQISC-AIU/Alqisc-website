import { createClient } from "./client";
import type { SiteSetting } from "./types";

// â”€â”€ GET ALL SETTINGS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export async function getSettings() {
    const firebase = await createClient();
    const { data, error } = await firebase
        .from("site_settings")
        .select("*")
        .order("key");

    if (error) throw error;

    // Convert array to key-value object for easy access
    const settings: Record<string, string> = {};
    (data as SiteSetting[]).forEach((s) => {
        settings[s.key] = s.value;
    });
    return settings;
}

// â”€â”€ UPDATE A SINGLE SETTING â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export async function updateSetting(key: string, value: string) {
    const firebase = await createClient();
    const { error } = await firebase
        .from("site_settings")
        .upsert({ key, value }, { onConflict: "key" });

    if (error) throw error;
}

// â”€â”€ UPDATE MULTIPLE SETTINGS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export async function updateSettings(settings: Record<string, string>) {
    const firebase = createClient();
    const payload = Object.entries(settings).map(([key, value]) => ({ key, value }));
    const { error } = await firebase
        .from("site_settings")
        .upsert(payload, { onConflict: "key" });
    if (error) throw error;
}
