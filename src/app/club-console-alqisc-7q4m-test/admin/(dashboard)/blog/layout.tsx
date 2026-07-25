import { requireAdminPermission } from "@/lib/firebase/admin";

export default async function BlogLayout({
    children,
}: Readonly<{ children: React.ReactNode }>) {
    await requireAdminPermission("blog");
    return children;
}
