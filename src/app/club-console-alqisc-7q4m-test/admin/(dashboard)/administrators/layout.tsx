import { requireAdminPermission } from "@/lib/firebase/admin";

export default async function AdministratorsLayout({
    children,
}: Readonly<{ children: React.ReactNode }>) {
    await requireAdminPermission("administrators");
    return children;
}
