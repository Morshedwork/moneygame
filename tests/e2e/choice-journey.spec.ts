import { test, expect, type Page } from './fixtures';
import { validSave } from '../../packages/money-quest/engine';

const SAVE = 'lead-money-quest-v03-local';
async function pickReasons(page: Page) {
  for (const fieldset of await page.locator('.play-reason').all()) {
    await fieldset.getByRole('button').first().click();
  }
}

test('four complete dice-driven laps preserve decisions, saved progress, and the parent report', async ({ page }) => {
  test.setTimeout(300000);
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/mission');
  await page.getByRole('checkbox', { name: /Save my practice choices/ }).check();
  await page.getByRole('button', { name: 'Begin Money Quest', exact: true }).click();
  await page.getByRole('button', { name: 'Use accessible text board' }).click();

  let reloaded = false;
  for (let step = 0; step < 400; step++) {
    const layout = page.locator('.quest-game-layout');
    await expect(layout).toHaveAttribute('data-busy', 'false');
    await expect(page.locator('.lr-report')).toHaveCount(0);
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByRole('region', { name: 'Your village game board' })).toBeVisible();
    await expect(page.locator('.quest-error')).toHaveCount(0);
    const phase = await layout.getAttribute('data-phase');
    if (phase === 'done') break;
    if (phase === 'lesson') {
      const startQuiz = page.getByRole('button', { name: 'Start the quick quiz', exact: true });
      if (await startQuiz.count()) await startQuiz.click();
      const answer = page.locator('.play-tap-options button').first();
      if (await answer.count()) await answer.click();
      else if (await page.getByRole('button', { name: 'Continue learning', exact: true }).count()) {
        await page.getByRole('button', { name: 'Continue learning', exact: true }).click();
      } else {
        await pickReasons(page);
        for (const box of await page.locator('.play-checks input[type=checkbox]').all()) await box.check();
        await page.getByRole('button', { name: 'Complete this lesson', exact: true }).click();
      }
    } else if (phase === 'deposit') {
      await page.getByRole('button', { name: 'Bring my coins to the board', exact: true }).click();
    } else if (phase === 'banner') {
      await page.getByRole('button', { name: /^(Let’s roll!|Plan my next lap)$/ }).click();
    } else if (phase === 'offers') {
      const before = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), SAVE);
      const lastQuarter = await layout.getAttribute('data-quarter') === '4';
      if (lastQuarter) await page.getByLabel('Stock stake', { exact: true }).fill('1');
      await pickReasons(page);
      await page.getByRole('button', { name: 'Try this plan', exact: true }).click();
      if (lastQuarter) {
        const saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), SAVE);
        const result = saved.events.filter((event: any) => event.type === 'investment-result').at(-1).data;
        await expect(page.locator('.play-investment-result')).toContainText(`1 staked · ${result.returned} returned`);
        // The stock roll stays separate from movement held at the lap boundary.
        expect(saved.position).toBe(before.remaining);
        expect(saved.remaining).toBe(0);
        expect(saved.turn).toBe(before.turn);
        expect(saved.events.filter((event: any) => event.type === 'die' && event.data.purpose === 'movement'))
          .toEqual(before.events.filter((event: any) => event.type === 'die' && event.data.purpose === 'movement'));
      }
    } else if (phase === 'board' || phase === 'recovery') {
      const recovery = page.getByRole('button', { name: 'Try again with 3 learning coins', exact: true });
      if (await recovery.count()) {
        await pickReasons(page);
        await page.locator('.play-tap-options button').first().click();
        await recovery.click();
      } else {
        await page.getByRole('button', { name: 'Roll the dice', exact: true }).click();
      }
    } else if (phase === 'decision') {
      await page.locator('.conversation-reply:not(:disabled)').first().click();
      await page.locator('.conversation-reason-options button').first().click();
    } else if (phase === 'outcome') {
      await expect(page.locator('.conversation-outcome')).toBeVisible();
      await page.getByRole('button', { name: 'Next roll', exact: true }).click();
    } else if (phase === 'reflection') {
      if (!reloaded) {
        const before = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), SAVE);
        await page.reload();
        await expect(page.locator('.quest-game-layout')).toHaveAttribute('data-phase', 'reflection');
        const after = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), SAVE);
        expect(after).toEqual(before);
        await page.getByRole('button', { name: 'Use accessible text board' }).click();
        reloaded = true;
      }
      await pickReasons(page);
      await page.getByRole('button', { name: 'Keep my learning and continue', exact: true }).click();
    } else if (phase === 'settlement') {
      await pickReasons(page);
      await page.getByRole('button', { name: 'Finish Money Quest', exact: true }).click();
    } else {
      throw new Error(`Unexpected phase in the dice journey: ${phase}`);
    }
  }

  await expect(page.locator('.quest-game-layout')).toHaveAttribute('data-phase', 'done');
  await expect(page.locator('.lr-report')).toHaveCount(0);
  const saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), SAVE);
  expect(validSave(saved)).toBe(true);
  expect(saved.reflections).toHaveLength(4);
  expect(saved.lesson.complete).toEqual([1, 2, 3, 4]);
  expect(saved.ledger.filter((entry: any) => entry.kind === 'lesson-import').map((entry: any) => entry.quarter)).toEqual([1, 2, 3, 4]);
  const rolls = saved.events.filter((event: any) => event.type === 'die' && event.data.purpose === 'movement');
  const decisions = saved.events.filter((event: any) => event.type === 'decision');
  const reasons = saved.events.filter((event: any) => ['decision', 'price-response', 'boundary-choice', 'recovery-choice'].includes(event.type));
  expect(rolls.length).toBeGreaterThanOrEqual(14);
  expect(rolls.every((event: any) => Number.isInteger(event.data.value) && event.data.value >= 1 && event.data.value <= 6)).toBe(true);
  expect(saved.turn).toBe(rolls.length);
  expect(decisions.length).toBeGreaterThan(0);
  expect(reasons.every((event: any) => event.data.reason.trim().length >= 3)).toBe(true);
  expect(saved.events.filter((event: any) => event.type === 'action' && event.data.command.type === 'roll-dice')).toHaveLength(rolls.length);
  const balances = saved.ledger.reduce((totals: { wallet: number; savings: number; liability: number }, entry: any) => ({
    wallet: totals.wallet + entry.wallet, savings: totals.savings + entry.savings, liability: totals.liability + entry.liability,
  }), { wallet: 0, savings: 0, liability: 0 });
  expect(balances).toEqual({ wallet: saved.wallet, savings: saved.savings, liability: saved.liability });
  expect(errors).toEqual([]);
  await page.screenshot({ path: test.info().outputPath('dice-journey-complete.png'), fullPage: true });

  await page.getByRole('button', { name: 'View parent learning report', exact: true }).click();
  await expect(page.locator('.lr-report')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Quarter-by-quarter learning', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Decisions and reasoning', exact: true })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Quarter-by-quarter learning', exact: true }).locator('tbody tr')).toHaveCount(4);
  await expect(page.getByRole('region', { name: 'Decisions and reasoning', exact: true }).locator('tbody tr')).toHaveCount(reasons.length);
  await expect(page.getByRole('region', { name: 'Reflect, adapt, try again', exact: true }).locator('tbody tr')).toHaveCount(5);
  await page.getByRole('button', { name: 'Back to my board', exact: true }).click();
  await expect(page.locator('.lr-report')).toHaveCount(0);
  await expect(page.locator('.quest-game-layout')).toHaveAttribute('data-phase', 'done');
});
