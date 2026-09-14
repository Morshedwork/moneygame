import { test, expect, type Page } from './fixtures';
import { applyAction, createMission, options, validSave, type Mission } from '../../packages/money-quest/engine';

const SAVE = 'lead-money-quest-v03-local';
const reason = 'I compared costs and customer budgets while keeping coins for surprises.';

/** Reach each lesson through real commands, so saved-state replay validation stays exercised. */
function lessonState(quarter: number): Mission {
  let state = createMission(2718), count = 0;
  const act = (type: string, data: Record<string, unknown> = {}) => {
    state = applyAction(state, { id: `lesson-lab-seed-${++count}`, type, ...data });
  };
  while (!(state.quarter === quarter && state.phase === 'lesson')) {
    if (count > 400) throw new Error(`Could not reach quarter ${quarter}: ${state.phase}`);
    switch (state.phase) {
      case 'lesson':
        if (!state.lesson.answered) act('answer', { answer: 0 });
        else act('lesson-next', { price: 6, goal: 'Protect profit', reason, ready: true });
        break;
      case 'deposit': act('deposit'); break;
      case 'banner': act('banner'); break;
      case 'offers': act('offers', { price: state.price, helper: 'none', save: 0, stock: 0, reinvest: false, reason }); break;
      case 'board':
        if (state.wallet === 0) act('recover', { choice: 'advance', reason });
        else act('roll-dice', { turn: state.turn });
        break;
      case 'decision': {
        const choices = options(state).filter(option => !option.disabled);
        const choice = ['decline', 'keep', '0', 'continue', 'close', 'refund'].map(id => choices.find(option => option.id === id)).find(Boolean) || choices[0];
        if (!choice) throw new Error(`No available choice for ${state.pending}`);
        act('choose', { choice: choice.id, reason });
        break;
      }
      case 'outcome': act('continue'); break;
      case 'recovery': act('recover', { choice: 'advance', reason }); break;
      case 'reflection': act('reflect', { changed: reason, next: reason }); break;
      default: throw new Error(`Unexpected seed phase ${state.phase}`);
    }
  }
  expect(validSave(state)).toBe(true);
  return state;
}

async function openLab(page: Page, quarter: number) {
  const state = lessonState(quarter), errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(({ key, value }) => localStorage.setItem(key, JSON.stringify(value)), { key: SAVE, value: state });
  await page.goto('/mission');
  await page.getByRole('button', { name: 'Try with practice coins', exact: true }).click();
  const lab = page.locator('.lesson-lab');
  await expect(lab).toBeVisible();
  await expect(page.locator('.quest-layout')).toHaveAttribute('data-quarter', String(quarter));
  const originalSave = await page.evaluate(key => localStorage.getItem(key), SAVE);
  return { lab, originalSave, errors };
}

async function unchanged(page: Page, originalSave: string | null, errors: string[]) {
  expect(await page.evaluate(key => localStorage.getItem(key), SAVE)).toBe(originalSave);
  expect(errors).toEqual([]);
}

async function range(page: Page, label: RegExp, value: number, min = 0) {
  const slider = page.locator('.lesson-lab').getByRole('slider', { name: label });
  await slider.focus();
  await slider.press('Home');
  for (let i = min; i < value; i++) await slider.press('ArrowRight');
  await expect(slider).toHaveValue(String(value));
}

test('price lab connects budgets to equal profit and keeps mission money untouched', async ({ page }) => {
  const { lab, originalSave, errors } = await openLab(page, 1);
  await range(page, /Example menu price/, 6, 4);
  await expect(lab.getByRole('status')).toContainText('12 revenue − 6 cost = 6 coins profit');
  await expect(lab.locator('.can-buy')).toHaveCount(2);
  await range(page, /Example menu price/, 5, 4);
  await expect(lab.getByRole('status')).toContainText('15 revenue − 9 cost = 6 coins profit');
  await expect(lab.locator('.can-buy')).toHaveCount(3);
  await lab.getByRole('button', { name: /Replay coin flow/ }).click();
  await expect(lab.locator('.lesson-lab-flow-track > i').first()).toHaveCSS('animation-name', 'lab-coin-travel');
  await unchanged(page, originalSave, errors);
  await page.screenshot({ path: test.info().outputPath('lesson-lab-price-desktop.png'), fullPage: true });
});

test('savings, known return choices and break-even use the full ledger', async ({ page }) => {
  const { lab, originalSave, errors } = await openLab(page, 2);
  await expect(lab.getByRole('status')).toHaveText('After tax: wallet 7, savings 3. Moving 3 to savings creates 0 profit.');
  await range(page, /Move to protected savings/, 0);
  await expect(lab.getByRole('status')).toHaveText('After tax: wallet 9, savings 0. Moving 0 to savings creates 0 profit.');
  await expect(lab.locator('dd').nth(1)).toHaveText('10% of 11, rounded up = 2');
  await lab.getByRole('button', { name: 'Returns', exact: true }).click();
  await expect(lab.getByRole('status')).toContainText('6 revenue − 3 original cost − 6 return cost = −3 coins');
  await lab.getByRole('button', { name: 'Make a replacement for 3' }).click();
  await expect(lab.getByRole('status')).toContainText('6 revenue − 3 original cost − 3 return cost = 0 coins');
  await expect(lab.getByText(/chance roll never moves your pawn/)).toBeVisible();
  await lab.getByRole('button', { name: 'Roll 1–3 · replacement plus refund', exact: true }).click();
  await expect(lab.getByRole('status')).toContainText('6 revenue − 3 original cost − 9 return cost = −6 coins');
  await lab.getByRole('button', { name: 'Roll 4–6 · replacement works', exact: true }).click();
  await expect(lab.getByRole('status')).toContainText('6 revenue − 3 original cost − 3 return cost = 0 coins');
  await lab.getByRole('button', { name: 'Refund 6', exact: true }).click();
  await expect(lab.getByRole('status')).toContainText('6 revenue − 3 original cost − 6 return cost = −3 coins');
  await lab.getByRole('button', { name: 'Break-even', exact: true }).click();
  await expect(lab.getByRole('status')).toContainText('6 revenue − 6 total costs = 0. Break-even');
  await range(page, /Example extra fee/, 5);
  await expect(lab.getByRole('status')).toContainText('6 revenue − 8 total costs = −2');
  await unchanged(page, originalSave, errors);
});

