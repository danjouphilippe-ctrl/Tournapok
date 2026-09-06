import { describe, expect, it } from "vitest";
import { initialSeating, rebalanceAfterRemoval, seatNewPlayer } from "./tableBalancing";

describe("initialSeating", () => {
  it("distributes players evenly across the minimum number of tables", () => {
    const players = Array.from({ length: 20 }, (_, i) => `p${i}`);
    const seats = initialSeating(players, 9);

    expect(seats).toHaveLength(20);
    const perTable = new Map<number, number>();
    for (const s of seats) perTable.set(s.tableNumber, (perTable.get(s.tableNumber) ?? 0) + 1);
    // 20 joueurs / 9 par table => 3 tables, écart maximum de 1 joueur.
    expect(perTable.size).toBe(3);
    const counts = [...perTable.values()];
    expect(Math.max(...counts) - Math.min(...counts)).toBeLessThanOrEqual(1);
  });

  it("assigns a unique seat number per player within a table", () => {
    const players = Array.from({ length: 9 }, (_, i) => `p${i}`);
    const seats = initialSeating(players, 9);
    const seatNumbers = seats.map((s) => s.seatNumber).sort((a, b) => a - b);
    expect(seatNumbers).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it("never throws on an invalid table size (regression: RangeError on table_size = 0)", () => {
    const players = ["a", "b", "c"];
    expect(() => initialSeating(players, 0)).not.toThrow();
    expect(() => initialSeating(players, -1)).not.toThrow();
    // Se dégrade proprement plutôt que de planter : une seule table.
    const seats = initialSeating(players, 0);
    expect(seats).toHaveLength(3);
  });

  it("handles an empty player list", () => {
    expect(initialSeating([], 9)).toEqual([]);
  });
});

describe("seatNewPlayer", () => {
  it("seats a new player at the least-filled existing table", () => {
    const current = [
      { playerId: "a", tableNumber: 1, seatNumber: 1 },
      { playerId: "b", tableNumber: 1, seatNumber: 2 },
      { playerId: "c", tableNumber: 2, seatNumber: 1 },
    ];
    const updated = seatNewPlayer(current, "d", 9);
    const newSeat = updated.find((s) => s.playerId === "d");
    expect(newSeat?.tableNumber).toBe(2);
  });

  it("opens a new table once every existing table is full", () => {
    const current = [
      { playerId: "a", tableNumber: 1, seatNumber: 1 },
      { playerId: "b", tableNumber: 1, seatNumber: 2 },
    ];
    const updated = seatNewPlayer(current, "c", 2);
    const newSeat = updated.find((s) => s.playerId === "c");
    expect(newSeat?.tableNumber).toBe(2);
  });

  it("reuses the first free seat number at the target table", () => {
    const current = [
      { playerId: "a", tableNumber: 1, seatNumber: 1 },
      { playerId: "b", tableNumber: 1, seatNumber: 3 },
    ];
    const updated = seatNewPlayer(current, "c", 9);
    const newSeat = updated.find((s) => s.playerId === "c");
    expect(newSeat?.seatNumber).toBe(2);
  });
});

describe("rebalanceAfterRemoval", () => {
  it("breaks a table once fewer tables are enough for the remaining players", () => {
    // 2 tables de 2 sur une table_size de 4 : après en avoir retiré
    // un, 3 joueurs tiennent sur une seule table de 4.
    const previousSeats = [
      { playerId: "a", tableNumber: 1, seatNumber: 1 },
      { playerId: "b", tableNumber: 1, seatNumber: 2 },
      { playerId: "c", tableNumber: 2, seatNumber: 1 },
      { playerId: "d", tableNumber: 2, seatNumber: 2 },
    ];
    const remaining = rebalanceAfterRemoval(["a", "b", "c"], previousSeats, 4);
    const tableNumbers = new Set(remaining.map((s) => s.tableNumber));
    expect(tableNumbers.size).toBe(1);
    expect(remaining).toHaveLength(3);
  });

  it("renumbers remaining tables contiguously starting at 1", () => {
    const previousSeats = [
      { playerId: "a", tableNumber: 2, seatNumber: 1 },
      { playerId: "b", tableNumber: 3, seatNumber: 1 },
    ];
    const remaining = rebalanceAfterRemoval(["a", "b"], previousSeats, 9);
    const tableNumbers = remaining.map((s) => s.tableNumber).sort((a, b) => a - b);
    expect(tableNumbers).toEqual([1, 1]);
  });

  it("drops players who are no longer in the remaining list", () => {
    const previousSeats = [
      { playerId: "a", tableNumber: 1, seatNumber: 1 },
      { playerId: "b", tableNumber: 1, seatNumber: 2 },
    ];
    const remaining = rebalanceAfterRemoval(["a"], previousSeats, 9);
    expect(remaining).toEqual([{ playerId: "a", tableNumber: 1, seatNumber: 1 }]);
  });
});
