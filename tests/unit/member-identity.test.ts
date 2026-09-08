import { describe, expect, it } from "vitest";
import { getUniqueMemberCount, getUniqueMembers } from "@/lib/member-identity";
import type { Member, Team } from "@/lib/firebase/types";

function member(id: string, name: string, imageUrl = ""): Member {
  return {
    id,
    team_id: "",
    name,
    role: "Member",
    image_url: imageUrl,
    socials: {},
    display_order: 0,
  };
}

function team(id: string, members: Member[]): Team {
  return { id, department_id: "ict", title: id, display_order: 0, members };
}

describe("department member identity", () => {
  it("does not count members again when they also belong to sub-teams", () => {
    const originalMembers = Array.from({ length: 9 }, (_, index) =>
      member(`original-${index}`, `Member ${index + 1}`),
    );
    const teams = [
      team("ICT Department", originalMembers),
      team("Developer Team", [member("dev-1", "Member 1"), member("dev-2", "Member 2"), member("dev-3", "Member 3")]),
      team("Media Team", [member("media-1", "Member 4"), member("media-2", "Member 5")]),
    ];

    expect(getUniqueMemberCount(teams)).toBe(9);
  });

  it("matches names despite capitalization, punctuation, or extra spacing", () => {
    const teams = [
      team("Main", [member("1", "Faisal Khrisan")]),
      team("Developer", [member("2", "  FAISAL   KHRISAN ")]),
    ];

    expect(getUniqueMemberCount(teams)).toBe(1);
  });

  it("keeps the duplicate record that has an image", () => {
    const teams = [
      team("Main", [member("1", "Taslim Bashir")]),
      team("Leadership", [member("2", "Taslim Bashir", "/taslim.jpg")]),
    ];

    expect(getUniqueMembers(teams)[0].image_url).toBe("/taslim.jpg");
  });
});
