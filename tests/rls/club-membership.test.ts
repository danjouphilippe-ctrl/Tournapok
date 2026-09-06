import { beforeAll, describe, expect, it } from "vitest";
import { rest, type TestUser } from "./helpers";
import { getPoolUser } from "./pool";

/** Phase 1 du plan "Clubs & Visibilité" : club_members et son
 * correctif de récursion RLS ("infinite recursion detected in
 * policy"), plus les permissions par rôle. */
describe("club_members RLS", () => {
  let owner: TestUser;
  let member: TestUser;
  let outsider: TestUser;
  let clubId: string;

  beforeAll(async () => {
    owner = await getPoolUser(0);
    member = await getPoolUser(1);
    outsider = await getPoolUser(2);

    const club = await rest.post<{ id: string }[]>(
      "/rest/v1/clubs",
      { name: `Club Membership Test ${Date.now()}`, created_by: owner.userId },
      owner.token,
    );
    expect(club.status).toBe(201);
    clubId = club.data[0].id;
  });

  it("auto-enrolls the club's creator as owner (handle_new_club trigger)", async () => {
    const res = await rest.get<{ user_id: string; role: string }[]>(
      `/rest/v1/club_members?club_id=eq.${clubId}&select=user_id,role`,
      owner.token,
    );
    expect(res.data).toEqual([{ user_id: owner.userId, role: "owner" }]);
  });

  it("lets the owner add a member", async () => {
    const res = await rest.post<{ id: string }[]>(
      "/rest/v1/club_members",
      { club_id: clubId, user_id: member.userId, role: "member", added_by: owner.userId },
      owner.token,
    );
    expect(res.status).toBe(201);
  });

  // Régression : club_members.select("...").eq(...) référençant
  // club_members provoquait "infinite recursion detected in policy".
  it("lets a fellow member see the full roster without triggering RLS recursion", async () => {
    const res = await rest.get<unknown[]>(
      `/rest/v1/club_members?club_id=eq.${clubId}&select=*`,
      member.token,
    );
    expect(res.status).toBe(200);
    expect(res.data).toHaveLength(2);
  });

  it("hides the roster entirely from a non-member", async () => {
    const res = await rest.get<unknown[]>(
      `/rest/v1/club_members?club_id=eq.${clubId}&select=*`,
      outsider.token,
    );
    expect(res.status).toBe(200);
    expect(res.data).toEqual([]);
  });

  it("blocks a non-member from adding themselves as admin", async () => {
    const res = await rest.post(
      "/rest/v1/club_members",
      { club_id: clubId, user_id: outsider.userId, role: "admin", added_by: outsider.userId },
      outsider.token,
    );
    expect(res.status).toBe(403);
  });

  it("blocks a plain member from changing another member's role", async () => {
    const res = await rest.patch<unknown[]>(
      `/rest/v1/club_members?club_id=eq.${clubId}&user_id=eq.${owner.userId}`,
      { role: "member" },
      member.token,
    );
    // RLS filtre silencieusement la ligne plutôt que de renvoyer une
    // erreur explicite : 0 ligne modifiée est le signal de refus.
    expect(res.status).toBe(200);
    expect(res.data).toEqual([]);
  });

  it("lets a member remove themselves from the club", async () => {
    const res = await rest.delete(
      `/rest/v1/club_members?club_id=eq.${clubId}&user_id=eq.${member.userId}`,
      member.token,
    );
    expect(res.status).toBe(204);

    const check = await rest.get<unknown[]>(
      `/rest/v1/club_members?club_id=eq.${clubId}&user_id=eq.${member.userId}`,
      owner.token,
    );
    expect(check.data).toEqual([]);
  });
});
