import { describe, expect, it } from 'vitest';
import { applyCommand, createPlayer, totals, type Player, type Command } from '../../packages/game-rules';
import { lessons, gate } from '../../packages/curriculum';
import { fortunes } from '../../packages/game-rules/content';
import { balances, cardChoices, cardGuidance, clampCoins, coinLimit, eventKey, previewChoice, shouldPresentCard, turnImpact } from '../../apps/client/board-cards/card-model';
import { DIE_MS, STEP_MS, sampleRoll } from '../../apps/client/board-presentation';

let sequence = 0;
const command = (type: string, data: Record<string, unknown> = {}): Command => ({ ...data, id: `event-test-${++sequence}`, type });
function ready(pending: string | null = 'bank') {
  let p = createPlayer('event-learner', 'Explorer');
  for (let index = 0; index < lessons.length; index++) p = applyCommand(p, command('lesson', { index, answer: lessons[index].answer })).player;
  for (let index = 0; index < gate.length; index++) p = applyCommand(p, command('gate', { index, answer: gate[index].answer })).player;
  p = applyCommand(p, command('setup', { name: 'Bento Co.', price: 6, color: '#52a7da', goal: 'Learn about money' }), 931).player;
  Object.assign(p.game!, { pending, position: 3, turn: 1, outcome: { title: 'A little room for tomorrow', text: 'Transfer coins into savings.' } });
  return p;
}
function compareWithEngine(p: Player, choice: string, amount = 0) {
  const preview = previewChoice(p.game!, choice, amount);
  expect(preview.allowed).toBe(true);
  const next = applyCommand(p, command('decision', preview.command)).player;
  expect(balances(next.game!)).toEqual(preview.after);
  expect(totals(next.game!).profit - totals(p.game!).profit).toBe(preview.profitDelta);
  return next.game!;
}

describe('interactive event previews use the real economy', () => {
  it('clamps bank amounts and preserves total coins and profit', () => {
    const p = ready();
    p.game!.wallet = 3; p.game!.savings = 2;
    expect(coinLimit(p.game!)).toBe(3);
    const g = compareWithEngine(p, '', 99);
    expect(g.wallet + g.savings).toBe(5);
    expect(turnImpact(g)).toEqual({ wallet: -3, savings: 3, liability: 0, profit: 0 });
  });
  it('lets an empty wallet continue without spending protected savings', () => {
    const p = ready(); p.game!.wallet = 0; p.game!.savings = 9;
    expect(coinLimit(p.game!)).toBe(0);
    expect(compareWithEngine(p, '', 5).savings).toBe(9);
    expect(clampCoins(NaN, 5)).toBe(0);
    expect(clampCoins(-2, 5)).toBe(0);
    expect(clampCoins(1.9, 5)).toBe(1);
  });
  it('caps festival contributions at two and records them as expenses', () => {
    const p = ready('festival');
    expect(coinLimit(p.game!)).toBe(2);
    const g = compareWithEngine(p, '', 5);
    expect(g.festival).toBe(2);
    expect(turnImpact(g).profit).toBe(-2);
  });
  it.each([0, 2, 4])('advertising %i pays now and adds visitors, not guaranteed sales', amount => {
    const p = ready('advertising');
    const g = compareWithEngine(p, String(amount));
    expect(g.effects.at(-1)?.visitors).toBe(amount / 2 + 1);
    expect(previewChoice(p.game!, String(amount), 0).note).toContain('not guaranteed');
  });
  it('blocks unaffordable advertising and optional opportunities', () => {
    const p = ready('advertising'); p.game!.wallet = 1;
    expect(cardChoices(p.game!).map(c => c.disabled)).toEqual([false, true, true]);
    expect(previewChoice(p.game!, '4', 0).allowed).toBe(false);
    p.game!.pending = 'fortune'; p.game!.card = fortunes.findIndex(c => c.name === 'Bulk Rice Offer');
    expect(cardChoices(p.game!)[1].disabled).toBe(true);
    expect(previewChoice(p.game!, 'accept', 0).allowed).toBe(false);
    compareWithEngine(p, 'decline');
  });
  it('optional fortune fees and declines agree with engine outcomes', () => {
    for (const [index, card] of fortunes.entries()) {
      if (!('choice' in card)) continue;
      const p = ready('fortune'); p.game!.card = index;
      const g = compareWithEngine(p, 'accept');
      expect(g.wallet).toBe(5 - card.fee);
      compareWithEngine(p, 'decline');
    }
  });
  it('previews sales unit costs without sampling or revealing customer budgets', () => {
    const p = ready('big-sale');
    p.game!.effects = [{ id: 'rice', name: 'Rice offer', trigger: 'next-sale', remaining: 1, cost: -1, visitors: 0, budget: 0 }];
    const snapshot = structuredClone(p.game);
    const keep = previewChoice(p.game!, 'keep', 0), discount = previewChoice(p.game!, 'discount', 0);
    expect(keep.perBento).toBe(4); expect(discount.perBento).toBe(3);
    expect(discount.command).toEqual({ discount: 1 });
    expect(discount.uncertain).toBe(true);
    expect(discount.after).toEqual(balances(p.game!));
    expect(p.game).toEqual(snapshot);
    const next = applyCommand(p, command('decision', discount.command)).player.game!;
    expect(next.outcome!.profit).toBe(next.outcome!.sales! * discount.perBento!);
  });
  it('refund previews protect savings and disclose recovery debt', () => {
    const p = ready('returns'); p.game!.wallet = 1; p.game!.savings = 7;
    p.game!.sales = [{ id: 'sale', price: 6, cost: 3, returned: false }];
    const preview = previewChoice(p.game!, 'refund', 0);
    expect(preview.after).toEqual({ wallet: 0, savings: 7, liability: 5 });
    expect(preview.note).toContain('money owed, not income');
    compareWithEngine(p, 'refund');
  });
  it('replacement preview labels both possible outcomes without rolling early', () => {
    const p = ready('returns'); p.game!.wallet = 2;
    p.game!.sales = [{ id: 'sale', price: 6, cost: 3, returned: false }];
    const rng = p.game!.rng, preview = previewChoice(p.game!, 'replace', 0);
    expect(preview.uncertain).toBe(true); expect(preview.after.liability).toBe(1);
    expect(preview.note).toContain('9 total'); expect(p.game!.rng).toBe(rng);
    const g = applyCommand(p, command('decision', preview.command)).player.game!;
    expect(g.outcome!.die).toBeGreaterThanOrEqual(1);
    const totalCost = g.outcome!.die! >= 4 ? 3 : 9;
    expect(g.liability).toBe(totalCost - 2);
    expect(turnImpact(g).profit).toBe(-totalCost);
  });
  it.each(['bench', 'ack'])('%s continues with no money moved', pending => {
    compareWithEngine(ready(pending), 'continue');
  });
});

