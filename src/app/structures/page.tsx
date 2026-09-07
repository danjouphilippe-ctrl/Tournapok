import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SpeedGauge } from "@/components/SpeedGauge";
import {
  averageLevelMinutes,
  formatDuration,
  paceRank,
  speedClass,
  speedLabel,
  structureTotals,
} from "@/lib/blindStructures";

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

  /* Les niveaux servent à afficher la durée réelle de chaque structure :
   * c'est le signal de vitesse le plus honnête, et ça évite de répéter
   * « Hyper-turbo » en titre puis en étiquette. */
  const structureIds = (structures ?? []).map((s) => s.id);
  const { data: levelRows } = await supabase
    .from("blind_structure_levels")
    .select("structure_id, is_break, duration_minutes")
    .in(
      "structure_id",
      structureIds.length > 0 ? structureIds : ["00000000-0000-0000-0000-000000000000"],
    );

  const levelsByStructure = new Map<string, { is_break: boolean; duration_minutes: number }[]>();
  for (const l of levelRows ?? []) {
    const list = levelsByStructure.get(l.structure_id);
    if (list) list.push(l);
    else levelsByStructure.set(l.structure_id, [l]);
  }

  /* Classement du plus rapide au plus lent, sur la durée réelle d'un
   * niveau plutôt que sur l'étiquette : une structure « personnalisée »
   * n'a pas de vitesse déclarée, mais ses niveaux, eux, la disent. La
   * couleur reste celle de l'étiquette ; c'est l'ordre qui suit les
   * données. À vitesse de niveau égale, la plus courte d'abord. */
  const sorted = [...(structures ?? [])].sort((a, b) => {
    const la = levelsByStructure.get(a.id) ?? [];
    const lb = levelsByStructure.get(b.id) ?? [];
    const paceDiff = averageLevelMinutes(la) - averageLevelMinutes(lb);
    if (paceDiff !== 0) return paceDiff;
    return structureTotals(la).total - structureTotals(lb).total;
  });

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
          {sorted.map((s) => {
            const stat = statsById.get(s.id);
            const levels = levelsByStructure.get(s.id) ?? [];
            const { total } = structureTotals(levels);
            const playingLevels = levels.filter((l) => !l.is_break);
            return (
              <li key={s.id}>
                <Link
                  href={`/structures/${s.id}`}
                  className={`card card-link speed-card ${speedClass(s.speed_preset)} flex h-full flex-col gap-3`}
                >
                  <div className="flex items-center gap-2.5">
                    <SpeedGauge rank={paceRank(levels)} title={speedLabel(s.speed_preset)} />
                    <span className="min-w-0 wrap-anywhere font-medium">{s.name}</span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <span className="chip chip-speed">⏱ {speedLabel(s.speed_preset)}</span>
                    {playingLevels.length > 0 && (
                      <span className="chip">
                        🃏 {playingLevels.length} niveau{playingLevels.length > 1 ? "x" : ""}
                      </span>
                    )}
                    {total > 0 && <span className="chip">⌛ {formatDuration(total)}</span>}
                  </div>

                  <div className="mt-auto flex flex-wrap items-center gap-2">
                    <span className="chip">
                      👤 {s.created_by ? (getPseudo(s) ?? "un joueur") : "Officielle"}
                    </span>
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
    </main>
  );
}
