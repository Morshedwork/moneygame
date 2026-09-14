import { describe, expect, it } from 'vitest';
import { applyAction, createMission, options, replayMission, validSave, type Mission } from '../../packages/money-quest/engine';

let serial = 0;
const reason = 'I considered the cost and the money available for my next choice.';
const act = (game: Mission, type: string, data: Record<string, unknown> = {}) =>
  applyAction(game, { id: `mission-dice-${++serial}`, type, ...data });

function lesson(game: Mission) {
  while (game.phase === 'lesson') {
    game = act(game, 'answer', { answer: 0 });
    game = act(game, 'lesson-next', { price: 6, goal: 'Protect profit', reason, ready: true });
  }
  return game;
}

function launch(seed = 37) {
  return act(act(lesson(createMission(seed)), 'deposit'), 'banner');
}

function advance(game: Mission) {
  if (game.phase === 'lesson') return game.lesson.answered
    ? act(game, 'lesson-next', { price: game.price, goal: game.goal, reason, ready: true })
    : act(game, 'answer', { answer: 0 });
  if (game.phase === 'deposit' || game.phase === 'banner') return act(game, game.phase);
  if (game.phase === 'offers') return act(game, 'offers', { price: game.price, helper: 'none', save: 0, stock: 0, reinvest: false, reason });
  if (game.phase === 'board') return game.wallet === 0
    ? act(game, 'recover', { choice: 'learning', answer: 0, reason })
    : act(game, 'roll-dice', { turn: game.turn });
  if (game.phase === 'decision') {
    const available = options(game).filter(option => !option.disabled);
    const selected = ['decline', 'keep', '0', 'continue', 'close', 'enjoy']
      .map(id => available.find(option => option.id === id)).find(Boolean) ?? available[0];
    return act(game, 'choose', { choice: selected.id, reason });
  }
  if (game.phase === 'outcome') return act(game, 'continue');
  if (game.phase === 'recovery') return act(game, 'recover', { choice: 'learning', answer: 0, reason });
  if (game.phase === 'reflection') return act(game, 'reflect', { changed: reason, next: reason });
  if (game.phase === 'settlement') return act(game, 'finish', { reason });
  throw new Error(`Cannot advance a ${game.phase} mission.`);
}

function findLiveState(predicate: (game: Mission) => boolean) {
  for (let seed = 0; seed < 100; seed++) {
    let game = createMission(seed);
    for (let step = 0; step < 800 && game.phase !== 'done'; step++) {
      if (predicate(game)) {
        expect(validSave(game)).toBe(true);
        return game;
      }
      game = advance(game);
    }
  }
  throw new Error('No deterministic live-dice fixture found.');
}

describe('restored mission movement dice', () => {
  it('keeps legacy roll saves replayable while the live dice action records one authoritative movement', () => {
    const before = launch();
    const snapshot = structuredClone(before);
    const historical = act(before, 'roll', { turn: before.turn });
    expect(validSave(historical)).toBe(true);
    expect(replayMission(historical)).toEqual(historical);

    const rolled = act(before, 'roll-dice', { turn: before.turn });
    expect(rolled.turn).toBe(before.turn + 1);
    expect(rolled.animation).toBe(before.animation + 1);
    expect(rolled.path).toEqual(Array.from({ length: rolled.lastDie }, (_, index) => before.position + index + 1));
    expect(rolled.position).toBe(before.position + rolled.lastDie);
    expect(rolled.events.slice(before.events.length).filter(event => event.type === 'die' && event.data.purpose === 'movement'))
      .toHaveLength(1);
    expect(before).toEqual(snapshot);
    expect(validSave(rolled)).toBe(true);
    expect(replayMission(rolled)).toEqual(rolled);
  });

  it('deduplicates a restored roll and rejects a stale or unresolved turn without another draw', () => {
    const before = launch();
    const command = { id: 'same-restored-dice-click', type: 'roll-dice', turn: before.turn };
    const rolled = applyAction(before, command);
    const snapshot = structuredClone(rolled);
    expect(applyAction(rolled, command)).toBe(rolled);
    expect(() => act(rolled, 'roll-dice', { turn: rolled.turn })).toThrow(/current step/);
    let ready = rolled;
    if (ready.phase === 'decision') {
      const available = options(ready).filter(option => !option.disabled);
      ready = act(ready, 'choose', { choice: available.find(option => option.id === 'decline')?.id ?? available[0].id, reason });
    }
    ready = act(ready, 'continue');
    expect(ready.phase).toBe('board');
    expect(() => act(ready, 'roll-dice', { turn: before.turn })).toThrow(/stale/);
    expect(rolled).toEqual(snapshot);
    expect(validSave(ready)).toBe(true);
  });

  it('stops at Start and resumes the saved remainder after reflection and one lesson deposit', () => {
    const before = findLiveState(game => {
      if (game.phase !== 'board' || game.wallet === 0) return false;
      const preview = applyAction(game, { id: 'preview-boundary-roll', type: 'roll-dice', turn: game.turn });
      return preview.phase === 'reflection' && preview.remaining > 0;
    });
    let game = act(before, 'roll-dice', { turn: before.turn });
    expect(game.position).toBe(0);
    expect(game.path.at(-1)).toBe(0);
    expect(game.phase).toBe('reflection');
    const remainder = before.position + game.lastDie - 20;
    expect(game.remaining).toBe(remainder);
    expect(game.wallet).toBe(before.wallet);
    expect(validSave(JSON.parse(JSON.stringify(game)))).toBe(true);
    const turn = game.turn;
    const movementCount = game.events.filter(event => event.type === 'die' && event.data.purpose === 'movement').length;
    game = act(game, 'reflect', { changed: 'My customers had different budgets.', next: 'I will keep enough money for the next cost.' });
    game = act(act(lesson(game), 'deposit'), 'banner');
    game = act(game, 'offers', { price: game.price, helper: 'none', save: 0, stock: 0, reason });
    expect(game.position).toBe(remainder);
    expect(game.path).toEqual(Array.from({ length: remainder }, (_, index) => index + 1));
    expect(game.remaining).toBe(0);
    expect(game.turn).toBe(turn);
    expect(game.events.filter(event => event.type === 'die' && event.data.purpose === 'movement')).toHaveLength(movementCount);
    expect(game.ledger.filter(entry => entry.kind === 'lesson-import').map(entry => entry.quarter)).toEqual([1, 2]);
    expect(validSave(game)).toBe(true);
    expect(replayMission(game)).toEqual(game);
  });

  it('keeps a replacement chance roll on the landed tile without another movement turn', () => {
    const landed = findLiveState(game => game.phase === 'decision' && game.pending === 'returns'
      && game.sales.some(sale => !sale.returned));
    const replaced = act(landed, 'choose', { choice: 'replace', reason });
    expect(replaced.phase).toBe('outcome');
    expect(replaced.outcome?.die).toBeGreaterThanOrEqual(1);
    expect(replaced.outcome?.die).toBeLessThanOrEqual(6);
    expect(replaced.position).toBe(landed.position);
    expect(replaced.path).toEqual(landed.path);
    expect(replaced.turn).toBe(landed.turn);
    expect(replaced.animation).toBe(landed.animation);
    expect(replaced.events.slice(landed.events.length).filter(event => event.type === 'die').map(event => event.data.purpose)).toEqual(['replacement']);
    expect(validSave(replaced)).toBe(true);
  });
});
