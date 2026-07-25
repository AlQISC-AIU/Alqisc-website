import { redirect } from "next/navigation";
import { normalizeAdminEmail, PRIMARY_ADMIN_EMAIL, requireAdminSession } from "@/lib/firebase/admin";

export default async function AdministratorsLayout({
    children,
}: Readonly<{ children: React.ReactNode }>) {
    const token = await requireAdminSession();
    if (!token.email || normalizeAdminEmail(token.email) !== PRIMARY_ADMIN_EMAIL) {
        redirect("/admin/dashboard");
    }
    return children;
}
