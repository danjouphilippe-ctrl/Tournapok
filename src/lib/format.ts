/** Mises en forme partagées entre plusieurs écrans. */

/** Ordinal français court : 1er, puis 2ème, 3ème… */
export function ordinal(place: number): string {
  if (place === 1) return "1er";
  return `${place}ème`;
}

/** Date courte pour une liste : « 8 sept. 2026 ».
 *
 * Toujours en heure de Paris : le serveur rend la page ailleurs (les
 * fonctions tournent à Dublin), et sans fuseau explicite un tournoi de
 * 00h30 s'afficherait la veille. */
export function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", {
    timeZone: "Europe/Paris",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** Date et heure, pour une échéance qu'on doit pouvoir noter. */
export function dateTime(iso: string): string {
  return new Date(iso).toLocaleString("fr-FR", {
    timeZone: "Europe/Paris",
    dateStyle: "long",
    timeStyle: "short",
  });
}
