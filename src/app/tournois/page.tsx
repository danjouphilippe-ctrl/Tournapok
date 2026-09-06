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
    .select("id, name, buy_in, status, created_at, created_by, chip_image_url")
    .order("created_at", { ascending: false });

  const creatorIds = [...new Set((tournaments ?? []).map((t) => t.created_by))];
  const { data: creators } = await supabase
    .from("profiles")
    .select("id, pseudo")
    .in("id", creatorIds.length > 0 ? creatorIds : ["00000000-0000-0000-0000-000000000000"]);
  const creatorPseudoById = new Map((creators ?? []).map((c) => [c.id, c.pseudo]));

  return (
    <main className="page">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Tournois</h1>
        <Link href="/tournois/nouveau" className="btn btn-primary btn-sm">
          + Nouveau
        </Link>
      </div>

      {!tournaments || tournaments.length === 0 ? (
        <p className="text-sm text-ink-soft">Aucun tournoi pour l&apos;instant.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {tournaments.map((t) => (
            <li key={t.id}>
              <Link
                href={`/tournois/${t.id}`}
                className="card card-link flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  {t.chip_image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={t.chip_image_url}
                      alt=""
                      className="h-10 w-10 shrink-0 rounded-full border border-line object-cover"
                    />
                  ) : null}
                  <div className="flex flex-col gap-1">
                    <span className="font-medium">{t.name}</span>
                    <span className="text-sm text-ink-soft">
                      Buy-in {t.buy_in}€ · Par {creatorPseudoById.get(t.created_by) ?? "—"}
                    </span>
                  </div>
                </div>
                <StatutBadge status={t.status} />
              </Link>
            </li>
          ))}
        </ul>
      )}

      <Link href="/tableau-de-bord" className="link text-sm">
        Retour au tableau de bord
      </Link>
    </main>
  );
}
