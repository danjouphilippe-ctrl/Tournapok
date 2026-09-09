/** L'horloge d'un tournoi : temps restant sur le niveau en cours.
 *
 * Extrait de l'écran d'affichage pour que la page de gestion montre
 * exactement le même décompte. Deux calculs séparés auraient fini par
 * diverger, et rien n'est plus pénible qu'un chronomètre qui n'affiche
 * pas la même chose selon l'écran qu'on regarde. */

export type EtatHorloge = {
  clock_status: string;
  level_ends_at: string | null;
  paused_remaining_seconds: number | null;
};

/** Secondes restantes sur le niveau en cours.
 *
 * En marche, on compte depuis l'échéance enregistrée en base : c'est
 * elle qui fait foi, pas un compteur local qui dériverait à chaque
 * onglet. À l'arrêt ou en pause, on lit le reliquat figé. */
export function secondesRestantes(t: EtatHorloge, maintenant: number): number {
  if (t.clock_status === "running" && t.level_ends_at) {
    return Math.max(0, (new Date(t.level_ends_at).getTime() - maintenant) / 1000);
  }
  return t.paused_remaining_seconds ?? 0;
}

/** mm:ss, ou h:mm:ss au-delà de l'heure. */
export function formatChrono(totalSecondes: number): string {
  const s = Math.max(0, Math.round(totalSecondes));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(sec).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}
