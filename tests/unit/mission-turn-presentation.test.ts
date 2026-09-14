import { describe, expect, it } from 'vitest';
import { applyAction, createMission, options, validSave } from '../../packages/money-quest/engine';
import { latestMissionDie, missionAnimations, missionOutcomeTotals } from '../../apps/client/mission-turn-presentation';

describe('mission animation dispatch', () => {
  it('keeps bank outcomes visible with exact ledger deltas after reload and an information visit', () => {
    let game = createMission(37), serial = 0;
    const act = (type: string, data: Record<string, unknown> = {}) => {
      game = applyAction(game, { id: `outcome-ledger-${++serial}`, type, ...data });
    };
    while (game.phase === 'lesson') {
      act('answer', { answer: 0 });
      act('lesson-next', { price: 6, goal: 'Protect profit', reason: 'I compare prices with costs.' });
    }
    act('deposit'); act('banner'); act('roll-dice', { turn: 0 });
    expect(game.pending).toBe('bank');
    act('choose', { choice: '2', reason: 'I keep some coins safe.' });
    const expected = { walletDelta: -2, savingsDelta: 2, liabilityDelta: 0, expenses: 0, refund: 0,
      finance: { revenue: 0, cost: 0, wage: 0, profit: 0 } };
    expect(missionOutcomeTotals(JSON.parse(JSON.stringify(game)))).toEqual(expected);
    act('evidence', { panel: 'ledger' });
    expect(missionOutcomeTotals(game)).toEqual(expected);
  });
  it('includes delivery costs in the landed choice’s profit after reloading a real save', () => {
    let game = createMission(12), serial = 0;
    const act = (type: string, data: Record<string, unknown> = {}) => {
      game = applyAction(game, { id: `delivery-profit-${++serial}`, type, ...data });
    };
    while (game.phase === 'lesson') {
      act('answer', { answer: 0 });
      act('lesson-next', { price: 6, goal: 'Protect profit', reason: 'I compare costs and prices.' });
    }
    act('deposit'); act('banner'); act('roll-dice', { turn: game.turn });
    if (game.phase === 'decision') act('choose', { choice: options(game).find(option => !option.disabled)!.id, reason: 'I compare the available options.' });
    act('continue'); act('roll-dice', { turn: game.turn });
    expect(game.pending).toBe('market'); expect(game.card).toBe(2);
    const walletBefore = game.wallet;
    act('choose', { choice: 'deliver', reason: 'I want to deliver for customers.' });
    expect(validSave(game)).toBe(true);
    expect(game.wallet - walletBefore).toBe(4);
    const expected = { walletDelta: 4, savingsDelta: 0, liabilityDelta: 0, expenses: 2, refund: 0,
      finance: { revenue: 12, cost: 6, wage: 0, profit: 4 } };
    expect(missionOutcomeTotals(JSON.parse(JSON.stringify(game)))).toEqual(expected);
    act('revise', { price: 6, reason: 'I will keep this price while comparing all costs.' });
    act('evidence', { panel: 'ledger' });
    expect(missionOutcomeTotals(game)).toEqual(expected);
  });
  it('excludes a boundary purchase from the carried-over sale while retaining its wallet change', () => {
    let game = createMission(4), serial = 0;
    const act = (type: string, data: Record<string, unknown> = {}) => {
      game = applyAction(game, { id: `planning-profit-${++serial}`, type, ...data });
    };
    const reason = 'I compare costs before making a choice.';
    for (let step = 0; step < 100 && game.phase !== 'offers'; step++) {
      if (game.phase === 'lesson') {
        if (!game.lesson.answered) act('answer', { answer: 0 });
        else act('lesson-next', { price: 6, goal: 'Protect profit', reason, ready: true });
      } else if (game.phase === 'deposit' || game.phase === 'banner') act(game.phase);
      else if (game.phase === 'board' && game.wallet > 0) act('roll-dice', { turn: game.turn });
      else if (game.phase === 'recovery' || game.phase === 'board') act('recover', { choice: 'learning', answer: 0, reason });
      else if (game.phase === 'decision') act('choose', { choice: options(game).find(option => !option.disabled)!.id, reason });
      else if (game.phase === 'outcome') act('continue');
      else if (game.phase === 'reflection') act('reflect', { changed: reason, next: reason });
    }
    expect(game.phase).toBe('offers'); expect(game.remaining).toBe(1);
    const walletBefore = game.wallet;
    act('offers', { price: Math.max(4, game.price - 1), upgrade: true, helper: 'none', save: 0, stock: 0, reason });
    expect(validSave(game)).toBe(true);
    expect(game.phase).toBe('outcome'); expect(game.position).toBe(1);
    const totals = missionOutcomeTotals(game)!;
    expect(totals.finance).toEqual({ revenue: game.outcome!.revenue, cost: game.outcome!.cost,
      wage: game.outcome!.wage, profit: game.outcome!.profit });
    expect(totals.expenses).toBe(0); expect(totals.refund).toBe(0);
    expect(totals.walletDelta).toBe(game.wallet - walletBefore);
    expect(totals.walletDelta).toBe(totals.finance.profit - 5);
  });
  it('uses the accepted die event and gives identical results distinct animations', () => {
    const before = createMission(5);
    const after = { ...before, position: 1, animation: 1, path: [1], events: [...before.events,
      { seq: 3, type: 'die', data: { purpose: 'movement', value: 1 }, quarter: 1, turn: 0, space: 0 }] };
    const [first] = missionAnimations(before, after, 0);
    expect(first).toMatchObject({ value: 1, from: 0, path: [1], replacement: false });
    const second = { ...after, position: 2, animation: 2, path: [2], events: [...after.events,
      { seq: 4, type: 'die', data: { purpose: 'movement', value: 1 }, quarter: 1, turn: 1, space: 1 }] };
    const [next] = missionAnimations(after, second, 10);
    expect(next.id).not.toBe(first.id);
    expect(next).toMatchObject({ value: 1, from: 1, path: [2] });
  });

  it('separates a stock result from the earlier roll’s saved movement', () => {
    const before = { ...createMission(7), animation: 4, remaining: 2, path: [19, 0] };
    const after = { ...before, position: 2, animation: 5, path: [1, 2], remaining: 0, events: [...before.events,
      { seq: 3, type: 'die', data: { purpose: 'stock', value: 6 }, quarter: 4, turn: 12, space: 0 }] };
    const animations = missionAnimations(before, after, 0);
    expect(animations).toHaveLength(2);
    expect(animations[0]).toMatchObject({ value: 6, replacement: true, path: [], from: 0 });
    expect(animations[1]).toMatchObject({ kind: 'walk', value: 0, replacement: false, path: [1, 2] });
    expect(latestMissionDie(after)).toEqual({ value: 6, chance: true });
    // Opening information or revising a price must not replay the result.
    expect(missionAnimations(after, { ...after, price: 7 }, 50)).toEqual([]);
  });

  it('does not reuse an old movement path for a replacement roll', () => {
    const before = { ...createMission(5), position: 13, animation: 1, path: [11, 12, 13] };
    const after = { ...before, events: [...before.events,
      { seq: 3, type: 'die', data: { purpose: 'replacement', value: 2 }, quarter: 1, turn: 1, space: 13 }] };
    expect(missionAnimations(before, after, 0)).toMatchObject([{ value: 2, replacement: true, path: [], from: 13 }]);
    expect(latestMissionDie(null)).toEqual({ value: 0, chance: false });
  });
});
