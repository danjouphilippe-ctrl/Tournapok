import { describe, expect, it } from "vitest";
import { parseEventFields } from "./actions";

function validFormData(overrides: Record<string, string | undefined> = {}): FormData {
  const base: Record<string, string> = {
    name: "Test Event",
    scheduled_at: "2026-11-28T19:00:00.000Z",
    location: "Pornic",
    visibility: "private",
  };
  const fd = new FormData();
  for (const [key, value] of Object.entries({ ...base, ...overrides })) {
    if (value !== undefined) fd.set(key, value);
  }
  return fd;
}

describe("parseEventFields", () => {
  it("accepts a valid minimal input", () => {
    const result = parseEventFields(validFormData());
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.row.name).toBe("Test Event");
      expect(result.row.club_id).toBeNull();
    }
  });

  it("rejects an empty name", () => {
    const result = parseEventFields(validFormData({ name: "" }));
    expect(result).toEqual({ ok: false, error: "L'évènement doit avoir un nom." });
  });

  it("rejects a missing date/time", () => {
    const result = parseEventFields(validFormData({ scheduled_at: "" }));
    expect(result).toEqual({ ok: false, error: "La date et l'heure sont obligatoires." });
  });

  it("rejects a missing location", () => {
    const result = parseEventFields(validFormData({ location: "" }));
    expect(result).toEqual({ ok: false, error: "Le lieu est obligatoire." });
  });

  it("rejects an invalid visibility value", () => {
    const result = parseEventFields(validFormData({ visibility: "secret" }));
    expect(result).toEqual({ ok: false, error: "Visibilité invalide." });
  });

  it("rejects visibility=club without a club_id", () => {
    const result = parseEventFields(validFormData({ visibility: "club" }));
    expect(result).toEqual({
      ok: false,
      error: "Choisis un club pour une visibilité réservée au club.",
    });
  });

  it("accepts visibility=club when a club_id is set", () => {
    const result = parseEventFields(
      validFormData({ visibility: "club", club_id: "some-club-id" }),
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.row.club_id).toBe("some-club-id");
  });

  it("defaults max_players to null when left empty", () => {
    const result = parseEventFields(validFormData());
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.row.max_players).toBeNull();
  });
});
