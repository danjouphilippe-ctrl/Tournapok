import { beforeAll, describe, expect, it } from "vitest";
import { rest, type TestUser } from "./helpers";
import { getPoolUser } from "./pool";

/** event_invitations, écrite le 7 septembre et jamais testée jusqu'ici.
 *
 * C'est la table la plus sensible du lot : une invitation ne se
 * contente pas d'être une notification, elle **ouvre l'accès à un
 * évènement privé**. Une politique trop large ici rendrait visible à un
 * inconnu le programme d'une soirée qui ne le regarde pas — et une
 * politique trop étroite empêcherait l'invité de répondre.
 *
 * Comme partout dans cette suite, un refus se vérifie sur le nombre de
 * lignes renvoyées : PostgREST répond 200 avec zéro ligne quand une
 * politique bloque un UPDATE ou un DELETE. */

async function creerEvenementPrive(organisateur: TestUser, titre: string): Promise<string> {
  const res = await rest.post<{ id: string }[]>(
    "/rest/v1/events",
    {
      name: `${titre} ${Date.now()}`,
      created_by: organisateur.userId,
      location: "Pornic",
      scheduled_at: new Date().toISOString(),
      visibility: "private",
    },
    organisateur.token,
  );
  expect(res.status).toBe(201);
  return res.data[0].id;
}

describe("event_invitations : qui peut inviter", () => {
  let organisateur: TestUser;
  let invite: TestUser;
  let etranger: TestUser;
  let eventId: string;

  beforeAll(async () => {
    organisateur = await getPoolUser(0);
    invite = await getPoolUser(1);
    etranger = await getPoolUser(2);
    eventId = await creerEvenementPrive(organisateur, "Invitations");
  });

  it("laisse l'organisateur inviter quelqu'un", async () => {
    const res = await rest.post<unknown[]>(
      "/rest/v1/event_invitations",
      { event_id: eventId, invited_user_id: invite.userId, invited_by: organisateur.userId },
      organisateur.token,
    );
    expect(res.status).toBe(201);
  });

  it("empêche un inconnu d'inviter à un évènement qu'il n'organise pas", async () => {
    const res = await rest.post<unknown>(
      "/rest/v1/event_invitations",
      { event_id: eventId, invited_user_id: etranger.userId, invited_by: etranger.userId },
      etranger.token,
    );
    expect(res.status).toBe(403);
  });

  it("empêche de signer une invitation du nom de l'organisateur", async () => {
    // invited_by doit valoir auth.uid() : sans ce garde-fou, un tiers
    // pourrait faire passer son invitation pour celle de l'organisateur.
    const res = await rest.post<unknown>(
      "/rest/v1/event_invitations",
      { event_id: eventId, invited_user_id: etranger.userId, invited_by: organisateur.userId },
      etranger.token,
    );
    expect(res.status).toBe(403);
  });
});

describe("event_invitations : qui voit quoi", () => {
  let organisateur: TestUser;
  let invite: TestUser;
  let etranger: TestUser;
  let eventId: string;
  let invitationId: string;

  beforeAll(async () => {
    organisateur = await getPoolUser(0);
    invite = await getPoolUser(1);
    etranger = await getPoolUser(2);
    eventId = await creerEvenementPrive(organisateur, "Visibilité");

    const res = await rest.post<{ id: string }[]>(
      "/rest/v1/event_invitations",
      { event_id: eventId, invited_user_id: invite.userId, invited_by: organisateur.userId },
      organisateur.token,
    );
    expect(res.status).toBe(201);
    invitationId = res.data[0].id;
  });

  it("montre l'invitation à son destinataire", async () => {
    const res = await rest.get<unknown[]>(
      `/rest/v1/event_invitations?id=eq.${invitationId}&select=id`,
      invite.token,
    );
    expect(res.data).toHaveLength(1);
  });

  it("la montre aussi à l'organisateur", async () => {
    const res = await rest.get<unknown[]>(
      `/rest/v1/event_invitations?id=eq.${invitationId}&select=id`,
      organisateur.token,
    );
    expect(res.data).toHaveLength(1);
  });

  it("la cache à un tiers", async () => {
    const res = await rest.get<unknown[]>(
      `/rest/v1/event_invitations?id=eq.${invitationId}&select=id`,
      etranger.token,
    );
    expect(res.data).toEqual([]);
  });

  /* Le cœur du sujet : c'est l'invitation qui ouvre l'évènement privé. */
  it("rend l'évènement privé visible à l'invité", async () => {
    const res = await rest.get<unknown[]>(`/rest/v1/events?id=eq.${eventId}&select=id`, invite.token);
    expect(res.data).toHaveLength(1);
  });

  it("laisse l'évènement privé invisible à un tiers", async () => {
    const res = await rest.get<unknown[]>(
      `/rest/v1/events?id=eq.${eventId}&select=id`,
      etranger.token,
    );
    expect(res.data).toEqual([]);
  });
});

