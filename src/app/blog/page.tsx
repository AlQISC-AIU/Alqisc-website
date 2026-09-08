import { Metadata } from "next";
import { Calendar, ArrowRight, BookOpen } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { InnerPageHero } from "@/components/sections/inner-page-hero";
import { getPublishedPosts } from "@/lib/firebase/blog";

export const metadata: Metadata = {
  title: "Islamic Articles & News",
  description:
    "Read the latest articles and insights from Al-Qisc Club on Islamic knowledge, Quranic studies, and spiritual growth.",
  alternates: { canonical: "/blog" },
};

const fivePillars = [
  {
    id: 1,
    title: "Shahada",
    subtitle: "Faith",
    description: `The Shahada is the fundamental declaration of Islamic faith: "La ilaha illallah, Muhammadur Rasulullah" — meaning "There is no god but Allah, and Muhammad (peace be upon him) is His Messenger." This statement signifies a Muslim's belief in the oneness of God and that Muhammad (peace be upon him) is the final prophet.`,
    videoId: "bp5GExgpZX8",
  },
  {
    id: 2,
    title: "Salah",
    subtitle: "Prayer",
    description: "Salah is the obligation of performing five daily prayers at specific times:",
    prayerTimes: [
      { name: "Fajr", time: "Before dawn" },
      { name: "Dhuhr", time: "Midday" },
      { name: "Asr", time: "Afternoon" },
      { name: "Maghrib", time: "Sunset" },
      { name: "Isha", time: "Night" },
    ],
    videoId: "j0xitQtLljg",
  },
  {
    id: 3,
    title: "Zakat",
    subtitle: "Charity",
    description: "Zakat is the practice of giving 2.5% of one's wealth annually to the poor and needy. It purifies wealth and helps promote economic justice in society.",
    videoId: "_3dmRrk7hqg",
  },
  {
    id: 4,
    title: "Sawm",
    subtitle: "Fasting",
    description: "Sawm refers to fasting during the month of Ramadan, when Muslims abstain from food, drink, and sinful behaviour from dawn until sunset. It is an act of devotion and self-discipline.",
    videoId: "I64V0DJAZUU",
  },
  {
    id: 5,
    title: "Hajj",
    subtitle: "Pilgrimage",
    description: "Hajj is the pilgrimage to Makkah that every Muslim must undertake at least once in their lifetime if physically and financially able. It is a journey of spiritual renewal and submission to Allah.",
    videoId: "y5FYkU6ozLU",
  },
];

