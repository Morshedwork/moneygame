import { boardNames } from '../../packages/curriculum';
import type { Mission } from '../../packages/money-quest/engine';

/** Explore the rules without drawing a card, previewing RNG, or changing money. */
export function boardStopInfo(game: Mission, space: number) {
  const stops: Record<string, { title: string; guide: string; options: string[] }> = {
    Start: { title: 'A new lap of ideas', guide: 'Finish the lap, reflect, and learn the next idea. Any unused dice steps wait until your next plan is ready. The final lap ends your adventure.', options: ['Reflect on your choices', 'Learn and plan for the next lap'] },
    'Sales Day': { title: 'Meet your customers', guide: 'A customer visits your stall. Their budget and your price decide whether they buy. Advertising and a working helper can bring extra visitors; count production costs and wages before profit.', options: ['See what customers can afford', 'Keep or revise your next price'] },
    Omikuji: { title: 'A fortune to discover', guide: 'Landing here draws a fortune. It might bring an opportunity or a setback. Read the card, then choose your response from the options it offers.', options: ['Discover a fortune', 'Consider its costs and possible benefits'] },
    Bank: { title: 'A buffer for tomorrow', guide: 'Move up to 5 wallet coins into protected savings. Saving is a transfer: it is neither sales income nor an expense.', options: [`Save 0–${Math.min(5, game.wallet)} coins`, 'Keep a wallet buffer for surprises'] },
    'Big Sale': { title: 'Choose before the reveal', guide: 'Three customers are coming. Keep your price or offer a 1-coin discount, then discover their budgets. Count every cost when comparing your result.', options: [`Keep price ${game.price}`, `Discount to ${game.price - 1}`] },
    Advertising: { title: 'Invite the village', guide: 'Spend 0, 2, or 4 coins for 1, 2, or 3 extra visitors at your next landed sales opportunity. Visitors still need enough money to buy.', options: ['Spend 0 → 1 extra visitor', 'Spend 2 → 2 extra visitors', 'Spend 4 → 3 extra visitors'] },
    Returns: { title: 'Practice a kind response', guide: 'If an earlier sale needs a refund, return its original price or try a replacement at production cost. A replacement rolls its own die: 1–3 also needs a refund. This roll does not move your character.', options: ['Give the full refund', 'Try a replacement', 'No earlier sale means no refund is needed'] },
    'Market Change': { title: 'Adapt to a changing market', guide: 'Reveal a market event when you land. Weather, costs, or customer needs can change. Read the event and compare the choices it offers before spending.', options: ['Discover the market event', 'Choose how your stall responds'] },
    'Festival Plaza': { title: 'A festival for everyone', guide: 'Contribute an inventory token or 2 coins to support the festival and improve the next customer budget. You can also enjoy a visit from one customer.', options: ['Enjoy the festival', 'Contribute 2 coins', 'Contribute 1 inventory token if available'] },
    'Town Hall': { title: 'Your community visit', guide: game.quarter === 1 ? 'Take a free tour this lap. From the next lap, tax is 10% of your wallet rounded up; savings are excluded. Any loan repayment is counted separately.' : 'Pay 10% of your wallet rounded up, unless a card changes it. Savings are excluded. Loan repayments and other obligations are counted separately.', options: [game.quarter === 1 ? 'Take the free tour' : 'Settle Town Hall'] },
    'Sparko’s Bench': { title: 'Pause with Sparko', guide: 'Review your coin history or a money word. Notice what changed, then keep your price or revise it by one coin for the next opportunity.', options: ['Review my next step', 'Keep or revise my next price'] },
  };
  return stops[boardNames[space]] ?? stops.Start;
}
