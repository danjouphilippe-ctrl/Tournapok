import { describe, expect, it } from "vitest";
import { formatChrono, secondesRestantes, type EtatHorloge } from "@/lib/horloge";

const T0 = new Date("2026-09-09T20:00:00Z").getTime();
const base: EtatHorloge = {
  clock_status: "stopped",
  level_ends_at: null,
  paused_remaining_seconds: null,
};

describe("secondesRestantes", () => {
  it("compte jusqu'à l'échéance quand l'horloge tourne", () => {
    const t = {
      ...base,
      clock_status: "running",
      level_ends_at: new Date(T0 + 90_000).toISOString(),
    };
    expect(secondesRestantes(t, T0)).toBe(90);
  });

  /* Sans ce plancher, un niveau dépassé afficherait un temps négatif
   * en attendant que le passage au niveau suivant soit enregistré. */
  it("ne descend jamais sous zéro", () => {
    const t = {
      ...base,
      clock_status: "running",
      level_ends_at: new Date(T0 - 30_000).toISOString(),
    };
    expect(secondesRestantes(t, T0)).toBe(0);
  });

  it("lit le reliquat figé en pause", () => {
    expect(
      secondesRestantes({ ...base, clock_status: "paused", paused_remaining_seconds: 245 }, T0),
    ).toBe(245);
  });

  it("rend zéro sur une horloge à l'arrêt jamais démarrée", () => {
    expect(secondesRestantes(base, T0)).toBe(0);
  });

  /* Cas dégradé : le statut dit « en marche » mais l'échéance manque.
   * On retombe sur le reliquat plutôt que sur NaN. */
  it("retombe sur le reliquat si l'échéance manque", () => {
    expect(
      secondesRestantes({ ...base, clock_status: "running", paused_remaining_seconds: 60 }, T0),
    ).toBe(60);
  });
});

describe("formatChrono", () => {
  it("affiche mm:ss en dessous de l'heure", () => {
    expect(formatChrono(0)).toBe("00:00");
    expect(formatChrono(9)).toBe("00:09");
    expect(formatChrono(65)).toBe("01:05");
    expect(formatChrono(599)).toBe("09:59");
  });

  it("passe en h:mm:ss au-delà", () => {
    expect(formatChrono(3600)).toBe("1:00:00");
    expect(formatChrono(3725)).toBe("1:02:05");
  });

  it("arrondit et n'affiche jamais de négatif", () => {
    expect(formatChrono(59.6)).toBe("01:00");
    expect(formatChrono(-42)).toBe("00:00");
  });
});
