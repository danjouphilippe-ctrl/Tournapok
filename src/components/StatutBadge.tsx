const STATUT_LABELS: Record<string, string> = {
  inscription: "Inscriptions ouvertes",
  en_cours: "En cours",
  termine: "Terminé",
};

/** Partagé entre la liste des tournois et le tableau de bord, pour que
 * le même statut ne prenne pas deux couleurs selon la page. */
export function StatutBadge({ status }: { status: string }) {
  const label = STATUT_LABELS[status] ?? status;
  if (status === "en_cours") {
    return <span className="badge badge-accent">{label}</span>;
  }
  if (status === "inscription") {
    return <span className="badge badge-success">{label}</span>;
  }
  return <span className="badge">{label}</span>;
}
