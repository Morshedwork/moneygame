import type { Game } from '../../../packages/game-rules';
import { fortunes } from '../../../packages/game-rules/content';
import { boardNames } from '../../../packages/curriculum';

export type CardGame = Pick<Game, 'turn' | 'phase' | 'position' | 'pending' | 'card' | 'price' | 'wallet' | 'savings' | 'liability' | 'effects' | 'sales' | 'ledger' | 'outcome'>;
export type Balance = Pick<Game, 'wallet' | 'savings' | 'liability'>;
export type CardChoice = { value: string; title: string; detail: string; disabled?: boolean };
export const balances = (g: Balance): Balance => ({ wallet: g.wallet, savings: g.savings, liability: g.liability });
export const eventKey = (g: CardGame) => JSON.stringify([g.turn, g.position, g.pending, g.outcome, g.ledger.at(-1)?.id]);
export const shouldPresentCard = (g: CardGame, motion: boolean, myTurn: boolean, lastShown: string) =>
  !motion && g.phase === 'board' && (!g.pending || myTurn) && g.turn > 0 && !!g.outcome && eventKey(g) !== lastShown;
export const coinLimit = (g: CardGame) => Math.max(0, Math.min(g.pending === 'bank' ? 5 : 2, g.wallet));
export const clampCoins = (amount: number, limit: number) => Number.isFinite(amount) ? Math.max(0, Math.min(limit, Math.floor(amount))) : 0;

const guidance: Record<string, { concept: string; why: string; question: string; answers: string[]; correct: number; feedback: string }> = {
  bank: { concept: 'A transfer, not an expense', why: 'Saving moves coins you already own. Your wallet goes down, your savings go up by the same amount, and your total coins and profit stay the same.', question: 'When you move 2 coins into savings, what changes?', answers: ['Where my coins are kept', 'My total money increases'], correct: 0, feedback: 'The coins change places. Wallet + savings stays the same; saving does not create income or reduce profit.' },
  festival: { concept: 'A contribution is an expense', why: 'You can contribute up to 2 coins, or choose 0. A contribution helps the village festival but reduces the coins in your wallet and your business profit.', question: 'Is a festival contribution sales revenue?', answers: ['Yes, it is money from customers', 'No, it is a community expense'], correct: 1, feedback: 'A contribution is money out, not money earned from a customer. Choosing 0 is allowed.' },
  advertising: { concept: 'Visitors are not guaranteed sales', why: 'Your plan adds visitors to the next sales opportunity. Each visitor still needs a budget that can afford your bento. Advertising costs are paid now.', question: 'Do three extra visitors guarantee three sales?', answers: ['Yes, every visitor buys', 'No, each visitor has a budget'], correct: 1, feedback: 'A visit is an opportunity, not a promise. Price and customer budgets decide whether a sale happens.' },
  'big-sale': { concept: 'Price and affordability', why: 'Choose your normal price or a one-time 1-coin discount before seeing customer budgets. The discount may help more visitors afford a bento, but changes the profit on each sale.', question: 'Does a discount always increase total profit?', answers: ['No, it depends on the customers and costs', 'Yes, a lower price always earns more'], correct: 0, feedback: 'More sales and more profit are not the same thing. Costs and the number of customers who can afford the price both matter.' },
  returns: { concept: 'Fairness has a cost', why: 'A refund returns the latest eligible sale price; its original production cost still happened. A replacement costs 3 coins. On a roll of 1–3 you also refund the customer; 4–6 succeeds.', question: 'Does a refund erase the original production cost?', answers: ['Yes, the cost disappears', 'No, the ingredients were already used'], correct: 1, feedback: 'The first bento was still made. Its production cost remains even after the customer receives a refund.' },
  fortune: { concept: 'An opportunity you can decline', why: 'Read the card’s fee and effect before choosing. Some benefits apply only at the next sales opportunity. Keeping your coins is a valid decision.', question: 'Must you pay for an optional opportunity?', answers: ['No, I can choose to keep my coins', 'Yes, every card must be purchased'], correct: 0, feedback: 'Optional means you have a choice. Preview the cost and consider whether it fits your plan.' },
  ack: { concept: 'Shared services', why: 'Town Hall explains how communities use taxes for shared services. There is no tax payment in this quarter, so nothing is deducted.', question: 'Does this Town Hall visit take coins in Quarter 1?', answers: ['Yes', 'No'], correct: 1, feedback: 'No coins are taken at Town Hall in this quarter.' },
  bench: { concept: 'Reflect, then adapt', why: 'Think about a recent customer or cost. After this pause you can keep your price or change it by one coin, within the 4–8 coin menu range.', question: 'What can help you choose your next price?', answers: ['What I noticed about budgets and costs', 'Assuming everyone has the same budget'], correct: 0, feedback: 'Use what happened to make your next decision. There is no single perfect price for every customer.' },
};

