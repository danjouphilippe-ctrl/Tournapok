import { describe, expect, it } from "vitest";
import { parseClubFields } from "./validation";

function formData(fields: Record<string, string | undefined>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined) fd.set(key, value);
  }
  return fd;
}

describe("parseClubFields", () => {
  it("accepts a valid minimal input", () => {
    const result = parseClubFields(formData({ name: "Cucumber Club" }));
    expect(result).toEqual({
      ok: true,
      row: { name: "Cucumber Club", description: null, location: null, logo_url: null },
    });
  });

  it("rejects an empty name", () => {
    const result = parseClubFields(formData({ name: "" }));
    expect(result).toEqual({ ok: false, error: "Le club doit avoir un nom." });
  });

  it("rejects a name that is only whitespace", () => {
    const result = parseClubFields(formData({ name: "   " }));
    expect(result.ok).toBe(false);
  });

  it("trims the name and keeps optional fields when provided", () => {
    const result = parseClubFields(
      formData({
        name: "  Cucumber Club  ",
        description: "Un club de test",
        location: "Pornic",
        logo_url: "https://example.com/logo.png",
      }),
    );
    expect(result).toEqual({
      ok: true,
      row: {
        name: "Cucumber Club",
        description: "Un club de test",
        location: "Pornic",
        logo_url: "https://example.com/logo.png",
      },
    });
  });
});
