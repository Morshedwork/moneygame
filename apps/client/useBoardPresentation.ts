import { useEffect, useRef, useState } from "react";
import type { ViewPlayer } from "./store";
import { useGame } from "./store";
import { advanceWalkElapsed, RollEvent, sampleRoll } from "./board-presentation";

// A single clock drives both renderers and the input lock. No animation of saved history.
export function useBoardPresentation(game: ViewPlayer["game"] | undefined, reduced: boolean) {
  const [seen, setSeen] = useState(game);
  const [event, setEvent] = useState<RollEvent | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const visibleElapsed = useRef(0);
  if (game !== seen) {
    setSeen(game);
    const movement = game && seen && game.turn !== seen.turn;
    const replacement = game?.outcome?.die !== undefined && seen?.outcome?.die === undefined;
    if (game && seen && (movement || replacement)) {
      setEvent({ id: `${game.turn}:${replacement ? "replacement" : "move"}`, value: replacement ? game.outcome!.die! : game.lastDie,
        from: seen.position, path: movement ? [...game.path] : [], replacement, started: performance.now() });
      visibleElapsed.current = 0;
      setElapsed(0);
    }
  }
  const sample = sampleRoll(event, elapsed, game?.position || 0, reduced);
  useEffect(() => {
    if (reduced) { setEvent(null); return; }
    if (!event) return;
    let frame: number;
    let previous: number | null = performance.now();
    const resetFrame = () => { previous = null; };
    const tick = (now: number) => {
      const active = !document.hidden;
      visibleElapsed.current = advanceWalkElapsed(
        visibleElapsed.current,
        previous === null ? 0 : now - previous,
        active,
      );
      previous = active ? now : null;
      setElapsed(visibleElapsed.current);
      if (!sampleRoll(event, visibleElapsed.current, 0).complete) frame = requestAnimationFrame(tick);
    };
    document.addEventListener("visibilitychange", resetFrame);
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("visibilitychange", resetFrame);
    };
  }, [event, reduced]);
  useEffect(() => {
    if (sample.complete) useGame.getState().finishPresentation();
  }, [sample.complete, event]);
  useEffect(() => () => useGame.getState().finishPresentation(), []);
  return { ...sample, value: game?.outcome?.die ?? game?.lastDie ?? 0, replacement: game?.outcome?.die !== undefined };
}