export function cardGuidance(g: CardGame) {
  if (g.pending && guidance[g.pending]) return guidance[g.pending];
  if (g.outcome?.sales !== undefined) return { concept: 'Revenue − cost = profit', why: 'Revenue is what customers paid. Subtract the cost of the bentos actually sold to find profit. A visitor who cannot afford the price does not buy, so no bento is made for them.', question: 'A bento earns 6 coins and costs 3 to make. What is the profit?', answers: ['6 coins', '3 coins'], correct: 1, feedback: '6 revenue − 3 cost = 3 profit. Revenue and profit are different.' };
  if (boardNames[g.position] === 'Bank') return guidance.bank;
  if (boardNames[g.position] === 'Festival Plaza') return guidance.festival;
  if (boardNames[g.position] === 'Advertising') return guidance.advertising;
  if (boardNames[g.position] === 'Returns') return guidance.returns;
  if (boardNames[g.position] === 'Town Hall') return guidance.ack;
  if (boardNames[g.position] === 'Sparko’s Bench') return guidance.bench;
  return { concept: 'Now or next time?', why: 'Read when this event applies. A gift is not sales revenue. A fee or repair is money out. An effect marked “next sales opportunity” waits until that opportunity and is then used once.', question: 'How often is a “next sales opportunity” effect used?', answers: ['Once, at the next sales opportunity', 'At every sale for the rest of the game'], correct: 0, feedback: 'It waits for the next opportunity and is used once. It does not last forever.' };
}

export function turnImpact(g: CardGame) {
  return g.ledger.filter(entry => entry.turn === g.turn).reduce((sum, entry) => ({
    profit: sum.profit + entry.revenue - entry.cost - entry.expense - entry.refund,
    wallet: sum.wallet + entry.walletDelta,
    savings: sum.savings + entry.savingsDelta,
    liability: sum.liability + entry.liabilityDelta,
  }), { profit: 0, wallet: 0, savings: 0, liability: 0 });
}

export function cardChoices(g: CardGame): CardChoice[] {
  switch (g.pending) {
    case 'big-sale': return [
      { value: 'keep', title: `Keep price · ${g.price} coins`, detail: 'Use your current menu price for this opportunity.' },
      { value: 'discount', title: `One-time discount · ${g.price - 1} coins`, detail: 'One coin less per bento. Your regular menu price stays the same.' },
    ];
    case 'advertising': return [0, 2, 4].map(n => ({ value: String(n), title: `${n} coins · ${n / 2 + 1} extra visitor${n ? 's' : ''}`, detail: n > g.wallet ? 'Not enough coins in your wallet.' : 'Added to the next sales opportunity; purchases are not guaranteed.', disabled: n > g.wallet }));
    case 'returns': {
      const sale = [...g.sales].reverse().find(s => !s.returned);
      return [
        { value: 'refund', title: `Give a fair refund · ${sale?.price ?? 0} coins`, detail: 'Return the eligible sale price. No replacement roll.', disabled: !sale },
        { value: 'replace', title: 'Try a replacement · 3 coins', detail: `Roll 4–6: replacement succeeds. Roll 1–3: also refund ${sale?.price ?? 0} coins.`, disabled: !sale },
      ];
    }
    case 'fortune': {
      const card = fortunes[g.card];
      const fee = card && 'fee' in card ? card.fee : 0;
      return [
        { value: 'decline', title: 'Keep my coins', detail: 'Decline this optional opportunity. No fee and no new benefit.' },
        { value: 'accept', title: `Take this opportunity · ${fee} coin${fee === 1 ? '' : 's'}`, detail: fee > g.wallet ? 'Not enough coins in your wallet.' : card?.text || 'Read the opportunity before deciding.', disabled: fee > g.wallet },
      ];
    }
    default: return [];
  }
}

