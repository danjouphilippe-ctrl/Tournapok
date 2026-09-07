import { speedLabel, speedRank } from "@/lib/blindStructures";

/** Quatre barres croissantes, remplies jusqu'au rang de la structure.
 * Purement visuel : le libellé de vitesse reste affiché à côté, donc on
 * masque la jauge aux lecteurs d'écran plutôt que de répéter. */
export function SpeedGauge({ preset }: { preset: string }) {
  const rank = speedRank(preset);
  return (
    <span className="speed-gauge" aria-hidden="true" title={speedLabel(preset)}>
      {[1, 2, 3, 4].map((n) => (
        <span key={n} className={n <= rank ? "on" : undefined} />
      ))}
    </span>
  );
}
