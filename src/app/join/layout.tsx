import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Join the Committee",
  description: "Apply to join the AL-QISC committee at Albukhary International University. See the positions open for the new term and send your application online.",
  alternates: { canonical: "/join" },
};

export default function JoinLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
