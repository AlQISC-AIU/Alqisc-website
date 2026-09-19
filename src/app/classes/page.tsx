import Link from "next/link";
import Image from "next/image";
import { Clock, Users, MapPin, ArrowRight, BookOpen } from "lucide-react";
import { InnerPageHero } from "@/components/sections/inner-page-hero";
import { getCachedActiveClasses } from "@/lib/firebase/public-content";

export const metadata = {
  title: "Qur'an & Islamic Classes",
  description:
    "Join our Islamic education classes including Arabic Language, Quran Reading, Hafazan Program, and Kids Academy.",
  alternates: { canonical: "/classes" },
};

export default async function ClassesPage() {
  const classes = await getCachedActiveClasses();

  return (
    <main className="bg-white">
      <InnerPageHero
        image="/images/classes/arabic clas.jpg"
        title="Our Classes"
        description="Build practical knowledge through welcoming, structured programmes."
        imagePosition="center 42%"
      />

      <section className="py-20 md:py-24 lg:py-28">
        <div className="container mx-auto px-5 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--primary)]">
              Current Programmes
            </p>
            <h2 className="mt-3 font-heading text-3xl font-bold text-[var(--dark)] md:text-4xl">
              Find the Right Class for You
            </h2>
            <p className="mt-4 leading-relaxed text-[var(--gray)]">
              Review the schedule, venue, learning goals, and enrollment details for every active class.
            </p>
          </div>

          {classes.length === 0 ? (
            <div className="mx-auto mt-12 max-w-2xl rounded-2xl border border-[var(--primary)]/10 bg-[var(--light)] px-6 py-12 text-center">
              <BookOpen className="mx-auto h-10 w-10 text-[var(--primary)]" />
              <h3 className="mt-4 font-heading text-xl font-bold text-[var(--dark)]">
                New classes are being prepared
              </h3>
              <p className="mt-2 text-[var(--gray)]">
                Please check back soon or contact us to ask about upcoming programmes.
              </p>
            </div>
          ) : (
            <div className="mt-12 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {classes.map((classItem) => (
                <article
                  key={classItem.id}
                  className="group flex h-full flex-col overflow-hidden rounded-2xl border border-[var(--primary)]/10 bg-white shadow-sm transition-shadow duration-300 hover:shadow-md"
                >
                  <Link
                    href={`/classes/${classItem.slug || classItem.id}`}
                    className="relative block aspect-[16/10] overflow-hidden bg-[var(--light)]"
                    aria-label={`View ${classItem.title}`}
                  >
                    {classItem.image_url ? (
                      <Image
                        src={classItem.image_url}
                        alt={classItem.title}
                        fill
                        sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
                        className="object-cover transition-transform duration-500 group-hover:scale-[1.03] motion-reduce:transition-none"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <span className="font-heading text-2xl text-[var(--gray)]/50">AL-QISC</span>
                      </div>
                    )}
                    <span className="absolute left-4 top-4 rounded-full bg-[var(--secondary)] px-3 py-1 text-xs font-semibold text-[var(--dark)]">
                      {classItem.fee || "Free"}
                    </span>
                  </Link>

                  <div className="flex flex-1 flex-col p-6">
                    <h3 className="font-heading text-xl font-bold leading-snug text-[var(--dark)]">
                      <Link
                        href={`/classes/${classItem.slug || classItem.id}`}
                        className="transition-colors hover:text-[var(--primary)]"
                      >
                        {classItem.title}
                      </Link>
                    </h3>
                    <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-[var(--gray)]">
                      {classItem.description}
                    </p>

                    <dl className="mt-5 space-y-3 border-t border-[var(--primary)]/10 pt-5 text-sm text-[var(--gray)]">
                      <div className="flex items-start gap-3">
                        <Clock className="mt-0.5 h-4 w-4 shrink-0 text-[var(--primary)]" />
                        <div>
                          <dt className="sr-only">Schedule</dt>
                          <dd>{classItem.schedule || "Schedule to be announced"}{classItem.time ? ` · ${classItem.time}` : ""}</dd>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[var(--primary)]" />
                        <div>
                          <dt className="sr-only">Venue</dt>
                          <dd>{classItem.venue || "Venue to be announced"}</dd>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <Users className="mt-0.5 h-4 w-4 shrink-0 text-[var(--primary)]" />
                        <div>
                          <dt className="sr-only">Students enrolled</dt>
                          <dd>{classItem.students_enrolled || 0} students enrolled</dd>
                        </div>
                      </div>
                    </dl>

                    <Link
                      href={`/classes/${classItem.slug || classItem.id}`}
                      className="mt-6 inline-flex items-center gap-2 font-semibold text-[var(--primary)] transition-colors hover:text-[var(--primary-dark)]"
                    >
                      View class details
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}

          <div className="mt-16 rounded-2xl bg-[var(--primary)] px-6 py-10 text-center sm:px-10 md:py-12">
            <h2 className="font-heading text-2xl font-bold text-white md:text-3xl">
              Looking for a Different Programme?
            </h2>
            <p className="mx-auto mt-3 max-w-2xl leading-relaxed text-white/80">
              Tell us what you would like to learn. Your suggestions help AL-QISC plan future classes for the community.
            </p>
            <Link
              href="/contact"
              className="mt-7 inline-flex rounded-full bg-[var(--secondary)] px-8 py-3.5 font-semibold text-[var(--dark)] transition-colors hover:bg-[var(--secondary-dark)]"
            >
              Contact Us
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
