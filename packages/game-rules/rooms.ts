import { Player, Command, applyCommand } from "./index";
import { markets } from "./content";
export type Room = {
  code: string;
  host: string | null;
  members: string[];
  ready: string[];
  started: boolean;
  turn: number;
  round: number;
  reactions: { name: string; text: string; at: number }[];
};
export function roomPublic(room: Room, players: Player[]) {
  return {
    ...room,
    players: players
      .filter((p) => room.members.includes(p.id))
      .map((p) => ({
        id: p.id,
        name: p.name,
        avatar: p.avatar,
        position: p.game?.position || 0,
        finished: p.game?.phase !== "board",
      })),
  };
}
export function roomCommand(
  room: Room,
  roster: Player[],
  actor: string,
  command: Command,
  seed: number,
) {
  const p = roster.find((p) => p.id === actor);
  if (!p || !room.members.includes(actor))
    throw new Error("You are not in this room.");
  if (p.receipts.includes(command.id))
    return { room, players: roster, feedback: undefined };
  if (!room.started)
    throw new Error("Wait until every player is ready and the host starts.");
  if (
    ["roll", "decision"].includes(command.type) &&
    room.members[room.turn] !== actor
  )
    throw new Error("It is another player’s turn.");
  const duplicate = p.receipts.includes(command.id);
  const result = applyCommand(p, command, seed);
  let players = roster.map((p) =>
    p.id === actor ? result.player : structuredClone(p),
  );
  const r = structuredClone(room);
  if (
    !duplicate &&
    command.type === "roll" &&
    result.player.game?.position &&
    [7, 17].includes(result.player.game.position)
  ) {
    const card = markets[result.player.game.card];
    for (const other of players) {
      if (other.id === actor || other.game?.phase !== "board") continue;
      other.game.effects.push({
        id: command.id + "-shared",
        name: "Shared market: " + card.name,
        trigger: "next-sale",
        remaining: 1,
        cost: card.cost,
        budget: card.budget,
        visitors: card.visitors,
      });
    }
  }
  if (
    !duplicate &&
    ["roll", "decision"].includes(command.type) &&
    !result.player.game?.pending
  ) {
    for (let i = 0; i < r.members.length; i++) {
      r.turn = (r.turn + 1) % r.members.length;
      if (r.turn === 0) r.round++;
      if (
        players.find((p) => p.id === r.members[r.turn])?.game?.phase === "board"
      )
        break;
    }
  }
  return { room: r, players, feedback: result.feedback };
}
