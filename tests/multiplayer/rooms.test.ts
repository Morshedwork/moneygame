import { it, expect, describe } from "vitest";
import {
  createPlayer,
  applyCommand,
  publicPlayer,
  Player,
} from "../../packages/game-rules";
import { leaveRoom, roomCommand, roomPublic, Room } from "../../packages/game-rules/rooms";
import { lessons, gate } from "../../packages/curriculum";
let n = 0;
const command = (type: string, data = {}) => ({
  id: "multiplayer-" + ++n,
  type,
  ...data,
});
function player(i: number) {
  let p = createPlayer("p" + i, "Player " + i);
  for (const [index, l] of lessons.entries())
    p = applyCommand(p, command("lesson", { index, answer: l.answer })).player;
  for (const [index, q] of gate.entries())
    p = applyCommand(p, command("gate", { index, answer: q.answer })).player;
  return applyCommand(
    p,
    command("setup", {
      name: "Bento " + i,
      price: 4 + i,
      color: "#174de5",
      goal: "Learn by doing",
    }),
    i + 20,
  ).player;
}
describe("private 2–4 player sessions", () => {
  const roomFor = (players: Player[], turn = 1): Room => ({
    code: "ROOM1234", host: players[0].id,
    members: players.map((p) => p.id), ready: players.map((p) => p.id),
    started: true, turn, round: 3, reactions: [],
  });
  for (const departing of [0, 2])
    it(`preserves the current actor when finished seat ${departing} leaves`, () => {
      const players = [player(0), player(1), player(2)];
      players[departing].game!.phase = "reflection";
      const room = roomFor(players);
      const result = leaveRoom(room, players, players[departing].id);
      expect(result.members[result.turn]).toBe("p1");
      expect(result.round).toBe(3);
      expect(result.ready).not.toContain(players[departing].id);
      expect(room.members).toEqual(["p0", "p1", "p2"]);
      expect(room.turn).toBe(1);
      expect(() => roomCommand(result, players, "p1", command("roll"), 23)).not.toThrow();
    });
  it("skips finished seats when the current finished member leaves", () => {
    const players = [player(0), player(1), player(2), player(3)];
    players[1].game!.phase = "reflection";
    players[2].game!.phase = "village";
    const result = leaveRoom(roomFor(players), players, "p1");
    expect(result.members[result.turn]).toBe("p3");
    expect(result.host).toBe("p0");
  });
  it("does not let an active or paused player forfeit without a recovery policy", () => {
    const players = [player(0), player(1)];
    players[1].paused = true;
    expect(() => leaveRoom(roomFor(players), players, "p1")).toThrow("Finish your lap");
    expect(() => leaveRoom(roomFor(players), players, "outsider")).toThrow("not in");
  });
  it("leaves a valid empty room after the final finished member leaves", () => {
    const players = [player(0)];
    players[0].game!.phase = "village";
    const result = leaveRoom(roomFor(players, 0), players, "p0");
    expect(result).toMatchObject({ members: [], ready: [], host: null, turn: 0 });
  });
  for (const count of [2, 4])
    it(`completes ${count}-player rounds with independent money and no skipped turns`, () => {
      let players = Array.from({ length: count }, (_, i) => player(i));
      let room: Room = {
        code: "ROOM1234",
        host: players[0].id,
        members: players.map((p) => p.id),
        ready: players.map((p) => p.id),
        started: true,
        turn: 0,
        round: 1,
        reactions: [],
      };
      let countTurns = 0;
      while (
        players.some((p) => p.game?.phase === "board") &&
        countTurns++ < 120
      ) {
        const actor = room.members[room.turn];
        const p = players.find((p) => p.id === actor)!;
        const g = p.game!;
        const pending = g.pending;
        const data =
          pending === "big-sale"
            ? { discount: 1 }
            : pending === "returns"
              ? { choice: "refund" }
              : pending === "fortune"
                ? { accept: false }
                : { amount: 0 };
        const c = command(pending ? "decision" : "roll", data);
        const before = players.find((x) => x.id !== actor)!.game!.wallet;
        const result = roomCommand(room, players, actor, c, 23);
        const duplicate = roomCommand(
          result.room,
          result.players,
          actor,
          c,
          23,
        );
        expect(duplicate.players).toEqual(result.players);
        players = result.players;
        room = result.room;
        expect(players.find((x) => x.id !== actor)!.game!.wallet).toBe(before);
      }
      expect(players.every((p) => p.game!.phase === "reflection")).toBe(true);
      expect(new Set(players.map((p) => p.game!.price)).size).toBe(count);
      expect(countTurns).toBeLessThan(120);
    });
  it("rejects a different player rolling and unknown members", () => {
    const players = [player(0), player(1)];
    const room: Room = {
      code: "ROOM1234",
      host: "p0",
      members: ["p0", "p1"],
      ready: ["p0", "p1"],
      started: true,
      turn: 0,
      round: 1,
      reactions: [],
    };
    expect(() => roomCommand(room, players, "p1", command("roll"), 1)).toThrow(
      "another player",
    );
    expect(() =>
      roomCommand(room, players, "outsider", command("roll"), 1),
    ).toThrow("not in");
  });
  it("never shares a player’s economy, reflection, decks or receipts", () => {
    const players = [player(0), player(1)];
    const room: Room = {
      code: "ROOM1234",
      host: "p0",
      members: ["p0", "p1"],
      ready: [],
      started: false,
      turn: 0,
      round: 1,
      reactions: [],
    };
    const view = roomPublic(room, players);
    for (const p of view.players) {
      for (const key of [
        "wallet",
        "game",
        "ledger",
        "reflection",
        "receipts",
        "budgetDeck",
      ])
        expect(p).not.toHaveProperty(key);
    }
    expect(view.players).toHaveLength(2);
  });
});
