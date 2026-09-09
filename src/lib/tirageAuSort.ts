/** Le tirage au sort des places, côté animation.
 *
 * Les places sont déjà attribuées en base quand on arrive sur l'écran :
 * l'animation ne tire rien, elle *révèle*. Ce qu'elle doit réussir, c'est
 * le rythme — un brassage rapide qui ralentit jusqu'à s'arrêter — et
 * c'est justement ce qui se teste sans navigateur. */

/** Délais successifs entre deux brassages, du plus vif au plus lent.
 *
 * Progression géométrique plutôt que linéaire : à l'oreille comme à
 * l'œil, c'est le *rapport* entre deux intervalles qu'on perçoit, pas
 * leur différence. Une progression linéaire donne un ralentissement qui
 * paraît brutal au début et interminable à la fin. */
export function rythmeDuTirage(nbEtapes: number, debutMs = 55, finMs = 640): number[] {
  if (nbEtapes <= 0) return [];
  if (nbEtapes === 1) return [finMs];
  const raison = Math.pow(finMs / debutMs, 1 / (nbEtapes - 1));
  return Array.from({ length: nbEtapes }, (_, i) => Math.round(debutMs * Math.pow(raison, i)));
}

/** Durée totale de l'animation, pour vérifier qu'on reste dans une
 * attente supportable devant une salle qui regarde. */
export function dureeTotale(rythme: number[]): number {
  return rythme.reduce((total, d) => total + d, 0);
}

/** Mélange de Fisher-Yates.
 *
 * Le générateur est injecté pour que le mélange soit reproductible en
 * test — sans quoi on ne pourrait vérifier que ce qu'il ne fait pas. */
export function melanger<T>(items: readonly T[], alea: () => number = Math.random): T[] {
  const copie = [...items];
  for (let i = copie.length - 1; i > 0; i--) {
    const j = Math.floor(alea() * (i + 1));
    [copie[i], copie[j]] = [copie[j], copie[i]];
  }
  return copie;
}
