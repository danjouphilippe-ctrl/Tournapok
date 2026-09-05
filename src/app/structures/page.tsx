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
    <main className="page">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Structures de blindes</h1>
        <Link href="/structures/nouvelle" className="btn btn-primary btn-sm">
          + Nouvelle
        </Link>
      </div>

      {!structures || structures.length === 0 ? (
        <p className="text-sm text-ink-soft">Aucune structure pour l&apos;instant.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {structures.map((s) => {
            const stat = statsById.get(s.id);
            return (
              <li key={s.id}>
                <Link
                  href={`/structures/${s.id}`}
                  className="card flex flex-col gap-1 transition-colors hover:border-ink-faint"
                >
                  <span className="font-medium">{s.name}</span>
                  <span className="text-sm text-ink-soft">
                    {s.created_by ? `Par ${getPseudo(s) ?? "un joueur"}` : "Officielle"} ·{" "}
                    {SPEED_LABELS[s.speed_preset] ?? s.speed_preset}
                    {stat ? ` · ⭐ ${stat.avg_rating} (${stat.ratings_count})` : " · pas encore noté"}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <Link href="/tournois" className="link text-sm">
        Retour aux tournois
      </Link>
    </main>
  );
}
