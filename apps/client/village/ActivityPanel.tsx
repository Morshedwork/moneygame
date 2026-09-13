import {useState} from "react";
import {ArrowRight, Check, RotateCcw, Stamp, Utensils, Wallet} from "lucide-react";
import {Activity, bentoOrders, checkBudget, ingredients, matchesOrder} from "./content";
import {RiverCareGame} from "./RiverCareGame";

export function ActivityPanel({activity: a, earned, onComplete}: {activity: Activity; earned: boolean; onComplete: () => void}) {
  if (a.kind === "sort") return <RiverCareGame earned={earned} onComplete={onComplete}/>;
  return <StepActivityPanel activity={a} earned={earned} onComplete={onComplete}/>;
}

function StepActivityPanel({activity: a, earned, onComplete}: {activity: Activity; earned: boolean; onComplete: () => void}) {
  const [step, setStep] = useState(0);
  const [selection, setSelection] = useState<string[]>([]);
  const [budget, setBudget] = useState([0,0,0]);
  const [feedback, setFeedback] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [finished, setFinished] = useState(false);
  const [wasEarned, setWasEarned] = useState(earned);
  const count = a.kind === "quiz" ? a.questions!.length : a.kind === "bento" ? bentoOrders.length : a.kind === "sequence" ? a.sequence!.length : 1;
  function finish() { setFinished(true); onComplete(); }
  function advance() {
    if (step + 1 >= count) finish();
    else { setStep(v => v+1); setAccepted(false); setSelection([]); setFeedback(""); }
  }
  function respond(correct: boolean, why: string) {
    if (accepted || finished) return;
    setFeedback(correct ? why : "Not quite yet. " + a.hint);
    setAccepted(correct);
  }
  function reset() { setStep(0); setSelection([]); setBudget([0,0,0]); setFeedback(""); setAccepted(false); setFinished(false); setWasEarned(true); }
  if (finished) return <section className="v-activity-success">
    <Stamp size={42} aria-hidden="true"/><span className="eyebrow">A LITTLE SKILL. A BIG STEP.</span>
    <h3>{wasEarned ? "Beautifully practised!" : "Your passport has a new stamp!"}</h3>
    <p>You completed {a.title.toLowerCase()} and practised {a.skill.toLowerCase()}.</p>
    <p className="v-small">One stamp per activity. Replays are just for fun—your money-game balance stays unchanged.</p>
    <button className="button secondary" onClick={reset}><RotateCcw size={16}/> Play again</button>
  </section>;
  return <section className="v-activity">
    <div className="v-activity-heading"><span>{a.skill} · {a.minutes}</span><span>{step+1} / {count}</span></div>
    <progress max={count} value={step} aria-label="Activity steps completed"/>
    <h3>{a.title}</h3><p>{a.description}</p>

    {a.kind === "quiz" && <>
      <h4>{a.questions![step].prompt}</h4>
      <div className="v-choice-stack">{a.questions![step].options.map((option, i) => <button key={option} disabled={accepted} className="v-choice" onClick={() => respond(i === a.questions![step].answer, a.questions![step].why)}><span>{String.fromCharCode(65+i)}</span>{option}</button>)}</div>
    </>}

    {a.kind === "bento" && <>
      <div className="v-order"><Utensils size={24}/><div><b>{bentoOrders[step].name}’s order</b><p>{bentoOrders[step].order.join(" + ")}</p></div></div>
      <p className="v-small">Your box: {selection.length ? selection.join(" · ") : "Choose three items below"}</p>
      <div className="v-choice-grid">{ingredients.map(item => <button key={item} aria-pressed={selection.includes(item)} disabled={accepted} className="v-choice" onClick={() => setSelection(s => s.includes(item) ? s.filter(v => v!==item) : s.length < 3 ? [...s,item] : s)}>{selection.includes(item) && <Check size={16}/>} {item}</button>)}</div>
      <button className="button primary" disabled={selection.length !== 3 || accepted} onClick={() => respond(matchesOrder(selection,bentoOrders[step].order), "Order complete! Careful listening makes a happy customer.")}>Serve this bento <ArrowRight size={16}/></button>
    </>}

    {a.kind === "budget" && <>
      <div className="v-order"><Wallet size={25}/><div><b>12 pretend festival tokens</b><p>{12-budget.reduce((x,y)=>x+y,0)} left to plan</p></div></div>
      {[["Lunch", "At least 5"],["Save", "At least 3"],["Share", "At least 2"]].map(([label,hint],i) => <label className="v-budget" key={label}><span><b>{label}</b><small>{hint}</small></span><input aria-label={`${label} tokens`} type="range" min="0" max="12" value={budget[i]} disabled={accepted} onChange={e => { const value=Number(e.target.value); setBudget(b => b.map((v,j)=>i===j?value:v)); }}/><output>{budget[i]}</output></label>)}
      <button className="button primary" disabled={accepted} onClick={() => respond(checkBudget(budget), "You covered today, protected tomorrow, and helped your community. That is a thoughtful plan.")}>Check my plan</button>
    </>}

    {a.kind === "sequence" && <>
      <div className="v-pattern" aria-label="Target pattern">{a.sequence!.map((item,i) => <span key={i} className={i<step || (i===step && accepted) ? "done" : i===step ? "current" : ""}>{i+1}. {item}{i<step && <Check size={13}/>}</span>)}</div>
      <h4>Choose step {step+1}</h4>
      <div className="v-choice-grid">{a.choices!.map(item => <button className="v-choice" key={item} disabled={accepted} onClick={() => respond(item===a.sequence![step], "That is the next step. Nice focus!")}>{item}</button>)}</div>
      <p className="v-small">No timer, no pressure. The pattern stays here to help you.</p>
    </>}

    <div className={`v-feedback ${accepted ? "correct" : ""}`} role="status" aria-live="polite">{feedback}</div>
    {accepted && <button className="button primary" onClick={advance}>{step+1 === count ? "Collect my stamp" : "Next step"}<ArrowRight size={16}/></button>}
    <details className="v-hint"><summary>Need a little hint?</summary><p>{a.hint}</p></details>
  </section>;
}
