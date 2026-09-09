import { beforeAll, describe, expect, it } from "vitest";
import { rest, type TestUser } from "./helpers";
import { getPoolUser } from "./pool";

/** Les trois dernières familles de tables sans couverture :
 *
 * - club_join_requests, qui décide qui entre dans un club. La page de
 *   notifications s'appuie sur ses policies pour n'afficher à chacun
 *   que ce qu'il a réellement à traiter.
 * - chip_sets et chip_denominations, du travail personnel réutilisable
 *   que tout le monde peut lire — donc que seule l'écriture protège.
 * - tournament_chip_rack, qui dépend de can_manage_tournament et non
 *   du seul créateur : un co-administrateur doit pouvoir y toucher. */

describe("club_join_requests", () => {
  let proprietaire: TestUser;
  let demandeur: TestUser;
  let tiers: TestUser;
  let clubId: string;
  let demandeId: string;

  beforeAll(async () => {
    proprietaire = await getPoolUser(0);
    demandeur = await getPoolUser(1);
    tiers = await getPoolUser(2);

    const club = await rest.post<{ id: string }[]>(
      "/rest/v1/clubs",
      { name: `Club adhésions ${Date.now()}`, created_by: proprietaire.userId },
      proprietaire.token,
    );
    expect(club.status).toBe(201);
    clubId = club.data[0].id;
  });

  it("laisse quiconque demander à adhérer", async () => {
    const res = await rest.post<{ id: string }[]>(
      "/rest/v1/club_join_requests",
      { club_id: clubId, requester_id: demandeur.userId },
      demandeur.token,
    );
    expect(res.status).toBe(201);
    demandeId = res.data[0].id;
  });

  it("empêche de déposer une demande au nom d'un autre", async () => {
    const res = await rest.post<unknown>(
      "/rest/v1/club_join_requests",
      { club_id: clubId, requester_id: demandeur.userId },
      tiers.token,
    );
    expect(res.status).toBe(403);
  });

  it("montre la demande à son auteur", async () => {
    const res = await rest.get<unknown[]>(
      `/rest/v1/club_join_requests?id=eq.${demandeId}&select=id`,
      demandeur.token,
    );
    expect(res.data).toHaveLength(1);
  });

  it("la montre au responsable du club", async () => {
    const res = await rest.get<unknown[]>(
      `/rest/v1/club_join_requests?id=eq.${demandeId}&select=id`,
      proprietaire.token,
    );
    expect(res.data).toHaveLength(1);
  });

  it("la cache à un tiers sans rapport avec le club", async () => {
    const res = await rest.get<unknown[]>(
      `/rest/v1/club_join_requests?id=eq.${demandeId}&select=id`,
      tiers.token,
    );
    expect(res.data).toEqual([]);
  });

  it("empêche un tiers de traiter la demande", async () => {
    const res = await rest.patch<unknown[]>(
      `/rest/v1/club_join_requests?id=eq.${demandeId}`,
      { status: "approved" },
      tiers.token,
    );
    expect(res.data).toEqual([]);
  });

  it("empêche le demandeur d'approuver sa propre demande", async () => {
    // Sinon n'importe qui s'auto-admettrait dans n'importe quel club.
    const res = await rest.patch<unknown[]>(
      `/rest/v1/club_join_requests?id=eq.${demandeId}`,
      { status: "approved" },
      demandeur.token,
    );
    expect(res.data).toEqual([]);
  });

  it("laisse le responsable du club l'approuver", async () => {
    const res = await rest.patch<{ status: string }[]>(
      `/rest/v1/club_join_requests?id=eq.${demandeId}`,
      { status: "approved" },
      proprietaire.token,
    );
    expect(res.data).toHaveLength(1);
    expect(res.data[0].status).toBe("approved");
  });

  it("laisse le demandeur retirer sa demande", async () => {
    const res = await rest.delete<unknown[]>(
      `/rest/v1/club_join_requests?id=eq.${demandeId}`,
      demandeur.token,
    );
    expect([200, 204]).toContain(res.status);

    const encore = await rest.get<unknown[]>(
      `/rest/v1/club_join_requests?id=eq.${demandeId}&select=id`,
      proprietaire.token,
    );
    expect(encore.data).toEqual([]);
  });
});

