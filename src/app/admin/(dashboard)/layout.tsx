import { AdminSidebar } from "@/components/admin/admin-layout";
import { GuidedTour } from "@/components/admin/guided-tour";
import { requireAdminSession } from "@/lib/firebase/admin";

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    await requireAdminSession();

    return (
        <div className="min-h-screen bg-[var(--light)]">
            <AdminSidebar />
            {/* Main content area - offset by sidebar width on desktop */}
            <div className="lg:ml-[260px] min-h-screen flex flex-col">
                {children}
            </div>
            <GuidedTour />
        </div>
    );
}
