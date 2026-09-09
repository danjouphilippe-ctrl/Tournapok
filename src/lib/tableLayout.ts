/** Répartition des sièges autour d'une table ovale.
 *
 * Vit hors du composant parce que c'est du calcul pur, et que le défaut
 * qu'il corrige ne se voit qu'à table pleine : sur une ellipse large,
 * des pas égaux du paramètre t donnent des arcs plus courts près des
 * extrémités gauche et droite qu'en haut et en bas. À neuf joueurs, les
 * sièges de flanc se chevauchaient pendant que le haut respirait.
 *
 * On répartit donc à longueur d'arc égale : chaque joueur a la même
 * portion de bord de table, où qu'il soit assis. */

/** Longueur d'arc parcourue par unité de paramètre, sur l'ellipse de
 * demi-axes (1, k) : ds/dt = √(sin²t + k²cos²t). */
function vitesse(t: number, k: number): number {
  const s = Math.sin(t);
  const c = Math.cos(t);
  return Math.sqrt(s * s + k * k * c * c);
}

/** Les `n` paramètres t plaçant autant de points à intervalles d'arc
 * égaux sur l'ellipse de demi-axes (1, k), le premier à midi.
 *
 * k est le rapport hauteur/largeur de l'ellipse : 1 pour un cercle,
 * moins pour un ovale couché. */
export function anglesArcEgal(n: number, k: number): number[] {
  if (n <= 0) return [];

  /* On intègre directement à partir de midi, et non depuis l'axe
   * horizontal quitte à faire tourner le résultat ensuite : une ellipse
   * n'est pas invariante par rotation, et ce quart de tour détruirait
   * l'égalité des arcs qu'on vient de calculer. */
  const DEPART = -Math.PI / 2;
  const PAS = 2048;
  const dt = (2 * Math.PI) / PAS;

  const cumul = new Float64Array(PAS + 1);
  for (let i = 1; i <= PAS; i++) {
    const a = vitesse(DEPART + (i - 1) * dt, k);
    const b = vitesse(DEPART + i * dt, k);
    cumul[i] = cumul[i - 1] + ((a + b) / 2) * dt;
  }
  const total = cumul[PAS];

  const angles: number[] = [];
  let j = 0;
  for (let p = 0; p < n; p++) {
    const cible = (p / n) * total;
    while (j < PAS && cumul[j + 1] < cible) j += 1;
    const pente = cumul[j + 1] - cumul[j];
    const fraction = pente > 0 ? (cible - cumul[j]) / pente : 0;
    angles.push(DEPART + (j + fraction) * dt);
  }
  return angles;
}
