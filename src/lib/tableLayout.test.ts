import { describe, expect, it } from "vitest";
import { anglesArcEgal } from "@/lib/tableLayout";

/** Longueur d'arc entre deux paramètres sur l'ellipse (1, k). */
function arc(t1: number, t2: number, k: number): number {
  const PAS = 4000;
  let total = 0;
  for (let i = 0; i < PAS; i++) {
    const a = t1 + ((t2 - t1) * i) / PAS;
    const b = t1 + ((t2 - t1) * (i + 1)) / PAS;
    const va = Math.hypot(Math.sin(a), k * Math.cos(a));
    const vb = Math.hypot(Math.sin(b), k * Math.cos(b));
    total += ((va + vb) / 2) * (b - a);
  }
  return total;
}

describe("anglesArcEgal", () => {
  it("rend autant d'angles que de joueurs", () => {
    for (const n of [2, 5, 8, 9, 10]) {
      expect(anglesArcEgal(n, 0.625)).toHaveLength(n);
    }
  });

  it("place le premier siège à midi", () => {
    expect(anglesArcEgal(9, 0.625)[0]).toBeCloseTo(-Math.PI / 2, 6);
  });

  it("retombe sur des pas égaux quand l'ellipse est un cercle", () => {
    const a = anglesArcEgal(8, 1);
    for (let i = 1; i < a.length; i++) {
      expect(a[i] - a[i - 1]).toBeCloseTo((2 * Math.PI) / 8, 4);
    }
  });

  /* Le cœur du sujet : c'est bien la *distance le long du bord* qui est
   * constante, et non l'écart d'angle. */
  it("donne à chaque joueur la même portion de bord de table", () => {
    const k = 0.625;
    const a = anglesArcEgal(9, k);
    const arcs = a.map((t, i) => arc(t, i + 1 < a.length ? a[i + 1] : a[0] + 2 * Math.PI, k));
    const min = Math.min(...arcs);
    const max = Math.max(...arcs);
    expect((max - min) / max).toBeLessThan(0.01);
  });

  it("ne rend rien pour zéro joueur", () => {
    expect(anglesArcEgal(0, 0.625)).toEqual([]);
  });
});
