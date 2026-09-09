/** Ce que la page de gestion doit proposer selon la phase du tournoi.
 *
 * Une fois la partie lancée, l'écran continuait d'afficher des commandes
 * d'avant-partie : le rappel complet des informations, le champ
 * d'inscription d'un joueur, et le lien « Marquer non payé ». Ces règles
 * vivent ici parce qu'elles ont des cas limites — notamment le niveau
 * de fin des inscriptions tardives — et qu'on veut les figer. */

export type PhaseTournoi = {
  status: string;
  late_registration_enabled: boolean;
  late_registration_until_level: number | null;
  current_level: number;
};

/** Peut-on encore inscrire un joueur ?
 *
 * Reproduit exactement le garde-fou de la base (migration 0003) : sans
 * ça l'interface propose un geste que le serveur refuse, et l'organisateur
 * se prend une erreur en pleine soirée de tournoi. */
export function peutInscrireUnJoueur(t: PhaseTournoi): boolean {
  if (t.status === "termine") return false;
  if (t.status !== "en_cours") return true;
  if (!t.late_registration_enabled) return false;
  if (t.late_registration_until_level === null) return true;
  // Le serveur refuse dès que current_level dépasse le niveau limite —
  // pendant le niveau limite lui-même, l'inscription passe encore.
  return t.current_level <= t.late_registration_until_level;
}

/** Peut-on revenir sur un buy-in déjà encaissé ?
 *
 * Seulement avant le départ : une fois les cartes distribuées, dire
 * qu'un joueur assis n'a finalement pas payé ne veut plus rien dire. */
export function peutDemarquerBuyIn(t: Pick<PhaseTournoi, "status">): boolean {
  return t.status === "inscription";
}

/** Le rappel des informations du tournoi doit-il être replié ?
 *
 * Avant le départ, c'est la fiche qu'on relit et qu'on partage. Une fois
 * la partie lancée, l'écran sert à faire tourner l'horloge et à éliminer
 * des joueurs : buy-in, adresse et plan n'ont plus leur place en tête. */
export function detailsReplies(t: Pick<PhaseTournoi, "status">): boolean {
  return t.status !== "inscription";
}
