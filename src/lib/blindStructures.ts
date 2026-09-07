export const SPEED_LABELS: Record<string, string> = {
  standard: "Standard",
  turbo: "Turbo",
  hyperturbo: "Hyper-turbo",
  deepstack: "Deepstack",
  personnalise: "Personnalisée",
};

/** Rang de vitesse, du plus lent (1) au plus rapide (4). Sert à remplir
 * la jauge et à choisir la couleur : l'échelle va du froid (lent) au
 * chaud (rapide), ce qui se lit sans légende. « Personnalisée » n'a pas
 * de vitesse connue et reste donc hors de l'échelle (0). */
export const SPEED_RANK: Record<string, number> = {
  deepstack: 1,
  standard: 2,
  turbo: 3,
  hyperturbo: 4,
  personnalise: 0,
};

export function speedRank(preset: string) {
  return SPEED_RANK[preset] ?? 0;
}

/** Classe de couleur associée au rang — définie dans globals.css. */
export function speedClass(preset: string) {
  return `speed-${speedRank(preset)}`;
}

export function speedLabel(preset: string) {
  return SPEED_LABELS[preset] ?? preset;
}

/** 95 → « 1 h 35 », 45 → « 45 min ». */
export function formatDuration(minutes: number) {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} h` : `${h} h ${String(m).padStart(2, "0")}`;
}

export type LevelDuration = { is_break: boolean; duration_minutes: number };

/** Ajoute à chaque niveau le temps écoulé à la fin de celui-ci — le
 * dernier élément vaut donc la durée totale. Vit ici, hors d'un
 * composant : accumuler dans un `map` à l'intérieur d'un rendu est
 * signalé par react-hooks/immutability. */
export function withElapsed<T extends LevelDuration>(levels: T[]): (T & { elapsed: number })[] {
  let running = 0;
  return levels.map((level) => {
    running += level.duration_minutes;
    return { ...level, elapsed: running };
  });
}

/** Durée moyenne d'un niveau de jeu — la mesure de vitesse la plus
 * honnête : un deepstack court reste lent, ses niveaux sont longs.
 * Sert à classer la liste, là où la couleur suit l'étiquette déclarée.
 * Renvoie +∞ sans niveau, pour renvoyer ces structures en fin de liste. */
export function averageLevelMinutes(levels: LevelDuration[]) {
  const playing = levels.filter((l) => !l.is_break);
  if (playing.length === 0) return Number.POSITIVE_INFINITY;
  return playing.reduce((sum, l) => sum + l.duration_minutes, 0) / playing.length;
}

/** Rang de vitesse déduit des niveaux réels, de 1 (lent) à 4 (rapide),
 * ou 0 quand la structure n'a aucun niveau et qu'on ne peut rien dire.
 *
 * Les seuils sont calés sur les structures officielles : l'hyper-turbo
 * tourne à 5 min par niveau, le turbo à 10, le standard à 20, le
 * deepstack à 45. Une structure « personnalisée » obtient ainsi une
 * jauge honnête, alors que son étiquette n'annonce aucune vitesse. */
export function paceRank(levels: LevelDuration[]) {
  const avg = averageLevelMinutes(levels);
  if (!Number.isFinite(avg)) return 0;
  if (avg <= 7) return 4;
  if (avg <= 12) return 3;
  if (avg <= 25) return 2;
  return 1;
}

/** Durée totale (pauses comprises) et temps de jeu effectif. */
export function structureTotals(levels: LevelDuration[]) {
  const total = levels.reduce((sum, l) => sum + l.duration_minutes, 0);
  const play = levels
    .filter((l) => !l.is_break)
    .reduce((sum, l) => sum + l.duration_minutes, 0);
  return { total, play, breaks: total - play };
}
