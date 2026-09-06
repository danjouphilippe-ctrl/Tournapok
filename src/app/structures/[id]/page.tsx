import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { rateStructure } from "@/app/structures/actions";

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

export default async function StructureDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erreur?: string }>;
}) {
  const { id } = await params;
  const { erreur } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const { data: structure } = await supabase
    .from("blind_structures")
    .select("id, name, description, speed_preset, created_by, profiles(pseudo)")
    .eq("id", id)
    .single();

  if (!structure) notFound();

  const { data: levels } = await supabase
    .from("blind_structure_levels")
    .select("level_number, is_break, small_blind, big_blind, ante, duration_minutes")
    .eq("structure_id", id)
    .order("level_number");

  const { data: stats } = await supabase
    .from("blind_structure_stats")
    .select("avg_rating, ratings_count")
    .eq("structure_id", id)
    .maybeSingle();

  const { data: myRating } = await supabase
    .from("blind_structure_ratings")
    .select("rating")
    .eq("structure_id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  return (
    <main className="page">
      {erreur && (
        <p className="card text-sm text-danger" role="alert">
          {erreur}
        </p>
      )}

      <div className="hero-card flex flex-col gap-3">
        <h1 className="text-2xl font-semibold">{structure.name}</h1>
        {structure.description && <p className="text-sm text-ink-soft">{structure.description}</p>}
        <div className="flex flex-wrap gap-2">
          <span className="chip">
            👤 {structure.created_by ? `Par ${getPseudo(structure) ?? "un joueur"}` : "Officielle"}
          </span>
          <span className="chip">⏱ {SPEED_LABELS[structure.speed_preset] ?? structure.speed_preset}</span>
          {stats ? (
            <span className="chip chip-money">⭐ {stats.avg_rating} ({stats.ratings_count} avis)</span>
          ) : (
            <span className="chip">Pas encore noté</span>
          )}
        </div>
        <Link href={`/structures/nouvelle?from=${structure.id}`} className="link text-sm w-fit">
          Dupliquer et personnaliser
        </Link>
      </div>

      <div className="card section-accent">
        <p className="section-eyebrow">
          <span className="dot" />
          Ta note
        </p>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <form key={n} action={rateStructure.bind(null, structure.id, n)}>
              <button
                type="submit"
                className={`text-2xl ${myRating && n <= myRating.rating ? "text-accent" : "text-ink-faint"}`}
                aria-label={`Noter ${n} étoiles`}
              >
                {myRating && n <= myRating.rating ? "★" : "☆"}
              </button>
            </form>
          ))}
        </div>
      </div>

      <div>
        <h2 className="mb-2 font-semibold">Niveaux</h2>
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-ink-soft">
                <th className="py-1 pr-2">#</th>
                <th className="py-1 pr-2">SB</th>
                <th className="py-1 pr-2">BB</th>
                <th className="py-1 pr-2">Ante</th>
                <th className="py-1 pr-2">Durée</th>
              </tr>
            </thead>
            <tbody>
              {(levels ?? []).map((l) => (
                <tr key={l.level_number} className="border-b border-line/60 last:border-0">
                  <td className="py-1 pr-2">{l.level_number}</td>
                  {l.is_break ? (
                    <td className="py-1 pr-2 text-ink-faint" colSpan={3}>
                      Pause
                    </td>
                  ) : (
                    <>
                      <td className="py-1 pr-2">{l.small_blind}</td>
                      <td className="py-1 pr-2">{l.big_blind}</td>
                      <td className="py-1 pr-2">{l.ante}</td>
                    </>
                  )}
                  <td className="py-1 pr-2">{l.duration_minutes} min</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Link href="/structures" className="link text-sm">
        Retour aux structures
      </Link>
    </main>
  );
}
