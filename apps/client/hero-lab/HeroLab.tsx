import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, BookOpen, Check, Droplet, Flag, Leaf, Lightbulb, Lock, RotateCcw, Sparkles, Stamp, Star } from 'lucide-react';
import { useGame } from '../store';
import { CharacterPortrait } from '../World';
import { HeroArtifact, HeroUnit, heroUnits, heroPhases, heroCompleted, heroUnlocked, strengths, jobs, goalSteps, storySteps, observations, improvements, audiences, needs, offers, brandColors, brandColorNames, brandSymbols } from '../../../packages/hero-lab';
import './hero-lab.css';

const mentors = { oty: 'Oty · The True Self', prena: 'Prena · The Planner', lido: 'Lido · The Leader', diva: 'Diva · The Connector' };
function Pick({ label, options, value, onChange }: { label: string; options: readonly string[]; value: unknown; onChange: (n: number) => void }) {
  return <fieldset className="hl-pick"><legend>{label}</legend><div>{options.map((option, i) => <label key={option} className={value === i ? 'selected' : ''}><input type="radio" name={label} value={i} checked={value === i} onChange={() => onChange(i)} /><span>{option}</span></label>)}</div></fieldset>;
}
function TextField({ label, value, onChange, max = 120 }: { label: string; value: unknown; onChange: (v: string) => void; max?: number }) {
  return <label className="hl-field">{label}<input type="text" value={typeof value === 'string' ? value : ''} maxLength={max} onChange={e => onChange(e.target.value)} autoComplete="off" /><small>Fictional ideas only. No names, addresses or contact details.</small></label>;
}
function Activity({ unit, previous, disabled, onSubmit }: { unit: HeroUnit; previous?: HeroArtifact | null; disabled: boolean; onSubmit: (a: HeroArtifact) => void }) {
  const [draft, setDraft] = useState<HeroArtifact>(previous ?? (unit.id === 'money' ? { supplies: 6, sign: 0, reserve: 6 } : unit.id === 'brand' ? { color: 0, symbol: 0 } : {}));
  const [gray, setGray] = useState(false);
  const orderPool = useRef<HTMLDivElement>(null);
  const resetOrder = useRef<HTMLButtonElement>(null);
  const set = (key: string, value: string | number | number[]) => setDraft(d => ({ ...d, [key]: value }));
  const arr = (key: string) => Array.isArray(draft[key]) ? draft[key] as number[] : [];
  const pick = (key: string, label: string, options: string[]) => <Pick label={label} options={options} value={draft[key]} onChange={n => set(key, n)} />;
  const text = (key: string, label: string, max?: number) => <TextField label={label} value={draft[key]} onChange={v => set(key, v)} max={max} />;
  const toggle = (key: string, n: number) => set(key, arr(key).includes(n) ? arr(key).filter(v => v !== n) : [...arr(key), n]);
  const order = unit.id === 'story' ? storySteps : goalSteps;
  const cost = arr('choices').reduce((sum, n) => sum + improvements[n].cost, 0);
  const sign = Number(draft.sign || 0);
  const testResults = [3, 2, 3];
  const SignIcon = [Droplet, Leaf, Lightbulb, Star][Number(draft.symbol || 0)];
  return <form className="hl-activity" onSubmit={e => { e.preventDefault(); onSubmit(draft); }}>
    <h2>{unit.activity}</h2><p>{unit.brief}</p>
    <fieldset disabled={disabled} className="hl-form-content"><legend className="sr-only">Festival activity controls</legend>
      {unit.id === 'super-you' && <><fieldset className="hl-checks"><legend>Choose three strengths</legend>{strengths.map((s, i) => <label key={s}><input type="checkbox" checked={arr('strengths').includes(i)} onChange={() => toggle('strengths', i)} />{s}</label>)}</fieldset>{pick('job', 'Your festival job', jobs)}</>}
      {unit.id === 'power-house' && ['A sign falls down. Oty feels frustrated.', 'The queue grows. Lido feels overwhelmed.', 'Prena is nervous about sharing an idea.'].map((s, i) => <Pick key={s} label={s} options={['Pause and breathe', 'Ask for support', 'Take a short, safe break', 'Try a smaller step', 'Blame another visitor']} value={arr('responses')[i]} onChange={n => { const next = [0, 1, 3].map((v, j) => arr('responses')[j] ?? -1); next[i] = n; set('responses', next); }} />)}
      {(unit.id === 'future-board' || unit.id === 'story') && <>
        <div className="hl-order" aria-label="Your arranged lanterns" aria-live="polite"><ol>{arr('order').map((n, i) => <li key={n}><span>{i + 1}</span>{order[n]}</li>)}</ol>{arr('order').length === 0 && <p>Pick the first lantern below to start your trail.</p>}</div>
        <div className="hl-order-pool" ref={orderPool}>{[2, 0, 3, 1].filter(i => !arr('order').includes(i)).map(i => <button type="button" key={i} onClick={() => { set('order', [...arr('order'), i]); requestAnimationFrame(() => (orderPool.current?.querySelector<HTMLButtonElement>('button') ?? resetOrder.current)?.focus()); }}><Lightbulb size={18} />{order[i]}</button>)}</div>
        <button className="inline-link" type="button" ref={resetOrder} onClick={() => set('order', [])}><RotateCcw size={16} />Reset lantern order</button>
        {unit.id === 'future-board' && text('goal', 'Your fictional festival goal')}
      </>}
      {unit.id === 'entrepreneur' && <>{pick('audience', 'Who would you like to help?', audiences)}{pick('need', 'What do they need?', needs)}{pick('offer', 'What could you offer?', offers)}{typeof draft.offer === 'number' && <div className="hl-note"><Storefront /> <span>Your idea stall: <b>{offers[draft.offer]}</b></span></div>}</>}
      {unit.id === 'hero-senses' && observations.map((c, i) => <Pick key={c.text} label={c.text} options={['Observed', 'Needs checking']} value={arr('clues')[i]} onChange={n => { const next = observations.map((_, j) => arr('clues')[j] ?? -1); next[i] = n; set('clues', next); }} />)}
      {unit.id === 'solutions' && <><div className={'hl-token-meter ' + (cost > 4 ? 'over' : '')}><b>{4 - cost}</b><span>of 4 effort tokens remaining</span></div><fieldset className="hl-checks"><legend>Choose two improvements</legend>{improvements.map((p, i) => <label key={p.label}><input type="checkbox" checked={arr('choices').includes(i)} onChange={() => toggle('choices', i)} /><span>{p.label}<small>{p.cost} effort tokens</small></span></label>)}</fieldset></>}
      {unit.id === 'prototype' && <>
        <div className="hl-experiment"><b>First test: 2 of 4 visitors found the station.</b><p>A tiny fictional test, not a result from real visitors.</p></div>
        <Pick label="Change one feature" options={['Add a clear water symbol', 'Add decorative lanterns', 'Use a larger purpose label']} value={draft.change} onChange={n => setDraft(d => ({ ...d, change: n, tested: 0, evidence: -1 }))} />
        <Pick label="Make a prediction" options={['More visitors will find it', 'The same number will find it', 'Fewer visitors will find it']} value={draft.prediction} onChange={n => setDraft(d => ({ ...d, prediction: n, tested: 0, evidence: -1 }))} />
        <button type="button" className="button secondary" disabled={draft.change === undefined || draft.prediction === undefined} onClick={() => set('tested', 1)}>Run fictional test</button>
        {draft.tested === 1 && <div className="hl-test-result" role="status"><b>Second test: {testResults[Number(draft.change)]} of 4 visitors found the station.</b><p>Your prediction is a starting idea, not a score. {Number(draft.change) === 1 ? 'Decorations did not improve this group’s result. A clearer symbol or label is worth testing next.' : 'This group’s result improved by one visitor. Try again with other visitors before drawing a bigger conclusion.'}</p>{pick('evidence', 'What does this tell us?', ['This proves what every visitor will do', 'It suggests a result for this small group; we should test again', 'Feedback tells us nothing'])}</div>}
      </>}
      {unit.id === 'brand' && <>
        <div className={'hl-brand-preview ' + (gray ? 'grayscale' : '')} style={{ background: brandColors[Number(draft.color || 0)] }} aria-label="Live festival sign preview"><span aria-hidden="true"><SignIcon size={42} /></span><b>{draft.name || 'Your idea goes here'}</b><p>{draft.purpose || 'Add a clear purpose label'}</p></div>
        {text('name', 'Fictional brand name', 32)}{text('purpose', 'Clear purpose label', 60)}{pick('symbol', 'Choose a symbol', brandSymbols)}{pick('color', 'Choose a LEAD colour', brandColorNames)}
        <label className="hl-gray"><input type="checkbox" checked={gray} onChange={e => setGray(e.target.checked)} />Check the sign without colour</label>
      </>}
      {unit.id === 'money' && <>
        <div className="hl-token-meter"><b>{12 - Number(draft.supplies) - sign - Number(draft.reserve)}</b><span>pretend coins left to allocate</span></div>
        <div className="hl-budget">{[['supplies', 'Supplies'], ['sign', 'Sign'], ['reserve', 'Reserve']].map(([key, label]) => <label key={key}>{label}<input type="number" min={0} max={12} step={1} value={Number(draft[key] || 0)} onChange={e => set(key, Number(e.target.value))} /></label>)}</div>
        <div className="hl-note"><span>Market day: three customers each pay 4 coins. Revenue is <b>12</b>, supplies cost <b>6</b>, and your sign costs <b>{sign}</b>. Your untouched reserve is separate.</span></div>
        <label className="hl-field">Profit after supplies and sign<input type="number" min={-12} max={12} step={1} value={draft.profit === undefined ? '' : Number(draft.profit)} onChange={e => set('profit', Number(e.target.value))} /></label>
      </>}
      {unit.id === 'pitch' && <>{text('need', 'What do visitors need?')}{text('idea', 'What is your idea?')}{text('ask', 'What next step will you ask for?')}<div className="hl-pitch-preview"><b>Your rehearsal card</b><p>{draft.need || 'The need…'}</p><p>{draft.idea || 'My idea…'}</p><p>{draft.ask || 'My next-step request…'}</p></div>{pick('response', 'A listener asks: How will you know it helps?', ['Try a small test and listen to feedback', 'Promise it will be perfect for everyone', 'Ignore the question'])}</>}
      {unit.id === 'make-real' && <>{text('goal', 'Project goal')}<div className="hl-project-steps">{text('first', 'First step')}{text('next', 'Next step')}{text('last', 'Last step')}</div>{text('materials', 'Materials already available')}{pick('helper', 'Who could help with a safe trial?', ['A trusted adult, with permission', 'A willing teammate in a supervised activity', 'I can sketch it privately first'])}{pick('review', 'Your review question', ['What helped visitors?', 'What would I change next?', 'Whose ideas should I listen to?'])}<p className="hl-note">This is a fictional project plan. Check permission before trying anything in real life.</p></>}
    </fieldset>
    <button className="button primary" disabled={disabled} type="submit">{disabled ? 'Checking…' : 'Check my activity'}<ArrowRight size={18} /></button>
  </form>;
}
const Storefront = () => <Flag size={24} aria-hidden="true" />;

