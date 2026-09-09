import { beforeAll, describe, expect, it } from "vitest";
import { rest, type TestUser } from "./helpers";
import { getPoolUser } from "./pool";

/** Les ressources que chacun crée dans son coin mais que tout le monde
 * voit : profils, structures de blindes, notes, co-administrateurs
 * d'évènement.
 *
 * Elles n'avaient aucun test, alors qu'elles partagent toutes le même
 * risque : la lecture est ouverte à tous, donc c'est l'écriture seule
 * qui protège le travail d'autrui. Une politique trop large ici
 * laisserait n'importe qui renommer une structure ou effacer les
 * niveaux d'un autre.
 *
 * On vérifie systématiquement le nombre de lignes renvoyées et non le
 * seul code HTTP : PostgREST répond 200 ou 204 avec zéro ligne quand
 * une politique bloque un UPDATE ou un DELETE. C'est l'échec
 * silencieux qui nous a déjà piégés côté application. */

describe("profiles", () => {
  let moi: TestUser;
  let autre: TestUser;

  beforeAll(async () => {
    moi = await getPoolUser(0);
    autre = await getPoolUser(1);
  });

  it("laisse un utilisateur connecté lire le profil des autres", async () => {
    const res = await rest.get<{ id: string }[]>(
      `/rest/v1/profiles?id=eq.${autre.userId}&select=id,pseudo`,
      moi.token,
    );
    expect(res.status).toBe(200);
    expect(res.data).toHaveLength(1);
  });

  it("cache tout à un visiteur non connecté", async () => {
    // Sans jeton, helpers retombe sur la clé anon : le rôle est
    // « anon », or les politiques de profiles visent « authenticated ».
    const res = await rest.get<unknown[]>(`/rest/v1/profiles?select=id&limit=1`);
    expect(res.data).toEqual([]);
  });

  it("laisse chacun modifier son propre profil", async () => {
    const pseudo = `Moi${Date.now()}`;
    const res = await rest.patch<{ pseudo: string }[]>(
      `/rest/v1/profiles?id=eq.${moi.userId}`,
      { pseudo },
      moi.token,
    );
    expect(res.data).toHaveLength(1);
    expect(res.data[0].pseudo).toBe(pseudo);
  });

  it("empêche de modifier le profil de quelqu'un d'autre", async () => {
    const res = await rest.patch<unknown[]>(
      `/rest/v1/profiles?id=eq.${autre.userId}`,
      { pseudo: "Pirate" },
      moi.token,
    );
    // Zéro ligne touchée : la politique a filtré, sans lever d'erreur.
    expect(res.data).toEqual([]);
  });
});

describe("blind_structures", () => {
  let auteur: TestUser;
  let etranger: TestUser;
  let structureId: string;

  beforeAll(async () => {
    auteur = await getPoolUser(2);
    etranger = await getPoolUser(0);

    const res = await rest.post<{ id: string }[]>(
      "/rest/v1/blind_structures",
      { name: `Structure RLS ${Date.now()}`, created_by: auteur.userId },
      auteur.token,
    );
    expect(res.status).toBe(201);
    structureId = res.data[0].id;
  });

  it("est visible par n'importe quel utilisateur connecté", async () => {
    const res = await rest.get<unknown[]>(
      `/rest/v1/blind_structures?id=eq.${structureId}&select=id`,
      etranger.token,
    );
    expect(res.data).toHaveLength(1);
  });

  it("refuse une structure attribuée à quelqu'un d'autre", async () => {
    const res = await rest.post<unknown>(
      "/rest/v1/blind_structures",
      { name: "Usurpation", created_by: auteur.userId },
      etranger.token,
    );
    expect(res.status).toBe(403);
  });

  it("laisse son auteur la renommer", async () => {
    const res = await rest.patch<{ name: string }[]>(
      `/rest/v1/blind_structures?id=eq.${structureId}`,
      { name: "Renommée par son auteur" },
      auteur.token,
    );
    expect(res.data).toHaveLength(1);
  });

  it("empêche un tiers de la renommer", async () => {
    const res = await rest.patch<unknown[]>(
      `/rest/v1/blind_structures?id=eq.${structureId}`,
      { name: "Renommée par un intrus" },
      etranger.token,
    );
    expect(res.data).toEqual([]);
  });

  it("empêche un tiers de la supprimer", async () => {
    const res = await rest.delete<unknown[]>(
      `/rest/v1/blind_structures?id=eq.${structureId}`,
      etranger.token,
    );
    expect(res.data ?? []).toEqual([]);

    // La structure est toujours là — la suppression n'a rien fait.
    const encore = await rest.get<unknown[]>(
      `/rest/v1/blind_structures?id=eq.${structureId}&select=id`,
      auteur.token,
    );
    expect(encore.data).toHaveLength(1);
  });
});

