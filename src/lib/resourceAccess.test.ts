import { describe, expect, it } from "vitest";
import { getResourceAccess } from "./resourceAccess";

/** Simule le client Supabase juste assez pour getResourceAccess.
 * Contrairement à un mock qui renverrait une réponse figée par table,
 * celui-ci applique réellement les .eq()/.in() chaînés sur la ligne
 * fournie — sinon un test ne remarquerait pas qu'un filtre a été
 * oublié dans le code (exactement le bug trouvé en session : un
 * simple membre traité comme administrateur faute de filtre de rôle).
 * Chaque ligne fournie doit donc inclure les colonnes sur lesquelles
 * le code applique un .eq()/.in(), pas seulement celles qu'il lit. */
function makeSupabaseMock(config: {
  user: { id: string } | null;
  byTable?: Record<string, Record<string, unknown> | null>;
}) {
  const byTable = config.byTable ?? {};
  return {
    auth: {
      getUser: async () => ({ data: { user: config.user } }),
    },
    from(table: string) {
      let row: Record<string, unknown> | null = byTable[table] ?? null;
      const builder = {
        select: () => builder,
        eq(column: string, value: unknown) {
          if (row && row[column] !== value) row = null;
          return builder;
        },
        in(column: string, values: unknown[]) {
          if (row && !values.includes(row[column])) row = null;
          return builder;
        },
        single: async () => ({ data: row }),
        maybeSingle: async () => ({ data: row }),
      };
      return builder;
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

const baseConfig = {
  resourceTable: "tournaments",
  ownerColumn: "created_by",
  adminTable: "tournament_admins",
  adminResourceColumn: "tournament_id",
};

describe("getResourceAccess", () => {
  it("returns null when there is no logged-in user", async () => {
    const supabase = makeSupabaseMock({ user: null });
    const access = await getResourceAccess(supabase, "t1", baseConfig);
    expect(access).toBeNull();
  });

  it("returns null when the resource doesn't exist", async () => {
    const supabase = makeSupabaseMock({ user: { id: "u1" }, byTable: { tournaments: null } });
    const access = await getResourceAccess(supabase, "t1", baseConfig);
    expect(access).toBeNull();
  });

  it("grants owner access when created_by matches", async () => {
    const supabase = makeSupabaseMock({
      user: { id: "u1" },
      byTable: { tournaments: { id: "t1", created_by: "u1" } },
    });
    const access = await getResourceAccess(supabase, "t1", baseConfig);
    expect(access).toEqual({ userId: "u1", isOwner: true });
  });

  it("grants co-admin access when a row exists in the admin table", async () => {
    const supabase = makeSupabaseMock({
      user: { id: "u2" },
      byTable: {
        tournaments: { id: "t1", created_by: "someone-else" },
        tournament_admins: { tournament_id: "t1", user_id: "u2" },
      },
    });
    const access = await getResourceAccess(supabase, "t1", baseConfig);
    expect(access).toEqual({ userId: "u2", isOwner: false });
  });

  it("denies access when the user is neither owner nor in the admin table", async () => {
    const supabase = makeSupabaseMock({
      user: { id: "u3" },
      byTable: {
        tournaments: { id: "t1", created_by: "someone-else" },
        tournament_admins: null,
      },
    });
    const access = await getResourceAccess(supabase, "t1", baseConfig);
    expect(access).toBeNull();
  });

  const clubAccessConfig = {
    resourceTable: "clubs",
    ownerColumn: "created_by",
    adminTable: "club_members",
    adminResourceColumn: "club_id",
    adminRoleColumn: "role",
    adminRoleValues: ["owner", "admin"],
  };

  // Régression : getClubAccess traitait n'importe quel membre de
  // club_members (même un simple "member") comme un droit de gestion,
  // avant l'ajout du filtre de rôle (adminRoleColumn/adminRoleValues).
  it("denies access when the admin row's role is outside adminRoleValues", async () => {
    const supabase = makeSupabaseMock({
      user: { id: "u4" },
      byTable: {
        clubs: { id: "c1", created_by: "someone-else" },
        club_members: { club_id: "c1", user_id: "u4", role: "member" },
      },
    });
    const access = await getResourceAccess(supabase, "c1", clubAccessConfig);
    expect(access).toBeNull();
  });

  it("grants access when the admin row's role is inside adminRoleValues", async () => {
    const supabase = makeSupabaseMock({
      user: { id: "u5" },
      byTable: {
        clubs: { id: "c1", created_by: "someone-else" },
        club_members: { club_id: "c1", user_id: "u5", role: "admin" },
      },
    });
    const access = await getResourceAccess(supabase, "c1", clubAccessConfig);
    expect(access).toEqual({ userId: "u5", isOwner: false });
  });

  it("grants access via club ownership when the resource belongs to a managed club", async () => {
    const supabase = makeSupabaseMock({
      user: { id: "u6" },
      byTable: {
        tournaments: { id: "t1", created_by: "someone-else", club_id: "club-1" },
        tournament_admins: null,
        club_members: { club_id: "club-1", user_id: "u6", role: "admin" },
      },
    });
    const access = await getResourceAccess(supabase, "t1", {
      ...baseConfig,
      clubColumn: "club_id",
    });
    expect(access).toEqual({ userId: "u6", isOwner: false });
  });

  it("denies club-based access for a plain club member", async () => {
    const supabase = makeSupabaseMock({
      user: { id: "u7" },
      byTable: {
        tournaments: { id: "t1", created_by: "someone-else", club_id: "club-1" },
        tournament_admins: null,
        club_members: { club_id: "club-1", user_id: "u7", role: "member" },
      },
    });
    const access = await getResourceAccess(supabase, "t1", {
      ...baseConfig,
      clubColumn: "club_id",
    });
    expect(access).toBeNull();
  });

  it("denies club-based access when the resource has no club at all", async () => {
    const supabase = makeSupabaseMock({
      user: { id: "u8" },
      byTable: {
        tournaments: { id: "t1", created_by: "someone-else", club_id: null },
        tournament_admins: null,
      },
    });
    const access = await getResourceAccess(supabase, "t1", {
      ...baseConfig,
      clubColumn: "club_id",
    });
    expect(access).toBeNull();
  });
});
