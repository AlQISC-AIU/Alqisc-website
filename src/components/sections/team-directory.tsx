"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Camera,
  GraduationCap,
  HandHeart,
  Laptop,
  Megaphone,
  UsersRound,
} from "lucide-react";
import type { Department, Member } from "@/lib/firebase/types";
import { getMemberIdentity } from "@/lib/member-identity";

interface TeamDirectoryProps {
  executiveCommittee?: Department;
  departments: Department[];
}

type DirectoryMember = Member & { teamTitles: string[] };

function departmentMembers(department?: Department): DirectoryMember[] {
  const people = new Map<string, DirectoryMember>();

  for (const team of department?.teams || []) {
    for (const member of team.members || []) {
      const key = getMemberIdentity(member);
      const existing = people.get(key);

      if (existing) {
        if (!existing.teamTitles.includes(team.title)) existing.teamTitles.push(team.title);
        if (!existing.image_url && member.image_url) existing.image_url = member.image_url;
      } else {
        people.set(key, { ...member, teamTitles: [team.title] });
      }
    }
  }

  return [...people.values()];
}

function isPresident(member: Member) {
  const role = member.role.toLowerCase();
  return role.includes("president") && !role.includes("vice");
}

function isDepartmentHead(member: Member) {
  return /\b(head|director|chair|lead|coordinator)\b/i.test(member.role);
}

function isIctDepartment(department: Department) {
  return /\bict\b|information\s+(?:and|&)\s+communication/i.test(
    `${department.slug} ${department.name} ${department.full_name}`,
  );
}

function DepartmentIcon({ slug, className = "h-5 w-5" }: { slug: string; className?: string }) {
  const value = slug.toLowerCase();
  const Icon = value.includes("education")
    ? BookOpen
    : value.includes("curricular")
      ? GraduationCap
      : value.includes("dawah") || value.includes("da-wah")
        ? Megaphone
        : value.includes("media")
          ? Camera
          : value.includes("ict") || value.includes("tech")
            ? Laptop
            : value.includes("sister")
              ? HandHeart
              : UsersRound;

  return <Icon className={className} aria-hidden="true" />;
}

function PersonCard({ member, featured = false }: { member: DirectoryMember; featured?: boolean }) {
  return (
    <article
      className={`group flex items-center rounded-2xl border bg-white transition duration-300 hover:-translate-y-0.5 hover:border-[var(--secondary)]/70 hover:shadow-[0_14px_35px_rgba(20,72,98,0.11)] ${
        featured
          ? "gap-5 border-[var(--secondary)]/60 p-5 shadow-[0_16px_40px_rgba(20,72,98,0.10)] sm:p-6"
          : "gap-3.5 border-slate-200/80 p-3.5 shadow-sm"
      }`}
    >
      <div
        className={`relative shrink-0 overflow-hidden rounded-full border-[3px] border-[var(--secondary)] bg-slate-100 ${
          featured ? "h-24 w-24 sm:h-28 sm:w-28" : "h-16 w-16"
        }`}
      >
        <Image
          src={member.image_url || "/images/placeholder.jpg"}
          alt={`Portrait of ${member.name}`}
          fill
          sizes={featured ? "112px" : "64px"}
          className="object-cover object-top transition duration-500 group-hover:scale-105"
        />
      </div>
      <div className="min-w-0">
        {featured ? (
          <p className="mb-1 text-[0.68rem] font-bold uppercase tracking-[0.18em] text-[var(--primary)]">
            Club leadership
          </p>
        ) : null}
        <h3 className={`${featured ? "text-xl" : "text-sm"} text-pretty font-heading font-bold leading-snug text-[var(--dark)]`}>
          {member.name}
        </h3>
        <p className={`${featured ? "mt-1 text-base" : "mt-0.5 text-xs"} font-medium leading-snug text-[var(--primary)]`}>
          {member.role || "Member"}
        </p>
        {member.teamTitles.length > 1 ? (
          <p className="mt-2 text-xs leading-5 text-slate-500">
            {member.teamTitles.join(" · ")}
          </p>
        ) : null}
      </div>
    </article>
  );
}

