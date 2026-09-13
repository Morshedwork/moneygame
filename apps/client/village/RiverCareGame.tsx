import {useEffect, useId, useReducer, useRef, useState} from "react";
import type {CSSProperties, KeyboardEvent, PointerEvent} from "react";
import {Check, Hand, Leaf, Newspaper, Recycle, RotateCcw, Stamp, Waves, X} from "lucide-react";
import {LitterArt, RiverBackdrop} from "./RiverCareArt";
import {newRiverGame, riverBins, riverFeedbackText, riverFirstTryCount, riverItems, riverReducer} from "./river-care";
import type {RiverBin} from "./river-care";
import "./river-care.css";

const binDetails = {
  Compost: {icon: Leaf, clue: "Fruit & food scraps", color: "#73ae53", ink: "#315128"},
  Paper: {icon: Newspaper, clue: "Clean paper & card", color: "#52a7da", ink: "#214e70"},
  Containers: {icon: Recycle, clue: "Empty bottles & cans", color: "#edb534", ink: "#624916"},
};
type Drag = {pointer: number; itemId: string; x: number; y: number; moved: boolean; element: HTMLButtonElement};

export function RiverCareGame({earned, onComplete}: {earned: boolean; onComplete: () => void}) {
  const [state, dispatch] = useReducer(riverReducer, undefined, newRiverGame);
  const [claimed, setClaimed] = useState(earned);
  const awarded = useRef(earned);
  const drag = useRef<Drag | null>(null);
  const ignoreClick = useRef({itemId: "", until: 0});
  const bins = useRef<Partial<Record<RiverBin, HTMLButtonElement | null>>>({});
  const itemButtons = useRef<Record<string, HTMLButtonElement | null>>({});
  const claimButton = useRef<HTMLButtonElement>(null);
  const feedbackId = useId();
  const helpId = useId();
  const count = state.sorted.length;
  const finished = count === riverItems.length;
  const selectedItem = riverItems.find(item => item.id === state.selected);
  const feedbackItem = riverItems.find(item => item.id === state.feedback.itemId);

  useEffect(() => {if (finished) claimButton.current?.focus({preventScroll: true});}, [finished]);

  function clearDrag() {
    const active = drag.current;
    drag.current = null;
    if (active) {
      active.element.style.removeProperty("--river-drag-x");
      active.element.style.removeProperty("--river-drag-y");
      delete active.element.dataset.dragging;
      if (active.element.hasPointerCapture(active.pointer)) active.element.releasePointerCapture(active.pointer);
    }
    for (const bin of riverBins) if (bins.current[bin]) delete bins.current[bin]!.dataset.over;
  }

  function binAt(x: number, y: number) {
    return riverBins.find(bin => {
      const rect = bins.current[bin]?.getBoundingClientRect();
      return rect && x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
    });
  }

  function sortItem(itemId: string, bin: RiverBin) {
    const item = riverItems.find(candidate => candidate.id === itemId);
    if (!item || state.sorted.includes(itemId)) return;
    dispatch({type: "sort", itemId, bin});
    if (item.bin === bin) {
      // Move focus off the removed item. The next litter item remains fully keyboard playable.
      const next = riverItems.find(candidate => candidate.id !== itemId && !state.sorted.includes(candidate.id));
      if (next) itemButtons.current[next.id]?.focus({preventScroll: true});
      else claimButton.current?.focus({preventScroll: true});
    }
  }

  function startDrag(event: PointerEvent<HTMLButtonElement>, itemId: string) {
    if (event.button !== 0 || drag.current || finished) return;
    dispatch({type: "pick", itemId});
    drag.current = {pointer: event.pointerId, itemId, x: event.clientX, y: event.clientY, moved: false, element: event.currentTarget};
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function moveDrag(event: PointerEvent<HTMLButtonElement>) {
    const active = drag.current;
    if (!active || active.pointer !== event.pointerId) return;
    const dx = event.clientX - active.x;
    const dy = event.clientY - active.y;
    if (Math.hypot(dx, dy) > 6) active.moved = true;
    if (!active.moved) return;
    // Pointer movement is transient DOM state, not a React render per pixel.
    active.element.dataset.dragging = "true";
    active.element.style.setProperty("--river-drag-x", `${dx}px`);
    active.element.style.setProperty("--river-drag-y", `${dy}px`);
    const over = binAt(event.clientX, event.clientY);
    for (const bin of riverBins) {
      const element = bins.current[bin];
      if (element) element.dataset.over = String(bin === over);
    }
  }

  function endDrag(event: PointerEvent<HTMLButtonElement>) {
    const active = drag.current;
    if (!active || active.pointer !== event.pointerId) return;
    const target = active.moved ? binAt(event.clientX, event.clientY) : undefined;
    if (active.moved) ignoreClick.current = {itemId: active.itemId, until: performance.now() + 500};
    clearDrag();
    if (target) sortItem(active.itemId, target);
    // A drop outside a bin leaves the item selected for the tap-to-sort alternative.
  }

  function keyboard(event: KeyboardEvent<HTMLElement>) {
    if (event.altKey || event.ctrlKey || event.metaKey || event.repeat || !state.selected) return;
    if (event.key === "Escape") {
      event.preventDefault(); event.stopPropagation(); clearDrag(); dispatch({type: "put-down"});
    } else if (["1", "2", "3"].includes(event.key)) {
      event.preventDefault(); sortItem(state.selected, riverBins[Number(event.key) - 1]);
    }
  }

  function collectStamp() {
    if (!finished || claimed || awarded.current) return;
    awarded.current = true;
    setClaimed(true);
    onComplete();
  }

  function restart() {
    clearDrag();
    setClaimed(earned || awarded.current);
    dispatch({type: "restart"});
  }

  return <section className="river-game" aria-label="River care sorting game" onKeyDown={keyboard} data-sorted={count} data-state={finished ? "complete" : "playing"}>
    <div className="river-game-heading">
      <div><span className="river-kicker">DIVA’S RIVER CARE CLUB</span><h3>Little hands. Happy river.</h3></div>
      <span className="river-counter"><Waves size={18}/><b>{count}<span> / {riverItems.length}</span></b></span>
    </div>
    <div className="river-progress-row"><span>{finished ? "A little better than we found it." : "Clean up the festival riverbank"}</span><span>{Math.round(count / riverItems.length * 100)}% clear</span></div>
    <progress className="river-progress" aria-label="River cleanup" max={riverItems.length} value={count}/>
    <p id={helpId} className="river-instructions">Pick up an item. Drag it to a bin, or tap the item and then its bin.</p>

    <div className="river-scene" role="group" aria-label="Riverbank litter" style={{"--river-murk": 1 - count / riverItems.length, "--river-life": count / riverItems.length} as CSSProperties}>
      <RiverBackdrop/>
      <span className="river-scene-label"><Waves size={13}/> YATAI RIVER <span lang="ja">川</span></span>
      <span className="river-no-timer">Take your time</span>
      {riverItems.filter(item => !state.sorted.includes(item.id)).map(item => <button
        key={item.id}
        ref={element => {itemButtons.current[item.id] = element;}}
        className="river-litter"
        style={{left: `${item.x}%`, top: `${item.y}%`} as CSSProperties}
        aria-label={`Pick up ${item.name.toLowerCase()}`}
        aria-pressed={state.selected === item.id}
        aria-describedby={helpId}
        data-item={item.id}
        onPointerDown={event => startDrag(event, item.id)}
        onPointerMove={moveDrag}
        onPointerUp={endDrag}
        onPointerCancel={event => {if (drag.current?.pointer === event.pointerId) clearDrag();}}
        onLostPointerCapture={event => {if (drag.current?.pointer === event.pointerId) clearDrag();}}
        onClick={event => {
          if (event.detail !== 0 && ignoreClick.current.itemId === item.id && performance.now() < ignoreClick.current.until) return;
          dispatch({type: "pick", itemId: item.id});
        }}
      ><LitterArt shape={item.shape}/><span>{item.name}</span>{state.selected === item.id && <i><Hand size={12}/></i>}</button>)}
      {finished && <div className="river-scene-win"><span><Check size={24}/></span><strong>The koi are back!</strong><small>You cleared all six items.</small></div>}
    </div>

    <div className="river-held"><Hand size={15} aria-hidden="true"/><span>{selectedItem ? <><b>{selectedItem.name}</b> · choose a bin</> : finished ? "Riverbank clear. Nicely done!" : count ? "Pick another item to keep going" : "Pick any item to begin"}</span>
      {selectedItem && <button type="button" aria-label="Put item down" onClick={() => {clearDrag(); dispatch({type: "put-down"});}}><X size={14}/></button>}
    </div>

    <div className="river-bins" role="group" aria-label="Sorting bins">
      {riverBins.map((bin, index) => {
        const detail = binDetails[bin];
        const Icon = detail.icon;
        const collected = riverItems.filter(item => item.bin === bin && state.sorted.includes(item.id));
        const binCapacity = riverItems.filter(item => item.bin === bin).length;
        return <button type="button" key={bin} className="river-bin" ref={element => {bins.current[bin] = element;}}
          style={{"--bin-color": detail.color, "--bin-ink": detail.ink} as CSSProperties}
          aria-label={`${bin} bin, ${collected.length} of ${binCapacity} items`}
          aria-disabled={!state.selected || finished}
          data-bin={bin}
          data-filled={collected.length === binCapacity}
          onClick={() => {if (state.selected) sortItem(state.selected, bin);}}
        >
          <span className="river-bin-lid"/>
          <span className="river-bin-body"><Icon size={26}/><span className="river-bin-slots" aria-hidden="true">{Array.from({length: binCapacity}, (_, slot) => <span key={slot}>{collected[slot] ? <LitterArt shape={collected[slot].shape}/> : <span/>}</span>)}</span></span>
          <strong><kbd aria-hidden="true">{index + 1}</kbd>{bin}</strong><small>{detail.clue}</small><span className="river-bin-count">{collected.length} / {binCapacity} sorted {collected.length === binCapacity && <Check size={11}/>}</span>
        </button>;
      })}
    </div>

    <div id={feedbackId} role="status" aria-live="polite" aria-atomic="true" className={`river-feedback ${state.feedback.kind}`}>
      <span className="river-feedback-icon" aria-hidden="true">{state.feedback.kind === "sorted" ? <Check size={18}/> : <Leaf size={18}/>}</span>
      <span>{riverFeedbackText(state)}</span>
    </div>

    {finished && <div className="river-results">
      <div><Stamp size={26}/><div><h4>{claimed || earned ? "River Guardian stamp earned" : "You’re a River Guardian!"}</h4><p>{riverFirstTryCount(state)} of {riverItems.length} sorted on the first try. Every try helped the river.</p></div></div>
      {claimed || earned ? <><p className="river-stamp-note">Your passport has one River Care stamp. Replays won’t add extra stamps or change your coins.</p><button className="button secondary" onClick={restart}><RotateCcw size={16}/> Play again</button></> : <button className="button primary" ref={claimButton} onClick={collectStamp}><Stamp size={17}/> Collect River Care stamp</button>}
    </div>}

    <div className="river-game-tools">
      <details><summary>Controls & a little hint</summary><p>Keyboard: Tab to an item and press Enter or Space to pick it up. Choose a bin with Tab and Enter, or press 1, 2, or 3. Escape puts an item down.</p><p>{selectedItem?.clue || feedbackItem?.clue || "Fruit scraps go in Compost; clean paper and card go in Paper; empty bottles and cans go in Containers."}</p></details>
      {!finished && <button onClick={restart} aria-label="Restart river cleanup"><RotateCcw size={13}/> Restart</button>}
    </div>
    <p className="river-safety">Pretend festival bins. Real recycling rules vary; ask an adult about local rules. Never pick up sharp or unknown litter.</p>
  </section>;
}
