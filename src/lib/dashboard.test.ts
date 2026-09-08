import { describe, expect, it } from "vitest";
import { byRecentFirst, recentFeed, type FeedItem } from "@/lib/dashboard";

function item(key: string, at: string | null): FeedItem {
  return { key, at, icon: "♠", text: key, href: `/${key}` };
}

describe("byRecentFirst", () => {
  it("place la date la plus récente en premier", () => {
    const a = item("vieux", "2026-01-01T10:00:00Z");
    const b = item("recent", "2026-09-01T10:00:00Z");
    expect(byRecentFirst(a, b)).toBeGreaterThan(0);
    expect(byRecentFirst(b, a)).toBeLessThan(0);
  });

  it("renvoie 0 pour deux dates identiques", () => {
    const a = item("a", "2026-05-05T12:00:00Z");
    const b = item("b", "2026-05-05T12:00:00Z");
    expect(byRecentFirst(a, b)).toBe(0);
  });

  it("relègue un élément sans date après ceux qui en ont une", () => {
    const date = item("date", "2020-01-01T00:00:00Z");
    const sans = item("sans", null);
    expect(byRecentFirst(sans, date)).toBeGreaterThan(0);
    expect(byRecentFirst(date, sans)).toBeLessThan(0);
  });
});

describe("recentFeed", () => {
  it("trie du plus récent au plus ancien", () => {
    const fil = recentFeed([
      item("b", "2026-05-01T00:00:00Z"),
      item("c", "2026-01-01T00:00:00Z"),
      item("a", "2026-09-01T00:00:00Z"),
    ]);
    expect(fil.map((i) => i.key)).toEqual(["a", "b", "c"]);
  });

  it("ne garde que les max premiers", () => {
    const items = Array.from({ length: 20 }, (_, n) =>
      item(`i${n}`, `2026-01-${String(n + 1).padStart(2, "0")}T00:00:00Z`),
    );
    expect(recentFeed(items).length).toBe(6);
    expect(recentFeed(items, 3).length).toBe(3);
  });

  it("ne modifie pas le tableau reçu", () => {
    const items = [item("vieux", "2020-01-01T00:00:00Z"), item("neuf", "2026-01-01T00:00:00Z")];
    const avant = items.map((i) => i.key);
    recentFeed(items);
    expect(items.map((i) => i.key)).toEqual(avant);
  });

  it("garde les éléments sans date, en fin de liste", () => {
    const fil = recentFeed([item("sans", null), item("avec", "2026-01-01T00:00:00Z")]);
    expect(fil.map((i) => i.key)).toEqual(["avec", "sans"]);
  });

  it("rend une liste vide sur une entrée vide", () => {
    expect(recentFeed([])).toEqual([]);
  });
});