function ExecutiveCommittee({ department }: { department?: Department }) {
  const members = useMemo(() => departmentMembers(department), [department]);
  if (!members.length) return null;

  const president = members.find(isPresident) || members[0];
  const committee = members.filter((member) => member !== president);

  return (
    <section aria-labelledby="executive-heading">
      <div className="mb-8 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--primary)]">Leadership</p>
          <h2 id="executive-heading" className="mt-2 font-heading text-3xl font-bold text-[var(--dark)] sm:text-4xl">
            Executive Committee
          </h2>
        </div>
        <p className="max-w-lg text-sm leading-6 text-[var(--gray)] sm:text-right">
          The student leaders guiding AL-QISC&apos;s direction, service, and community programmes.
        </p>
      </div>

      <div className="rounded-[2rem] border border-[var(--primary)]/10 bg-[linear-gradient(135deg,#f7fbfd_0%,#ffffff_52%,#fff9e8_100%)] p-5 shadow-[0_18px_50px_rgba(20,72,98,0.08)] sm:p-7 lg:p-9">
        <div className="grid items-center gap-5 lg:grid-cols-[minmax(260px,0.9fr)_minmax(0,1.6fr)] lg:gap-8">
          <PersonCard member={president} featured />
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {committee.map((member) => (
              <PersonCard key={getMemberIdentity(member)} member={member} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export function TeamDirectory({ executiveCommittee, departments }: TeamDirectoryProps) {
  const orderedDepartments = useMemo(
    () => [...departments].sort((left, right) => Number(isIctDepartment(right)) - Number(isIctDepartment(left))),
    [departments],
  );
  const [activeSlug, setActiveSlug] = useState(
    () => orderedDepartments.find(isIctDepartment)?.slug || orderedDepartments[0]?.slug || "",
  );
  const activeDepartment =
    orderedDepartments.find((department) => department.slug === activeSlug) || orderedDepartments[0];
  const members = useMemo(() => departmentMembers(activeDepartment), [activeDepartment]);
  const head = members.find(isDepartmentHead);
  const otherMembers = members.filter((member) => member !== head);

  return (
    <div className="mx-auto mt-12 max-w-7xl space-y-20 md:mt-14">
      <ExecutiveCommittee department={executiveCommittee} />

      {activeDepartment ? (
        <section aria-labelledby="departments-heading">
          <div className="mx-auto mb-8 max-w-2xl text-center">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--primary)]">Our departments</p>
            <h2 id="departments-heading" className="mt-2 font-heading text-3xl font-bold text-[var(--dark)] sm:text-4xl">
              Explore our teams
            </h2>
            <p className="mt-3 leading-7 text-[var(--gray)]">
              Choose a department to meet its people. Members assigned to several teams appear once, with every assignment listed.
            </p>
          </div>

          <div className="overflow-x-auto px-1 py-2" role="tablist" aria-label="AL-QISC departments">
            <div className="flex w-max min-w-full justify-start gap-2 px-1 sm:justify-center">
              {orderedDepartments.map((department) => {
                const selected = department.slug === activeDepartment.slug;
                return (
                  <button
                    key={department.id || department.slug}
                    id={`department-tab-${department.slug}`}
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    aria-controls={`department-panel-${department.slug}`}
                    onClick={() => setActiveSlug(department.slug)}
                    className={`inline-flex min-h-12 shrink-0 items-center gap-2 whitespace-nowrap rounded-xl border px-4 py-3 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-1 ${
                      selected
                        ? "border-[var(--primary)] bg-[var(--primary)] text-white shadow-md"
                        : "border-slate-200 bg-white text-[var(--primary)] hover:border-[var(--primary)]/40 hover:bg-[var(--light)]"
                    }`}
                  >
                    <DepartmentIcon slug={department.slug} />
                    {department.name}
                  </button>
                );
              })}
            </div>
          </div>

          <div
            id={`department-panel-${activeDepartment.slug}`}
            role="tabpanel"
            aria-labelledby={`department-tab-${activeDepartment.slug}`}
            className="mt-5 overflow-hidden rounded-[2rem] border border-[var(--primary)]/10 bg-white shadow-[0_18px_55px_rgba(20,72,98,0.09)]"
          >
            <header className="grid gap-5 bg-[linear-gradient(120deg,#edf7fb_0%,#ffffff_66%,#fff7dc_100%)] p-6 sm:p-8 lg:grid-cols-[auto_1fr_auto] lg:items-center">
              <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--primary)] text-white shadow-md">
                <DepartmentIcon slug={activeDepartment.slug} className="h-8 w-8" />
              </span>
              <div>
                <h3 className="font-heading text-2xl font-bold text-[var(--dark)] sm:text-3xl">
                  {activeDepartment.full_name || activeDepartment.name}
                </h3>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--gray)] sm:text-base">
                  {activeDepartment.description}
                </p>
              </div>
              <div className="flex items-center gap-5 lg:justify-end">
                <div className="text-center">
                  <strong className="block font-heading text-2xl text-[var(--primary)]">{members.length}</strong>
                  <span className="text-xs text-[var(--gray)]">Members</span>
                </div>
                <div className="text-center">
                  <strong className="block font-heading text-2xl text-[var(--primary)]">{activeDepartment.teams?.length || 0}</strong>
                  <span className="text-xs text-[var(--gray)]">Teams</span>
                </div>
              </div>
            </header>

            <div className="grid gap-6 p-5 sm:p-7 lg:grid-cols-[minmax(230px,0.7fr)_minmax(0,2fr)] lg:p-8">
              <div>
                <p className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-[var(--primary)]">Department head</p>
                {head ? (
                  <PersonCard member={head} />
                ) : (
                  <p className="rounded-2xl bg-[var(--light)] p-5 text-sm text-[var(--gray)]">The department head will be added soon.</p>
                )}
                <Link
                  href={`/departments/${activeDepartment.slug}`}
                  className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-[var(--primary)] hover:underline focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-2"
                >
                  View department details
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>

              <div>
                <div className="mb-3 flex items-center justify-between gap-4">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--primary)]">Team members</p>
                  <span className="rounded-full bg-[#edf7fb] px-3 py-1 text-xs font-semibold text-[var(--primary)]">
                    {members.length} unique {members.length === 1 ? "member" : "members"}
                  </span>
                </div>
                {otherMembers.length ? (
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {otherMembers.map((member) => (
                      <PersonCard key={getMemberIdentity(member)} member={member} />
                    ))}
                  </div>
                ) : (
                  <p className="rounded-2xl bg-[var(--light)] p-5 text-sm text-[var(--gray)]">Additional members will be added soon.</p>
                )}
              </div>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