export default async function BlogPage() {
  const blogPosts = await getPublishedPosts();

  return (
    <main className="bg-white">
      <InnerPageHero
        image="/images/backround.JPG"
        title="AL-QISC Blog"
        description="Articles, reminders, and educational resources for thoughtful Islamic learning."
        imagePosition="center 48%"
      />

      <section className="py-20 md:py-24 lg:py-28">
        <div className="container mx-auto px-5 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--primary)]">
                Latest Articles
              </p>
              <h2 className="mt-3 font-heading text-3xl font-bold text-[var(--dark)] md:text-4xl">
                Recent Posts
              </h2>
              <p className="mt-4 leading-relaxed text-[var(--gray)]">
                Read the latest reflections, club updates, and practical learning from our community.
              </p>
          </div>

          {blogPosts.length === 0 ? (
            <div className="mt-12 rounded-2xl border border-[var(--primary)]/10 bg-[var(--light)] px-6 py-12 text-center">
              <BookOpen className="mx-auto h-10 w-10 text-[var(--primary)]" />
              <h3 className="mt-4 font-heading text-xl font-bold text-[var(--dark)]">
                Articles are coming soon
              </h3>
              <p className="mt-2 text-[var(--gray)]">Please return soon for new reflections and learning resources.</p>
            </div>
          ) : (
            <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {blogPosts.map((post) => (
                <article
                  key={post.id}
                  className="group flex h-full flex-col overflow-hidden rounded-2xl border border-[var(--primary)]/10 bg-white shadow-sm transition-shadow duration-300 hover:shadow-md"
                >
                  <Link href={`/blog/${post.slug}`} className="relative block aspect-[16/10] overflow-hidden bg-[var(--light)]">
                    {post.featured_image_url ? (
                      <Image
                        src={post.featured_image_url}
                        alt={post.title}
                        fill
                        sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        className="object-cover transition-transform duration-500 group-hover:scale-[1.03] motion-reduce:transition-none"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <span className="font-heading text-2xl text-[var(--gray)]/50">AL-QISC</span>
                      </div>
                    )}
                    {post.category && (
                      <span className="absolute left-4 top-4 rounded-full bg-[var(--primary)] px-3 py-1 text-xs font-semibold text-white">
                        {post.category}
                      </span>
                    )}
                  </Link>
                  <div className="flex flex-1 flex-col p-6">
                    <p className="flex items-center gap-2 text-xs font-medium text-[var(--gray)]">
                      <Calendar className="h-4 w-4 text-[var(--primary)]" />
                      {post.published_at
                        ? new Date(post.published_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
                        : "Recently published"}
                    </p>
                    <h3 className="mt-4 font-heading text-xl font-bold leading-snug text-[var(--dark)]">
                      <Link href={`/blog/${post.slug}`} className="transition-colors hover:text-[var(--primary)]">
                        {post.title}
                      </Link>
                    </h3>
                    <p className="mt-3 line-clamp-3 flex-1 text-sm leading-relaxed text-[var(--gray)]">
                      {post.excerpt}
                    </p>
                    <div className="mt-6 flex items-center justify-between gap-4 border-t border-[var(--primary)]/10 pt-4">
                      <span className="truncate text-sm text-[var(--gray)]">By {post.author || "AL-QISC Club"}</span>
                      <Link href={`/blog/${post.slug}`} className="inline-flex shrink-0 items-center gap-2 text-sm font-semibold text-[var(--primary)]">
                        Read article <ArrowRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="bg-[var(--light)] py-20 md:py-24 lg:py-28">
        <div className="container mx-auto px-5 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--primary)]">Learning Library</p>
            <h2 className="mt-3 font-heading text-3xl font-bold text-[var(--dark)] md:text-4xl">
              The Five Pillars of Islam
            </h2>
            <p className="mt-4 leading-relaxed text-[var(--gray)]">
              A concise introduction to the beliefs and practices at the foundation of Islamic life.
            </p>
          </div>

          <div className="mt-12 grid gap-6 lg:grid-cols-2">
            {fivePillars.map((pillar) => (
              <article key={pillar.id} className="overflow-hidden rounded-2xl border border-[var(--primary)]/10 bg-white shadow-sm">
                <div className="aspect-video bg-[var(--dark)]">
                  <iframe
                    width="100%"
                    height="100%"
                    src={`https://www.youtube.com/embed/${pillar.videoId}`}
                    title={`${pillar.title} — Pillar of Islam`}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    loading="lazy"
                    className="h-full w-full"
                  />
                </div>
                <div className="p-6 sm:p-7">
                  <div className="flex items-center gap-4">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--primary)] font-bold text-white">
                      {pillar.id}
                    </span>
                    <div>
                      <h3 className="font-heading text-2xl font-bold text-[var(--dark)]">{pillar.title}</h3>
                      <p className="text-sm font-semibold text-[var(--primary)]">{pillar.subtitle}</p>
                    </div>
                  </div>
                  <p className="mt-5 leading-relaxed text-[var(--gray)]">{pillar.description}</p>
                  {pillar.prayerTimes && (
                    <ul className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-5">
                      {pillar.prayerTimes.map((prayer) => (
                        <li key={prayer.name} className="rounded-lg bg-[var(--light)] p-2.5 text-center">
                          <span className="block text-sm font-bold text-[var(--dark)]">{prayer.name}</span>
                          <span className="text-xs text-[var(--gray)]">{prayer.time}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
