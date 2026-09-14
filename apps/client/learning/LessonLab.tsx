import { useId, useState, type CSSProperties } from 'react';
import './lesson-lab.css';

type LabProps = { quarter: number; step: number; price: number; reduced: boolean };
type MarkName = 'bento' | 'wallet' | 'bank' | 'helper' | 'plant' | 'chance';
const clamp = (n: number, low: number, high: number) => Math.min(high, Math.max(low, Number.isFinite(n) ? Math.round(n) : low));
const net = (n: number) => n > 0 ? `+${n}` : String(n).replace('-', '−');

function Mark({ name }: { name: MarkName }) {
  return <svg viewBox="0 0 80 68" className="lesson-lab-mark" aria-hidden="true">
    <ellipse cx="40" cy="61" rx="31" ry="5" fill="currentColor" opacity=".12" />
    {name === 'bento' && <g transform="rotate(-7 40 34)"><rect x="8" y="13" width="64" height="44" rx="11" fill="#314c46" /><rect x="12" y="12" width="56" height="38" rx="8" fill="#152f2d" /><path d="M39 13v36M13 31h54" stroke="#ae8460" strokeWidth="3" />{[[25, 23], [54, 23], [25, 41], [54, 41]].map(([x, y], i) => <g key={i}><ellipse cx={x} cy={y} rx="10" ry="6" fill="#fff3d3" /><ellipse cx={x} cy={y - 1} rx="5" ry="4" fill={i % 2 ? '#eb784d' : '#7eae4c'} /></g>)}</g>}
    {name === 'wallet' && <g><rect x="12" y="19" width="55" height="37" rx="9" fill="#dc9251" /><path d="M14 27h51" stroke="#ffd59a" strokeWidth="3" /><rect x="48" y="32" width="23" height="15" rx="5" fill="#94593c" /><circle cx="56" cy="39" r="3" fill="#ffd66a" /><circle cx="29" cy="15" r="11" fill="#f8c33c" stroke="#ffdf7b" strokeWidth="3" /><path d="M29 10v10m-3-8 3-2" stroke="#a66e16" strokeWidth="2" /></g>}
    {name === 'bank' && <g fill="#5088b8"><path d="M8 25 40 8l32 17v5H8Z" /><rect x="10" y="52" width="60" height="7" rx="2" /><path d="M16 33h9v17h-9zm20 0h9v17h-9zm20 0h9v17h-9z" /><circle cx="40" cy="20" r="5" fill="#fff4b7" /></g>}
    {name === 'helper' && <g><path d="m30 42-9 15m29-15 9 15M27 40l-13 5m39-5 13 5" stroke="#6abb4a" strokeWidth="9" strokeLinecap="round" /><ellipse cx="40" cy="45" rx="15" ry="14" fill="#74c850" /><path d="m28 15-4-8m27 8 5-9" stroke="#7ccb53" strokeWidth="5" strokeLinecap="round" /><ellipse cx="40" cy="26" rx="22" ry="19" fill="#82d954" /><circle cx="32" cy="24" r="3" fill="#214534" /><circle cx="49" cy="24" r="3" fill="#214534" /><path d="M35 32q5 6 10 0" stroke="white" strokeWidth="4" fill="none" strokeLinecap="round" /><path d="M32 43h17l-3 15H35Z" fill="#fff6da" /></g>}
    {name === 'plant' && <g><path d="m26 38 5 22h19l5-22Z" fill="#d8945c" /><path d="M40 42V20" stroke="#3c8e57" strokeWidth="5" /><path d="M40 31Q12 30 18 13q23-3 22 18Zm0-7Q41 6 64 9q1 23-24 15Z" fill="#6bbb64" /><rect x="23" y="36" width="34" height="7" rx="3" fill="#f0ae72" /></g>}
    {name === 'chance' && <g transform="rotate(10 40 32)"><rect x="16" y="9" width="48" height="48" rx="11" fill="#f4efff" stroke="#a78acb" strokeWidth="3" />{[[28, 21], [52, 21], [40, 33], [28, 45], [52, 45]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="3.6" fill="#7753a2" />)}</g>}
  </svg>;
}

function Flow({ revision, label, amount }: { revision: string | number; label: string; amount: number }) {
  return <div className="lesson-lab-flow" aria-hidden="true" key={revision}><span>{label}</span><div className="lesson-lab-flow-track">{Array.from({ length: Math.min(3, Math.max(0, amount)) }, (_, i) => <i key={i} style={{ '--coin-delay': `${i * 140}ms` } as CSSProperties}>1</i>)}<b>→</b></div></div>;
}

