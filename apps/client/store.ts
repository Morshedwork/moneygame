import { create } from "zustand";
import {
  applyCommand,
  createPlayer,
  publicPlayer,
  Player,
  Command,
} from "../../packages/game-rules";
import { cloud, friendlyError } from "./firebase";
export type ViewPlayer = ReturnType<typeof publicPlayer>;
type Store = {
  player: ViewPlayer | null;
  practice: boolean;
  practicePrivate: Player | null;
  busy: boolean;
  presenting: boolean;
  finishPresentation: () => void;
  error: string;
  feedback: { correct: boolean; text: string } | null;
  page: string;
  muted: boolean;
  reduced: boolean;
  setPage: (s: string) => void;
  setPlayer: (p: ViewPlayer | null) => void;
  startPractice: () => void;
  send: (type: string, data?: Record<string, unknown>) => Promise<boolean>;
  setError: (s: string) => void;
  toggleSound: () => void;
  toggleMotion: () => void;
  exit: () => void;
};
export const useGame = create<Store>((set, get) => ({
  player: null,
  practice: false,
  practicePrivate: null,
  busy: false,
  presenting: false,
  finishPresentation: () => set({ presenting: false }),
  error: "",
  feedback: null,
  page: "home",
  muted: true,
  reduced: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  setPage: (page) => set({ page, error: "", feedback: null, presenting: false }),
  setPlayer: (player) => set({ player }),
  setError: (error) => set({ error }),
  startPractice: () => {
    const p = createPlayer("practice", "Explorer");
    set({
      player: publicPlayer(p),
      practicePrivate: p,
      practice: true,
      page: "dashboard",
      error: "",
      feedback: null,
    });
  },
  send: async (type, data = {}) => {
    if (get().busy || get().presenting) return false;
    const rollsDie = type === "roll" || (type === "decision" && data.choice === "replace");
    set({ busy: true, error: "", feedback: null, presenting: rollsDie });
    try {
      const command: Command = { ...data, id: crypto.randomUUID(), type };
      if (type === "roll") command.expectedTurn = data.expectedTurn ?? get().player?.game?.turn;
      if (get().practice) {
        const result = applyCommand(
          get().practicePrivate!,
          command,
          crypto.getRandomValues(new Uint32Array(1))[0],
        );
        set({
          player: publicPlayer(result.player),
          practicePrivate: result.player,
          feedback: result.feedback || null,
        });
      } else {
        const result = await cloud("command", { command });
        set({ player: result.player, feedback: result.feedback });
      }
      return true;
    } catch (e) {
      set({ error: friendlyError(e), presenting: false });
      return false;
    } finally {
      set({ busy: false });
    }
  },
  toggleSound: () => set((s) => ({ muted: !s.muted })),
  toggleMotion: () => set((s) => ({ reduced: !s.reduced })),
  exit: () =>
    set({
      player: null,
      practicePrivate: null,
      practice: false,
      page: "home",
      feedback: null,
      error: "",
      presenting: false,
    }),
}));
