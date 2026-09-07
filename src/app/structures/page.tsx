import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const SPEED_LABELS: Record<string, string> = {
  standard: "Standard",
  turbo: "Turbo",
  hyperturbo: "Hyper-turbo",
  deepstack: "Deepstack",
  personnalise: "Personnalisée",
};

function getPseudo(s: { profiles: { pseudo: string }[] | { pseudo: string } | null }) {
  const profiles = s.profiles;
  if (!profiles) return null;
  return Array.isArray(profiles) ? (profiles[0]?.pseudo ?? null) : profiles.pseudo;
}

export default async function StructuresPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const { data: structures } = await supabase
    .from("blind_structures")
    .select("id, name, speed_preset, created_by, created_at, profiles(pseudo)")
    .order("created_at", { ascending: false });

  const { data: stats } = await supabase
    .from("blind_structure_stats")
    .select("structure_id, avg_rating, ratings_count");

  const statsById = new Map(
    (stats ?? []).map((s) => [s.structure_id, s]),
  );

  return (
    <main className="page page-list">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Structures de blindes</h1>
        <Link href="/structures/nouvelle" className="btn btn-primary btn-sm">
          + Nouvelle
        </Link>
      </div>

      {!structures || structures.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 py-14 text-center">
          <span className="tile-icon tile-icon-slate text-2xl">⏱</span>
          <p className="text-sm text-ink-soft">Aucune structure pour l&apos;instant.</p>
          <Link href="/structures/nouvelle" className="btn btn-primary btn-sm">
            Créer la première structure
          </Link>
        </div>
      ) : (
        <ul className="list-grid">
          {structures.map((s) => {
            const stat = statsById.get(s.id);
            return (
              <li key={s.id}>
                <Link
                  href={`/structures/${s.id}`}
                  className="card card-link flex h-full flex-col gap-3"
                >
                  <span className="wrap-anywhere font-medium">{s.name}</span>

                  <div className="flex flex-wrap gap-2">
                    <span className="chip">
                      👤 {s.created_by ? (getPseudo(s) ?? "un joueur") : "Officielle"}
                    </span>
                    <span className="chip">
                      ⏱ {SPEED_LABELS[s.speed_preset] ?? s.speed_preset}
                    </span>
                  </div>

                  <div>
                    {stat ? (
                      <span className="badge">
                        ⭐ {stat.avg_rating} ({stat.ratings_count} avis)
                      </span>
                    ) : (
                      <span className="badge">Pas encore noté</span>
                    )}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <Link href="/tournois" className="link link-action text-sm">
        Retour aux tournois
      </Link>
    </main>
  );
}
