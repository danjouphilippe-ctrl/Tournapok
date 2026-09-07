import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function ClubsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  let query = supabase
    .from("clubs")
    .select("id, name, description, location, address, logo_url, banner_url, visibility, created_by");

  const term = q?.trim();
  if (term) {
    const pattern = `%${term}%`;
    query = query.or(`name.ilike.${pattern},location.ilike.${pattern},address.ilike.${pattern}`);
  }

  const { data: clubs } = await query.order("created_at", { ascending: false });

  const creatorIds = [...new Set((clubs ?? []).map((c) => c.created_by))];
  const { data: creators } = await supabase
    .from("profiles")
    .select("id, pseudo")
    .in("id", creatorIds.length > 0 ? creatorIds : ["00000000-0000-0000-0000-000000000000"]);
  const creatorPseudoById = new Map((creators ?? []).map((c) => [c.id, c.pseudo]));

  const clubIds = (clubs ?? []).map((c) => c.id);
  const { data: memberRows } = await supabase
    .from("club_members")
    .select("club_id")
    .in("club_id", clubIds.length > 0 ? clubIds : ["00000000-0000-0000-0000-000000000000"]);
  const memberCountByClub = new Map<string, number>();
  for (const m of memberRows ?? []) {
    memberCountByClub.set(m.club_id, (memberCountByClub.get(m.club_id) ?? 0) + 1);
  }

  return (
    <main className="page page-list">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Clubs</h1>
        <Link href="/clubs/nouveau" className="btn btn-primary btn-sm">
          + Nouveau
        </Link>
      </div>

      <form className="flex gap-2">
        <input
          type="text"
          name="q"
          defaultValue={term ?? ""}
          placeholder="Rechercher un club (nom, lieu, adresse)"
          className="input"
        />
        <button type="submit" className="btn btn-secondary btn-sm">
          Rechercher
        </button>
      </form>

      {!clubs || clubs.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 py-14 text-center">
          <span className="tile-icon tile-icon-teal text-2xl">🏛</span>
          <p className="text-sm text-ink-soft">
            {term ? "Aucun club ne correspond à cette recherche." : "Aucun club pour l'instant."}
          </p>
          {!term && (
            <Link href="/clubs/nouveau" className="btn btn-primary btn-sm">
              Créer le premier club
            </Link>
          )}
        </div>
      ) : (
        <ul className="list-grid">
          {clubs.map((c) => {
            const count = memberCountByClub.get(c.id) ?? 0;
            return (
              <li key={c.id}>
                <Link
                  href={`/clubs/${c.id}`}
                  className="card card-flush card-link flex h-full flex-col"
                >
                  {c.banner_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={c.banner_url}
                      alt=""
                      className="h-28 w-full shrink-0 object-cover sm:h-32"
                    />
                  ) : null}

                  <div className="flex flex-col gap-3 p-5">
                    <div className="flex items-center gap-3">
                      {c.logo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={c.logo_url}
                          alt=""
                          className="h-11 w-11 shrink-0 rounded-full border border-line object-cover"
                        />
                      ) : null}
                      <span className="min-w-0 wrap-anywhere font-medium">{c.name}</span>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <span className="chip">👤 {creatorPseudoById.get(c.created_by) ?? "—"}</span>
                      {c.location && <span className="chip">📍 {c.location}</span>}
                      <span className="chip">
                        👥 {count} membre{count > 1 ? "s" : ""}
                      </span>
                    </div>

                    <div>
                      <span className={`badge${c.visibility === "public" ? " badge-success" : ""}`}>
                        {c.visibility === "public" ? "🌐 Club public" : "🔒 Club privé"}
                      </span>
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <Link href="/tableau-de-bord" className="link link-action text-sm">
        Retour au tableau de bord
      </Link>
    </main>
  );
}
