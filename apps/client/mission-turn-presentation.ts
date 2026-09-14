import { replayMission, type Mission } from '../../packages/money-quest/engine';
import type { RollEvent } from './board-presentation';

/** Animate accepted engine events only; presentation never draws another number. */
export function missionAnimations(before: Mission, after: Mission, started: number): RollEvent[] {
  const dice = after.events.slice(before.events.length).filter(event => event.type === 'die');
  const path = after.animation !== before.animation ? after.path : [];
  const animations: RollEvent[] = dice.map(event => ({
    id: `${after.id}:die:${event.seq}`,
    value: Number(event.data.value),
    from: before.position,
    path: event.data.purpose === 'movement' ? path : [],
    replacement: event.data.purpose !== 'movement',
    started,
  }));
  // A lap's unused steps resume after the lesson, without rolling a second die.
  if (path.length && !dice.some(event => event.data.purpose === 'movement')) {
    animations.push({ id: `${after.id}:walk:${after.animation}`, kind: 'walk', value: 0,
      from: before.position, path, replacement: false, started });
  }
  return animations;
}

export function latestMissionDie(game: Mission | null) {
  const event = game ? [...game.events].reverse().find(event => event.type === 'die') : undefined;
  return { value: Number(event?.data.value || 0), chance: !!event && event.data.purpose !== 'movement' };
}

/** Find this visit's actual ledger changes, including after a saved-game reload. */
export function missionOutcomeTotals(game: Mission | null) {
  if (!game || game.phase !== 'outcome') return undefined;
  const actions = ['roll', 'roll-dice', 'choose', 'offers'];
  let index = game.events.length - 1;
  while (index >= 0) {
    const event = game.events[index];
    if (event.type === 'action' && actions.includes(String((event.data.command as { type?: string })?.type))) break;
    index--;
  }
  if (index < 0) return undefined;
  const before = replayMission({ ...game, events: game.events.slice(0, index) });
  const actionEntries = game.ledger.slice(before.ledger.length);
  const totals = actionEntries.reduce((totals, entry) => ({
    walletDelta: totals.walletDelta + entry.wallet, savingsDelta: totals.savingsDelta + entry.savings,
    liabilityDelta: totals.liabilityDelta + entry.liability,
  }), { walletDelta: 0, savingsDelta: 0, liabilityDelta: 0 });
  let financeEntries = actionEntries;
  if ((game.events[index].data.command as { type?: string }).type === 'offers') {
    // Boundary planning and the resumed landing share one action. Only the
    // landed sale belongs in its profit equation; balances include the plan too.
    const sale = game.events.slice(before.events.length, index).reverse().find(event => event.type === 'sales-result');
    financeEntries = sale ? game.ledger.slice(Number(sale.data.ledgerStart)) : [];
  }
  const sums = financeEntries.reduce((sums, entry) => ({
    revenue: sums.revenue + entry.revenue, cost: sums.cost + entry.cost, wage: sums.wage + entry.wage,
    expenses: sums.expenses + entry.expense, refund: sums.refund + entry.refund,
  }), { revenue: 0, cost: 0, wage: 0, expenses: 0, refund: 0 });
  return { ...totals, expenses: sums.expenses, refund: sums.refund,
    finance: { revenue: sums.revenue, cost: sums.cost, wage: sums.wage,
      profit: sums.revenue - sums.cost - sums.wage - sums.expenses - sums.refund } };
}
