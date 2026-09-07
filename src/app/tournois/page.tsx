import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const STATUT_LABELS: Record<string, string> = {
  inscription: "Inscriptions ouvertes",
  en_cours: "En cours",
  termine: "Terminé",
};

function StatutBadge({ status }: { status: string }) {
  const label = STATUT_LABELS[status] ?? status;
  if (status === "en_cours") {
    return <span className="badge badge-accent">{label}</span>;
  }
  if (status === "inscription") {
    return <span className="badge badge-success">{label}</span>;
  }
  return <span className="badge">{label}</span>;
}

export default async function TournoisPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const { data: tournaments } = await supabase
    .from("tournaments")
    .select("id, name, buy_in, status, created_at, created_by, chip_image_url, banner_url")
    .order("created_at", { ascending: false });

  const creatorIds = [...new Set((tournaments ?? []).map((t) => t.created_by))];
  const { data: creators } = await supabase
    .from("profiles")
    .select("id, pseudo")
    .in("id", creatorIds.length > 0 ? creatorIds : ["00000000-0000-0000-0000-000000000000"]);
  const creatorPseudoById = new Map((creators ?? []).map((c) => [c.id, c.pseudo]));

  return (
    <main className="page page-list">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Tournois</h1>
        <Link href="/tournois/nouveau" className="btn btn-primary btn-sm">
          + Nouveau
        </Link>
      </div>

      {!tournaments || tournaments.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 py-14 text-center">
          <span className="tile-icon tile-icon-gold text-2xl">♠</span>
          <p className="text-sm text-ink-soft">Aucun tournoi pour l&apos;instant.</p>
          <Link href="/tournois/nouveau" className="btn btn-primary btn-sm">
            Créer le premier tournoi
          </Link>
        </div>
      ) : (
        <ul className="list-grid">
          {tournaments.map((t) => (
            <li key={t.id}>
              {/* Carte empilée plutôt qu'en ligne : sur un téléphone, le nom,
                * les métadonnées et le statut se disputaient la largeur et le
                * texte finissait écrasé sur trois lignes. */}
              <Link
                href={`/tournois/${t.id}`}
                className="card card-flush card-link flex h-full flex-col"
              >
                {t.banner_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={t.banner_url}
                    alt=""
                    className="h-28 w-full shrink-0 object-cover sm:h-32"
                  />
                ) : null}

                <div className="flex flex-col gap-3 p-5">
                  <div className="flex items-center gap-3">
                    {t.chip_image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={t.chip_image_url}
                        alt=""
                        className="h-11 w-11 shrink-0 rounded-full border border-line object-cover"
                      />
                    ) : null}
                    <span className="min-w-0 wrap-anywhere font-medium">{t.name}</span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <span className="chip">
                      👤 {creatorPseudoById.get(t.created_by) ?? "—"}
                    </span>
                    <span className="chip chip-money">💶 Buy-in {t.buy_in} €</span>
                  </div>

                  <div>
                    <StatutBadge status={t.status} />
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
