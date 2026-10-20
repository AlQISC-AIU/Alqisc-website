import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Join the Committee",
  description: "Apply to join the AL-QISC committee at Albukhary International University and choose the department you would like to serve in.",
  alternates: { canonical: "/join" },
};

export default function JoinLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
