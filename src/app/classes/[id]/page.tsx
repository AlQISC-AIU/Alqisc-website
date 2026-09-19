import { getCachedClassById, getCachedClassBySlug } from "@/lib/firebase/public-content";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Clock, Users, MapPin, ArrowLeft, ArrowRight, Target, CheckCircle2 } from "lucide-react";
import { notFound } from "next/navigation";
import { cache } from "react";

const getClass = cache((id: string) =>
  getCachedClassBySlug(id).catch(() => getCachedClassById(id)).catch(() => null),
);

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const classItem = await getClass(id);

  if (!classItem) return { title: "Class Not Found" };
  return {
    title: classItem.title,
    description: classItem.description,
    alternates: { canonical: `/classes/${classItem.slug || classItem.id}` },
    openGraph: classItem.image_url ? { images: [classItem.image_url] } : undefined,
  };
}

export default async function ClassDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  if (!id) notFound();

  const classItem = await getClass(id);

  if (!classItem || !classItem.is_active) notFound();

  return (
    <main className="min-h-screen bg-white">
      <section className="bg-[var(--light)] pb-14 pt-32 md:pb-16 md:pt-36">
        <div className="container mx-auto px-5 sm:px-6 lg:px-8">
          <Link
            href="/classes"
            className="inline-flex items-center gap-2 text-sm font-medium text-[var(--gray)] transition-colors hover:text-[var(--primary)]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Classes
          </Link>
          <div className="mt-8 max-w-4xl">
            <span className="inline-flex rounded-full bg-[var(--secondary)] px-3 py-1 text-xs font-semibold uppercase tracking-wider text-[var(--dark)]">
              {classItem.fee || "Free"}
            </span>
            <h1 className="mt-4 font-heading text-4xl font-bold leading-tight text-[var(--dark)] md:text-5xl lg:text-6xl">
              {classItem.title}
            </h1>
            <p className="mt-5 max-w-3xl text-base leading-relaxed text-[var(--gray)] sm:text-lg">
              {classItem.description}
            </p>
          </div>
        </div>
      </section>

      <section className="py-16 md:py-20 lg:py-24">
        <div className="container mx-auto px-5 sm:px-6 lg:px-8">
          <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1.45fr)_minmax(290px,0.55fr)] lg:gap-10">
            <div>
              <div className="relative aspect-[16/10] overflow-hidden rounded-2xl border border-[var(--primary)]/10 bg-[var(--light)] shadow-sm">
                {classItem.image_url ? (
                  <Image
                    src={classItem.image_url}
                    alt={classItem.title}
                    fill
                    sizes="(max-width: 1024px) 100vw, 68vw"
                    className="object-cover"
                    priority
                  />
                ) : (
                  <div className="flex h-full flex-col items-center justify-center text-[var(--gray)]">
                    <span className="font-heading text-2xl opacity-50">AL-QISC</span>
                    <span className="mt-2 text-sm">Image coming soon</span>
                  </div>
                )}
              </div>

              <dl className="mt-6 grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-[var(--primary)]/10 bg-white p-4">
                  <dt className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--primary)]">
                    <Clock className="h-4 w-4" /> Schedule
                  </dt>
                  <dd className="mt-2 text-sm leading-relaxed text-[var(--dark)]">
                    {classItem.schedule || "TBA"}{classItem.time ? ` · ${classItem.time}` : ""}
                  </dd>
                </div>
                <div className="rounded-xl border border-[var(--primary)]/10 bg-white p-4">
                  <dt className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--primary)]">
                    <MapPin className="h-4 w-4" /> Venue
                  </dt>
                  <dd className="mt-2 text-sm leading-relaxed text-[var(--dark)]">
                    {classItem.venue || "TBA"}
                  </dd>
                </div>
                <div className="rounded-xl border border-[var(--primary)]/10 bg-white p-4">
                  <dt className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--primary)]">
                    <Users className="h-4 w-4" /> Enrolled
                  </dt>
                  <dd className="mt-2 text-sm leading-relaxed text-[var(--dark)]">
                    {classItem.students_enrolled || 0} students
                  </dd>
                </div>
              </dl>

              <div className="mt-12 space-y-12">
                <section>
                  <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--primary)]">Overview</p>
                  <h2 className="mt-2 font-heading text-2xl font-bold text-[var(--dark)] md:text-3xl">
                    About the Class
                  </h2>
                  <div className="mt-5 whitespace-pre-wrap text-base leading-8 text-[var(--gray)]">
                    {classItem.description}
                  </div>
                </section>

                {classItem.objectives?.length > 0 && (
                  <section>
                    <h2 className="flex items-center gap-3 font-heading text-2xl font-bold text-[var(--dark)] md:text-3xl">
                      <Target className="h-6 w-6 text-[var(--primary)]" />
                      What You Will Learn
                    </h2>
                    <ul className="mt-6 grid gap-3 sm:grid-cols-2">
                      {classItem.objectives.map((objective) => (
                        <li
                          key={objective}
                          className="flex items-start gap-3 rounded-xl bg-[var(--light)] p-4 text-[var(--gray)]"
                        >
                          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[var(--secondary)]" />
                          <span className="leading-relaxed">{objective}</span>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}
              </div>
            </div>

            <aside className="rounded-2xl border border-[var(--primary)]/15 bg-[var(--light)] p-6 lg:sticky lg:top-28">
              <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--primary)]">
                Enrollment
              </p>
              <h2 className="mt-2 font-heading text-2xl font-bold text-[var(--dark)]">
                Ready to Join?
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-[var(--gray)]">
                Review the class details and reserve your place. Contact the team if you need help before enrolling.
              </p>
              {classItem.registration_url ? (
                <a
                  href={classItem.registration_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-[var(--primary)] px-6 py-3.5 font-semibold text-white transition-colors hover:bg-[var(--primary-dark)]"
                >
                  Enroll in This Class
                  <ArrowRight className="h-4 w-4" />
                </a>
              ) : (
                <Link
                  href="/contact"
                  className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-[var(--primary)] px-6 py-3.5 font-semibold text-white transition-colors hover:bg-[var(--primary-dark)]"
                >
                  Ask About Enrollment
                  <ArrowRight className="h-4 w-4" />
                </Link>
              )}
              <Link
                href="/contact"
                className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[var(--primary)] hover:text-[var(--primary-dark)]"
              >
                Contact the AL-QISC team
                <ArrowRight className="h-4 w-4" />
              </Link>
            </aside>
          </div>
        </div>
      </section>
    </main>
  );
}
