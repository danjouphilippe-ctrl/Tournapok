import { describe, expect, it } from "vitest";
import { parseTournamentFields } from "./validation";

/** Construit un FormData valide minimal, avec la possibilité de
 * surcharger ou de retirer des champs pour chaque cas de test. */
function validFormData(overrides: Record<string, string | undefined> = {}): FormData {
  const base: Record<string, string> = {
    name: "Test Tournament",
    buy_in: "20",
    starting_stack: "10000",
    min_players: "2",
    table_size: "9",
    visibility: "private",
    blind_structure_id: "some-structure-id",
    payouts_json: "[]",
  };
  const fd = new FormData();
  for (const [key, value] of Object.entries({ ...base, ...overrides })) {
    if (value !== undefined) fd.set(key, value);
  }
  return fd;
}

describe("parseTournamentFields", () => {
  it("accepts a valid minimal input", () => {
    const result = parseTournamentFields(validFormData());
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.row.name).toBe("Test Tournament");
      expect(result.row.visibility).toBe("private");
      expect(result.row.club_id).toBeNull();
    }
  });

  it("rejects an empty name", () => {
    const result = parseTournamentFields(validFormData({ name: "" }));
    expect(result).toEqual({ ok: false, error: "Le tournoi doit avoir un nom." });
  });

  it("rejects a negative buy-in", () => {
    const result = parseTournamentFields(validFormData({ buy_in: "-5" }));
    expect(result.ok).toBe(false);
  });

  it("rejects a non-positive starting stack", () => {
    const result = parseTournamentFields(validFormData({ starting_stack: "0" }));
    expect(result.ok).toBe(false);
  });

  // Régression : table_size = 0 faisait planter initialSeating() avec
  // une RangeError au démarrage du tournoi (faille critique de l'audit).
  it("rejects a table size below 2", () => {
    const result = parseTournamentFields(validFormData({ table_size: "0" }));
    expect(result).toEqual({
      ok: false,
      error: "Le nombre de joueurs par table doit être d'au moins 2.",
    });
  });

  it("rejects a table size of 1", () => {
    const result = parseTournamentFields(validFormData({ table_size: "1" }));
    expect(result.ok).toBe(false);
  });

  it("rejects a minimum player count below 1", () => {
    const result = parseTournamentFields(validFormData({ min_players: "0" }));
    expect(result.ok).toBe(false);
  });

  // Régression : un tournoi avec max_players < min_players ne pouvait
  // jamais démarrer, sans le moindre message d'avertissement.
  it("rejects a maximum player count below the minimum", () => {
    const result = parseTournamentFields(
      validFormData({ min_players: "4", max_players: "2" }),
    );
    expect(result).toEqual({
      ok: false,
      error: "Le nombre maximum de joueurs ne peut pas être inférieur au minimum.",
    });
  });

  it("accepts a maximum player count equal to the minimum", () => {
    const result = parseTournamentFields(
      validFormData({ min_players: "4", max_players: "4" }),
    );
    expect(result.ok).toBe(true);
  });

  it("rejects an invalid visibility value", () => {
    const result = parseTournamentFields(validFormData({ visibility: "friends-only" }));
    expect(result).toEqual({ ok: false, error: "Visibilité invalide." });
  });

  it("rejects visibility=club without a club_id", () => {
    const result = parseTournamentFields(validFormData({ visibility: "club" }));
    expect(result).toEqual({
      ok: false,
      error: "Choisis un club pour une visibilité réservée au club.",
    });
  });

  it("accepts visibility=club when a club_id is set", () => {
    const result = parseTournamentFields(
      validFormData({ visibility: "club", club_id: "some-club-id" }),
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.row.club_id).toBe("some-club-id");
  });

  it("requires a price and chip count when rebuys are enabled", () => {
    const result = parseTournamentFields(validFormData({ rebuy_enabled: "on" }));
    expect(result).toEqual({
      ok: false,
      error: "Renseigne le prix et les jetons de la recave.",
    });
  });

  it("requires a price and chip count when the add-on is enabled", () => {
    const result = parseTournamentFields(validFormData({ addon_enabled: "on" }));
    expect(result).toEqual({
      ok: false,
      error: "Renseigne le prix et les jetons de l'add-on.",
    });
  });

  it("requires a bounty amount when bounty is enabled", () => {
    const result = parseTournamentFields(validFormData({ bounty_enabled: "on" }));
    expect(result).toEqual({ ok: false, error: "Renseigne le montant de la prime." });
  });

  it("requires either a blind structure or custom levels", () => {
    const result = parseTournamentFields(
      validFormData({ blind_structure_id: "", custom_levels_json: "[]" }),
    );
    expect(result).toEqual({
      ok: false,
      error: "Choisis une structure de blindes ou définis des niveaux.",
    });
  });

  it("rejects invalid JSON in the payouts field", () => {
    const result = parseTournamentFields(validFormData({ payouts_json: "not json" }));
    expect(result).toEqual({ ok: false, error: "La répartition des gains est invalide." });
  });

  it("rejects a negative payout percentage", () => {
    const result = parseTournamentFields(
      validFormData({
        payouts_json: JSON.stringify([
          { place: 1, percentage: 120 },
          { place: 2, percentage: -20 },
        ]),
      }),
    );
    expect(result).toEqual({
      ok: false,
      error: "Un pourcentage de gain ne peut pas être négatif.",
    });
  });

  it("rejects duplicate payout places", () => {
    const result = parseTournamentFields(
      validFormData({
        payouts_json: JSON.stringify([
          { place: 1, percentage: 50 },
          { place: 1, percentage: 50 },
        ]),
      }),
    );
    expect(result).toEqual({
      ok: false,
      error: "Chaque place ne peut apparaître qu'une seule fois.",
    });
  });

  it("rejects payouts that don't total 100%", () => {
    const result = parseTournamentFields(
      validFormData({
        payouts_json: JSON.stringify([{ place: 1, percentage: 60 }]),
      }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("100");
  });

  it("accepts payouts that total exactly 100%", () => {
    const result = parseTournamentFields(
      validFormData({
        payouts_json: JSON.stringify([
          { place: 1, percentage: 50 },
          { place: 2, percentage: 30 },
          { place: 3, percentage: 20 },
        ]),
      }),
    );
    expect(result.ok).toBe(true);
  });

  it("ignores the chip rack entirely when no chip set is chosen", () => {
    const result = parseTournamentFields(
      validFormData({ chip_set_id: "", chip_rack_json: "not json" }),
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.chipRack).toEqual([]);
  });

  it("rejects invalid JSON in the chip rack field once a chip set is chosen", () => {
    const result = parseTournamentFields(
      validFormData({ chip_set_id: "some-chip-set-id", chip_rack_json: "not json" }),
    );
    expect(result).toEqual({ ok: false, error: "La composition de la cave de départ est invalide." });
  });

  it("rejects a chip rack entry with a non-positive quantity", () => {
    const result = parseTournamentFields(
      validFormData({
        chip_set_id: "some-chip-set-id",
        chip_rack_json: JSON.stringify([{ denominationId: "d1", value: 10000, quantity: 0 }]),
      }),
    );
    expect(result).toEqual({ ok: false, error: "Chaque quantité de jetons doit être positive." });
  });

  it("rejects the same denomination appearing twice in the chip rack", () => {
    const result = parseTournamentFields(
      validFormData({
        chip_set_id: "some-chip-set-id",
        chip_rack_json: JSON.stringify([
          { denominationId: "d1", value: 5000, quantity: 1 },
          { denominationId: "d1", value: 5000, quantity: 1 },
        ]),
      }),
    );
    expect(result).toEqual({
      ok: false,
      error: "Chaque dénomination ne peut apparaître qu'une seule fois dans la cave.",
    });
  });

  it("rejects a chip rack that doesn't total the starting stack", () => {
    const result = parseTournamentFields(
      validFormData({
        chip_set_id: "some-chip-set-id",
        chip_rack_json: JSON.stringify([{ denominationId: "d1", value: 100, quantity: 5 }]),
      }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("10000");
  });

  it("accepts a chip rack that exactly totals the starting stack", () => {
    const result = parseTournamentFields(
      validFormData({
        starting_stack: "1000",
        chip_set_id: "some-chip-set-id",
        chip_rack_json: JSON.stringify([
          { denominationId: "d1", value: 10, quantity: 10 },
          { denominationId: "d2", value: 25, quantity: 4 },
          { denominationId: "d3", value: 100, quantity: 3 },
          { denominationId: "d4", value: 500, quantity: 1 },
        ]),
      }),
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.chipRack).toHaveLength(4);
  });
});
