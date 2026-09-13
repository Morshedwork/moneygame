import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Check, ChevronDown, Coins, Dices, HelpCircle, Landmark, Leaf, Megaphone, PackageCheck, ReceiptText, Sparkles, Store, X } from 'lucide-react';
import { boardNames } from '../../../packages/curriculum';
import { balances, cardChoices, cardGuidance, clampCoins, coinLimit, eventKey, previewChoice, shouldPresentCard, turnImpact, type Balance, type CardGame } from './card-model';
import './event-card.css';

function EventIcon({ place }: { place: string }) {
  const Icon = place === 'Bank' ? Landmark : place === 'Advertising' ? Megaphone : place === 'Returns' ? PackageCheck : place === 'Festival Plaza' ? Leaf : place === 'Omikuji' || place === 'Market Change' ? Sparkles : Store;
  return <Icon size={29} aria-hidden="true" />;
}

function MoneyPreview({ before, after, caption }: { before?: Balance; after: Balance; caption: string }) {
  const items = [['Wallet', before?.wallet, after.wallet], ['Savings', before?.savings, after.savings], ['Total coins', before && before.wallet + before.savings, after.wallet + after.savings]] as const;
  return <section className="event-money" aria-label={caption}>
    <p className="event-section-label">{caption}</p>
    <div className="event-money-grid">{items.map(([label, old, current]) => <div key={label}><span>{label}</span>
      <strong aria-label={old !== undefined && old !== current ? `${old} before, ${current} after` : `${current} coins`}>{old !== undefined && old !== current && <><del>{old}</del><ArrowRight size={15} aria-hidden="true" /></>}{current}</strong>
    </div>)}</div>
    {(after.liability > 0 || (before?.liability || 0) > 0) && <p className="event-debt">Recovery advance owed: {before && before.liability !== after.liability ? `${before.liability} → ` : ''}{after.liability} coins. This is debt, not income.</p>}
  </section>;
}

function Comprehension({ game }: { game: CardGame }) {
  const guide = cardGuidance(game);
  const [answer, setAnswer] = useState<number | null>(null);
  return <details className="event-help"><summary><HelpCircle size={18} />Why does this matter?<ChevronDown size={16} /></summary>
    <p>{guide.why}</p><fieldset><legend>Try a quick check: {guide.question}</legend><div>{guide.answers.map((text, i) => <button type="button" key={text} aria-pressed={answer === i} onClick={() => setAnswer(i)}>{text}{answer === i && i === guide.correct && <Check size={16} />}</button>)}</div></fieldset>
    {answer !== null && <p className="event-check-feedback" role="status">{answer === guide.correct ? 'Exactly! ' : 'Have another look. '}{guide.feedback} No coins are at stake in this check.</p>}
  </details>;
}

