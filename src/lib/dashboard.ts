/** Fil d'actualité du tableau de bord.
 *
 * Vit hors de la page pour être testable : le fil mélange des sources
 * qui n'ont pas la même notion de date (création d'un tournoi,
 * élimination d'un joueur), et le tri doit rester prévisible même
 * quand l'une d'elles est absente. */

export type FeedItem = {
  key: string;
  /** Date ISO de l'évènement raconté, ou null si la source n'en a pas. */
  at: string | null;
  icon: string;
  text: string;
  href: string;
};

/** Le plus récent d'abord.
 *
 * Un élément sans date part en fin de liste plutôt que de remonter en
 * tête par accident : c'est la même prudence que `byDateAsc` de
 * l'agenda, appliquée dans l'autre sens. */
export function byRecentFirst(a: FeedItem, b: FeedItem): number {
  const ta = a.at ? new Date(a.at).getTime() : Number.NEGATIVE_INFINITY;
  const tb = b.at ? new Date(b.at).getTime() : Number.NEGATIVE_INFINITY;
  return tb - ta;
}

/** Les `max` actualités les plus récentes.
 *
 * Copie avant de trier : `sort` modifie le tableau reçu, ce que le
 * compilateur React interdit sur des données de rendu. */
export function recentFeed(items: FeedItem[], max = 6): FeedItem[] {
  return [...items].sort(byRecentFirst).slice(0, max);
}