const memoryCards = [
  { pair: 0, text: 'Lido', hint: 'Character' }, { pair: 2, text: 'The True Self', hint: 'Role' },
  { pair: 1, text: 'Prena', hint: 'Character' }, { pair: 3, text: 'The Connector', hint: 'Role' },
  { pair: 2, text: 'Oty', hint: 'Character' }, { pair: 0, text: 'The Leader', hint: 'Role' },
  { pair: 3, text: 'Diva', hint: 'Character' }, { pair: 1, text: 'The Planner', hint: 'Role' },
];
function BonusActivities() {
  const [open, setOpen] = useState(false), [flipped, setFlipped] = useState<number[]>([]), [matched, setMatched] = useState<number[]>([]), [challenge, setChallenge] = useState(-1);
  const tasks = ['Invent a new use for a paper lantern.', 'Find one observation and one guess in a fictional festival story.', 'Describe a kind way to welcome a new teammate.', 'Plan one small step for an idea using only paper.', 'Explain revenue and profit using pretend coins.'];
  const match = flipped.length === 2 && memoryCards[flipped[0]].pair === memoryCards[flipped[1]].pair;
  function flip(i: number) {
    if (flipped.length === 2 || flipped.includes(i) || matched.includes(memoryCards[i].pair)) return;
    const next = [...flipped, i]; setFlipped(next);
    if (next.length === 2 && memoryCards[next[0]].pair === memoryCards[i].pair) setMatched(m => [...m, memoryCards[i].pair]);
  }
  return <section className="hl-bonus"><div className="hl-section-head"><div><span className="eyebrow">A LITTLE EXTRA CURIOSITY</span><h2>Take a playful detour.</h2></div><button className="button secondary" onClick={() => setOpen(v => !v)} aria-expanded={open} aria-controls="hl-bonus-body">{open ? 'Close bonus activities' : 'Open bonus activities'}<Sparkles size={18} /></button></div>
    {open && <div id="hl-bonus-body" className="hl-bonus-grid"><section><h3>My Hero Connections</h3><p>Match each character with their role. No timer, no lost lives.</p><div className="hl-memory">{memoryCards.map((c, i) => { const visible = flipped.includes(i) || matched.includes(c.pair); return <button key={i} onClick={() => flip(i)} aria-label={visible ? `${c.text}, ${c.hint}` : `Reveal card ${i + 1}`} disabled={matched.includes(c.pair) || (flipped.length === 2 && !flipped.includes(i))}><small>{visible ? c.hint : 'LEAD'}</small><b>{visible ? c.text : '?'}</b></button>; })}</div><p role="status">{matched.length === 4 ? 'All four connections found. You know your team!' : flipped.length === 2 ? match ? 'A connection! Ready for the next pair?' : 'Not a match yet. Remember the cards and try again.' : `${matched.length} of 4 connections found.`}</p>{flipped.length === 2 && matched.length < 4 && <button className="button secondary" onClick={() => setFlipped([])}>Try another pair</button>}{matched.length === 4 && <button className="button secondary" onClick={() => { setMatched([]); setFlipped([]); }}>Play memory again</button>}</section>
      <section className="hl-wheel"><Sparkles size={38} /><h3>Spin My Challenge Wheel</h3><p>Try an untimed imagination prompt. These optional activities stay on this page and do not award stamps or coins.</p><button className="button primary" onClick={() => setChallenge(n => (n + 1 + Math.floor(Math.random() * (tasks.length - 1))) % tasks.length)}>Spin a challenge</button><div role="status">{challenge >= 0 && <p className="hl-note">{tasks[challenge]}</p>}</div></section></div>}
  </section>;
}

