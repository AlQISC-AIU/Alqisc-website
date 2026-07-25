import { requireAdminPermission } from "@/lib/firebase/admin";

export default async function DepartmentsLayout({
    children,
}: Readonly<{ children: React.ReactNode }>) {
    await requireAdminPermission("departments");
    return children;
}