function Balance({ label, value, mark, tone = '' }: { label: string; value: string | number; mark: MarkName; tone?: string }) {
  return <div className={`lesson-lab-balance ${tone}`}><Mark name={mark} /><span>{label}</span><strong>{value}<small>coins</small></strong></div>;
}

function Range({ label, value, min = 0, max, onChange }: { label: string; value: number; min?: number; max: number; onChange: (value: number) => void }) {
  const id = useId();
  return <div className="lesson-lab-range"><label htmlFor={id}>{label}<strong>{value} {value === 1 ? 'coin' : 'coins'}</strong></label><input id={id} type="range" min={min} max={max} step={1} value={value} onChange={e => onChange(Number(e.target.value))} /></div>;
}

function Receipt({ lines, equation }: { lines: { label: string; value: string | number }[]; equation: string }) {
  return <div className="lesson-lab-receipt"><dl>{lines.map(line => <div key={line.label}><dt>{line.label}</dt><dd>{line.value}</dd></div>)}</dl><p role="status" aria-live="polite" aria-atomic="true">{equation}</p></div>;
}

function PriceLab({ price }: { price: number }) {
  const [menu, setMenu] = useState(clamp(price, 4, 8));
  const [revision, setRevision] = useState(0);
  const budgets = [5, 6, 8], sales = budgets.filter(budget => budget >= menu).length;
  const revenue = sales * menu, cost = sales * 3, profit = revenue - cost;
  return <>
    <p className="lesson-lab-intro">Three visitors. One bento recipe. Move the price and watch who can buy.</p>
    <Range label="Example menu price" value={menu} min={4} max={8} onChange={setMenu} />
    <div className="lesson-lab-customers" aria-label="Example customer budgets">{budgets.map((budget, index) => <div className={`lesson-lab-customer ${budget >= menu ? 'can-buy' : 'cannot-buy'}`} key={budget}>
      <span className="lesson-lab-face" aria-hidden="true" style={{ '--visitor-color': ['#ee856e', '#65b59b', '#8a9dd6'][index] } as CSSProperties}><i /><i /><b /></span>
      <span>Budget <strong>{budget}</strong></span><small>{budget >= menu ? 'Buys a bento' : 'Keeps their coins'}</small>
    </div>)}</div>
    <div className="lesson-lab-scene"><Balance label={`${sales} ${sales === 1 ? 'bento sold' : 'bentos sold'}`} value={revenue} mark="bento" /><Flow revision={`${menu}-${revision}`} label={`After ${cost} ingredient costs`} amount={profit} /><Balance label="Profit left" value={profit} mark="wallet" tone="mint" /></div>
    <Receipt lines={[{ label: 'Sales revenue', value: `${sales} × ${menu} = ${revenue}` }, { label: 'Production costs', value: `${sales} × 3 = ${cost}` }, { label: 'Profit', value: profit }]} equation={`${revenue} revenue − ${cost} cost = ${profit} coins profit. ${3 - sales ? `${3 - sales} ${3 - sales === 1 ? 'visitor cannot buy' : 'visitors cannot buy'}; no bento is made for them.` : 'All three visitors can buy.'}`} />
    <div className="lesson-lab-footer"><p>Try prices 5 and 6. Does more revenue always mean more profit?</p><button type="button" onClick={() => setRevision(n => n + 1)}>Replay coin flow <span aria-hidden="true">↻</span></button></div>
  </>;
}

function SavingsExample() {
  const [saved, setSaved] = useState(3), [revision, setRevision] = useState(0);
  const wallet = 11 - saved, tax = Math.ceil(wallet * .1);
  return <><p className="lesson-lab-intro">Start with 11 practice coins. Set some aside before visiting Town Hall.</p>
    <Range label="Move to protected savings" value={saved} max={5} onChange={setSaved} />
    <div className="lesson-lab-scene"><Balance label="Wallet before tax" value={wallet} mark="wallet" /><Flow revision={`${saved}-${revision}`} label={`${saved} moved, none earned`} amount={saved} /><Balance label="Protected savings" value={saved} mark="bank" tone="blue" /></div>
    <Receipt lines={[{ label: 'Total before tax', value: `${wallet} + ${saved} = 11` }, { label: 'Town Hall tax', value: `10% of ${wallet}, rounded up = ${tax}` }, { label: 'Wallet after tax', value: wallet - tax }]} equation={`After tax: wallet ${wallet - tax}, savings ${saved}. Moving ${saved} to savings creates 0 profit.`} />
    <div className="lesson-lab-footer"><p>This game uses a simplified wallet levy from Q2. Savings are excluded; these are game rules.</p><button type="button" onClick={() => setRevision(n => n + 1)}>Replay transfer <span aria-hidden="true">↻</span></button></div>
  </>;
}