function DecisionBody({ game, disabled, onConfirm }: { game: CardGame; disabled: boolean; onConfirm: (data: Record<string, unknown>) => Promise<boolean> }) {
  const choices = cardChoices(game);
  const [choice, setChoice] = useState(choices[0]?.value || 'continue');
  const [amount, setAmount] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const limit = coinLimit(game), n = clampCoins(amount, limit);
  const preview = previewChoice(game, choice, n);
  const blocked = disabled || submitting;
  async function confirm() {
    if (blocked || submittingRef.current || !preview.allowed) return;
    submittingRef.current = true; setSubmitting(true);
    try { await onConfirm(preview.command); }
    finally { submittingRef.current = false; setSubmitting(false); }
  }
  return <>
    {(game.pending === 'bank' || game.pending === 'festival') && <fieldset className="event-amount" disabled={blocked}>
      <legend>{game.pending === 'bank' ? 'How many coins would you like to save?' : 'How many coins would you like to contribute?'}</legend>
      <div className="event-coin-options" role="group" aria-label="Choose coin amount">{Array.from({ length: limit + 1 }, (_, i) => <button type="button" key={i} aria-pressed={n === i} onClick={() => setAmount(i)}><Coins size={17} />{i}</button>)}</div>
      <label htmlFor="event-amount">Choose coins <output>{n} of {limit} available</output></label>
      <input id="event-amount" type="range" min={0} max={limit} step={1} value={n} onChange={e => setAmount(Number(e.target.value))} disabled={blocked || limit === 0} />
      <p>{limit === 0 ? 'Your wallet is empty. Choose 0 to continue; your savings are not spent.' : 'Try different amounts. Nothing moves until you confirm.'}</p>
    </fieldset>}
    {choices.length > 0 && <fieldset className="event-options" disabled={blocked}><legend>Choose an option to preview</legend>{choices.map(option => <label className={choice === option.value ? 'is-selected' : ''} key={option.value}>
      <input type="radio" name="event-choice" value={option.value} checked={choice === option.value} disabled={blocked || option.disabled} onChange={() => setChoice(option.value)} />
      <span><b>{option.title}</b><small>{option.detail}</small></span>
    </label>)}</fieldset>}
    <div className="event-live-preview" aria-live="polite" aria-atomic="true">
      <MoneyPreview before={balances(game)} after={preview.after} caption={game.pending === 'big-sale' ? 'Your coins before customers arrive' : preview.uncertain ? 'Preview · replacement cost before its roll' : 'Preview · if you confirm this choice'} />
      <p className="event-preview-note">{preview.note}</p>
      {game.pending !== 'big-sale' && <span className="event-profit-note">{preview.uncertain ? 'Profit change before a possible refund' : 'Profit change'}: {preview.profitDelta > 0 ? '+' : ''}{preview.profitDelta} coins</span>}
    </div>
    <Comprehension game={game} />
    <button className="event-primary" type="button" disabled={blocked || !preview.allowed} onClick={confirm}>{submitting ? 'Confirming your choice…' : preview.confirm}<ArrowRight size={19} /></button>
    <p className="event-footnote">Preview first. Confirm when you are ready.</p>
  </>;
}

function ResultBody({ game, before, onClose }: { game: CardGame; before?: Balance; onClose: () => void }) {
  const result = game.outcome;
  const impact = turnImpact(game);
  const previous = before || { wallet: game.wallet - impact.wallet, savings: game.savings - impact.savings, liability: game.liability - impact.liability };
  return <>
    <div className="event-result-status"><Check size={18} />Event resolved · these are your current coins</div>
    <MoneyPreview before={previous} after={balances(game)} caption="What changed in this event" />
    {result?.sales === undefined && <p className="event-profit-note">Profit change this turn: {impact.profit > 0 ? '+' : ''}{impact.profit} coins. Savings transfers, gifts, and recovery advances are not sales profit.</p>}
    {result?.sales !== undefined && <section className="event-sale-result"><p className="event-section-label">{result.sales} bento{result.sales === 1 ? '' : 's'} sold</p>
      <div><span>Revenue<strong>{result.revenue ?? 0}</strong></span><i>−</i><span>Cost<strong>{result.cost ?? 0}</strong></span><i>=</i><span>Profit<strong>{result.profit ?? 0}</strong></span></div>
      <p>Customer budgets this visit</p><div className="event-budgets">{result.budgets?.map((budget, i) => <span key={i}>{budget} coins</span>)}</div>
    </section>}
    {game.effects.length > 0 && <section className="event-effects"><p className="event-section-label">Waiting for your next sales opportunity</p>{game.effects.map(effect => <div key={effect.id}><Sparkles size={16} /><span><b>{effect.name}</b><small>{[
      effect.cost && `${effect.cost > 0 ? '+' : ''}${effect.cost} cost per sold bento`, effect.budget && `${effect.budget > 0 ? '+' : ''}${effect.budget} to each customer budget`, effect.visitors && `+${effect.visitors} visitors`,
    ].filter(Boolean).join(' · ')} · used once</small></span></div>)}</section>}
    <Comprehension game={game} />
    <button className="event-primary" type="button" onClick={onClose}>Got it · back to the board<ArrowRight size={19} /></button>
  </>;
}

