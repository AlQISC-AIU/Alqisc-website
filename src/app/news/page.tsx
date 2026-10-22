import type { Metadata } from "next";
import { InnerPageHero } from "@/components/sections/inner-page-hero";
import { NewsBrowser } from "@/components/sections/news-browser";
import { getCachedNews } from "@/lib/firebase/public-content";

export const metadata: Metadata = {
  title: "News & Announcements",
  description: "Announcements from AL-QISC and the club's latest posts on Instagram and YouTube.",
  alternates: { canonical: "/news" },
};

export default async function NewsPage() {
  const news = await getCachedNews().catch(() => null);

  return (
    <>
      <InnerPageHero
        image="/images/events/activity-1.jpg"
        title="News & Updates"
        description="Announcements from the club and our latest posts on Instagram and YouTube."
        imagePosition="center 40%"
      />

      <main className="bg-white py-20 md:py-24 lg:py-28">
        <div className="container mx-auto px-5 sm:px-6 lg:px-8">
          {news === null ? (
            <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-red-700">
              News could not be loaded. Please refresh and try again.
            </div>
          ) : (
            <NewsBrowser items={news} />
          )}
        </div>
      </main>
    </>
  );
}