describe("event_invitations : répondre", () => {
  let organisateur: TestUser;
  let invite: TestUser;
  let etranger: TestUser;
  let eventId: string;
  let invitationId: string;

  beforeAll(async () => {
    organisateur = await getPoolUser(0);
    invite = await getPoolUser(1);
    etranger = await getPoolUser(2);
    eventId = await creerEvenementPrive(organisateur, "Réponse");

    const res = await rest.post<{ id: string }[]>(
      "/rest/v1/event_invitations",
      { event_id: eventId, invited_user_id: invite.userId, invited_by: organisateur.userId },
      organisateur.token,
    );
    invitationId = res.data[0].id;
  });

  it("empêche un tiers de répondre à la place de l'invité", async () => {
    const res = await rest.patch<unknown[]>(
      `/rest/v1/event_invitations?id=eq.${invitationId}`,
      { status: "accepted" },
      etranger.token,
    );
    expect(res.data).toEqual([]);
  });

  it("empêche même l'organisateur de répondre à la place de l'invité", async () => {
    const res = await rest.patch<unknown[]>(
      `/rest/v1/event_invitations?id=eq.${invitationId}`,
      { status: "accepted" },
      organisateur.token,
    );
    expect(res.data).toEqual([]);
  });

  it("laisse l'invité accepter", async () => {
    const res = await rest.patch<{ status: string }[]>(
      `/rest/v1/event_invitations?id=eq.${invitationId}`,
      { status: "accepted" },
      invite.token,
    );
    expect(res.data).toHaveLength(1);
    expect(res.data[0].status).toBe("accepted");
  });

  /* Règle subtile de la policy de events : `status <> 'declined'`.
   * Refuser une invitation referme donc l'évènement. */
  it("referme l'évènement quand l'invité décline", async () => {
    const refus = await rest.patch<unknown[]>(
      `/rest/v1/event_invitations?id=eq.${invitationId}`,
      { status: "declined" },
      invite.token,
    );
    expect(refus.data).toHaveLength(1);

    const vue = await rest.get<unknown[]>(`/rest/v1/events?id=eq.${eventId}&select=id`, invite.token);
    expect(vue.data).toEqual([]);
  });
});

describe("event_invitations : annuler", () => {
  let organisateur: TestUser;
  let invite: TestUser;
  let etranger: TestUser;
  let eventId: string;
  let invitationId: string;

  beforeAll(async () => {
    organisateur = await getPoolUser(0);
    invite = await getPoolUser(1);
    etranger = await getPoolUser(2);
    eventId = await creerEvenementPrive(organisateur, "Annulation");

    const res = await rest.post<{ id: string }[]>(
      "/rest/v1/event_invitations",
      { event_id: eventId, invited_user_id: invite.userId, invited_by: organisateur.userId },
      organisateur.token,
    );
    invitationId = res.data[0].id;
  });

  it("empêche un tiers d'annuler une invitation", async () => {
    const res = await rest.delete<unknown[]>(
      `/rest/v1/event_invitations?id=eq.${invitationId}`,
      etranger.token,
    );
    expect(res.data ?? []).toEqual([]);

    const encore = await rest.get<unknown[]>(
      `/rest/v1/event_invitations?id=eq.${invitationId}&select=id`,
      organisateur.token,
    );
    expect(encore.data).toHaveLength(1);
  });

  it("laisse l'organisateur annuler", async () => {
    const res = await rest.delete<unknown[]>(
      `/rest/v1/event_invitations?id=eq.${invitationId}`,
      organisateur.token,
    );
    expect([200, 204]).toContain(res.status);

    const encore = await rest.get<unknown[]>(
      `/rest/v1/event_invitations?id=eq.${invitationId}&select=id`,
      organisateur.token,
    );
    expect(encore.data).toEqual([]);
  });
});
