import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { applyAction, createMission } from '../../packages/money-quest/engine';
import { OutcomeChat } from '../../apps/client/learning/BoardConversation';

describe('the child sees the full money consequence', () => {
  it('shows the unpaid part of a refund even when the two-sentence guide omits it', () => {
    const game = createMission(37);
    game.phase = 'decision'; game.pending = 'returns'; game.position = 13; game.wallet = 1;
    game.sales = [{ price: 6, returned: false }];
    const result = applyAction(game, { id: 'refund-with-obligation', type: 'choose', choice: 'refund', reason: 'I want to return the original payment.' });
    const html = renderToStaticMarkup(createElement(OutcomeChat, {
      outcome: { ...result.outcome!, revenue: 0, cost: 0, wage: 0, profit: -6 }, showText: false,
      walletDelta: result.wallet - game.wallet, expenses: 0, refund: 6,
      liabilityDelta: result.liability - game.liability, liabilityTotal: result.liability,
    }));
    expect(html).toContain('5 coins still need to be paid from this choice.');
    expect(html).toContain('5 owed in total.');
    expect(html).toContain('Revenue 0, minus total costs and refunds 6, equals -6 coins profit on this visit.');
  });

  it('includes a delivery expense in the result equation', () => {
    const game = createMission(37);
    game.phase = 'decision'; game.pending = 'market'; game.card = 2; game.wallet = 10; game.price = 6;
    game.customerDeck = [8, 8];
    const result = applyAction(game, { id: 'paid-delivery', type: 'choose', choice: 'deliver', reason: 'I want to see whether the extra sales cover delivery.' });
    const html = renderToStaticMarkup(createElement(OutcomeChat, {
      outcome: { ...result.outcome!, profit: 4 }, expenses: 2, refund: 0,
    }));
    expect(result.outcome).toMatchObject({ revenue: 12, cost: 6, wage: 0 });
    expect(html).toContain('Revenue 12, minus total costs and refunds 8, equals 4 coins profit on this visit.');
    expect(html).not.toContain('owed in total');
  });
});