/** Owns presentation only. The existing server/practice commands remain authoritative. */
export function BoardEventCards({ game, motion, disabled, myTurn, reduced, error, onDecision, onRoll }: {
  game: CardGame; motion: boolean; disabled: boolean; myTurn: boolean; reduced: boolean; error: string;
  onDecision: (data: Record<string, unknown>) => Promise<boolean>; onRoll: () => Promise<boolean>;
}) {
  const [open, setOpen] = useState(false);
  const [before, setBefore] = useState<{ balance: Balance; turn: number }>();
  const dialog = useRef<HTMLDialogElement>(null), title = useRef<HTMLHeadingElement>(null), opener = useRef<HTMLButtonElement>(null);
  const shown = useRef('');
  const key = eventKey(game), place = boardNames[game.position] || 'Yatai Village', guide = cardGuidance(game);
  const ready = !motion && game.phase === 'board';
  useEffect(() => {
    if (shouldPresentCard(game, motion, myTurn, shown.current)) { shown.current = key; setOpen(true); }
  }, [game, motion, myTurn, key]);
  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (open && ready && !element.open) { element.showModal(); title.current?.focus(); }
    else if ((!open || !ready) && element.open) element.close();
  }, [open, ready]);
  useEffect(() => { if (open && ready) title.current?.focus(); }, [key, open, ready]);
  async function decide(data: Record<string, unknown>) {
    setBefore({ balance: balances(game), turn: game.turn });
    return onDecision(data);
  }
  async function roll() {
    if (disabled) return;
    setBefore({ balance: balances(game), turn: game.turn + 1 });
    await onRoll();
  }
  function close() { setOpen(false); opener.current?.focus(); }
  return <div className="board-event-controller">
    <span className="event-rail-label">{motion ? 'ON THE WAY' : game.pending ? 'DECISION CARD' : game.turn ? 'EVENT RESULT' : 'YOUR FIRST STEP'}</span>
    <h2>{motion ? 'Your next stop is coming…' : game.outcome?.title || 'Ready for an adventure?'}</h2>
    <p>{motion ? 'Your card appears when your character reaches the space.' : game.pending ? 'Open your card, explore the choices, and see what they mean before you decide.' : game.turn ? 'Read what happened and what it means for your business.' : 'Roll the die to discover your first village event.'}</p>
    {game.turn > 0 && <button ref={opener} className="event-open-card" type="button" disabled={!ready} onClick={() => setOpen(true)}><ReceiptText size={19} />{game.pending ? 'Open decision card' : 'Read event card'}<ArrowRight size={17} /></button>}
    {!game.pending && <button className="event-primary event-roll" type="button" disabled={disabled} onClick={roll}><Dices size={20} />{motion ? 'Moving…' : myTurn ? 'Roll the die' : 'Waiting for your friend'}</button>}
    <dialog className="event-card" data-reduced-motion={reduced} ref={dialog} aria-labelledby="event-card-title" aria-describedby="event-card-explanation" onCancel={close} onClose={() => setOpen(false)}>
      <div className="event-card-content" key={key}>
        <header className="event-card-heading"><span className="event-place-icon"><EventIcon place={place} /></span><div><span className="event-section-label">SPACE {game.position} · {place}</span><b>{game.pending ? 'Pause. Explore. Choose.' : 'Notice what changed.'}</b></div><button type="button" className="event-close" aria-label="Close card and look at board" onClick={close}><X size={21} /></button></header>
        <div className="event-card-body"><div className="event-card-step"><span><Check size={13} /> Landed</span><span className={game.pending ? 'current' : ''}>2 · Choose</span><span className={!game.pending ? 'current' : ''}>3 · Result</span></div>
          <h2 id="event-card-title" tabIndex={-1} ref={title}>{game.outcome?.title || place}</h2>
          <p id="event-card-explanation" className="event-explanation">{game.outcome?.text}</p>
          <div className="event-concept"><Landmark size={18} /><span>{guide.concept}</span></div>
          {game.pending ? <DecisionBody game={game} disabled={disabled} onConfirm={decide} /> : <ResultBody game={game} before={before?.turn === game.turn ? before.balance : undefined} onClose={close} />}
          {error && <p className="event-error" role="alert">{error} Your choice has not been confirmed. Try again when you are ready.</p>}
        </div>
      </div>
    </dialog>
  </div>;
}