function ReturnsExample() {
  const [choice, setChoice] = useState<'refund' | 'replacement'>('refund');
  const [replacementRoll, setReplacementRoll] = useState<'success' | 'refund'>('success');
  const [revision, setRevision] = useState(0);
  const replacement = choice === 'replacement', replacementRefund = replacement && replacementRoll === 'refund';
  const refund = !replacement || replacementRefund;
  const extra = (replacement ? 3 : 0) + (refund ? 6 : 0), result = 6 - 3 - extra;
  return <><p className="lesson-lab-intro">A bento sold for 6 and originally cost 3. Compare ways to make a return right.</p>
    <div className="lesson-lab-options" role="group" aria-label="Example return choice"><button type="button" aria-pressed={!replacement} onClick={() => setChoice('refund')}>Refund 6</button><button type="button" aria-pressed={replacement} onClick={() => setChoice('replacement')}>Make a replacement for 3</button></div>
    {replacement && <div className="lesson-lab-options" role="group" aria-label="Example replacement roll"><button type="button" aria-pressed={replacementRoll === 'refund'} onClick={() => setReplacementRoll('refund')}>Roll 1–3 · replacement plus refund</button><button type="button" aria-pressed={replacementRoll === 'success'} onClick={() => setReplacementRoll('success')}>Roll 4–6 · replacement works</button></div>}
    <div className="lesson-lab-scene"><Balance label="Original revenue" value={6} mark="bento" /><Flow revision={`${choice}-${replacementRoll}-${revision}`} label={!replacement ? 'Money back to customer' : replacementRefund ? 'Make a new bento, then refund' : 'Make a new bento'} amount={extra} /><Balance label="Extra return cost" value={extra} mark="wallet" tone="rose" /></div>
    <Receipt lines={[{ label: 'Original production', value: 3 }, { label: 'Replacement', value: replacement ? 3 : 0 }, { label: 'Refund', value: refund ? 6 : 0 }]} equation={`Whole sale: 6 revenue − 3 original cost − ${extra} return cost = ${net(result)} coins. The original ingredients still cost money.`} />
    <div className="lesson-lab-footer"><p>{replacement ? 'A replacement roll of 4–6 works; 1–3 also refunds the original 6 coins. This chance roll never moves your pawn.' : 'The full refund amount is known before you choose.'} No prior sale means no return charge.</p><button type="button" onClick={() => setRevision(n => n + 1)}>Replay return <span aria-hidden="true">↻</span></button></div>
  </>;
}

function CostsExample() {
  const [fee, setFee] = useState(3), [revision, setRevision] = useState(0);
  const result = 6 - 3 - fee;
  return <><p className="lesson-lab-intro">One 6-coin sale, 3 coins of ingredients. Explore how an extra fee changes the result.</p>
    <Range label="Example extra fee" value={fee} max={5} onChange={setFee} />
    <div className="lesson-lab-scene"><Balance label="Revenue" value={6} mark="bento" /><Flow revision={`${fee}-${revision}`} label="Subtract every cost" amount={Math.max(0, result)} /><Balance label={result === 0 ? 'Break-even' : result > 0 ? 'Profit' : 'Loss'} value={net(result)} mark="wallet" tone={result < 0 ? 'rose' : 'mint'} /></div>
    <Receipt lines={[{ label: 'Production + extra fee', value: `3 + ${fee} = ${3 + fee}` }, { label: 'Revenue', value: 6 }]} equation={`6 revenue − ${3 + fee} total costs = ${net(result)}. ${result === 0 ? 'Break-even: revenue exactly covers costs.' : result > 0 ? 'Revenue is greater than costs: a profit.' : 'Costs are greater than revenue: a loss.'}`} />
    <div className="lesson-lab-footer"><p>The whole ledger tells the story. Revenue alone does not show profit.</p><button type="button" onClick={() => setRevision(n => n + 1)}>Replay costs <span aria-hidden="true">↻</span></button></div>
  </>;
}

function QuarterTwoLab({ step }: { step: number }) {
  const [mode, setMode] = useState(step === 1 ? 'returns' : step >= 2 ? 'costs' : 'savings');
  return <><div className="lesson-lab-modes" role="group" aria-label="Choose an example">{[['savings', 'Savings'], ['returns', 'Returns'], ['costs', 'Break-even']].map(([value, label]) => <button type="button" key={value} aria-pressed={mode === value} onClick={() => setMode(value)}>{label}</button>)}</div>{mode === 'savings' ? <SavingsExample /> : mode === 'returns' ? <ReturnsExample /> : <CostsExample />}</>;
}

