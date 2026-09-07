/** Classement « à venir / passé » de l'agenda d'un club.
 *
 * Vit hors des pages pour être testable : les règles ont assez de cas
 * limites (tournoi en cours, élément sans date, tournoi terminé mais
 * daté au futur) pour mériter d'être figées par des tests. */

export type Dated = { scheduled_at: string | null };
export type TournamentLike = Dated & { status: string };

/** Un élément sans date n'est jamais « passé » : mieux vaut l'afficher
 * que le perdre par erreur. */
export function isBeforeNow(scheduledAt: string | null, now: number = Date.now()): boolean {
  return scheduledAt !== null && new Date(scheduledAt).getTime() < now;
}

/** Un tournoi bascule dans le passé sur sa date, comme un évènement —
 * le statut seul ne suffisait pas : laissé en « inscriptions ouvertes »
 * après sa date, il restait annoncé « à venir » indéfiniment.
 *
 * Deux réserves, car `scheduled_at` est l'heure de *début* :
 * un tournoi en cours a forcément une date dépassée sans être passé
 * pour autant, et un tournoi terminé l'est même si sa date est à venir. */
export function isPastTournament(t: TournamentLike, now: number = Date.now()): boolean {
  if (t.status === "termine") return true;
  if (t.status === "en_cours") return false;
  return isBeforeNow(t.scheduled_at, now);
}

/** Ordre chronologique, le plus proche d'abord. Sans date — donc sans
 * échéance connue — on renvoie en fin de liste plutôt que de faire
 * disparaître l'élément. */
export function byDateAsc(a: Dated, b: Dated): number {
  const ta = a.scheduled_at ? new Date(a.scheduled_at).getTime() : Number.POSITIVE_INFINITY;
  const tb = b.scheduled_at ? new Date(b.scheduled_at).getTime() : Number.POSITIVE_INFINITY;
  return ta - tb;
}
