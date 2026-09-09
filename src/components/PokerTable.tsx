import Link from "next/link";

/** Une table et ses joueurs, dans une tuile.
 *
 * Sorti de la page pour pouvoir être rendu isolément : la page exige
 * une session et de vraies données, ce composant non — c'est ce qui
 * permet de mesurer débordements et chevauchements sans tournoi réel.
 *
 * Le tapis n'est volontairement pas affiché ici : cet écran répond à
 * « qui est assis où », pas à « qui est devant ». Le détail des tapis
 * vit sur la page du tournoi. */
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
  const parSiege = [...seats].sort((a, b) => a.seatNumber - b.seatNumber);

  return (
    <div className="card flex flex-col gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold">Table {tableNumber}</h2>
        <span className="text-sm text-ink-soft">
          {seats.length} {seats.length > 1 ? "joueurs" : "joueur"}
        </span>
      </div>

      {/* Sur téléphone, l'ellipse est intenable : huit sièges autour d'un
        * ovale de 340 px se chevauchent quel que soit le rayon. Une liste
        * dit la même chose sans rien tronquer, et c'est de toute façon
        * sur un portable ou un téléviseur qu'on montre le placement. */}
      <ol className="flex flex-col gap-2 sm:hidden">
        {parSiege.map((seat) => (
          <li key={seat.playerId}>
            <Link
              href={`/joueurs/${seat.playerId}`}
              className="flex items-center gap-3 rounded-lg border border-line px-3 py-2"
            >
              <span className="w-5 shrink-0 text-center text-xs tabular-nums text-ink-faint">
                {seat.seatNumber}
              </span>
              <Avatar seat={seat} taille="h-11 w-11" />
              <span className="min-w-0 flex-1 wrap-anywhere font-medium">{seat.pseudo}</span>
            </Link>
          </li>
        ))}
      </ol>

      <div className="relative mx-auto hidden aspect-[8/5] w-full max-w-lg sm:block">
        <div
          className="absolute inset-[14%] rounded-[50%] border-4 border-line"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(138,35,50,0.35), rgba(28,22,21,0.9))",
          }}
        />
        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-3xl text-accent opacity-30">
          ♠
        </span>

        {seats.map((seat) => {
          const angle = ((seat.seatNumber - 1) / tableSize) * 2 * Math.PI - Math.PI / 2;
          /* Rayon vertical plus court que l'horizontal : sinon le siège
           * du haut, centré trop près du bord, débordait sur le titre. */
          const left = 50 + 46 * Math.cos(angle);
          const top = 50 + 40 * Math.sin(angle);
          /* L'étiquette est centrée sur le siège, donc aux extrémités
           * gauche et droite elle sortirait du cadre pour moitié. Sur les
           * flancs, on la fait partir du centre de l'avatar vers
           * l'intérieur. */
          const alignement =
            left < 25 ? "translate-x-1/2" : left > 75 ? "-translate-x-1/2" : "";
          /* L'étiquette se place toujours du côté extérieur de l'ovale :
           * au-dessus pour les sièges du haut, en dessous pour ceux du
           * bas. Toujours en dessous, celles des sièges hauts se
           * serraient contre le tapis et celles du bas venaient
           * recouvrir l'avatar du voisin. */
          const enHaut = top < 50;
          return (
            <Link
              key={seat.playerId}
              href={`/joueurs/${seat.playerId}`}
              className={`absolute flex -translate-x-1/2 -translate-y-1/2 items-center gap-1.5 ${
                enHaut ? "flex-col-reverse" : "flex-col"
              }`}
              style={{ left: `${left}%`, top: `${top}%` }}
            >
              <Avatar seat={seat} taille="h-14 w-14" />
              <span
                title={seat.pseudo}
                className={`max-w-[7rem] truncate rounded-md bg-surface-2 px-2 py-0.5 text-xs font-medium text-ink shadow ${alignement}`}
              >
                {seat.pseudo}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function Avatar({
  seat,
  taille,
}: {
  seat: { pseudo: string; avatarUrl: string | null };
  taille: string;
}) {
  if (seat.avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={seat.avatarUrl}
        alt=""
        className={`${taille} shrink-0 rounded-full border-2 border-accent object-cover`}
      />
    );
  }
  return (
    <span
      className={`${taille} flex shrink-0 items-center justify-center rounded-full border-2 border-accent bg-surface-2 font-medium text-ink-soft`}
    >
      {seat.pseudo.slice(0, 1).toUpperCase()}
    </span>
  );
}
