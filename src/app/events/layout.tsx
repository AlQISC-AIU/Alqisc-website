import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Islamic Events & Programmes",
  description: "Discover upcoming AL-QISC talks, Qur'an competitions, Ramadan gatherings, workshops, and community events at AIU.",
  alternates: { canonical: "/events" },
};

export default function EventsLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
