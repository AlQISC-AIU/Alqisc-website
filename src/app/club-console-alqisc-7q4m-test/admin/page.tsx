import { redirect } from "next/navigation";
import { ADMIN_LOGIN_PATH } from "@/lib/admin-routes";

export default function AdminIndexPage() {
    redirect(ADMIN_LOGIN_PATH);
}