function HelperLab({ price }: { price: number }) {
  const [menu, setMenu] = useState(clamp(price, 4, 8));
  const [hired, setHired] = useState(true), [benefit, setBenefit] = useState(false), [movementRollOne, setMovementRollOne] = useState(false);
  const [revision, setRevision] = useState(0);
  const works = hired && (benefit || !movementRollOne), visitors = works ? 2 : 1;
  const budgets = [6, 6], sales = budgets.slice(0, visitors).filter(budget => budget >= menu).length;
  const revenue = sales * menu, cost = sales * 3, wage = works ? 1 : 0, profit = revenue - cost - wage;
  const benefitCost = hired && benefit ? 2 : 0;
  return <><p className="lesson-lab-intro">A Sales Day normally has one visitor. A working helper serves one more. Both example visitors have a budget of 6.</p>
    <div className="lesson-lab-options" role="group" aria-label="Example helper choice"><button type="button" aria-pressed={!hired} onClick={() => setHired(false)}>Work alone</button><button type="button" aria-pressed={hired} onClick={() => setHired(true)}>Hire a helper</button></div>
    {hired && <label className="lesson-lab-check"><input type="checkbox" checked={benefit} onChange={e => setBenefit(e.target.checked)} /><span>Add the 2-coin reliability benefit<small>Paid once; normal wages still apply.</small></span></label>}
    <Range label="Example menu price" value={menu} min={4} max={8} onChange={setMenu} />
    {hired && <div className="lesson-lab-options" role="group" aria-label="Example movement roll"><button type="button" aria-pressed={!movementRollOne} onClick={() => setMovementRollOne(false)}>Movement roll 2–6</button><button type="button" aria-pressed={movementRollOne} onClick={() => setMovementRollOne(true)}>Movement roll 1</button></div>}
    <div className="lesson-lab-scene"><div className={`lesson-lab-worker ${works ? 'working' : 'away'}`} key={`${hired}-${benefit}-${movementRollOne}-${revision}`}><Mark name="helper" /><strong>{!hired ? 'Working alone' : works ? 'Helper is here' : 'Helper is absent'}</strong><span>{visitors} {visitors === 1 ? 'visitor' : 'visitors'} · {sales} {sales === 1 ? 'sale' : 'sales'}</span></div><Flow revision={`${menu}-${hired}-${benefit}-${movementRollOne}-${revision}`} label={`${wage} wage today`} amount={Math.max(0, profit)} /><Balance label="Sales Day profit" value={net(profit)} mark="wallet" tone={profit < 0 ? 'rose' : 'mint'} /></div>
    <Receipt lines={[{ label: 'Revenue', value: `${sales} × ${menu} = ${revenue}` }, { label: 'Production + wage', value: `${cost} + ${wage} = ${cost + wage}` }, { label: 'One-time benefit', value: benefitCost }]} equation={`${revenue} revenue − ${cost} production − ${wage} wage = ${net(profit)} today. ${benefitCost ? `Including the benefit purchase: ${net(profit - benefitCost)} coins.` : works && sales === 0 ? 'The helper worked, so the wage is paid even with no sales.' : 'Visitors are an opportunity; purchases are not guaranteed.'}`} />
    <div className="lesson-lab-footer"><p>On a Sales Day, a movement roll of 1 means an unprotected helper is absent; reliability covers it. The normal wage is paid only when they work. Try price 7 to see why wages still matter when nobody buys.</p><button type="button" onClick={() => setRevision(n => n + 1)}>Replay Sales Day <span aria-hidden="true">↻</span></button></div>
  </>;
}

