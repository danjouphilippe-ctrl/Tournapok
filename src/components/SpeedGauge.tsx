/** Quatre barres croissantes, remplies jusqu'au rang de vitesse.
 *
 * Le rang vient des niveaux réels (voir `paceRank`), pas de l'étiquette :
 * une structure « personnalisée » n'annonce aucune vitesse, mais ses
 * niveaux la disent. La couleur, elle, reste celle de la famille
 * déclarée — les deux ne divergent que si l'étiquette ment, ce qui est
 * précisément l'information utile.
 *
 * Purement visuel : la vitesse et la durée sont déjà écrites à côté, on
 * masque donc la jauge aux lecteurs d'écran plutôt que de répéter. */
export function SpeedGauge({ rank, title }: { rank: number; title?: string }) {
  return (
    <span className="speed-gauge" aria-hidden="true" title={title}>
      {[1, 2, 3, 4].map((n) => (
        <span key={n} className={n <= rank ? "on" : undefined} />
      ))}
    </span>
  );
}
