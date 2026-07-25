import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Admin Panel | Al-QIsc Club",
    description: "Al-QIsc Club Admin Dashboard — Manage website content",
};

export default function AdminLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return <>{children}</>;
}
