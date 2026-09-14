import { test, expect } from './fixtures';
import { createMission, applyAction, validSave } from '../../packages/money-quest/engine';

const SAVE = 'lead-money-quest-v03-local';

test('learning stays beside the board and practice examples preserve progress', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/mission');
  await page.getByRole('checkbox', { name: /Save my practice/ }).check();
  await page.getByRole('button', { name: 'Begin Money Quest', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Set a smart price', exact: true })).toBeVisible();
  await expect(page.getByText('The difference is profit.', { exact: false })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Which amount is profit?', exact: true })).toHaveCount(0);
  const canvas = page.locator('.quest-scene canvas');
  await expect(canvas).toBeVisible({ timeout: 60000 });
  await canvas.evaluate(element => element.setAttribute('data-test-instance', 'original'));
  const saved = await page.evaluate(key => localStorage.getItem(key), SAVE);
  await page.getByRole('button', { name: 'Try with practice coins', exact: true }).click();
  await expect(page.locator('.lesson-lab')).toBeVisible();
  await expect(canvas).toHaveAttribute('data-test-instance', 'original');
  await expect(page.locator('[aria-modal="true"], .lr-report')).toHaveCount(0);
  await page.getByRole('button', { name: 'Back to my game', exact: true }).click();
  expect(await page.evaluate(key => localStorage.getItem(key), SAVE)).toBe(saved);
  await page.getByRole('button', { name: 'Start the quick quiz', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Which amount is profit?', exact: true })).toBeVisible();
  await page.locator('.play-tap-options button').first().click();
  await page.getByRole('button', { name: 'Continue learning', exact: true }).click();
  await expect(canvas).toHaveAttribute('data-test-instance', 'original');
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).lesson.step, SAVE)).toBe(1);
  await expect(page.getByText('A visitor can buy when their budget meets your effective price.', { exact: false })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Start the quick quiz', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'What does this comparison show?', exact: true })).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('mobile setup and the lesson conversation fit without horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/mission');
  await page.getByRole('checkbox', { name: /Save my practice/ }).check();
  await page.getByRole('button', { name: 'Begin Money Quest', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Set a smart price', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Start the quick quiz', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  const board = await page.locator('.play-board-stage').boundingBox();
  const chat = await page.locator('.board-conversation').boundingBox();
  expect(board!.height).toBeGreaterThan(220);
  expect(board!.y + board!.height).toBeLessThanOrEqual(chat!.y);
  expect(chat!.y + chat!.height).toBeLessThanOrEqual(845);
});

test('the real 3D board accepts one dice roll on a double tap and shows its result inline', async ({ page }) => {
  let state = createMission(5), index = 0;
  while (state.phase === 'lesson') {
    state = applyAction(state, { id: 'scene-test-' + ++index, type: 'answer', answer: 0 });
    state = applyAction(state, { id: 'scene-test-' + ++index, type: 'lesson-next', price: 6, goal: 'Protect profit', reason: 'I considered the price and cost.' });
  }
  state = applyAction(state, { id: 'scene-test-' + ++index, type: 'deposit' });
  state = applyAction(state, { id: 'scene-test-' + ++index, type: 'banner' });
  await page.addInitScript(value => localStorage.setItem('lead-money-quest-v03-local', JSON.stringify(value)), state);
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/mission');
  const roll = page.getByRole('button', { name: 'Roll the dice', exact: true });
  await expect(roll).toBeEnabled({ timeout: 60000 });
  await roll.dblclick();
  await expect(page.locator('.quest-layout')).toHaveAttribute('data-busy', 'false', { timeout: 15000 });
  await expect(page.locator('.quest-layout')).toHaveAttribute('data-phase', 'outcome');
  await expect(page.locator('.quest-scene canvas')).toBeVisible();
  await expect(page.locator('[aria-modal="true"], .lr-report')).toHaveCount(0);
  const saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), SAVE);
  expect(validSave(saved)).toBe(true);
  expect(saved.turn).toBe(1);
  expect(saved.position).toBe(1);
  expect(saved.price).toBe(6);
  expect(saved.lastDie).toBe(1);
  expect(saved.outcome).toBeTruthy();
  expect(saved.events.filter((event: any) => event.type === 'die' && event.data.purpose === 'movement')).toHaveLength(1);
  await expect(page.locator('.conversation-outcome')).toBeVisible();
  await expect(page.getByTestId('mission-roll-result')).toContainText('Rolled 1');
  await expect(page.getByRole('button', { name: 'Next roll' })).toBeVisible();
  expect(errors).toEqual([]);
});

test('malformed local progress is ignored instead of crashing the mission', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('lead-money-quest-v03-local', JSON.stringify({
    version: 'money-quest-v0.3-local-1', id: 'practice-corrupt', quarters: 4, quarter: 1,
    phase: 'lesson', wallet: 0, position: 0, events: [], ledger: [], receipts: [],
    helper: {}, fx: {}, lesson: { complete: [] },
  })));
  await page.goto('/mission');
  await expect(page.getByRole('heading', { name: 'A little stall. A lot to discover.' })).toBeVisible();
});

test('same-length progress from another tab is restored before a new action', async ({ page }) => {
  const start = createMission(73), first = applyAction(start, { id: 'tab-a-answer-1', type: 'answer', answer: 0 });
  const other = applyAction(start, { id: 'tab-b-answer-1', type: 'answer', answer: 1 });
  await page.addInitScript(value => localStorage.setItem('lead-money-quest-v03-local', JSON.stringify(value)), first);
  await page.goto('/mission');
  await expect(page.getByRole('button', { name: 'Continue learning' })).toBeVisible();
  await page.evaluate(value => localStorage.setItem('lead-money-quest-v03-local', JSON.stringify(value)), other);
  await page.getByRole('button', { name: 'Continue learning' }).click();
  await expect(page.getByRole('alert')).toContainText('another tab is restored');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('lead-money-quest-v03-local')!).receipts)).toEqual(other.receipts);
});
