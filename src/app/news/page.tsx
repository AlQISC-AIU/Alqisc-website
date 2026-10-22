import type { Metadata } from "next";
import Link from "next/link";
import { Megaphone } from "lucide-react";
import { InnerPageHero } from "@/components/sections/inner-page-hero";
import { NewsCard } from "@/components/sections/news-card";
import { getCachedNews } from "@/lib/firebase/public-content";
import type { FeedKind } from "@/lib/feed";

export const metadata: Metadata = {
  title: "News & Announcements",
  description: "Announcements from AL-QISC and the club's latest posts on Instagram and YouTube.",
  alternates: { canonical: "/news" },
};

const filters: { id: "all" | Exclude<FeedKind, "event">; label: string }[] = [
  { id: "all", label: "All news" },
  { id: "announcement", label: "Announcements" },
  { id: "instagram", label: "Instagram" },
  { id: "youtube", label: "YouTube" },
];

export default async function NewsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const { type } = await searchParams;
  const active = filters.find((filter) => filter.id === type)?.id ?? "all";
  const news = await getCachedNews().catch(() => null);
  const shown = news?.filter((item) => active === "all" || item.kind === active) ?? [];

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
          <div className="mx-auto flex max-w-4xl flex-col items-center gap-7 border-b border-[var(--primary)]/10 pb-10 text-center">
            <div className="max-w-2xl">
              <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-[var(--primary)]">Stay in touch</p>
              <h2 className="font-heading text-3xl font-bold text-[var(--dark)] sm:text-4xl">What&apos;s new at AL-QISC</h2>
              <p className="mt-4 leading-7 text-[var(--gray)]">The same updates you see in the AL-QISC mobile app.</p>
            </div>
            <nav className="flex max-w-full justify-start gap-2 overflow-x-auto pb-1 sm:justify-center" aria-label="Filter news">
              {filters.map((filter) => (
                <Link
                  key={filter.id}
                  href={filter.id === "all" ? "/news" : `/news?type=${filter.id}`}
                  aria-current={active === filter.id ? "page" : undefined}
                  className={`inline-flex min-h-11 shrink-0 items-center rounded-full border px-5 py-2.5 text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-2 ${
                    active === filter.id
                      ? "border-[var(--primary)] bg-[var(--primary)] text-white"
                      : "border-[var(--primary)]/15 bg-white text-[var(--dark)] hover:border-[var(--primary)]/40 hover:text-[var(--primary)]"
                  }`}
                >
                  {filter.label}
                </Link>
              ))}
            </nav>
          </div>

          {news === null ? (
            <div role="alert" className="mt-12 rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-red-700">
              News could not be loaded. Please refresh and try again.
            </div>
          ) : shown.length ? (
            <div className="mt-12 grid gap-7 md:grid-cols-2 lg:grid-cols-3">
              {shown.map((item) => (
                <NewsCard key={item.id} item={item} />
              ))}
            </div>
          ) : (
            <div className="mt-12 rounded-2xl border border-[var(--primary)]/10 bg-[var(--light)] px-6 py-16 text-center">
              <Megaphone className="mx-auto h-10 w-10 text-[var(--primary)]" aria-hidden="true" />
              <h3 className="mt-5 font-heading text-2xl font-bold text-[var(--dark)]">Nothing here yet</h3>
              <p className="mx-auto mt-3 max-w-md leading-7 text-[var(--gray)]">Check back soon, or choose another filter.</p>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
