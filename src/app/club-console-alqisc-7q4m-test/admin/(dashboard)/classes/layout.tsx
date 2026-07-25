import { requireAdminPermission } from "@/lib/firebase/admin";

export default async function ClassesLayout({
    children,
}: Readonly<{ children: React.ReactNode }>) {
    await requireAdminPermission("classes");
    return children;
}
