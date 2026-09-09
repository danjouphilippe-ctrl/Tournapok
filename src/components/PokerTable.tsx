import Link from "next/link";

/** La table ovale et ses sièges disposés en ellipse.
 *
 * Sorti de la page pour pouvoir être rendu isolément : la page
 * exige une session et de vraies données, ce composant non. */
export function PokerTable({
  tableNumber,
  tableSize,
  seats,
}: {
  tableNumber: number;
  tableSize: number;
  seats: {
    seatNumber: number;
    pseudo: string;
    avatarUrl: string | null;
    stack: number | null;
    playerId: string;
  }[];
}) {
  return (
    <div className="flex flex-col items-center gap-3">
      <p className="eyebrow">Table {tableNumber}</p>

      {/* Sur téléphone, l'ellipse est intenable : huit étiquettes
        * « pseudo · tapis » autour d'un ovale de 340 px se chevauchent et
        * débordent du cadre, quel que soit le rayon. Une liste dit la
        * même chose sans rien tronquer. L'ovale reprend la main dès
        * qu'il y a la place — et c'est de toute façon sur un portable ou
        * un téléviseur qu'on montre le placement en salle. */}
      <ol className="flex w-full flex-col gap-2 sm:hidden">
        {[...seats]
          .sort((a, b) => a.seatNumber - b.seatNumber)
          .map((seat) => (
            <li key={seat.playerId}>
              <Link
                href={`/joueurs/${seat.playerId}`}
                className="card card-link flex items-center gap-3 px-3 py-2"
              >
                <span className="w-5 shrink-0 text-center text-xs text-ink-faint">
                  {seat.seatNumber}
                </span>
                {seat.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={seat.avatarUrl}
                    alt=""
                    className="h-9 w-9 shrink-0 rounded-full border-2 border-accent object-cover"
                  />
                ) : (
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-accent bg-surface-2 text-sm font-medium text-ink-soft">
                    {seat.pseudo.slice(0, 1).toUpperCase()}
                  </span>
                )}
                <span className="min-w-0 flex-1 wrap-anywhere text-sm">{seat.pseudo}</span>
                {seat.stack != null && (
                  <span className="shrink-0 text-sm tabular-nums text-ink-soft">
                    {seat.stack.toLocaleString("fr-FR")}
                  </span>
                )}
              </Link>
            </li>
          ))}
      </ol>

      <div className="relative hidden aspect-[8/5] w-full max-w-lg sm:block">
        <div
          className="absolute inset-[12%] rounded-[50%] border-4 border-line"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(138,35,50,0.35), rgba(28,22,21,0.9))",
          }}
        />
        {seats.map((seat) => {
          const angle = ((seat.seatNumber - 1) / tableSize) * 2 * Math.PI - Math.PI / 2;
          /* Rayon vertical plus court que l'horizontal : à 46 % le siège
           * du haut débordait sur le titre de la table, son avatar étant
           * centré sur un point situé à 4 % de la hauteur. */
          const left = 50 + 46 * Math.cos(angle);
          const top = 50 + 40 * Math.sin(angle);
          /* L'étiquette est centrée sur le siège, donc aux extrémités
           * gauche et droite elle sortait du cadre pour moitié — c'est
           * ce qui coupait « Joueur02 · 20 0… ». Sur les flancs, on la
           * fait donc partir du centre de l'avatar vers l'intérieur. */
          const alignement =
            left < 25 ? "translate-x-1/2" : left > 75 ? "-translate-x-1/2" : "";
          return (
            <Link
              key={seat.playerId}
              href={`/joueurs/${seat.playerId}`}
              className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1"
              style={{ left: `${left}%`, top: `${top}%` }}
            >
              {seat.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={seat.avatarUrl}
                  alt={seat.pseudo}
                  className="h-10 w-10 rounded-full border-2 border-accent object-cover"
                />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-accent bg-surface-2 text-sm font-medium text-ink-soft">
                  {seat.pseudo.slice(0, 1).toUpperCase()}
                </div>
              )}
              <span
                className={`whitespace-nowrap rounded-md bg-surface px-1.5 py-0.5 text-[11px] text-ink shadow ${alignement}`}
              >
                {seat.pseudo}
                {seat.stack != null && (
                  <span className="text-ink-faint"> · {seat.stack.toLocaleString("fr-FR")}</span>
                )}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
