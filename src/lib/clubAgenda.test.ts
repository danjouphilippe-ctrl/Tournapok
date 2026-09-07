import { describe, expect, it } from "vitest";
import { byDateAsc, isBeforeNow, isPastTournament } from "./clubAgenda";

/* Instant de référence fixe : sans lui, un test qui dépend de "maintenant"
 * change de résultat selon le jour où on le lance. */
const NOW = new Date("2026-09-07T12:00:00Z").getTime();
const HIER = "2026-09-06T20:00:00Z";
const DEMAIN = "2026-09-08T20:00:00Z";

describe("isBeforeNow", () => {
  it("considère une date passée comme passée", () => {
    expect(isBeforeNow(HIER, NOW)).toBe(true);
  });

  it("considère une date future comme à venir", () => {
    expect(isBeforeNow(DEMAIN, NOW)).toBe(false);
  });

  it("ne classe jamais un élément sans date dans le passé", () => {
    expect(isBeforeNow(null, NOW)).toBe(false);
  });
});

describe("isPastTournament", () => {
  it("classe dans le passé un tournoi dont la date est dépassée, même resté ouvert aux inscriptions", () => {
    // Le cas qui motivait le changement : sans regarder la date, un
    // tournoi oublié en « inscription » restait annoncé à venir.
    expect(isPastTournament({ status: "inscription", scheduled_at: HIER }, NOW)).toBe(true);
  });

  it("garde à venir un tournoi encore à jouer", () => {
    expect(isPastTournament({ status: "inscription", scheduled_at: DEMAIN }, NOW)).toBe(false);
  });

  it("ne classe pas dans le passé un tournoi en cours, dont la date de début est forcément dépassée", () => {
    expect(isPastTournament({ status: "en_cours", scheduled_at: HIER }, NOW)).toBe(false);
  });

  it("classe dans le passé un tournoi terminé même si sa date est à venir", () => {
    expect(isPastTournament({ status: "termine", scheduled_at: DEMAIN }, NOW)).toBe(true);
  });

  it("garde à venir un tournoi sans date tant qu'il n'est pas terminé", () => {
    expect(isPastTournament({ status: "inscription", scheduled_at: null }, NOW)).toBe(false);
  });
});

describe("partition d'une liste (le piège de l'arité)", () => {
  /* .filter() passe (élément, index, tableau) au callback. Passer
   * isPastTournament directement lui fait recevoir l'index dans son
   * paramètre `now` : toute date paraît alors postérieure à 1970, donc
   * jamais passée, et l'élément disparaît des deux listes. Ce test
   * garde la partition complète, quel que soit le style d'appel. */
  const tournois = [
    { status: "inscription", scheduled_at: HIER },
    { status: "inscription", scheduled_at: DEMAIN },
    { status: "en_cours", scheduled_at: HIER },
    { status: "termine", scheduled_at: HIER },
  ];

  it("ne perd aucun tournoi entre « à venir » et « passés »", () => {
    const passes = tournois.filter((t) => isPastTournament(t, NOW));
    const aVenir = tournois.filter((t) => !isPastTournament(t, NOW));
    expect(passes.length + aVenir.length).toBe(tournois.length);
  });

  it("range chaque tournoi du bon côté", () => {
    const passes = tournois.filter((t) => isPastTournament(t, NOW));
    const aVenir = tournois.filter((t) => !isPastTournament(t, NOW));
    expect(passes.map((t) => t.status)).toEqual(["inscription", "termine"]);
    expect(aVenir.map((t) => t.status)).toEqual(["inscription", "en_cours"]);
  });
});

describe("byDateAsc", () => {
  it("place le plus proche en premier", () => {
    const tri = [{ scheduled_at: DEMAIN }, { scheduled_at: HIER }].sort(byDateAsc);
    expect(tri.map((x) => x.scheduled_at)).toEqual([HIER, DEMAIN]);
  });

  it("renvoie les éléments sans date en fin de liste", () => {
    const tri = [{ scheduled_at: null }, { scheduled_at: DEMAIN }].sort(byDateAsc);
    expect(tri.map((x) => x.scheduled_at)).toEqual([DEMAIN, null]);
  });
});