test('helper lab compares shown situations and pays wages without sales', async ({ page }) => {
  const { lab, originalSave, errors } = await openLab(page, 3);
  await range(page, /Example menu price/, 6, 4);
  await expect(lab.getByRole('status')).toContainText('12 revenue − 6 production − 1 wage = +5 today');
  await range(page, /Example menu price/, 7, 4);
  await expect(lab.getByRole('status')).toContainText('0 revenue − 0 production − 1 wage = −1 today');
  await expect(lab.getByRole('group', { name: 'Example movement roll' })).toBeVisible();
  await lab.getByRole('button', { name: 'Movement roll 1', exact: true }).click();
  await expect(lab.getByText('Helper is absent', { exact: true })).toBeVisible();
  await expect(lab.getByRole('status')).toContainText('0 revenue − 0 production − 0 wage = 0 today');
  await lab.getByRole('checkbox', { name: /Add the 2-coin reliability benefit/ }).check();
  await expect(lab.getByText('Helper is here', { exact: true })).toBeVisible();
  await expect(lab.getByRole('status')).toContainText('0 revenue − 0 production − 1 wage = −1 today. Including the benefit purchase: −3 coins.');
  await lab.getByRole('button', { name: 'Movement roll 2–6', exact: true }).click();
  await lab.getByRole('checkbox', { name: /Add the 2-coin reliability benefit/ }).uncheck();
  await expect(lab.getByText('Helper is here', { exact: true })).toBeVisible();
  await expect(lab.getByRole('status')).toContainText('The helper worked, so the wage is paid even with no sales.');
  await lab.getByRole('button', { name: 'Work alone', exact: true }).click();
  await expect(lab.getByRole('status')).toContainText('0 revenue − 0 production − 0 wage = 0 today');
  await unchanged(page, originalSave, errors);
});

test('money paths distinguish transfers, costs, stake returns and investment profit', async ({ page }) => {
  const { lab, originalSave, errors } = await openLab(page, 4);
  await expect(lab.getByRole('status')).toContainText('2 wallet + 3 savings = 5 original coins');
  await expect(lab.locator('dd').nth(1)).toHaveText('1');
  await range(page, /Set aside in savings/, 2);
  await expect(lab.getByRole('status')).toContainText('Savings below 3 do not earn the Goal interest');
  await lab.getByRole('button', { name: 'Reinvest', exact: true }).click();
  await expect(lab.getByRole('status')).toContainText('Reinvest spends 3 now and adds 1 to effective customer budgets');
  await expect(lab.getByRole('status')).toContainText('Future profit is not guaranteed');
  await lab.getByRole('button', { name: 'Stock', exact: true }).click();
  await range(page, /Example wallet stake/, 2);
  await expect(lab.getByRole('status')).toContainText('2 returned − 2 original stake = 0 coins');
  await lab.getByRole('button', { name: '1–2 Lose stake', exact: true }).click();
  await expect(lab.getByRole('status')).toContainText('0 returned − 2 original stake = −2 coins');
  await lab.getByRole('button', { name: '5–6 Double returned', exact: true }).click();
  await expect(lab.getByRole('status')).toContainText('4 returned − 2 original stake = +2 coins');
  await lab.getByRole('button', { name: '3–4 Stake returned', exact: true }).click();
  await expect(lab.getByRole('status')).toContainText('Getting your stake back is break-even, not new profit');
  await range(page, /Example wallet stake/, 0);
  await expect(lab.getByRole('status')).toContainText('Placing zero is a valid choice');
  await unchanged(page, originalSave, errors);
});

for (const quarter of [1, 2, 3, 4]) {
  test(`quarter ${quarter} lab fits 390px and honors reduced motion`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const { lab, originalSave, errors } = await openLab(page, quarter);
    await expect(lab).toHaveAttribute('data-reduced', 'true');
    await lab.getByRole('button', { name: /Replay/ }).click();
    expect(await lab.locator('*').evaluateAll(elements => elements.every(element => getComputedStyle(element).animationName === 'none'))).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    expect(await lab.evaluate(element => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
    // The focused keyboard slider still works without any animation.
    if (quarter === 1) {
      await range(page, /Example menu price/, 8, 4);
      await expect(lab.getByRole('status')).toContainText('8 revenue − 3 cost = 5 coins profit');
    }
    await unchanged(page, originalSave, errors);
    await lab.screenshot({ path: test.info().outputPath(`lesson-lab-q${quarter}-mobile.png`) });
  });
}
