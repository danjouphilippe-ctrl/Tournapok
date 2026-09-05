// Attribution et équilibrage des tables, selon les règles usuelles
// des tournois de poker (proches des règles TDA) :
// - Tirage aléatoire des places au démarrage.
// - Une table est "cassée" dès que le nombre de joueurs restants
//   permet de tenir sur un nombre de tables inférieur ; ses joueurs
//   sont alors redistribués aléatoirement sur les tables restantes.
// - Sinon, dès qu'une table compte 2 joueurs de moins qu'une autre,
//   un joueur est déplacé de la table la plus remplie vers la plus
//   courte, pour ne jamais dépasser 1 joueur d'écart.

export type SeatedPlayer = {
  playerId: string;
  tableNumber: number;
  seatNumber: number;
};

function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function groupByTable(seats: SeatedPlayer[]): Map<number, SeatedPlayer[]> {
  const map = new Map<number, SeatedPlayer[]>();
  for (const s of seats) {
    const list = map.get(s.tableNumber);
    if (list) list.push(s);
    else map.set(s.tableNumber, [s]);
  }
  return map;
}

function firstFreeSeat(taken: Set<number>): number {
  let seat = 1;
  while (taken.has(seat)) seat++;
  return seat;
}

/** Tirage initial : répartit tous les joueurs au hasard, le plus
 * équitablement possible, sur le nombre de tables nécessaire. */
export function initialSeating(playerIds: string[], tableSize: number): SeatedPlayer[] {
  const shuffled = shuffle(playerIds);
  const tableCount = Math.max(1, Math.ceil(shuffled.length / tableSize));
  const tables: string[][] = Array.from({ length: tableCount }, () => []);
  shuffled.forEach((id, i) => tables[i % tableCount].push(id));

  const result: SeatedPlayer[] = [];
  tables.forEach((players, tIdx) => {
    players.forEach((playerId, seatIdx) => {
      result.push({ playerId, tableNumber: tIdx + 1, seatNumber: seatIdx + 1 });
    });
  });
  return result;
}

/** Place un joueur qui rejoint le tournoi en cours de route, à la
 * table la moins remplie (ou en ouvre une nouvelle si toutes sont
 * pleines). */
export function seatNewPlayer(
  current: SeatedPlayer[],
  playerId: string,
  tableSize: number,
): SeatedPlayer[] {
  const byTable = groupByTable(current);
  let target: number | null = null;
  let minCount = Infinity;
  for (const [tableNumber, players] of byTable) {
    if (players.length < tableSize && players.length < minCount) {
      minCount = players.length;
      target = tableNumber;
    }
  }
  if (target === null) {
    target = Math.max(0, ...byTable.keys()) + 1;
  }
  const taken = new Set((byTable.get(target) ?? []).map((p) => p.seatNumber));
  return [...current, { playerId, tableNumber: target, seatNumber: firstFreeSeat(taken) }];
}

/** Ré-équilibre les tables après l'élimination d'un joueur : casse
 * une table si le nombre de tables peut diminuer, sinon déplace un
 * joueur de la table la plus remplie vers la plus courte tant que
 * l'écart dépasse 1. Renumérote les tables de façon contiguë. */
export function rebalanceAfterRemoval(
  remainingPlayerIds: string[],
  previousSeats: SeatedPlayer[],
  tableSize: number,
): SeatedPlayer[] {
  let seats = previousSeats.filter((s) => remainingPlayerIds.includes(s.playerId));

  let changed = true;
  while (changed) {
    changed = false;
    const byTable = groupByTable(seats);
    const tableNumbers = [...byTable.keys()].sort((a, b) => a - b);
    const idealTableCount = Math.max(1, Math.ceil(seats.length / tableSize));

    if (tableNumbers.length > idealTableCount) {
      // Casse la table la plus courte, redistribue ses joueurs.
      let breakTable = tableNumbers[0];
      let minCount = Infinity;
      for (const t of tableNumbers) {
        const c = byTable.get(t)!.length;
        if (c < minCount) {
          minCount = c;
          breakTable = t;
        }
      }
      const movingPlayers = shuffle(byTable.get(breakTable)!.map((p) => p.playerId));
      seats = seats.filter((s) => s.tableNumber !== breakTable);
      for (const playerId of movingPlayers) {
        seats = seatNewPlayer(seats, playerId, tableSize);
      }
      changed = true;
      continue;
    }

    const counts = tableNumbers.map((t) => ({ t, count: byTable.get(t)!.length }));
    const fullest = counts.reduce((a, b) => (b.count > a.count ? b : a));
    const shortest = counts.reduce((a, b) => (b.count < a.count ? b : a));

    if (fullest.count - shortest.count >= 2) {
      const candidates = byTable.get(fullest.t)!;
      const moving = candidates[Math.floor(Math.random() * candidates.length)];
      seats = seats.filter((s) => s.playerId !== moving.playerId);
      const taken = new Set(byTable.get(shortest.t)!.map((p) => p.seatNumber));
      seats.push({
        playerId: moving.playerId,
        tableNumber: shortest.t,
        seatNumber: firstFreeSeat(taken),
      });
      changed = true;
    }
  }

  // Renumérote les tables restantes de façon contiguë (1, 2, 3...).
  const finalTables = [...new Set(seats.map((s) => s.tableNumber))].sort((a, b) => a - b);
  const renumber = new Map(finalTables.map((t, i) => [t, i + 1]));
  return seats.map((s) => ({ ...s, tableNumber: renumber.get(s.tableNumber)! }));
}