function MoneyPathsLab() {
  const [path, setPath] = useState<'save' | 'reinvest' | 'stock'>('save');
  const [amount, setAmount] = useState(3), [die, setDie] = useState(4), [revision, setRevision] = useState(0);
  const stake = Math.min(amount, 3), returned = die >= 5 ? stake * 2 : die >= 3 ? stake : 0;
  const savings = path === 'save' ? amount : 0, spending = path === 'save' ? amount : path === 'reinvest' ? 3 : stake;
  const interest = savings >= 3 ? 1 : 0;
  return <><p className="lesson-lab-intro">Explore with 5 wallet coins and no existing savings. Choose a path, then compare what can happen.</p>
    <div className="lesson-lab-paths" role="group" aria-label="Example money path">{(['save', 'reinvest', 'stock'] as const).map(value => <button key={value} type="button" aria-pressed={path === value} onClick={() => setPath(value)}><Mark name={value === 'save' ? 'bank' : value === 'reinvest' ? 'plant' : 'chance'} /><strong>{value === 'save' ? 'Save' : value === 'reinvest' ? 'Reinvest' : 'Stock'}</strong></button>)}</div>
    {path !== 'reinvest' && <Range label={path === 'save' ? 'Set aside in savings' : 'Example wallet stake'} value={path === 'save' ? amount : stake} max={path === 'save' ? 5 : 3} onChange={setAmount} />}
    {path === 'stock' && <div className="lesson-lab-outcomes" role="group" aria-label="Inspect every possible stock outcome">{[[2, '1–2', 'Lose stake'], [4, '3–4', 'Stake returned'], [6, '5–6', 'Double returned']].map(([value, faces, label]) => <button key={value} type="button" aria-pressed={die === value} onClick={() => setDie(Number(value))}><b>{faces}</b><small>{label}</small></button>)}</div>}
    <div className="lesson-lab-scene"><Balance label="Wallet after allocation" value={5 - spending} mark="wallet" /><Flow revision={`${path}-${amount}-${die}-${revision}`} label={path === 'save' ? 'Set aside' : path === 'reinvest' ? 'Spend on the stall' : 'Inspect a possible return'} amount={path === 'stock' ? returned : spending} />{path === 'reinvest' ? <div className="lesson-lab-growth"><Mark name="plant" /><span>Effective budgets</span><strong>+1</strong></div> : <Balance label={path === 'save' ? 'Protected savings' : 'Stake returned'} value={path === 'save' ? savings : returned} mark={path === 'save' ? 'bank' : 'chance'} tone={path === 'save' ? 'blue' : 'lavender'} />}</div>
    {path === 'save' && <Receipt lines={[{ label: 'Transfer profit', value: 0 }, { label: 'Interest at Goal', value: interest }, { label: 'Savings at Goal, if unchanged', value: savings + interest }]} equation={`${5 - amount} wallet + ${amount} savings = 5 original coins. ${amount >= 3 ? 'Keep at least 3 in savings to receive 1 interest at Goal.' : 'Savings below 3 do not earn the Goal interest.'}`} />}
    {path === 'reinvest' && <Receipt lines={[{ label: 'One-time reinvestment cost', value: 3 }, { label: 'An example customer budget', value: '5 → 6' }, { label: 'Wallet kept for other costs', value: 2 }]} equation="Reinvest spends 3 now and adds 1 to effective customer budgets. A budget of 6 can meet price 6; it still cannot meet price 7. Future profit is not guaranteed." />}
    {path === 'stock' && <Receipt lines={[{ label: 'Stake placed', value: stake }, { label: 'Return in this outcome', value: returned }, { label: 'Net investment result', value: net(returned - stake) }]} equation={`${returned} returned − ${stake} original stake = ${net(returned - stake)} coins. ${stake === 0 ? 'Placing zero is a valid choice.' : die >= 3 && die <= 4 ? 'Getting your stake back is break-even, not new profit.' : 'Inspect all three possibilities before choosing.'}`} />}
    <div className="lesson-lab-footer"><p>{path === 'stock' ? 'These buttons inspect possible game die results; you cannot choose the result in a mission. Protected savings cannot be staked.' : 'Fictional game rules. Keep a buffer for costs and explain what fits your goal.'}</p><button type="button" onClick={() => setRevision(n => n + 1)}>Replay this path <span aria-hidden="true">↻</span></button></div>
  </>;
}

/** Learning sandbox only. It has no connection to mission balances or actions. */
export function LessonLab({ quarter, step, price, reduced }: LabProps) {
  const id = useId(), q = clamp(quarter, 1, 4);
  const titles = ['The bento price lab', 'Where your coins go', 'Build your team', 'Explore money paths'];
  return <section className="lesson-lab" data-reduced={reduced} aria-labelledby={id}>
    <header className="lesson-lab-header"><span className="lesson-lab-badge"><i aria-hidden="true">✦</i> Try an example</span><small>Practice coins only</small><h2 id={id}>{titles[q - 1]}</h2></header>
    <div className="lesson-lab-body" key={`${q}-${step}`}>{q === 1 ? <PriceLab price={price} /> : q === 2 ? <QuarterTwoLab step={step} /> : q === 3 ? <HelperLab price={price} /> : <MoneyPathsLab />}</div>
    <p className="lesson-lab-isolation">Explore freely. These examples never change your mission wallet.</p>
  </section>;
}

export default LessonLab;
