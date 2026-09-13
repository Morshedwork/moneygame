import { useState, type CSSProperties, type FormEvent } from 'react';
import { ArrowRight, Check, ChevronRight, Coins, Eye, Package, RotateCcw, Store, Utensils, UserRound } from 'lucide-react';
import { mascots } from '../../../packages/curriculum';
import { leadTheme } from '../theme';
import ShopPreview from './ShopPreview';
import { shopContents, shopViews, type ShopView } from './showroom';
import './shop.css';

export type ShopSetupValues = { name: string; price: number; color: string; goal: string };
const swatches = [
  { name: 'Sky', color: leadTheme.sky }, { name: 'Coral', color: leadTheme.coral },
  { name: 'Leaf', color: leadTheme.green }, { name: 'Sunshine', color: leadTheme.yellow },
  { name: 'Lavender', color: leadTheme.lavender },
];

export function ShopSetup({ avatar, busy, onAvatar, onOpen }: {
  avatar: string; busy: boolean; onAvatar: (avatar: string) => void; onOpen: (values: ShopSetupValues) => Promise<void>;
}) {
  const [name, setName] = useState('Little Bento Co.');
  const [price, setPrice] = useState(6);
  const [color, setColor] = useState<string>(leadTheme.sky);
  const [goal, setGoal] = useState('Learn from every choice');
  const [view, setView] = useState<ShopView>('whole');
  const [roof, setRoof] = useState(false);
  const [reset, setReset] = useState(0);
  const selected = swatches.find(s => s.color === color)!;
  const owner = mascots.find(m => m.id === avatar) || mascots[1];
  function focus(next: ShopView) { setView(next); setReset(n => n + 1); if (next !== 'whole') setRoof(false); }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!busy) await onOpen({ name: name.trim(), price, color, goal: goal.trim() });
  }
  return <section className="shop-builder" aria-labelledby="shop-heading">
    <header className="shop-heading">
      <div><span className="shop-eyebrow">YATAI VILLAGE / YOUR FIRST BUSINESS</span>
        <h1 id="shop-heading">Make it yours<span>.</span></h1>
        <p>A little bento shop. A big idea. Every detail starts with you.</p></div>
      <div className="shop-starting-coins"><Coins size={21} /><span><b>5 LEAD Coins</b><small>Your learning reward is ready</small></span></div>
    </header>
    <div className="shop-builder-grid">
      <form className="shop-controls" onSubmit={submit}>
        <div className="shop-section-title"><span>01</span><div><h2>Your shop, your story</h2><p>Watch your choices appear in 3D.</p></div></div>
        <label className="shop-field" htmlFor="shop-name">Your business name
          <input id="shop-name" value={name} minLength={2} maxLength={32} required disabled={busy}
            onChange={e => setName(e.target.value)} autoComplete="organization" /></label>
        <fieldset className="shop-color-field" disabled={busy}><legend>Banner color <span>{selected.name}</span></legend>
          <div className="shop-swatches">{swatches.map(s => <button key={s.name} type="button" aria-label={`${s.name} banner`}
            aria-pressed={color === s.color} onClick={() => setColor(s.color)} style={{ '--swatch': s.color } as CSSProperties}>
            <span>{color === s.color && <Check size={20} />}</span><small>{s.name}</small></button>)}</div>
        </fieldset>
        <div className="shop-divider" />
        <div className="shop-section-title"><span>02</span><div><h2>Set a thoughtful price</h2><p>Good business starts with a little maths.</p></div></div>
        <div className="shop-price-label"><label htmlFor="shop-price">Your first bento price</label><output htmlFor="shop-price">{price} <small>LEAD Coins</small></output></div>
        <input className="shop-price-range" id="shop-price" type="range" min={4} max={8} step={1} value={price} disabled={busy} onChange={e => setPrice(Number(e.target.value))} />
        <div className="shop-range-ends"><span>4 · more affordable</span><span>8 · higher margin</span></div>
        <div className="shop-maths" aria-live="polite"><div><span>Price</span><b>{price}</b></div><i>−</i><div><span>Cost</span><b>3</b></div><i>=</i><div><span>Profit / sale</span><b>{price - 3}</b></div></div>
        <p className="shop-price-note">Higher prices can earn more per sale, but fewer customers may be able to afford them.</p>
        <label className="shop-field" htmlFor="shop-goal">My goal for this chapter
          <input id="shop-goal" value={goal} minLength={2} maxLength={100} required disabled={busy} onChange={e => setGoal(e.target.value)} /></label>
        <button className="shop-open-button" type="submit" disabled={busy || name.trim().length < 2 || goal.trim().length < 2}>
          {busy ? 'Saving your choices…' : 'Open my business'}<ArrowRight size={20} /></button>
        <p className="shop-form-note">Your name, banner, price, and goal travel with your business.</p>
      </form>

      <div className="shop-showroom">
        <div className="shop-preview-heading"><div><span className="shop-eyebrow">YOUR BENTO SHOP</span><h2>{name.trim() || 'Your little bento shop'}</h2></div><span className="shop-live"><i /> Live 3D preview</span></div>
        <div className="shop-view-toolbar" role="group" aria-label="Shop camera views">
          {(Object.keys(shopViews) as ShopView[]).map(id => <button type="button" key={id} aria-pressed={view === id} onClick={() => focus(id)}>
            {id === 'whole' ? <Store size={16} /> : id === 'counter' ? <Utensils size={16} /> : <Package size={16} />}{shopViews[id].label}</button>)}
        </div>
        <div className="shop-stage" aria-describedby="shop-view-description">
          <ShopPreview name={name} price={price} color={color} avatar={avatar} roof={roof} view={view} reset={reset} />
          <span className="shop-stage-badge">{view === 'shelves' ? 'INTERIOR CUTAWAY' : roof ? 'FULL ROOF' : 'OPEN-ROOF VIEW'}</span>
        </div>
        <div className="shop-scene-actions"><span>Drag to look around · scroll to zoom</span><div>
          <button type="button" aria-pressed={roof} onClick={() => { focus('whole'); setRoof(!roof); }}><Eye size={16} />{roof ? 'Open the roof' : 'Show full roof'}</button>
          <button type="button" onClick={() => { setRoof(false); focus('whole'); }} aria-label="Reset shop view"><RotateCcw size={16} /></button>
        </div></div>
        <p className="shop-view-description" id="shop-view-description" aria-live="polite">{shopViews[view].description}</p>
        <div className="shop-owner"><div className="shop-owner-title"><UserRound size={18} /><h3>Meet your shopkeeper</h3><span>{owner.role}</span></div>
          <div className="shop-owner-choices" role="group" aria-label="Choose your character">{mascots.map(m => <button key={m.id} type="button" disabled={busy} aria-pressed={avatar === m.id} onClick={() => onAvatar(m.id)}>
            <i style={{ background: m.color }} /><span>{m.name}</span>{avatar === m.id && <Check size={16} />}</button>)}</div>
        </div>
      </div>
    </div>
    <section className="shop-details" aria-labelledby="shop-details-title"><div className="shop-details-intro"><span className="shop-eyebrow">SMALL DETAILS, BIG PERSONALITY</span><h2 id="shop-details-title">A whole shop to discover.</h2><p>Real 3D objects, from the roof tiles to the rice grains.</p></div>
      <div className="shop-detail-items">{shopContents.map((item, i) => <button type="button" key={item.title} onClick={() => { focus(item.view); document.querySelector('.shop-showroom')?.scrollIntoView({ block: 'nearest', behavior: 'auto' }); }}>
        <span className="shop-detail-number">0{i + 1}</span><span><b>{item.title}</b><small>{item.detail}</small></span><ChevronRight size={18} /></button>)}</div>
    </section>
  </section>;
}
