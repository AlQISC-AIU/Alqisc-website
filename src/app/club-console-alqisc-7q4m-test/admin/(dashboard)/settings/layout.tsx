import { requireAdminPermission } from "@/lib/firebase/admin";

export default async function SettingsLayout({
    children,
}: Readonly<{ children: React.ReactNode }>) {
    await requireAdminPermission("settings");
    return children;
}
