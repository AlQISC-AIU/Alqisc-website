import { redirect } from "next/navigation";
import { canManageDepartment } from "@/lib/admin-access";
import {
    getFirebaseAdminDb,
    requireAdminPermission,
} from "@/lib/firebase/admin";

export default async function EditDepartmentLayout({
    children,
    params,
}: Readonly<{
    children: React.ReactNode;
    params: Promise<{ slug: string }>;
}>) {
    const { access } = await requireAdminPermission("departments");
    if (access.role !== "department_head") return children;

    const { slug } = await params;
    const snapshot = await getFirebaseAdminDb()
        .collection("departments")
        .where("slug", "==", slug)
        .limit(1)
        .get();
    const department = snapshot.docs[0];
    if (!department || !canManageDepartment(access, department.id)) {
        redirect("/club-console-alqisc-7q4m-test/admin/departments");
    }
    return children;
}