describe("blind_structure_levels", () => {
  let auteur: TestUser;
  let etranger: TestUser;
  let structureId: string;

  beforeAll(async () => {
    auteur = await getPoolUser(1);
    etranger = await getPoolUser(2);

    const res = await rest.post<{ id: string }[]>(
      "/rest/v1/blind_structures",
      { name: `Structure niveaux ${Date.now()}`, created_by: auteur.userId },
      auteur.token,
    );
    structureId = res.data[0].id;
  });

  it("laisse l'auteur ajouter un niveau à sa structure", async () => {
    const res = await rest.post<unknown[]>(
      "/rest/v1/blind_structure_levels",
      { structure_id: structureId, level_number: 1, small_blind: 25, big_blind: 50, duration_minutes: 20 },
      auteur.token,
    );
    expect(res.status).toBe(201);
  });

  it("empêche un tiers d'ajouter un niveau à la structure d'un autre", async () => {
    const res = await rest.post<unknown>(
      "/rest/v1/blind_structure_levels",
      { structure_id: structureId, level_number: 2, small_blind: 50, big_blind: 100, duration_minutes: 20 },
      etranger.token,
    );
    expect(res.status).toBe(403);
  });

  it("empêche un tiers d'effacer les niveaux d'un autre", async () => {
    const res = await rest.delete<unknown[]>(
      `/rest/v1/blind_structure_levels?structure_id=eq.${structureId}`,
      etranger.token,
    );
    expect(res.data ?? []).toEqual([]);

    const restants = await rest.get<unknown[]>(
      `/rest/v1/blind_structure_levels?structure_id=eq.${structureId}&select=id`,
      auteur.token,
    );
    expect(restants.data).toHaveLength(1);
  });
});

describe("blind_structure_ratings", () => {
  let auteur: TestUser;
  let noteur: TestUser;
  let tiers: TestUser;
  let structureId: string;

  beforeAll(async () => {
    auteur = await getPoolUser(0);
    noteur = await getPoolUser(1);
    tiers = await getPoolUser(2);

    const res = await rest.post<{ id: string }[]>(
      "/rest/v1/blind_structures",
      { name: `Structure notée ${Date.now()}`, created_by: auteur.userId },
      auteur.token,
    );
    structureId = res.data[0].id;
  });

  it("laisse un utilisateur noter une structure", async () => {
    const res = await rest.post<unknown[]>(
      "/rest/v1/blind_structure_ratings",
      { structure_id: structureId, user_id: noteur.userId, rating: 4 },
      noteur.token,
    );
    expect(res.status).toBe(201);
  });

  it("refuse une note attribuée à quelqu'un d'autre", async () => {
    const res = await rest.post<unknown>(
      "/rest/v1/blind_structure_ratings",
      { structure_id: structureId, user_id: noteur.userId, rating: 1 },
      tiers.token,
    );
    expect(res.status).toBe(403);
  });

  it("empêche de modifier la note d'un autre", async () => {
    const res = await rest.patch<unknown[]>(
      `/rest/v1/blind_structure_ratings?structure_id=eq.${structureId}&user_id=eq.${noteur.userId}`,
      { rating: 1 },
      tiers.token,
    );
    expect(res.data).toEqual([]);
  });
});

describe("event_admins", () => {
  let organisateur: TestUser;
  let coAdmin: TestUser;
  let etranger: TestUser;
  let eventId: string;

  beforeAll(async () => {
    organisateur = await getPoolUser(0);
    coAdmin = await getPoolUser(1);
    etranger = await getPoolUser(2);

    const res = await rest.post<{ id: string }[]>(
      "/rest/v1/events",
      {
        name: `Évènement RLS ${Date.now()}`,
        created_by: organisateur.userId,
        // location est not null depuis la migration 0016.
        location: "Pornic",
        scheduled_at: new Date().toISOString(),
      },
      organisateur.token,
    );
    expect(res.status).toBe(201);
    eventId = res.data[0].id;
  });

  it("laisse l'organisateur nommer un co-administrateur", async () => {
    const res = await rest.post<unknown[]>(
      "/rest/v1/event_admins",
      { event_id: eventId, user_id: coAdmin.userId, added_by: organisateur.userId },
      organisateur.token,
    );
    expect(res.status).toBe(201);
  });

  it("empêche un inconnu de se nommer co-administrateur", async () => {
    const res = await rest.post<unknown>(
      "/rest/v1/event_admins",
      { event_id: eventId, user_id: etranger.userId, added_by: etranger.userId },
      etranger.token,
    );
    expect(res.status).toBe(403);
  });

  it("empêche même un co-administrateur d'en nommer un autre", async () => {
    // Seul l'organisateur nomme : un co-admin n'hérite pas de ce droit.
    const res = await rest.post<unknown>(
      "/rest/v1/event_admins",
      { event_id: eventId, user_id: etranger.userId, added_by: coAdmin.userId },
      coAdmin.token,
    );
    expect(res.status).toBe(403);
  });
});