describe('cards follow completed dice movement and each decision result', () => {
  it('waits for every walking step before opening the card', () => {
    const g = ready().game!;
    const roll = { id: 'turn1', value: 3, from: 0, path: [1, 2, 3], replacement: false, started: 0 };
    for (const elapsed of [0, DIE_MS - 1, DIE_MS, DIE_MS + 3 * STEP_MS - 1]) {
      expect(shouldPresentCard(g, !sampleRoll(roll, elapsed, 3).complete, true, '')).toBe(false);
    }
    expect(shouldPresentCard(g, !sampleRoll(roll, DIE_MS + 3 * STEP_MS, 3).complete, true, '')).toBe(true);
    expect(shouldPresentCard(g, !sampleRoll(roll, 0, 3, true).complete, true, '')).toBe(true);
  });
  it('waits for a replacement roll without moving the pawn', () => {
    const g = ready(null).game!;
    const roll = { id: 'replacement', value: 4, from: 13, path: [], replacement: true, started: 0 };
    expect(shouldPresentCard(g, !sampleRoll(roll, DIE_MS - 1, 13).complete, true, '')).toBe(false);
    expect(shouldPresentCard(g, !sampleRoll(roll, DIE_MS, 13).complete, true, '')).toBe(true);
  });
  it('shows acknowledgements once, then opens the resolved card even with unchanged text', () => {
    const p = ready('ack'), key = eventKey(p.game!);
    expect(shouldPresentCard(p.game!, false, true, key)).toBe(false);
    const g = compareWithEngine(p, 'continue');
    expect(eventKey(g)).not.toBe(key);
    expect(shouldPresentCard(g, false, true, key)).toBe(true);
  });
  it('does not reopen on price changes or interrupt another player with a decision', () => {
    const g = ready().game!, key = eventKey(g);
    g.price++;
    expect(eventKey(g)).toBe(key);
    expect(shouldPresentCard(g, false, false, '')).toBe(false);
    g.pending = null;
    expect(shouldPresentCard(g, false, false, '')).toBe(true);
    g.phase = 'reflection';
    expect(shouldPresentCard(g, false, true, '')).toBe(false);
  });
  it('provides explanations and retryable checks for every board location', () => {
    const g = ready(null).game!;
    for (let position = 0; position < 20; position++) {
      g.position = position;
      const guide = cardGuidance(g);
      expect(guide.why.length).toBeGreaterThan(40);
      expect(guide.answers[guide.correct]).toBeTruthy();
    }
  });
});
