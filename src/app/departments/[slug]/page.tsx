import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Check, Target, Users } from "lucide-react";
import { InnerPageHero } from "@/components/sections/inner-page-hero";
import { DepartmentTeamCarousel } from "@/components/sections/department-team-carousel";
import {
  getCachedActiveDepartments,
  getCachedDepartmentBySlug,
} from "@/lib/firebase/public-content";
import { getUniqueMemberCount } from "@/lib/member-identity";
import type { Member } from "@/lib/firebase/types";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  try {
    const departments = await getCachedActiveDepartments();
    return departments.map((department) => ({ slug: department.slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;

  try {
    const department = await getCachedDepartmentBySlug(slug);
    if (!department) return { title: "Department Not Found" };

    return {
      title: department.full_name || department.name,
      description: department.description,
      alternates: { canonical: `/departments/${department.slug}` },
    };
  } catch {
    return { title: "Department Not Found" };
  }
}

export default async function DepartmentPage({ params }: PageProps) {
  const { slug } = await params;
  let department;

  try {
    department = await getCachedDepartmentBySlug(slug);
    if (!department || department.is_active === false) notFound();
  } catch (error) {
    console.error("Error fetching department:", error);
    notFound();
  }

  if (!department) notFound();

  const teams = department.teams?.filter((team) => team.members?.length) || [];
  const memberCount = getUniqueMemberCount(teams);

  return (
    <>
      <InnerPageHero
        image={department.image_url || "/images/backround.JPG"}
        title={department.full_name || department.name}
        description={`Meet the people and work behind the ${department.name} department.`}
        imagePosition="center 42%"
      />

      <main>
        <section className="bg-white py-20 md:py-24 lg:py-28">
          <div className="container mx-auto px-5 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-5xl">
              <div className="mx-auto max-w-3xl text-center">
                <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-[var(--primary)]">
                  About the department
                </p>
                <h2 className="font-heading text-3xl font-bold leading-tight text-[var(--dark)] sm:text-4xl">
                  Serving the community through focused, practical work
                </h2>
                <p className="mt-6 whitespace-pre-line text-base leading-8 text-[var(--gray)] sm:text-lg">
                  {department.description}
                </p>

                <dl className="mx-auto mt-10 grid max-w-lg grid-cols-2 gap-4 border-t border-[var(--primary)]/10 pt-8">
                  <div>
                    <dt className="text-sm text-[var(--gray)]">Organized teams</dt>
                    <dd className="mt-1 font-heading text-3xl font-bold text-[var(--primary)]">{teams.length}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-[var(--gray)]">Team members</dt>
                    <dd className="mt-1 font-heading text-3xl font-bold text-[var(--primary)]">{memberCount}</dd>
                  </div>
                </dl>
              </div>

              <aside className="mt-12 rounded-2xl border border-[var(--primary)]/10 bg-[var(--light)] p-7 sm:p-9 lg:p-10" aria-labelledby="objectives-heading">
                <div className="flex items-center justify-center gap-3 text-center">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--primary)] text-white">
                    <Target className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <h2 id="objectives-heading" className="font-heading text-2xl font-bold text-[var(--dark)]">
                    Our objectives
                  </h2>
                </div>
                {department.objectives?.length ? (
                  <ol className="mt-8 grid gap-4 md:grid-cols-2">
                    {department.objectives.map((objective, index) => (
                      <li key={`${objective}-${index}`} className="grid grid-cols-[2rem_1fr] gap-3 rounded-xl bg-white p-4 text-left text-[var(--gray)]">
                        <span className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--primary)]/20 bg-white text-sm font-bold text-[var(--primary)]">
                          {index + 1}
                        </span>
                        <span className="pt-1 leading-7">{objective}</span>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="mt-6 text-center leading-7 text-[var(--gray)]">The department&apos;s objectives will be published here soon.</p>
                )}
              </aside>
            </div>
          </div>
        </section>

        {teams.map((team) => (
          <DepartmentTeamCarousel
            key={team.id || team.title}
            title={team.title}
            subtitle="Meet the team"
            members={(team.members || []).map((member: Member) => ({
              id: member.id,
              name: member.name,
              role: member.role || "Member",
              image: member.image_url || "/images/placeholder.jpg",
              facebook: member.socials?.facebook,
              twitter: member.socials?.twitter,
              instagram: member.socials?.instagram,
              linkedin: member.socials?.linkedin,
              github: member.socials?.github,
              email: member.socials?.email,
              phone: member.socials?.phone,
              website: member.socials?.website,
            }))}
            autoScroll={false}
          />
        ))}

        {department.responsibilities?.length ? (
          <section className="bg-[var(--light)] py-20 md:py-24 lg:py-28">
            <div className="container mx-auto px-5 sm:px-6 lg:px-8">
              <div className="mx-auto max-w-3xl text-center">
                <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-[var(--primary)]">What we do</p>
                <h2 className="font-heading text-3xl font-bold text-[var(--dark)] sm:text-4xl">Our responsibilities</h2>
                <p className="mt-4 text-base leading-7 text-[var(--gray)] sm:text-lg">
                  The core areas this department is responsible for across the club and wider community.
                </p>
              </div>
              <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                {department.responsibilities.map((responsibility, index) => (
                  <article key={`${responsibility}-${index}`} className="flex gap-4 rounded-2xl border border-[var(--primary)]/10 bg-white p-6 shadow-sm">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--secondary)] text-[var(--dark)]">
                      <Check className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <p className="pt-1 leading-7 text-[var(--gray)]">{responsibility}</p>
                  </article>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        <section className="bg-[var(--primary)] py-16 md:py-20">
          <div className="container mx-auto px-5 sm:px-6 lg:px-8">
            <div className="flex flex-col items-start justify-between gap-8 md:flex-row md:items-center">
              <div className="max-w-2xl">
                <div className="mb-4 flex items-center gap-3 text-[var(--secondary)]">
                  <Users className="h-5 w-5" aria-hidden="true" />
                  <span className="text-sm font-semibold uppercase tracking-[0.18em]">Get involved</span>
                </div>
                <h2 className="font-heading text-3xl font-bold text-white sm:text-4xl">Interested in joining {department.name}?</h2>
                <p className="mt-4 leading-7 text-white/80">Contact the club to learn about current roles, volunteer opportunities, and upcoming activities.</p>
              </div>
              <Link href="/contact" className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-full bg-[var(--secondary)] px-7 py-3 font-semibold text-[var(--dark)] transition-colors hover:bg-[var(--secondary-dark)] focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-[var(--primary)]">
                Contact us
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
