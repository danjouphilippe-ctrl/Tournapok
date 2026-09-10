import { describe, expect, it } from "vitest";
import {
  detailsReplies,
  peutDemarquerBuyIn,
  peutInscrireUnJoueur,
  peutRefaireLeTirage,
  type PhaseTournoi,
} from "@/lib/tournoiPhase";

const base: PhaseTournoi = {
  status: "inscription",
  late_registration_enabled: false,
  late_registration_until_level: null,
  current_level: 1,
};

describe("peutInscrireUnJoueur", () => {
  it("accepte avant le départ", () => {
    expect(peutInscrireUnJoueur(base)).toBe(true);
  });

  it("refuse une fois le tournoi terminé", () => {
    expect(peutInscrireUnJoueur({ ...base, status: "termine" })).toBe(false);
  });

  it("refuse en cours de partie sans inscription tardive", () => {
    expect(peutInscrireUnJoueur({ ...base, status: "en_cours" })).toBe(false);
  });

  it("accepte en cours de partie si l'inscription tardive est ouverte sans limite", () => {
    expect(
      peutInscrireUnJoueur({ ...base, status: "en_cours", late_registration_enabled: true }),
    ).toBe(true);
  });

  /* Le serveur refuse quand current_level dépasse la limite : pendant le
   * niveau limite lui-même, l'inscription passe encore. */
  it("accepte pendant le niveau limite", () => {
    expect(
      peutInscrireUnJoueur({
        ...base,
        status: "en_cours",
        late_registration_enabled: true,
        late_registration_until_level: 6,
        current_level: 6,
      }),
    ).toBe(true);
  });

  it("refuse au niveau suivant la limite", () => {
    expect(
      peutInscrireUnJoueur({
        ...base,
        status: "en_cours",
        late_registration_enabled: true,
        late_registration_until_level: 6,
        current_level: 7,
      }),
    ).toBe(false);
  });
});

describe("peutDemarquerBuyIn", () => {
  it("n'est possible qu'avant le départ", () => {
    expect(peutDemarquerBuyIn({ status: "inscription" })).toBe(true);
    expect(peutDemarquerBuyIn({ status: "en_cours" })).toBe(false);
    expect(peutDemarquerBuyIn({ status: "termine" })).toBe(false);
  });
});

describe("detailsReplies", () => {
  it("laisse la fiche ouverte avant le départ, la replie ensuite", () => {
    expect(detailsReplies({ status: "inscription" })).toBe(false);
    expect(detailsReplies({ status: "en_cours" })).toBe(true);
    expect(detailsReplies({ status: "termine" })).toBe(true);
  });
});

describe("peutRefaireLeTirage", () => {
  const tournoi = { status: "inscription", created_by: "orga", min_players: 3 };
  const troisPayes = [{ buy_in_paid: true }, { buy_in_paid: true }, { buy_in_paid: true }];

  it("accepte pour l'organisateur, avant le départ, tout le monde ayant payé", () => {
    expect(peutRefaireLeTirage(tournoi, "orga", troisPayes)).toBe(true);
  });

  /* Le premier tirage est ouvert aux co-administrateurs ; celui-ci non,
   * parce qu'il annule un résultat déjà annoncé. */
  it("refuse à quelqu'un d'autre que l'organisateur", () => {
    expect(peutRefaireLeTirage(tournoi, "co-admin", troisPayes)).toBe(false);
  });

  it("refuse une fois le tournoi lancé ou terminé", () => {
    expect(peutRefaireLeTirage({ ...tournoi, status: "en_cours" }, "orga", troisPayes)).toBe(false);
    expect(peutRefaireLeTirage({ ...tournoi, status: "termine" }, "orga", troisPayes)).toBe(false);
  });

  it("refuse en dessous du minimum de joueurs", () => {
    expect(peutRefaireLeTirage(tournoi, "orga", troisPayes.slice(0, 2))).toBe(false);
  });

  it("accepte pile au minimum de joueurs", () => {
    expect(peutRefaireLeTirage({ ...tournoi, min_players: 3 }, "orga", troisPayes)).toBe(true);
  });

  it("refuse si un seul buy-in manque", () => {
    expect(
      peutRefaireLeTirage(tournoi, "orga", [...troisPayes.slice(0, 2), { buy_in_paid: false }]),
    ).toBe(false);
  });
});
