import type { Metadata } from "next";
import { Amiri, Cormorant_Garamond, Manrope } from "next/font/google";
import type { Viewport } from "next";
import "./globals.css";
import { LayoutShell } from "@/components/layout/layout-shell";
import { FirebaseAnalytics } from "@/components/firebase-analytics";
import { getSettings } from "@/lib/firebase/settings";
import { getActiveDepartments } from "@/lib/firebase/departments";
import { NotificationProvider } from "@/components/ui/notification-provider";
import { getSiteUrl } from "@/lib/site-url";

export const dynamic = "force-dynamic";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: "variable",
  display: "swap",
});

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: "variable",
  style: ["normal", "italic"],
  display: "swap",
});

const amiri = Amiri({
  variable: "--font-amiri",
  subsets: ["arabic"],
  weight: ["400", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: "AL-QISC | AIU Al-Qur'an & Islamic Club",
    template: "%s | AL-QISC",
  },
  description:
    "The official Al-Qur'an and Islamic Club at Albukhary International University. Explore Qur'an classes, Islamic events, community programmes, and student-led departments.",
  applicationName: "AL-QISC",
  authors: [{ name: "AL-QISC" }],
  creator: "AL-QISC",
  publisher: "AL-QISC",
  category: "Education",
  keywords: [
    "AL-QISC",
    "Al-Qur'an and Islamic Club",
    "AIU Islamic Club",
    "Albukhary International University",
    "Qur'an classes Alor Setar",
    "Islamic student club Malaysia",
    "Islamic events Kedah",
  ],
  openGraph: {
    type: "website",
    locale: "en_MY",
    siteName: "AL-QISC",
    title: "AL-QISC | AIU Al-Qur'an & Islamic Club",
    description: "Qur'anic learning, Islamic values, service, and student community at Albukhary International University.",
    images: [
      {
        url: "/images/backround.JPG",
        width: 1280,
        height: 960,
        alt: "AL-QISC student community at Albukhary International University",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "AL-QISC | AIU Al-Qur'an & Islamic Club",
    description: "Qur'anic learning, Islamic values, service, and student community at AIU.",
    images: ["/images/backround.JPG"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 },
  },
  verification: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
    ? { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION }
    : undefined,
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#34708d",
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
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "AL-QISC — Al-Qur'an and Islamic Club",
    alternateName: "AL-QISC",
    url: getSiteUrl(),
    logo: `${getSiteUrl()}/images/logo.png`,
    description: "The official Al-Qur'an and Islamic Club at Albukhary International University.",
    email: settings.contact_email || "alqiscpersonal@gmail.com",
    telephone: settings.contact_phone || "+60177316088",
    sameAs: [
      settings.social_facebook || "https://www.facebook.com/people/Aiu-Alqisc-Club/61554751049769/",
      settings.social_instagram || "https://www.instagram.com/alqisc.aiu/",
      settings.social_twitter,
      settings.social_linkedin,
    ].filter(Boolean),
    parentOrganization: {
      "@type": "CollegeOrUniversity",
      name: "Albukhary International University",
      url: "https://aiu.edu.my/",
    },
    address: {
      "@type": "PostalAddress",
      addressLocality: "Alor Setar",
      addressRegion: "Kedah",
      addressCountry: "MY",
    },
  };

  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className="scroll-smooth"
      suppressHydrationWarning
    >
      <head>
        <link rel="preconnect" href="https://cdnjs.cloudflare.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css" />
      </head>
      <body
        className={`${manrope.variable} ${cormorant.variable} ${amiri.variable} antialiased`}
        suppressHydrationWarning
      >
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema).replace(/</g, "\\u003c") }}
        />
        <FirebaseAnalytics />
        <NotificationProvider>
          <LayoutShell settings={settings} departments={departments}>{children}</LayoutShell>
        </NotificationProvider>
      </body>
    </html>
  );
}
