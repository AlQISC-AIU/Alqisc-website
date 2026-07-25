import Image from "next/image";
import type { Department, Member, Team } from "@/lib/firebase/types";

interface OrganizationChartProps {
  executiveCommittee?: Department;
  departments: Department[];
}

function memberKey(member: Member) {
  return member.id || `${member.name}-${member.role}`;
}

function flattenMembers(department?: Department) {
  return (department?.teams || []).flatMap((team) => team.members || []);
}

function isPresident(member: Member) {
  const role = member.role.trim().toLowerCase();
  return role.includes("president") && !role.includes("vice");
}

function isExecutiveOfficer(member: Member) {
  const role = member.role.toLowerCase();
  return role.includes("vice president") || role.includes("secretary");
}

function isDepartmentHead(member: Member) {
  return /\b(head|director|chair|lead|coordinator)\b/i.test(member.role);
}

function PersonCard({
  member,
  prominence = "standard",
}: {
  member: Member;
  prominence?: "primary" | "standard" | "compact";
}) {
  const isPrimary = prominence === "primary";
  const isCompact = prominence === "compact";

  return (
    <article
      className={`relative mx-auto flex w-full items-center bg-white text-left shadow-[0_10px_28px_rgba(15,23,42,0.08)] ${
        isPrimary
          ? "max-w-sm flex-col rounded-3xl border border-[var(--secondary)]/60 px-6 py-7 text-center"
          : isCompact
            ? "gap-3 rounded-2xl border border-[var(--primary)]/10 px-3.5 py-3"
            : "max-w-xs gap-4 rounded-2xl border border-[var(--primary)]/15 px-4 py-4"
      }`}
    >
      <div
        className={`relative shrink-0 overflow-hidden rounded-full bg-[var(--light)] ${
          isPrimary
            ? "h-24 w-24 border-4 border-[var(--secondary)]"
            : isCompact
              ? "h-11 w-11 border-2 border-[var(--secondary)]/70"
              : "h-16 w-16 border-[3px] border-[var(--secondary)]"
        }`}
      >
        <Image
          src={member.image_url || "/images/placeholder.jpg"}
          alt={member.name}
          fill
          sizes={isPrimary ? "96px" : isCompact ? "44px" : "64px"}
          className="object-cover object-top"
        />
      </div>
      <div className={isPrimary ? "mt-4 min-w-0" : "min-w-0"}>
        {isPrimary ? (
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--primary)]">
            Club leadership
          </p>
        ) : null}
        <h3 className={`${isPrimary ? "text-xl" : isCompact ? "text-sm" : "text-base"} font-heading font-bold leading-snug text-[var(--dark)]`}>
          {member.name}
        </h3>
        <p className={`${isCompact ? "mt-0.5 text-xs" : "mt-1 text-sm"} font-medium leading-snug text-[var(--primary)]`}>
          {member.role || "Member"}
        </p>
      </div>
    </article>
  );
}

function VerticalConnector({ height = "h-10" }: { height?: string }) {
  return <div className={`mx-auto w-0.5 rounded-full bg-[var(--primary)]/30 ${height}`} aria-hidden="true" />;
}

