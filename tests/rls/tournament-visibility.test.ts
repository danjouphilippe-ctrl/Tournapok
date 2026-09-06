import { beforeAll, describe, expect, it } from "vitest";
import { rest, type TestUser } from "./helpers";
import { getPoolUser } from "./pool";

/** Phase 3 du plan "Clubs & Visibilité" : la policy de lecture
 * public/club/privé sur tournaments et events, et le correctif de
 * récursion croisée avec tournament_invitations/tournament_join_
 * requests (can_manage_tournament). */
describe("tournament visibility", () => {
  let owner: TestUser;
  let coAdmin: TestUser;
  let player: TestUser;
  let invitee: TestUser;
  let requester: TestUser;
  let outsider: TestUser;
  let tournamentId: string;

  async function canSeeTournament(token: string): Promise<boolean> {
    const res = await rest.get<unknown[]>(
      `/rest/v1/tournaments?id=eq.${tournamentId}&select=id`,
      token,
    );
    expect(res.status).toBe(200);
    return res.data.length === 1;
  }

  beforeAll(async () => {
    owner = await getPoolUser(0);
    coAdmin = await getPoolUser(1);
    player = await getPoolUser(2);
    invitee = await getPoolUser(3);
    requester = await getPoolUser(4);
    outsider = await getPoolUser(5);

    const tournament = await rest.post<{ id: string }[]>(
      "/rest/v1/tournaments",
      {
        name: `Visibility Test ${Date.now()}`,
        buy_in: 10,
        starting_stack: 10000,
        min_players: 2,
        table_size: 9,
        created_by: owner.userId,
        // visibility par défaut = "private"
      },
      owner.token,
    );
    expect(tournament.status).toBe(201);
    tournamentId = tournament.data[0].id;

    await rest.post(
      "/rest/v1/tournament_admins",
      { tournament_id: tournamentId, user_id: coAdmin.userId, added_by: owner.userId },
      owner.token,
    );
    await rest.post(
      "/rest/v1/tournament_players",
      { tournament_id: tournamentId, player_id: player.userId },
      owner.token,
    );
    await rest.post(
      "/rest/v1/tournament_invitations",
      { tournament_id: tournamentId, invited_user_id: invitee.userId, invited_by: owner.userId },
      owner.token,
    );
    await rest.post(
      "/rest/v1/tournament_join_requests",
      { tournament_id: tournamentId, requester_id: requester.userId },
      requester.token,
    );
  });

  it("is visible to its owner", async () => {
    expect(await canSeeTournament(owner.token)).toBe(true);
  });

  it("is visible to a co-admin", async () => {
    expect(await canSeeTournament(coAdmin.token)).toBe(true);
  });

  it("is visible to a registered player", async () => {
    expect(await canSeeTournament(player.token)).toBe(true);
  });

  it("is visible to someone invited but not yet registered", async () => {
    expect(await canSeeTournament(invitee.token)).toBe(true);
  });

  it("is visible to someone with a pending join request", async () => {
    expect(await canSeeTournament(requester.token)).toBe(true);
  });

  it("is invisible to a genuine outsider while private", async () => {
    expect(await canSeeTournament(outsider.token)).toBe(false);
  });

  it("becomes visible to everyone once switched to public", async () => {
    const patch = await rest.patch(
      `/rest/v1/tournaments?id=eq.${tournamentId}`,
      { visibility: "public" },
      owner.token,
    );
    expect(patch.status).toBe(200);
    expect(await canSeeTournament(outsider.token)).toBe(true);

    await rest.patch(
      `/rest/v1/tournaments?id=eq.${tournamentId}`,
      { visibility: "private" },
      owner.token,
    );
    expect(await canSeeTournament(outsider.token)).toBe(false);
  });
});

describe("club-visibility tournament", () => {
  let owner: TestUser;
  let clubMember: TestUser;
  let outsider: TestUser;
  let tournamentId: string;
  let clubId: string;

  beforeAll(async () => {
    owner = await getPoolUser(0);
    clubMember = await getPoolUser(1);
    outsider = await getPoolUser(2);

    const club = await rest.post<{ id: string }[]>(
      "/rest/v1/clubs",
      { name: `Club Visibility Test ${Date.now()}`, created_by: owner.userId },
      owner.token,
    );
    clubId = club.data[0].id;

    await rest.post(
      "/rest/v1/club_members",
      { club_id: clubId, user_id: clubMember.userId, role: "member", added_by: owner.userId },
      owner.token,
    );

    const tournament = await rest.post<{ id: string }[]>(
      "/rest/v1/tournaments",
      {
        name: `Club Tournament ${Date.now()}`,
        buy_in: 10,
        starting_stack: 10000,
        min_players: 2,
        table_size: 9,
        created_by: owner.userId,
        club_id: clubId,
        visibility: "club",
      },
      owner.token,
    );
    tournamentId = tournament.data[0].id;
  });

  it("is visible to a member of the owning club", async () => {
    const res = await rest.get<unknown[]>(
      `/rest/v1/tournaments?id=eq.${tournamentId}&select=id`,
      clubMember.token,
    );
    expect(res.data).toHaveLength(1);
  });

  it("stays invisible to someone outside the club", async () => {
    const res = await rest.get<unknown[]>(
      `/rest/v1/tournaments?id=eq.${tournamentId}&select=id`,
      outsider.token,
    );
    expect(res.data).toEqual([]);
  });
});

describe("event visibility via a sibling tournament", () => {
  let owner: TestUser;
  let player: TestUser;
  let outsider: TestUser;
  let eventId: string;

  beforeAll(async () => {
    owner = await getPoolUser(0);
    player = await getPoolUser(1);
    outsider = await getPoolUser(2);

    const event = await rest.post<{ id: string }[]>(
      "/rest/v1/events",
      {
        name: `Private Event ${Date.now()}`,
        scheduled_at: new Date().toISOString(),
        location: "Pornic",
        created_by: owner.userId,
        // visibility par défaut = "private"
      },
      owner.token,
    );
    eventId = event.data[0].id;

    const tournament = await rest.post<{ id: string }[]>(
      "/rest/v1/tournaments",
      {
        name: `Sibling Tournament ${Date.now()}`,
        buy_in: 10,
        starting_stack: 10000,
        min_players: 2,
        table_size: 9,
        created_by: owner.userId,
        event_id: eventId,
      },
      owner.token,
    );
    await rest.post(
      "/rest/v1/tournament_players",
      { tournament_id: tournament.data[0].id, player_id: player.userId },
      owner.token,
    );
  });

  it("stays visible to a player registered in one of its tournaments", async () => {
    const res = await rest.get<unknown[]>(`/rest/v1/events?id=eq.${eventId}&select=id`, player.token);
    expect(res.data).toHaveLength(1);
  });

  it("stays invisible to someone with no relation to the event or its tournaments", async () => {
    const res = await rest.get<unknown[]>(`/rest/v1/events?id=eq.${eventId}&select=id`, outsider.token);
    expect(res.data).toEqual([]);
  });
});
