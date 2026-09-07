import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getChipSetOptions } from "@/lib/chipSetOptions";

function getPseudo(s: { profiles: { pseudo: string }[] | { pseudo: string } | null }) {
  const profiles = s.profiles;
  if (!profiles) return null;
  return Array.isArray(profiles) ? (profiles[0]?.pseudo ?? null) : profiles.pseudo;
}

export default async function JetonsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const [{ data: chipSets }, chipSetOptions] = await Promise.all([
    supabase.from("chip_sets").select("id, created_by, profiles(pseudo)").order("created_at", { ascending: false }),
    getChipSetOptions(supabase),
  ]);

  const optionsById = new Map(chipSetOptions.map((s) => [s.id, s]));

  return (
    <main className="page page-list">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Jeux de jetons</h1>
        <Link href="/jetons/nouveau" className="btn btn-primary btn-sm">
          + Nouveau
        </Link>
      </div>

      {!chipSets || chipSets.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 py-14 text-center">
          <span className="tile-icon tile-icon-gold text-2xl">🎰</span>
          <p className="text-sm text-ink-soft">Aucun jeu de jetons pour l&apos;instant.</p>
          <Link href="/jetons/nouveau" className="btn btn-primary btn-sm">
            Créer le premier jeu de jetons
          </Link>
        </div>
      ) : (
        <ul className="list-grid">
          {chipSets.map((s) => {
            const option = optionsById.get(s.id);
            return (
              <li key={s.id} className="card flex flex-col gap-3">
                <span className="wrap-anywhere font-medium">{option?.name ?? "Jeu de jetons"}</span>

                <div className="flex flex-wrap gap-2">
                  <span className="chip">👤 {getPseudo(s) ?? "un joueur"}</span>
                  <span className="chip chip-money">
                    🎰 {(option?.denominations ?? []).length} valeur
                    {(option?.denominations ?? []).length > 1 ? "s" : ""}
                  </span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {(option?.denominations ?? []).length > 0 ? (
                    [...(option?.denominations ?? [])]
                      .sort((a, b) => a.value - b.value)
                      .map((d, i) => (
                        <span key={i} className="badge">
                          {d.color} = {d.value}
                        </span>
                      ))
                  ) : (
                    <span className="badge">Aucune dénomination</span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
