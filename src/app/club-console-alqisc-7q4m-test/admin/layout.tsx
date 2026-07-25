import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Admin Panel | Al-QIsc Club",
    description: "Al-QIsc Club Admin Dashboard — Manage website content",
    robots: {
        index: false,
        follow: false,
        noarchive: true,
        nosnippet: true,
    },
};

export default function AdminLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return <>{children}</>;
}
