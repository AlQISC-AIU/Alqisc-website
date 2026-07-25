import type { Metadata } from "next";
import { Inter, Saira } from "next/font/google";
import type { Viewport } from "next";
import "./globals.css";
import { LayoutShell } from "@/components/layout/layout-shell";
import { FirebaseAnalytics } from "@/components/firebase-analytics";
import { getSettings } from "@/lib/firebase/settings";
import { getActiveDepartments } from "@/lib/firebase/departments";
import { NotificationProvider } from "@/components/ui/notification-provider";

export const dynamic = "force-dynamic";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const saira = Saira({
  variable: "--font-saira",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Al-QIsc Club | AIU Al-Qur'an & Islamic Club",
  description:
    "Official Al-Quran and Islamic Club at Albukhary International University (AIU). Join us in promoting Islamic values and strengthening the Ummah.",
  keywords: [
    "Al-QIsc",
    "Islamic Club",
    "AIU",
    "Albukhary International University",
    "Quran",
    "Islamic Education",
    "Malaysia",
  ],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [settings, departments] = await Promise.all([
    getSettings(),
    getActiveDepartments().catch(() => []),
  ]);

  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className="scroll-smooth"
      suppressHydrationWarning
    >
      <head>
        <link rel="preconnect" href="https://cdnjs.cloudflare.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.10.0/css/all.min.css"
        />
      </head>
      <body
        className={`${inter.variable} ${saira.variable} antialiased`}
        suppressHydrationWarning
      >
        <FirebaseAnalytics />
        <NotificationProvider>
          <LayoutShell settings={settings} departments={departments}>{children}</LayoutShell>
        </NotificationProvider>
      </body>
    </html>
  );
}
