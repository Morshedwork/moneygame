import { forwardRef, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import type { Outcome } from '../../../packages/money-quest/engine';
import './board-conversation.css';

export type BoardConversationProps = {
  speaker?: string;
  guide: string;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  busy?: boolean;
  quarter: number;
  position: number;
  avatar?: string;
  reduced?: boolean;
  /** Reuse an existing portrait if one is available; this frame adds no WebGL context. */
  portrait?: ReactNode;
  className?: string;
};

/** The current conversation stays beside the village. It never blocks the board. */
export const BoardConversation = forwardRef<HTMLElement, BoardConversationProps>(function BoardConversation(
  { speaker = 'Sparko', guide, title, children, footer, busy = false, quarter, position, avatar, reduced = false, portrait, className = '' }, ref,
) {
  const headingId = useId();
  const body = useRef<HTMLDivElement>(null);
  useEffect(() => { if (body.current) body.current.scrollTop = 0; }, [title, position, quarter]);
  return <section ref={ref} className={`board-conversation ${className}`} aria-labelledby={headingId} tabIndex={-1} data-reduced={reduced} data-busy={busy} data-position={position}>
    <header className="board-conversation-header">
      <div className="board-conversation-identity"><span className="board-conversation-avatar" aria-hidden="true">{portrait || speaker.slice(0, 1)}</span><div><strong>{speaker}</strong><small>Your business buddy</small></div></div>
      <span className="board-conversation-location">Q{quarter}<i aria-hidden="true">·</i> Space {position}</span>
    </header>
    <div className="board-conversation-speech" role="status" aria-live="polite" aria-atomic="true">
      <h2 id={headingId}>{title}</h2>
      {guide && <p>{guide}</p>}
      {busy && <span className="board-conversation-thinking" aria-label="Moving to your next stop"><i/><i/><i/></span>}
    </div>
    <div className="board-conversation-body" ref={body}>
      {!busy && <p className="board-conversation-turn"><span aria-hidden="true">↳</span> {avatar ? `${avatar[0].toUpperCase()}${avatar.slice(1)}’s turn` : 'Your turn'}</p>}
      {children}
    </div>
    {footer && <footer className="board-conversation-footer">{footer}</footer>}
    <div className="board-conversation-thread" aria-hidden="true"><span/><span/><span/></div>
  </section>;
});

export type ConversationChoice = { id: string; label: string; detail?: string; reason?: string; disabled?: boolean };
export type ChoiceRepliesProps = {
  options: ConversationChoice[];
  onChoose: (id: string, reason: string) => void;
  disabled?: boolean;
  prompt?: string;
  /** Supply reasons suited to the current concept. A child explicitly picks their own. */
  reasons?: string[];
};

/** Two short replies replace a large decision form: a choice, then its reason. */
export function ChoiceReplies({ options, onChoose, disabled = false, prompt = 'What would you like to do?', reasons = [] }: ChoiceRepliesProps) {
  const [selected, setSelected] = useState('');
  const [reason, setReason] = useState('');
  const [ownReason, setOwnReason] = useState(false);
  const sending = useRef(false);
  const reasonId = useId();
  const signature = options.map(option => `${option.id}:${option.label}:${!!option.disabled}`).join('|');
  useEffect(() => { setSelected(''); setReason(''); setOwnReason(false); sending.current = false; }, [signature]);
  const choice = options.find(option => option.id === selected);
  const locked = disabled;
  const suggestions = Array.from(new Set([choice?.reason, ...reasons, 'This choice supports my business goal.', 'I want to keep a buffer for my next choice.'].filter((item): item is string => !!item))).slice(0, 3);
  function send(reply: string) {
    if (locked || sending.current || !choice || choice.disabled || reply.trim().length < 3) return;
    sending.current = true;
    try { onChoose(choice.id, reply.trim()); }
    finally { queueMicrotask(() => { sending.current = false; }); }
  }
  return <div className="conversation-replies">
    <p className="conversation-reply-prompt">{prompt}</p>
    <div className="conversation-reply-options" role="group" aria-label={prompt}>{(choice ? [choice] : options).map(option => <button type="button" className="conversation-reply" key={option.id} aria-pressed={option.id === selected} disabled={locked || option.disabled} onClick={() => { setSelected(option.id); setReason(''); setOwnReason(false); }}><span>{option.label}{option.detail && <small>{option.detail}</small>}</span><i aria-hidden="true">{option.id === selected ? '✓' : '↗'}</i></button>)}</div>
    {choice && <button type="button" className="conversation-change-choice" disabled={locked} onClick={() => { setSelected(''); setReason(''); setOwnReason(false); }}>Change my choice</button>}
    {choice && <form className="conversation-reason" onSubmit={event => { event.preventDefault(); send(reason); }}>
      <p>I’m choosing this because…</p>
      <div className="conversation-reason-options" role="group" aria-label="Choose your reason and try your choice">{suggestions.map(reply => <button type="button" key={reply} disabled={locked} onClick={() => send(reply)}>{reply}<span aria-hidden="true"> →</span></button>)}<button type="button" aria-pressed={ownReason} disabled={locked} onClick={() => { setOwnReason(!ownReason); setReason(''); }}>I have my own reason</button></div>
      {ownReason && <><label htmlFor={reasonId}>My reason</label><textarea id={reasonId} value={reason} rows={2} minLength={3} maxLength={500} required disabled={locked} placeholder="I noticed…" onChange={event => setReason(event.target.value)}/><button type="submit" className="conversation-send" disabled={locked || choice.disabled || reason.trim().length < 3}>Try my choice<span aria-hidden="true">→</span></button></>}
    </form>}
  </div>;
}

const signed = (value: number) => value > 0 ? `+${value}` : String(value).replace('-', '−');

function CustomerFace({ bought }: { bought: boolean }) {
  return <svg viewBox="0 0 40 44" aria-hidden="true"><path d="M5 43c0-11 7-15 15-15s15 4 15 15" fill={bought ? '#77bd9c' : '#a9bbc9'}/><circle cx="20" cy="17" r="15" fill="#ffdfa5"/><path d="M7 14Q8 0 20 2q12 0 13 12c-7 0-9-5-10-6-4 5-9 6-16 6" fill="#806149"/><circle cx="15" cy="18" r="1.5" fill="#374853"/><circle cx="25" cy="18" r="1.5" fill="#374853"/>{bought ? <path d="M15 24q5 6 10 0" fill="none" stroke="#b56b53" strokeWidth="2.2" strokeLinecap="round"/> : <path d="M17 25h6" stroke="#b56b53" strokeWidth="2" strokeLinecap="round"/>}</svg>;
}

export type OutcomeChatProps = { outcome: Outcome; walletDelta?: number; savingsDelta?: number; liabilityDelta?: number; liabilityTotal?: number; price?: number; expenses?: number; refund?: number; showText?: boolean };

/** Only this visit's real numbers are shown. Transfers are distinct from profit. */
export function OutcomeChat({ outcome, walletDelta, savingsDelta, liabilityDelta = 0, liabilityTotal = 0, expenses = 0, refund = 0, showText = true }: OutcomeChatProps) {
  const hasSale = !!outcome.budgets?.length || (outcome.sales ?? 0) > 0;
  const orders = outcome.sales ?? 0;
  const visitors = Math.max(outcome.budgets?.length ?? 0, orders);
  const shownVisitors = Math.min(visitors, 6);
  const hasMoneyChange = walletDelta !== undefined || savingsDelta !== undefined;
  const totalCosts = (outcome.cost ?? 0) + (outcome.wage ?? 0) + expenses + refund;
  const costs = [
    { label: 'Making bento', value: outcome.cost ?? 0 },
    { label: 'Helper wages', value: outcome.wage ?? 0 },
    { label: 'Other expenses', value: expenses },
    { label: 'Customer refunds', value: refund },
  ].filter(item => item.value !== 0);
  return <div className="conversation-outcome">
    {hasSale && <div className="conversation-customers"><div className="conversation-customer-faces">{Array.from({ length: shownVisitors }, (_, index) => <CustomerFace key={index} bought={index < orders}/>)}{visitors > shownVisitors && <span>+{visitors - shownVisitors}</span>}</div><p><strong>{orders} {orders === 1 ? 'paid order' : 'paid orders'}</strong><span>{orders > 0 ? 'Bento is on its way!' : 'Customers are thinking about your price.'}</span></p></div>}
    {showText && outcome.text && <p className="conversation-result-message">{outcome.text}</p>}
    {outcome.profit !== undefined && <div className="conversation-result-equation" aria-label={`Revenue ${outcome.revenue ?? 0}, minus total costs and refunds ${totalCosts}, equals ${outcome.profit} coins profit on this visit.`}>
      <span><b>{outcome.revenue ?? 0}</b><small>Revenue</small></span><i aria-hidden="true">−</i><span><b>{totalCosts}</b><small>All costs</small></span><i aria-hidden="true">=</i><span className={outcome.profit < 0 ? 'result-loss' : 'result-profit'}><b>{signed(outcome.profit)}</b><small>{outcome.profit === 0 ? 'Break even' : outcome.profit > 0 ? 'Profit' : 'Loss'}</small></span>
    </div>}
    {costs.length > 0 && <details className="conversation-budget-detail conversation-cost-detail"><summary>Where did the coins go?</summary><dl>{costs.map(item => <div key={item.label}><dt>{item.label}</dt><dd>{item.value} {item.value === 1 ? 'coin' : 'coins'}</dd></div>)}</dl></details>}
    {hasMoneyChange && <p className="conversation-coin-change" role="status" aria-live="polite" aria-atomic="true">{walletDelta !== undefined && <span className={walletDelta < 0 ? 'spent' : ''}>Wallet <strong>{signed(walletDelta)}</strong></span>}{savingsDelta !== undefined && savingsDelta !== 0 && <span>Saved <strong>{signed(savingsDelta)}</strong></span>}<small>coins this choice</small></p>}
    {liabilityDelta !== 0 && <p className="conversation-owed" role="status">{liabilityDelta > 0 ? `${liabilityDelta} coins still need to be paid from this choice.` : `${Math.abs(liabilityDelta)} owed coins repaid.`} <strong>{liabilityTotal} owed in total.</strong></p>}
    {!!outcome.budgets?.length && <details className="conversation-budget-detail"><summary>What could the customers spend?</summary><p>{outcome.budgets.join(' · ')} coins</p></details>}
  </div>;
}
