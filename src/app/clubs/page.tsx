import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function ClubsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const { data: clubs } = await supabase
    .from("clubs")
    .select("id, name, description, location, logo_url, created_by")
    .order("created_at", { ascending: false });

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
    <main className="page">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Clubs</h1>
        <Link href="/clubs/nouveau" className="btn btn-primary btn-sm">
          + Nouveau
        </Link>
      </div>

      {!clubs || clubs.length === 0 ? (
        <p className="text-sm text-ink-soft">Aucun club pour l&apos;instant.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {clubs.map((c) => {
            const count = memberCountByClub.get(c.id) ?? 0;
            return (
              <li key={c.id}>
                <Link
                  href={`/clubs/${c.id}`}
                  className="card flex items-center gap-3 transition-colors hover:border-ink-faint"
                >
                  {c.logo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={c.logo_url}
                      alt=""
                      className="h-14 w-14 shrink-0 rounded-full border border-line object-cover"
                    />
                  ) : null}
                  <div className="flex flex-col gap-1">
                    <span className="font-medium">{c.name}</span>
                    <span className="text-sm text-ink-soft">
                      Par {creatorPseudoById.get(c.created_by) ?? "—"}
                      {c.location ? ` · 📍 ${c.location}` : ""}
                      {" · "}
                      {count} membre{count > 1 ? "s" : ""}
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <Link href="/tableau-de-bord" className="link text-sm">
        Retour au tableau de bord
      </Link>
    </main>
  );
}
