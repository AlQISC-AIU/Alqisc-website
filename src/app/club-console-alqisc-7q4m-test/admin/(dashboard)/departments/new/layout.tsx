import { redirect } from "next/navigation";
import { requireAdminPermission } from "@/lib/firebase/admin";

export default async function NewDepartmentLayout({
    children,
}: Readonly<{ children: React.ReactNode }>) {
    const { access } = await requireAdminPermission("departments");
    if (access.role === "department_head") {
        redirect("/club-console-alqisc-7q4m-test/admin/departments");
    }
    return children;
}