describe("chip_sets et chip_denominations", () => {
  let auteur: TestUser;
  let etranger: TestUser;
  let jeuId: string;

  beforeAll(async () => {
    auteur = await getPoolUser(0);
    etranger = await getPoolUser(1);

    const res = await rest.post<{ id: string }[]>(
      "/rest/v1/chip_sets",
      { name: `Jeu de jetons ${Date.now()}`, created_by: auteur.userId },
      auteur.token,
    );
    expect(res.status).toBe(201);
    jeuId = res.data[0].id;
  });

  it("laisse n'importe qui voir un jeu de jetons", async () => {
    const res = await rest.get<unknown[]>(
      `/rest/v1/chip_sets?id=eq.${jeuId}&select=id`,
      etranger.token,
    );
    expect(res.data).toHaveLength(1);
  });

  it("refuse un jeu attribué à quelqu'un d'autre", async () => {
    const res = await rest.post<unknown>(
      "/rest/v1/chip_sets",
      { name: "Usurpation", created_by: auteur.userId },
      etranger.token,
    );
    expect(res.status).toBe(403);
  });

  it("empêche un tiers de renommer le jeu d'un autre", async () => {
    const res = await rest.patch<unknown[]>(
      `/rest/v1/chip_sets?id=eq.${jeuId}`,
      { name: "Renommé par un intrus" },
      etranger.token,
    );
    expect(res.data).toEqual([]);
  });

  it("laisse l'auteur ajouter une dénomination à son jeu", async () => {
    const res = await rest.post<unknown[]>(
      "/rest/v1/chip_denominations",
      { chip_set_id: jeuId, color: "vert", value: 25 },
      auteur.token,
    );
    expect(res.status).toBe(201);
  });

  it("empêche un tiers d'ajouter une dénomination au jeu d'un autre", async () => {
    const res = await rest.post<unknown>(
      "/rest/v1/chip_denominations",
      { chip_set_id: jeuId, color: "noir", value: 100 },
      etranger.token,
    );
    expect(res.status).toBe(403);
  });

  it("empêche un tiers d'effacer les dénominations d'un autre", async () => {
    const res = await rest.delete<unknown[]>(
      `/rest/v1/chip_denominations?chip_set_id=eq.${jeuId}`,
      etranger.token,
    );
    expect(res.data ?? []).toEqual([]);

    const restantes = await rest.get<unknown[]>(
      `/rest/v1/chip_denominations?chip_set_id=eq.${jeuId}&select=id`,
      auteur.token,
    );
    expect(restantes.data).toHaveLength(1);
  });

  it("empêche un tiers de supprimer le jeu", async () => {
    const res = await rest.delete<unknown[]>(`/rest/v1/chip_sets?id=eq.${jeuId}`, etranger.token);
    expect(res.data ?? []).toEqual([]);

    const encore = await rest.get<unknown[]>(
      `/rest/v1/chip_sets?id=eq.${jeuId}&select=id`,
      auteur.token,
    );
    expect(encore.data).toHaveLength(1);
  });
});

describe("tournament_chip_rack", () => {
  let organisateur: TestUser;
  let coAdmin: TestUser;
  let etranger: TestUser;
  let tournoiId: string;
  let denominationId: string;

  beforeAll(async () => {
    organisateur = await getPoolUser(0);
    coAdmin = await getPoolUser(1);
    etranger = await getPoolUser(2);

    const jeu = await rest.post<{ id: string }[]>(
      "/rest/v1/chip_sets",
      { name: `Jeu cave ${Date.now()}`, created_by: organisateur.userId },
      organisateur.token,
    );
    const denom = await rest.post<{ id: string }[]>(
      "/rest/v1/chip_denominations",
      { chip_set_id: jeu.data[0].id, color: "blanc", value: 1 },
      organisateur.token,
    );
    denominationId = denom.data[0].id;

    const tournoi = await rest.post<{ id: string }[]>(
      "/rest/v1/tournaments",
      { name: `Tournoi cave ${Date.now()}`, created_by: organisateur.userId },
      organisateur.token,
    );
    expect(tournoi.status).toBe(201);
    tournoiId = tournoi.data[0].id;

    await rest.post<unknown[]>(
      "/rest/v1/tournament_admins",
      { tournament_id: tournoiId, user_id: coAdmin.userId, added_by: organisateur.userId },
      organisateur.token,
    );
  });

  it("laisse l'organisateur composer la cave", async () => {
    const res = await rest.post<unknown[]>(
      "/rest/v1/tournament_chip_rack",
      { tournament_id: tournoiId, denomination_id: denominationId, quantity: 10 },
      organisateur.token,
    );
    expect(res.status).toBe(201);
  });

  it("empêche un inconnu d'y toucher", async () => {
    const res = await rest.post<unknown>(
      "/rest/v1/tournament_chip_rack",
      { tournament_id: tournoiId, denomination_id: denominationId, quantity: 999 },
      etranger.token,
    );
    expect(res.status).toBe(403);
  });

  it("empêche un inconnu d'effacer la cave", async () => {
    const res = await rest.delete<unknown[]>(
      `/rest/v1/tournament_chip_rack?tournament_id=eq.${tournoiId}`,
      etranger.token,
    );
    expect(res.data ?? []).toEqual([]);

    const restant = await rest.get<unknown[]>(
      `/rest/v1/tournament_chip_rack?tournament_id=eq.${tournoiId}&select=id`,
      organisateur.token,
    );
    expect(restant.data).toHaveLength(1);
  });

  /* can_manage_tournament, et non « le créateur » : le co-admin doit
   * pouvoir corriger la cave le soir du tournoi. */
  it("laisse un co-administrateur la corriger", async () => {
    const res = await rest.delete<unknown[]>(
      `/rest/v1/tournament_chip_rack?tournament_id=eq.${tournoiId}`,
      coAdmin.token,
    );
    expect([200, 204]).toContain(res.status);

    const restant = await rest.get<unknown[]>(
      `/rest/v1/tournament_chip_rack?tournament_id=eq.${tournoiId}&select=id`,
      organisateur.token,
    );
    expect(restant.data).toEqual([]);
  });
});
