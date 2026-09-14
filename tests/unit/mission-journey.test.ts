import { describe, expect, it } from 'vitest';
import { applyAction, createMission, financialTotals, Mission, options, replayMission, validSave } from '../../packages/money-quest/engine';
import { goals, lessonBeats } from '../../packages/money-quest/content';

const explanation = 'I compared customer budgets, the next cost, and my available buffer.';
type Style = 'save' | 'grow' | 'explore';

/** Play only public actions, with an independent deterministic choice generator. */
function journey(seed: number, style: Style, quarters: 2 | 4 = 4) {
  let g = createMission(seed, quarters);
  let choiceState = (seed ^ 0xa341316c) >>> 0;
  const pick = (length: number) => {
    choiceState = (Math.imul(choiceState, 1103515245) + 12345) >>> 0;
    return choiceState % length;
  };
  let serial = 0;
  const send = (type: string, data: Record<string, unknown> = {}) => {
    const before = g;
    const command = { id: `journey-${seed}-${style}-${++serial}`, type, ...data };
    g = applyAction(g, command);
    // A retried click must never import, charge, draw or move a second time.
    expect(applyAction(g, command)).toBe(g);
    expect(g.receipts).toHaveLength(before.receipts.length + 1);
    expect(g.wallet).toBeGreaterThanOrEqual(0);
    expect(g.savings).toBeGreaterThanOrEqual(0);
    expect(g.liability).toBeGreaterThanOrEqual(0);
    for (const value of [g.wallet, g.savings, g.liability, g.inventory, g.position, g.turn]) {
      expect(Number.isInteger(value)).toBe(true);
    }
    expect(g.position).toBeGreaterThanOrEqual(0);
    expect(g.position).toBeLessThan(20);
    expect(g.price).toBeGreaterThanOrEqual(4);
    expect(g.price).toBeLessThanOrEqual(8);
    expect(g.inventory).toBeGreaterThanOrEqual(0);
    expect(g.customerDeck.every(budget => [4, 5, 6, 7, 8, 10].includes(budget))).toBe(true);
    expect(g.fortuneDeck.every(card => card >= 0 && card < g.layers)).toBe(true);
    const ledger = g.ledger.reduce((totals, entry) => ({
      wallet: totals.wallet + entry.wallet,
      savings: totals.savings + entry.savings,
      liability: totals.liability + entry.liability,
    }), { wallet: 0, savings: 0, liability: 0 });
    expect(ledger).toEqual({ wallet: g.wallet, savings: g.savings, liability: g.liability });
    expect(g.ledger.filter(entry => entry.kind === 'lesson-import').map(entry => entry.quarter)).toEqual(g.lesson.complete);
    if (g.phase !== 'settlement' && g.phase !== 'done') expect(g.savings).toBeGreaterThanOrEqual(before.savings);
    const newEvents = g.events.slice(before.events.length);
    const movementDice = newEvents.filter(event => event.type === 'die' && event.data.purpose === 'movement');
    expect(movementDice).toHaveLength(type === 'roll' ? 1 : 0);
    expect(g.turn - before.turn).toBe(type === 'roll' ? 1 : 0);
    for (const result of newEvents.filter(event => event.type === 'sales-result')) {
      const { revenue, cost, wage, profit, ledgerStart } = result.data as Record<string, number>;
      expect(profit).toBe(revenue - cost - wage);
      const entries = g.ledger.slice(ledgerStart);
      expect(entries[0]).toMatchObject({ kind: 'sale', revenue, wallet: revenue });
      expect(entries[1]).toMatchObject({ kind: 'production', cost });
      expect(entries.reduce((sum, entry) => sum + entry.wage, 0)).toBe(wage);
    }
    if (type === 'offers') {
      expect(g.position).toBe(before.remaining);
      expect(g.remaining).toBe(0);
      expect(g.path).toEqual(Array.from({ length: before.remaining }, (_, i) => i + 1));
    }
    if (g.phase === 'reflection') {
      expect(g.position).toBe(0);
      expect(g.path.at(-1)).toBe(0);
      expect(g.remaining).toBeLessThan(6);
    }
  };

  for (let guard = 0; g.phase !== 'done' && guard < 500; guard++) {
    switch (g.phase) {
      case 'lesson': {
        const beat = lessonBeats(g.quarter, g.lesson.depth)[g.lesson.step];
        if (!g.lesson.answered) send('answer', { answer: pick(beat.choices.length) });
        else send('lesson-next', { price: 4 + seed % 5, goal: goals[seed % goals.length], reason: explanation, ready: true });
        break;
      }
      case 'deposit': send('deposit'); break;
      case 'banner': send('banner'); break;
      case 'offers': {
        let budget = g.wallet;
        const upgrade = style === 'grow' && !g.upgrade && budget >= 5;
        if (upgrade) budget -= 5;
        let helper = 'none';
        if (g.quarter >= 3 && style !== 'save') {
          helper = budget >= 2 ? 'benefit' : 'helper';
          if (helper === 'benefit' && !g.helper.benefit) budget -= 2;
        }
        let save = 0, stock = 0;
        const reinvest = g.quarter === 4 && style === 'grow' && budget >= 3;
        if (g.quarter === 4) {
          const available = Math.min(5, budget) - (reinvest ? 3 : 0);
          save = style === 'save' ? available : pick(available + 1);
          stock = Math.min(3, available - save);
        }
        send('offers', { price: g.price, upgrade, helper, save, stock, reinvest, reason: explanation });
        break;
      }
      case 'board':
        if (g.wallet === 0) send('recover', { choice: 'learning', answer: 0, reason: explanation });
        else send('roll', { turn: g.turn });
        break;
      case 'decision': {
        const available = options(g).filter(option => !option.disabled);
        expect(available.length).toBeGreaterThan(0);
        if (style === 'save') send('evidence', { panel: 'ledger' });
        const selected = g.pending === 'bank' && style === 'save'
          ? available.at(-1)!
          : available[pick(available.length)];
        send('choose', { choice: selected.id, reason: explanation });
        break;
      }
      case 'outcome':
        if (g.revision && pick(2)) send('revise', { price: Math.max(4, Math.min(8, g.price + pick(3) - 1)), reason: explanation });
        send('continue');
        break;
      case 'recovery': send('recover', { choice: pick(2) ? 'advance' : 'learning', answer: 0, reason: explanation }); break;
      case 'reflection':
        // This is the important reload point: a lap ends before held movement resumes.
        expect(validSave(JSON.parse(JSON.stringify(g)))).toBe(true);
        send('reflect', { changed: explanation, next: 'I will review the ledger and explain my next choice.' });
        break;
      case 'settlement': send('finish', { reason: explanation }); break;
    }
  }
  expect(g.phase).toBe('done');
  expect(g.reflections.map(reflection => reflection.quarter)).toEqual(Array.from({ length: quarters }, (_, i) => i + 1));
  expect(g.lesson.complete).toEqual(Array.from({ length: quarters }, (_, i) => i + 1));
  expect(g.events.filter(event => event.type === 'goal-settled')).toHaveLength(1);
  expect(g.events.filter(event => event.type === 'session-reflection')).toHaveLength(1);
  expect(g.ledger.some(entry => entry.kind === 'salary')).toBe(false);
  expect(g.ledger.filter(entry => entry.kind === 'lesson-import').every(entry => entry.wallet === 5)).toBe(true);
  expect(validSave(g)).toBe(true);
  expect(replayMission(g)).toEqual(g);
  return g;
}

describe('complete Money Quest journeys', () => {
  for (const style of ['save', 'grow', 'explore'] as const) {
    it.each(Array.from({ length: 16 }, (_, i) => i * 1543 + 19))(`preserves learning, accounting and replay through a ${style} journey from seed %i`, seed => {
      journey(seed, style);
    });
  }

  it('settles a shorter mission with the same protected-balance and replay guarantees', () => {
    journey(89231, 'save', 2);
    journey(39101, 'explore', 2);
  });

  it('keeps transfers, lesson awards, advances and stock stakes out of business profit', () => {
    const g = journey(70231, 'grow');
    const operating = g.ledger.filter(entry => !['transfer', 'settlement-transfer', 'lesson-import', 'advance', 'repayment', 'investment-stake', 'investment-return'].includes(entry.kind));
    expect(financialTotals(g).profit).toBe(operating.reduce((sum, entry) => sum + entry.revenue - entry.cost - entry.wage - entry.expense - entry.refund, 0));
  });
});
