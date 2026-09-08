import type { Member, Team } from "@/lib/firebase/types";

/**
 * Member records are stored per team, so one person can legitimately have more
 * than one record. Names are the shared human identifier in the current schema.
 */
export function getMemberIdentity(member: Pick<Member, "id" | "name">) {
  const normalizedName = member.name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();

  return normalizedName || member.id;
}

export function getUniqueMembers(teams: Pick<Team, "members">[] = []) {
  const uniqueMembers = new Map<string, Member>();

  for (const team of teams) {
    for (const member of team.members || []) {
      const key = getMemberIdentity(member);
      const existing = uniqueMembers.get(key);

      // Prefer the most complete copy when duplicate team records differ.
      if (!existing || (!existing.image_url && member.image_url)) {
        uniqueMembers.set(key, member);
      }
    }
  }

  return [...uniqueMembers.values()];
}

export function getUniqueMemberCount(teams: Pick<Team, "members">[] = []) {
  return getUniqueMembers(teams).length;
}