function BranchGrid({ members }: { members: Member[] }) {
  if (!members.length) return null;
  const connectorInset = `${50 / members.length}%`;

  return (
    <>
      <div className="relative space-y-4 pl-7 lg:hidden">
        <div className="absolute bottom-8 left-0 top-0 w-0.5 rounded-full bg-[var(--primary)]/25" aria-hidden="true" />
        {members.map((member) => (
          <div key={memberKey(member)} className="relative pt-8">
            <div className="absolute -left-7 top-0 h-8 w-7 rounded-bl-3xl border-b-2 border-l-2 border-[var(--primary)]/25" aria-hidden="true" />
            <PersonCard member={member} />
          </div>
        ))}
      </div>

      <div className="relative mx-auto hidden max-w-4xl pt-9 lg:block">
        <div className="absolute left-1/2 top-0 h-5 w-0.5 -translate-x-1/2 rounded-full bg-[var(--primary)]/30" aria-hidden="true" />
        {members.length > 1 ? (
          <div
            className="absolute top-5 h-0.5 rounded-full bg-[var(--primary)]/25"
            style={{ left: connectorInset, right: connectorInset }}
            aria-hidden="true"
          />
        ) : null}
        <div className="grid gap-5" style={{ gridTemplateColumns: `repeat(${members.length}, minmax(0, 1fr))` }}>
          {members.map((member) => (
            <div key={memberKey(member)} className="relative pt-4">
              <div className="absolute -top-4 left-1/2 h-8 w-0.5 -translate-x-1/2 rounded-full bg-[var(--primary)]/30" aria-hidden="true" />
              <PersonCard member={member} />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function SupportingExecutiveMembers({ members }: { members: Member[] }) {
  if (!members.length) return null;

  return (
    <>
      <VerticalConnector height="h-9" />
      <section className="mx-auto max-w-4xl rounded-3xl border border-[var(--primary)]/10 bg-white/70 p-5 shadow-sm sm:p-7" aria-labelledby="executive-members-heading">
        <h3 id="executive-members-heading" className="text-center text-sm font-semibold uppercase tracking-[0.16em] text-[var(--primary)]">
          Executive committee members
        </h3>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {members.map((member) => (
            <PersonCard key={memberKey(member)} member={member} prominence="compact" />
          ))}
        </div>
      </section>
    </>
  );
}

function DepartmentCard({ department }: { department: Department }) {
  const members = flattenMembers(department);
  const head = members.find(isDepartmentHead) || members[0];
  const teamsWithRemainingMembers = (department.teams || [])
    .map((team) => ({
      ...team,
      members: (team.members || []).filter((member) => memberKey(member) !== (head ? memberKey(head) : "")),
    }))
    .filter((team) => team.members.length);

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-3xl border border-[var(--primary)]/15 bg-white shadow-[0_12px_30px_rgba(15,23,42,0.08)]">
      <header className="bg-[var(--primary)] px-5 py-5 text-center text-white">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/70">Department</p>
        <h3 className="mt-1.5 font-heading text-lg font-bold leading-snug">{department.full_name || department.name}</h3>
      </header>

      <div className="flex flex-1 flex-col p-5">
        {head ? (
          <div>
            <p className="mb-3 text-center text-xs font-semibold uppercase tracking-[0.14em] text-[var(--primary)]">Department head</p>
            <PersonCard member={head} />
          </div>
        ) : null}

        {teamsWithRemainingMembers.length ? (
          <>
            <VerticalConnector height="h-7" />
            <div className="space-y-5">
              {teamsWithRemainingMembers.map((team: Team) => (
                <section key={team.id || team.title} aria-label={team.title}>
                  <div className="mb-3 flex items-center gap-3">
                    <span className="h-px flex-1 bg-[var(--primary)]/15" aria-hidden="true" />
                    <h4 className="text-center text-xs font-semibold uppercase tracking-[0.12em] text-[var(--primary)]">{team.title}</h4>
                    <span className="h-px flex-1 bg-[var(--primary)]/15" aria-hidden="true" />
                  </div>
                  <div className="space-y-2.5">
                    {(team.members || []).map((member) => (
                      <PersonCard key={memberKey(member)} member={member} prominence="compact" />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </>
        ) : (
          <p className="mt-5 text-center text-sm leading-6 text-[var(--gray)]">Additional members will appear here when added by the admin.</p>
        )}
      </div>
    </article>
  );
}

function DepartmentsTree({ departments, connected }: { departments: Department[]; connected: boolean }) {
  if (!departments.length) return null;

  const chartMinWidth = Math.max(departments.length * 300, 1080);
  const connectorInset = `${50 / departments.length}%`;

  return (
    <>
      {connected ? <VerticalConnector height="h-12" /> : null}
      <div className="mx-auto w-fit rounded-full border border-[var(--primary)]/15 bg-white px-5 py-2 text-sm font-semibold uppercase tracking-[0.16em] text-[var(--primary)] shadow-sm">
        Departments
      </div>
      <VerticalConnector height="h-8" />

      <div className="relative space-y-5 pl-7 md:hidden">
        <div className="absolute bottom-8 left-0 top-0 w-0.5 rounded-full bg-[var(--primary)]/25" aria-hidden="true" />
        {departments.map((department) => (
          <div key={department.id || department.slug} className="relative pt-8">
            <div className="absolute -left-7 top-0 h-8 w-7 rounded-bl-3xl border-b-2 border-l-2 border-[var(--primary)]/25" aria-hidden="true" />
            <DepartmentCard department={department} />
          </div>
        ))}
      </div>

      <div className="hidden overflow-x-auto pb-5 md:block" aria-label="Scrollable organization chart">
        <div className="relative mx-auto pt-8" style={{ minWidth: `${chartMinWidth}px` }}>
          {departments.length > 1 ? (
            <div
              className="absolute top-0 h-0.5 rounded-full bg-[var(--primary)]/25"
              style={{ left: connectorInset, right: connectorInset }}
              aria-hidden="true"
            />
          ) : null}
          <div
            className="grid items-stretch gap-5 lg:gap-6"
            style={{ gridTemplateColumns: `repeat(${departments.length}, minmax(280px, 1fr))` }}
          >
            {departments.map((department) => (
              <div key={department.id || department.slug} className="relative pt-5">
                <div className="absolute -top-8 left-1/2 h-[52px] w-0.5 -translate-x-1/2 rounded-full bg-[var(--primary)]/30" aria-hidden="true" />
                <DepartmentCard department={department} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

export function OrganizationChart({ executiveCommittee, departments }: OrganizationChartProps) {
  const executiveMembers = flattenMembers(executiveCommittee);
  const president = executiveMembers.find(isPresident) || executiveMembers[0];
  const officers = executiveMembers.filter(
    (member) => memberKey(member) !== (president ? memberKey(president) : "") && isExecutiveOfficer(member)
  );
  const supportingMembers = executiveMembers.filter(
    (member) => memberKey(member) !== (president ? memberKey(president) : "") && !isExecutiveOfficer(member)
  );

  return (
    <div className="mx-auto mt-12 max-w-[1500px] md:mt-14">
      {executiveMembers.length ? (
        <section className="relative rounded-[2.5rem] border-2 border-[var(--primary)]/20 bg-white/35 px-5 pb-8 pt-12 shadow-[0_16px_45px_rgba(15,23,42,0.06)] sm:px-8 sm:pb-10 md:px-10" aria-labelledby="executive-committee-heading">
          <h3
            id="executive-committee-heading"
            className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full border border-[var(--primary)]/20 bg-[var(--light)] px-6 py-2 font-heading text-base font-bold text-[var(--primary)] shadow-sm sm:text-lg"
          >
            Executive Committee
          </h3>
          {president ? <PersonCard member={president} prominence="primary" /> : null}
          {president && officers.length ? <VerticalConnector height="h-10" /> : null}
          <BranchGrid members={officers} />
          <SupportingExecutiveMembers members={supportingMembers} />
        </section>
      ) : null}
      <DepartmentsTree departments={departments} connected={executiveMembers.length > 0} />
    </div>
  );
}
