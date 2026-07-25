import { requireAdminPermission } from "@/lib/firebase/admin";

export default async function EventsLayout({
    children,
}: Readonly<{ children: React.ReactNode }>) {
    await requireAdminPermission("events");
    return children;
}
