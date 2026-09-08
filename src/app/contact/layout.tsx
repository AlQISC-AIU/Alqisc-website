import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact Us",
  description: "Contact AL-QISC at Albukhary International University about classes, events, volunteering, and club activities.",
  alternates: { canonical: "/contact" },
};

export default function ContactLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
