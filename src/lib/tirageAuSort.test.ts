import { describe, expect, it } from "vitest";
import { dureeTotale, melanger, rythmeDuTirage } from "@/lib/tirageAuSort";

describe("rythmeDuTirage", () => {
  it("rend autant de délais que d'étapes", () => {
    expect(rythmeDuTirage(20)).toHaveLength(20);
    expect(rythmeDuTirage(0)).toEqual([]);
  });

  it("part du délai de début et finit sur celui de fin", () => {
    const r = rythmeDuTirage(24, 55, 640);
    expect(r[0]).toBe(55);
    expect(r[r.length - 1]).toBe(640);
  });

  /* Le cœur de l'effet : ça doit ralentir sans jamais réaccélérer. */
  it("ralentit à chaque étape, sans exception", () => {
    const r = rythmeDuTirage(30, 55, 640);
    for (let i = 1; i < r.length; i++) {
      expect(r[i]).toBeGreaterThanOrEqual(r[i - 1]);
    }
  });

  it("ne rend que des délais positifs", () => {
    expect(rythmeDuTirage(40, 20, 900).every((d) => d > 0)).toBe(true);
  });

  it("tient dans une attente supportable devant une salle", () => {
    const total = dureeTotale(rythmeDuTirage(24, 55, 640));
    expect(total).toBeGreaterThan(4000);
    expect(total).toBeLessThan(9000);
  });
});

describe("melanger", () => {
  it("conserve exactement les mêmes éléments", () => {
    const source = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    const melange = melanger(source);
    expect([...melange].sort((a, b) => a - b)).toEqual(source);
  });

  it("ne modifie pas le tableau reçu", () => {
    const source = ["a", "b", "c", "d"];
    melanger(source);
    expect(source).toEqual(["a", "b", "c", "d"]);
  });

  it("est reproductible avec un générateur fixe", () => {
    const fixe = () => 0.42;
    expect(melanger([1, 2, 3, 4, 5], fixe)).toEqual(melanger([1, 2, 3, 4, 5], fixe));
  });

  it("brasse réellement", () => {
    // Avec un générateur qui renvoie toujours 0, Fisher-Yates ramène
    // chaque élément en tête : l'ordre obtenu n'est pas l'ordre initial.
    expect(melanger([1, 2, 3, 4, 5], () => 0)).not.toEqual([1, 2, 3, 4, 5]);
  });

  it("supporte les cas dégénérés", () => {
    expect(melanger([])).toEqual([]);
    expect(melanger([7])).toEqual([7]);
  });
});
