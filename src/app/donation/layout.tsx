import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Support AL-QISC",
  description: "Support AL-QISC's Qur'an classes, Islamic programmes, student welfare activities, and community service at AIU.",
  alternates: { canonical: "/donation" },
};

export default function DonationLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