export default function HeroLab() {
  const { player, practice, send, busy, error, feedback, setPage } = useGame();
  const [selected, setSelected] = useState<number | null>(null);
  const [review, setReview] = useState(false);
  const [answer, setAnswer] = useState(-1);
  const heading = useRef<HTMLHeadingElement>(null);
  const progress = player?.heroLab, count = heroCompleted(progress);
  const unit = selected === null ? null : heroUnits[selected];
  const entry = unit ? progress?.units[unit.id] : undefined;
  const stage = entry?.reflection != null ? 'complete' : entry?.artifact ? 'reflection' : entry?.lesson ? 'activity' : 'lesson';
  useEffect(() => { setAnswer(-1); heading.current?.focus({ preventScroll: true }); }, [selected, stage]);
  if (!player || player.role !== 'student') return null;
  const choose = (i: number | null) => { setSelected(i); setReview(false); useGame.setState({ error: '', feedback: null }); };
  const command = (data: Record<string, unknown>) => send('hero-lab', { unitId: unit!.id, ...data });
  return <section className="hl-page">
    {!unit ? <>
      <header className="hl-hero"><div><span className="eyebrow">THE HERO LAB · YOUR L.E.A.D. JOURNEY</span><h1 ref={heading} tabIndex={-1}>Little ideas.<br /><em>Wonderful possibilities.</em></h1><p>Follow twelve learning trails through our Japan-inspired festival. Discover your strengths, make something useful and bring your ideas to life.</p><button className="button primary" onClick={() => choose(Math.min(count, 11))}>{count === 12 ? 'Revisit your final project' : count ? 'Continue my learning trail' : 'Begin my learning trail'}<ArrowRight size={18} /></button><div className="hl-hero-meta"><span><BookOpen size={16} />12 short lessons</span><span><Flag size={16} />12 hands-on activities</span><span><HeartIcon />At your own pace</span></div></div><div className="hl-mentor"><CharacterPortrait name="oty" animation="Wave" /><span>Oty and the L.E.A.D. team</span></div></header>
      <div className="hl-progress"><div><Stamp size={26} /><span><b>{count} / 12 stamps</b><small>Learn · Try · Reflect</small></span></div><progress value={count} max={12} aria-label="Hero Lab units completed" /><p>{count === 12 ? 'Your first Hero Lab journey is complete. Keep your curiosity growing.' : 'One small step unlocks the next. No timers or penalties.'}</p></div>
      <p className="hl-source">Original lessons and activities inspired by the supplied L.E.A.D. guidebook topics and welcome pages. {practice ? 'Practice progress is not saved.' : 'Completed steps use your Firebase student profile. Linked parents and authorised admins can see your learning work.'}</p>
      {heroPhases.map((phase, p) => <section className={'hl-phase hl-phase-' + p} key={phase}><div className="hl-section-head"><div><span className="eyebrow">PHASE 0{p + 1} · UNITS {p * 4 + 1}–{p * 4 + 4}</span><h2>{phase}</h2></div><span className="hl-phase-total">{heroUnits.slice(p * 4, p * 4 + 4).filter(u => progress?.units[u.id]?.reflection != null).length} / 4 stamps</span></div><div className="hl-unit-grid">{heroUnits.slice(p * 4, p * 4 + 4).map((u, j) => { const i = p * 4 + j, done = progress?.units[u.id]?.reflection != null, unlocked = heroUnlocked(progress, i); return <button className={'hl-unit ' + (done ? 'done' : '')} key={u.id} disabled={!unlocked} onClick={() => choose(i)}><span className="hl-unit-top"><b>{String(i + 1).padStart(2, '0')}</b>{done ? <Check size={20} /> : unlocked ? <ArrowRight size={20} /> : <Lock size={18} />}</span><small>{u.station}</small><h3>{u.title}</h3><p>{u.activity}</p><span className="hl-unit-status">{done ? 'Stamped · Revisit' : unlocked ? progress?.units[u.id] ? 'Continue your unit' : 'Ready to explore' : `Complete unit ${i} to unlock`}</span></button>; })}</div></section>)}
      <BonusActivities />
    </> : <>
      <button className="inline-link hl-back" onClick={() => choose(null)} disabled={busy}><ArrowLeft size={17} />Back to my passport</button>
      <header className="hl-unit-heading"><div><span className="eyebrow">UNIT {String(selected! + 1).padStart(2, '0')} · {unit.station}</span><h1 ref={heading} tabIndex={-1}>{unit.title}</h1><p>{mentors[unit.mentor]}</p></div><span className="hl-unit-seal">{entry?.reflection != null ? <Check size={30} /> : <Stamp size={30} />}</span></header>
      <ol className="hl-steps" aria-label="Unit progress">{['lesson', 'activity', 'reflection'].map((s, i) => <li key={s} aria-current={stage === s ? 'step' : undefined}><span>{i + 1}</span>{['Learn', 'Try it', 'Reflect'][i]}{(i === 0 ? entry?.lesson : i === 1 ? entry?.artifact : entry?.reflection != null) && <Check size={16} />}</li>)}</ol>
      <div className="hl-feedback" aria-live="polite">{error ? <p role="alert" className="hl-error">{error}</p> : feedback && <p className={feedback.correct ? 'hl-success' : 'hl-hint'}>{feedback.text}</p>}</div>
      <div className="hl-workspace"><article className="hl-work-card">
        {(stage === 'lesson' || review) && <><h2>A small idea to take with you.</h2>{unit.lesson.map(p => <p key={p}>{p}</p>)}{review ? <><div className="hl-note">{unit.explain}</div><button className="button secondary" onClick={() => setReview(false)}>Back to my completed unit</button></> : <form onSubmit={e => { e.preventDefault(); void command({ action: 'lesson', answer }); }}><Pick label={unit.question} options={unit.options} value={answer} onChange={setAnswer} /><button className="button primary" disabled={busy || answer < 0}>Check my understanding<ArrowRight size={18} /></button></form>}</>}
        {stage === 'activity' && !review && <Activity key={unit.id} unit={unit} previous={entry?.artifact} disabled={busy} onSubmit={artifact => void command({ action: 'activity', artifact })} />}
        {stage === 'reflection' && !review && <><h2>Pause. Notice. Grow.</h2><p>There is no single best reflection. Choose a next step that feels useful. Your stamp recognises completing the journey, not a personality score.</p><form onSubmit={e => { e.preventDefault(); void command({ action: 'reflection', choice: answer }); }}><Pick label={unit.reflection} options={unit.reflections} value={answer} onChange={setAnswer} /><button className="button primary" disabled={busy || answer < 0}>Add my passport stamp<Stamp size={18} /></button></form></>}
        {stage === 'complete' && !review && <div className="hl-complete"><span className="hl-big-stamp"><Check size={40} /></span><span className="eyebrow">A LITTLE TRY. A REAL STEP FORWARD.</span><h2>{count === 12 && selected === 11 ? 'Your Hero Lab passport is complete!' : 'A new stamp. A new possibility.'}</h2><p>You learned, tried an activity and reflected. Your next step: <b>{unit.reflections[entry!.reflection!]}</b>.</p>{entry?.artifact && <details><summary>See my activity keepsake</summary><ArtifactSummary unit={unit} artifact={entry.artifact} /></details>}<div className="hl-complete-actions">{selected! < 11 ? <button className="button primary" onClick={() => choose(selected! + 1)}>Continue to unit {selected! + 2}<ArrowRight size={18} /></button> : <button className="button primary" onClick={() => choose(null)}>See my complete passport<Stamp size={18} /></button>}<button className="button secondary" onClick={() => setReview(true)}>Revisit lesson</button></div></div>}
      </article><aside className="hl-mentor-card"><div className="hl-portrait"><CharacterPortrait name={unit.mentor} animation="Wave" /></div><b>{mentors[unit.mentor]}</b><p>Try, learn and go again. You do not need to get everything right the first time.</p><div className="hl-home"><span className="eyebrow">OPTIONAL · AWAY FROM THE SCREEN</span><p>{unit.home}</p></div><small>{practice ? 'This is practice. Steps are kept only until you leave or reload.' : 'Only successful submissions are confirmed here. If saving fails, your activity stays open so you can retry.'}</small></aside></div>
    </>}
    <footer className="hl-footer"><span>Stamps celebrate learning. They never add money to your game wallet.</span><button className="inline-link" onClick={() => setPage('learn')} disabled={busy}>Visit Finance Foundations<ArrowRight size={16} /></button></footer>
  </section>;
}
const HeartIcon = () => <Sparkles size={16} aria-hidden="true" />;
function ArtifactSummary({ unit, artifact: a }: { unit: HeroUnit; artifact: HeroArtifact }) {
  const list = (key: string) => a[key] as number[];
  const strings: string[] = unit.id === 'super-you' ? [...list('strengths').map(i => strengths[i]), jobs[Number(a.job)]]
    : unit.id === 'power-house' ? list('responses').map((n, i) => `Scene ${i + 1}: ${['Pause and breathe', 'Ask for support', 'Take a break', 'Try a smaller step'][n]}`)
    : unit.id === 'entrepreneur' ? [audiences[Number(a.audience)], needs[Number(a.need)], offers[Number(a.offer)]]
    : unit.id === 'hero-senses' ? observations.map((o, i) => `${o.text} — ${list('clues')[i] === 0 ? 'Observed' : 'Needs checking'}`)
    : unit.id === 'solutions' ? list('choices').map(i => improvements[i].label)
    : unit.id === 'story' || unit.id === 'future-board' ? [...(a.goal ? [String(a.goal)] : []), ...list('order').map(i => (unit.id === 'story' ? storySteps : goalSteps)[i])]
    : unit.id === 'money' ? [`Supplies: ${a.supplies}; sign: ${a.sign}; reserve: ${a.reserve}`, `Profit after supplies and sign: ${a.profit}`]
    : unit.id === 'prototype' ? [`Change: ${['Add a clear water symbol', 'Add decorative lanterns', 'Use a larger purpose label'][Number(a.change)]}`, `Prediction: ${['More visitors will find it', 'The same number will find it', 'Fewer visitors will find it'][Number(a.prediction)]}`, `Fictional result: ${[3, 2, 3][Number(a.change)]} of 4 visitors found the station, compared with 2 of 4 before.`, 'This suggests a result for a small group, not proof about everyone.']
    : unit.id === 'brand' ? [String(a.name), String(a.purpose), brandSymbols[Number(a.symbol)], brandColorNames[Number(a.color)]]
    : unit.id === 'make-real' ? [`Goal: ${a.goal}`, `First: ${a.first}`, `Next: ${a.next}`, `Last: ${a.last}`, `Materials: ${a.materials}`, `Support: ${['A trusted adult, with permission', 'A willing teammate in a supervised activity', 'Sketch privately first'][Number(a.helper)]}`, `Review: ${['What helped visitors?', 'What would I change next?', 'Whose ideas should I listen to?'][Number(a.review)]}`]
    : Object.entries(a).filter(([, v]) => typeof v === 'string').map(([k, v]) => `${k}: ${v}`);
  return <ul className="hl-keepsake">{strings.map((s, i) => <li key={i}>{s}</li>)}</ul>;
}
