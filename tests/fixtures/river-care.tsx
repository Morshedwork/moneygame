import {StrictMode, useEffect, useRef, useState} from "react";
import {createRoot} from "react-dom/client";
import {ActivityPanel} from "../../apps/client/village/ActivityPanel";
import {activities} from "../../apps/client/village/content";
import "../../apps/client/game.css";
import "../../apps/client/lead-theme.css";
import "../../apps/client/village/village.css";

// A development-only fixture exercises the production ActivityPanel in a native modal.
function Harness() {
  const [earned, setEarned] = useState(new URLSearchParams(location.search).has("earned"));
  const [awards, setAwards] = useState(0);
  const [open, setOpen] = useState(true);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {const element = dialog.current; if (open) element?.showModal(); return () => element?.close();}, [open]);
  return <main className="v-expansion">
    <button onClick={() => setOpen(true)}>Open River Care</button>
    <output aria-label="Stamps awarded">{awards}</output>
    {open && <dialog ref={dialog} className="v-modal" aria-label="River Care Club" onCancel={event => {event.preventDefault(); setOpen(false);}}>
      <div className="v-modal-inner"><header><div><span className="eyebrow">SAKURA GARDENS</span><h2>River Care Club</h2></div><button className="icon-button" aria-label="Close activity" onClick={() => setOpen(false)}>×</button></header>
        <ActivityPanel activity={activities.river} earned={earned} onComplete={() => {setEarned(true); setAwards(value => value + 1);}}/>
        <footer><button className="inline-link" onClick={() => setOpen(false)}>Keep exploring</button></footer>
      </div>
    </dialog>}
  </main>;
}
createRoot(document.getElementById("root")!).render(<StrictMode><Harness/></StrictMode>);