function spend(g: CardGame, expense: number): Balance {
  return { wallet: Math.max(0, g.wallet - expense), savings: g.savings, liability: g.liability + Math.max(0, expense - g.wallet) };
}

/** A read-only preview. Random outcomes are NEVER sampled here; the existing command engine settles them. */
export function previewChoice(g: CardGame, choice: string, amount: number) {
  let after = balances(g), command: Record<string, unknown> = {}, note = 'No coins change hands.', confirm = 'Continue', allowed = true;
  let uncertain = false, profitDelta = 0, perBento: number | undefined;
  if (g.pending === 'bank' || g.pending === 'festival') {
    const n = clampCoins(amount, coinLimit(g)); command = { amount: n };
    after = { ...after, wallet: g.wallet - n, savings: g.savings + (g.pending === 'bank' ? n : 0) };
    profitDelta = g.pending === 'bank' ? 0 : -n;
    confirm = n === 0 ? g.pending === 'bank' ? 'Keep coins in my wallet' : 'Continue without contributing' : `${g.pending === 'bank' ? 'Save' : 'Contribute'} ${n} coin${n === 1 ? '' : 's'}`;
    note = g.pending === 'bank' ? `Wallet + savings stays ${g.wallet + g.savings} coins. Profit does not change.` : `${n} coins go to the festival. This is an expense, not a transfer to your savings.`;
  } else if (g.pending === 'advertising') {
    const n = Number(choice); allowed = [0, 2, 4].includes(n) && n <= g.wallet;
    command = { amount: n }; if (allowed) after = spend(g, n);
    profitDelta = allowed ? -n : 0; confirm = `Choose the ${n}-coin plan`;
    note = `${n / 2 + 1} extra visitors next time. The ${n}-coin advertising expense is paid now; sales are not guaranteed.`;
  } else if (g.pending === 'big-sale') {
    allowed = ['keep', 'discount'].includes(choice); const discount = choice === 'discount' ? 1 : 0;
    command = { discount }; uncertain = true; confirm = `Serve at ${g.price - discount} coins`;
    const cost = Math.max(1, 3 + g.effects.reduce((n, e) => n + e.cost, 0));
    perBento = g.price - discount - cost;
    note = `Each sold bento: ${g.price - discount} price − ${cost} cost = ${perBento} profit. Customer budgets stay hidden until you confirm.`;
  } else if (g.pending === 'fortune') {
    const card = fortunes[g.card]; const fee = card && 'fee' in card ? card.fee : 0;
    const accept = choice === 'accept'; command = { accept };
    allowed = ['accept', 'decline'].includes(choice) && (!accept || fee <= g.wallet);
    if (accept && allowed) { after = spend(g, fee); profitDelta = -fee; }
    confirm = accept ? `Pay ${fee} coin${fee === 1 ? '' : 's'} and accept` : 'Keep my coins';
    note = accept ? card?.text || '' : 'Your coins stay where they are. No new effect is added.';
  } else if (g.pending === 'returns') {
    const sale = [...g.sales].reverse().find(s => !s.returned);
    allowed = !!sale && ['refund', 'replace'].includes(choice); command = { choice };
    const cost = choice === 'replace' ? 3 : sale?.price || 0;
    after = spend(g, cost); profitDelta = -cost; uncertain = choice === 'replace';
    confirm = choice === 'replace' ? 'Try replacement & roll' : 'Confirm the refund';
    note = choice === 'replace' ? `Shown: the 3-coin replacement cost. A roll of 1–3 also refunds ${sale?.price || 0} coins (${cost + (sale?.price || 0)} total).` : 'The original production cost still happened. This refund is not a new sale.';
  } else if (g.pending === 'bench') confirm = 'Reflect, then review my price';
  else if (g.pending === 'ack') confirm = 'Got it · no tax this quarter';
  if (after.liability > g.liability) note += ` A recovery advance of ${after.liability - g.liability} coins is needed. It is money owed, not income.`;
  return { after, command, note, confirm, allowed, uncertain, profitDelta: profitDelta || 0, perBento };
}
