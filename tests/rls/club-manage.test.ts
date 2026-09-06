import { beforeAll, describe, expect, it } from "vitest";
import { rest, type TestUser } from "./helpers";
import { getPoolUser } from "./pool";

/** Phases 4 et 5 : un tournoi/évènement ne peut se rattacher qu'à un
 * club que son créateur gère (0019), et un owner/admin de club peut
 * ensuite gérer ce tournoi de bout en bout sans être ajouté
 * individuellement comme co-administrateur (0020) — y compris le
 * correctif de récursion croisée tournaments <-> events pour la
 * création via event_id (can_manage_event). */
describe("club_id integrity on creation", () => {
  it("rejects attaching a new tournament to a club its creator doesn't manage", async () => {
    const owner = await getPoolUser(0);
    const stranger = await getPoolUser(1);

    const club = await rest.post<{ id: string }[]>(
      "/rest/v1/clubs",
      { name: `Integrity Club ${Date.now()}`, created_by: owner.userId },
      owner.token,
    );
    const clubId = club.data[0].id;

    const res = await rest.post(
      "/rest/v1/tournaments",
      {
        name: "Should be rejected",
        buy_in: 10,
        starting_stack: 10000,
        min_players: 2,
        table_size: 9,
        created_by: stranger.userId,
        club_id: clubId,
      },
      stranger.token,
    );
    expect([401, 403]).toContain(res.status);
  });

  it("accepts attaching a tournament to a club its creator does manage", async () => {
    const owner = await getPoolUser(0);
    const club = await rest.post<{ id: string }[]>(
      "/rest/v1/clubs",
      { name: `Integrity Club Ok ${Date.now()}`, created_by: owner.userId },
      owner.token,
    );
    const clubId = club.data[0].id;

    const res = await rest.post(
      "/rest/v1/tournaments",
      {
        name: "Should succeed",
        buy_in: 10,
        starting_stack: 10000,
        min_players: 2,
        table_size: 9,
        created_by: owner.userId,
        club_id: clubId,
      },
      owner.token,
    );
    expect(res.status).toBe(201);
  });

  // Régression phase 4 : le check event_id de l'insert policy des
  // tournois interrogeait events, dont la policy de lecture (phase 3)
  // interrogeait tournaments en retour — une vraie création de
  // tournoi lié à un évènement plantait avec "infinite recursion
  // detected in policy" avant le correctif can_manage_event().
  it("creating a tournament attached to an event doesn't trigger RLS recursion", async () => {
    const owner = await getPoolUser(0);
    const event = await rest.post<{ id: string }[]>(
      "/rest/v1/events",
      {
        name: `Recursion Check Event ${Date.now()}`,
        scheduled_at: new Date().toISOString(),
        location: "Pornic",
        created_by: owner.userId,
      },
      owner.token,
    );
    const res = await rest.post(
      "/rest/v1/tournaments",
      {
        name: "Event-linked tournament",
        buy_in: 10,
        starting_stack: 10000,
        min_players: 2,
        table_size: 9,
        created_by: owner.userId,
        event_id: event.data[0].id,
      },
      owner.token,
    );
    expect(res.status).toBe(201);
  });
});

describe("a club admin can manage the club's tournament end to end", () => {
  let owner: TestUser;
  let clubAdmin: TestUser;
  let clubMember: TestUser;
  let outsider: TestUser;
  let tournamentId: string;

  beforeAll(async () => {
    owner = await getPoolUser(0);
    clubAdmin = await getPoolUser(1);
    clubMember = await getPoolUser(2);
    outsider = await getPoolUser(3);

    const club = await rest.post<{ id: string }[]>(
      "/rest/v1/clubs",
      { name: `Manage Club ${Date.now()}`, created_by: owner.userId },
      owner.token,
    );
    const clubId = club.data[0].id;

    await rest.post(
      "/rest/v1/club_members",
      { club_id: clubId, user_id: clubAdmin.userId, role: "admin", added_by: owner.userId },
      owner.token,
    );
    await rest.post(
      "/rest/v1/club_members",
      { club_id: clubId, user_id: clubMember.userId, role: "member", added_by: owner.userId },
      owner.token,
    );

    const tournament = await rest.post<{ id: string }[]>(
      "/rest/v1/tournaments",
      {
        name: `Managed Tournament ${Date.now()}`,
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

  it("lets the club admin (not the tournament's creator) update it", async () => {
    const res = await rest.patch<unknown[]>(
      `/rest/v1/tournaments?id=eq.${tournamentId}`,
      { buy_in: 25 },
      clubAdmin.token,
    );
    expect(res.status).toBe(200);
    expect(res.data).toHaveLength(1);
  });

  it("lets the club admin add a blind level", async () => {
    const res = await rest.post(
      "/rest/v1/tournament_blind_levels",
      { tournament_id: tournamentId, level_number: 1, small_blind: 25, big_blind: 50, duration_minutes: 20 },
      clubAdmin.token,
    );
    expect(res.status).toBe(201);
  });

  it("lets the club admin add a payout", async () => {
    const res = await rest.post(
      "/rest/v1/tournament_payouts",
      { tournament_id: tournamentId, place: 1, percentage: 100 },
      clubAdmin.token,
    );
    expect(res.status).toBe(201);
  });

  it("lets the club admin register a player directly", async () => {
    const res = await rest.post<unknown[]>(
      "/rest/v1/tournament_players",
      { tournament_id: tournamentId, player_id: outsider.userId },
      clubAdmin.token,
    );
    expect(res.status).toBe(201);
  });

  it("lets the club admin mark that player's buy-in as paid", async () => {
    const res = await rest.patch<unknown[]>(
      `/rest/v1/tournament_players?tournament_id=eq.${tournamentId}&player_id=eq.${outsider.userId}`,
      { buy_in_paid: true },
      clubAdmin.token,
    );
    expect(res.status).toBe(200);
    expect(res.data).toHaveLength(1);
  });

  it("lets the club admin send and cancel an invitation", async () => {
    const invitee = await getPoolUser(4);
    const invite = await rest.post<{ id: string }[]>(
      "/rest/v1/tournament_invitations",
      { tournament_id: tournamentId, invited_user_id: invitee.userId, invited_by: clubAdmin.userId },
      clubAdmin.token,
    );
    expect(invite.status).toBe(201);

    const cancel = await rest.delete(
      `/rest/v1/tournament_invitations?id=eq.${invite.data[0].id}`,
      clubAdmin.token,
    );
    expect(cancel.status).toBe(204);
  });

  it("blocks a plain club member from updating the tournament", async () => {
    const res = await rest.patch<unknown[]>(
      `/rest/v1/tournaments?id=eq.${tournamentId}`,
      { buy_in: 999 },
      clubMember.token,
    );
    expect(res.status).toBe(200);
    expect(res.data).toEqual([]);
  });

  it("blocks a genuine outsider from updating the tournament", async () => {
    const res = await rest.patch<unknown[]>(
      `/rest/v1/tournaments?id=eq.${tournamentId}`,
      { buy_in: 999 },
      outsider.token,
    );
    expect(res.status).toBe(200);
    expect(res.data).toEqual([]);
  });
});
