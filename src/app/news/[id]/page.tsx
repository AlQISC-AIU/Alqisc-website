import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, CalendarDays } from "lucide-react";
import { notFound } from "next/navigation";
import { cache } from "react";
import { getCachedAnnouncementById } from "@/lib/firebase/public-content";
import { formatEventDate, pickText } from "@/lib/feed";

const getAnnouncement = cache(getCachedAnnouncementById);

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const item = await getAnnouncement(id).catch(() => null);
  if (!item) return { title: "Announcement Not Found" };

  const title = pickText(item.title);
  const description = pickText(item.summary) || "An announcement from AL-QISC at Albukhary International University.";
  return {
    title,
    description,
    alternates: { canonical: `/news/${item.id}` },
    openGraph: {
      type: "article",
      url: `/news/${item.id}`,
      title,
      description,
      images: item.thumbnail_url ? [{ url: item.thumbnail_url, alt: title }] : [],
    },
    twitter: {
      card: item.thumbnail_url ? "summary_large_image" : "summary",
      title,
      description,
      images: item.thumbnail_url ? [item.thumbnail_url] : [],
    },
  };
}

export default async function AnnouncementPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(id)) notFound();
  const item = await getAnnouncement(id).catch(() => null);
  if (!item) notFound();

  const title = pickText(item.title);
  const summary = pickText(item.summary);
  const date = formatEventDate(item.published_at || "");

  return (
    <main className="min-h-screen bg-white pt-32 pb-20 md:pt-36 md:pb-28">
      <article className="container mx-auto max-w-3xl px-5 sm:px-6 lg:px-8">
        <Link
          href="/news"
          className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-[var(--primary)] transition-colors hover:text-[var(--primary-dark)] focus:outline-none focus:underline"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          All news
        </Link>
        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-[var(--primary)]">Announcement</p>
        <h1 className="font-heading text-3xl font-bold leading-tight text-[var(--dark)] sm:text-4xl">{title}</h1>
        {date ? (
          <p className="mt-4 flex items-center gap-2 text-sm text-[var(--gray)]">
            <CalendarDays className="h-4 w-4 text-[var(--primary)]" aria-hidden="true" />
            {date}
          </p>
        ) : null}
        {item.thumbnail_url ? (
          <div className="mt-8 overflow-hidden rounded-2xl bg-[var(--light)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={item.thumbnail_url} alt="" className="w-full object-cover" />
          </div>
        ) : null}
        {summary ? (
          <div className="mt-8 space-y-4 text-lg leading-8 text-[var(--dark)]">
            {summary.split(/\n{2,}/).map((paragraph, index) => (
              <p key={index} className="whitespace-pre-line">{paragraph}</p>
            ))}
          </div>
        ) : null}
      </article>
    </main>
  );
}
