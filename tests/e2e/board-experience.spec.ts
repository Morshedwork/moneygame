import { test, expect, type Page } from './fixtures';
import { PerspectiveCamera, Vector3 } from 'three';
import { applyAction, createMission, type Mission } from '../../packages/money-quest/engine';
import { boardPosition } from '../../packages/game-rules';
import { boardNames } from '../../packages/curriculum';

const key = 'lead-money-quest-v03-local';
function readyMission(seed = 37, stopAtLesson = false) {
  let game = createMission(seed, 4, 'lido'), i = 0;
  while (game.phase === 'lesson') {
    game = applyAction(game, { id: `board-exp-${++i}`, type: 'answer', answer: 0 });
    if (stopAtLesson && game.lesson.step === 2) return game;
    game = applyAction(game, { id: `board-exp-${++i}`, type: 'lesson-next', price: 6, goal: 'Protect profit', reason: 'I compared costs and customer budgets.' });
  }
  game = applyAction(game, { id: `board-exp-${++i}`, type: 'deposit' });
  return applyAction(game, { id: `board-exp-${++i}`, type: 'banner' });
}
async function restore(page: Page, game: Mission) {
  await page.addInitScript(({ game, key }) => { if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(game)); }, { game, key });
  await page.goto('/mission');
}
async function saved(page: Page) { return page.evaluate(key => localStorage.getItem(key), key); }
async function savedGame(page: Page): Promise<Mission> { return JSON.parse((await saved(page))!); }
const canvas = (page: Page) => page.locator('.play-board-world canvas');
const chat = (page: Page) => page.locator('.board-conversation');
const rollButton = (page: Page) => page.getByRole('button', { name: 'Roll the dice', exact: true });
const firstReply = (page: Page) => page.locator('.conversation-reply:not(:disabled)').first();
const firstReason = (page: Page) => page.getByRole('group', { name: 'Choose your reason and try your choice', exact: true }).getByRole('button').first();
function expectedRoll(game: Mission) {
  return applyAction(game, { id: `board-expected-roll-${game.turn}`, type: 'roll-dice', turn: game.turn });
}
function assertMovement(game: Mission, expected: Mission) {
  expect({ turn: game.turn, position: game.position, lastDie: game.lastDie, path: game.path }).toEqual({ turn: expected.turn, position: expected.position, lastDie: expected.lastDie, path: expected.path });
  expect(game.events.filter(event => event.type === 'die' && event.data.purpose === 'movement').map(event => event.data)).toEqual(expected.events.filter(event => event.type === 'die' && event.data.purpose === 'movement').map(event => event.data));
  expect(game.events.filter(event => event.type === 'action' && (event.data.command as { type?: string })?.type === 'roll-dice')).toHaveLength(expected.events.filter(event => event.type === 'action' && (event.data.command as { type?: string })?.type === 'roll-dice').length);
}
async function villageReady(page: Page) {
  await expect(canvas(page)).toBeVisible({ timeout: 60000 });
  await expect(rollButton(page)).toBeEnabled({ timeout: 60000 });
}
async function assertBoardBesideChat(page: Page, mobile: boolean) {
  const board = await canvas(page).boundingBox(), conversation = await chat(page).boundingBox();
  expect(board).not.toBeNull(); expect(conversation).not.toBeNull();
  expect(board!.width).toBeGreaterThan(mobile ? 300 : 600);
  expect(board!.height).toBeGreaterThan(mobile ? 200 : 400);
  const overlapWidth = Math.max(0, Math.min(board!.x + board!.width, conversation!.x + conversation!.width) - Math.max(board!.x, conversation!.x));
  const overlapHeight = Math.max(0, Math.min(board!.y + board!.height, conversation!.y + conversation!.height) - Math.max(board!.y, conversation!.y));
  expect(overlapWidth * overlapHeight, 'The conversation must not cover the game canvas').toBe(0);
  if (mobile) {
    expect(board!.y + board!.height).toBeLessThanOrEqual(conversation!.y);
    expect(conversation!.height).toBeLessThanOrEqual(844 * .43 + 1);
  } else expect(board!.x + board!.width).toBeLessThanOrEqual(conversation!.x);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
}
async function bankPoint(page: Page) {
  // Project the Bank's known physical location, then send a real pointer click.
  // Do not call the inspection callback or read React state.
  const box = (await canvas(page).boundingBox())!, aspect = box.width / box.height;
  const camera = new PerspectiveCamera(35, aspect, .1, 1000);
  camera.position.set(0, 25, 32).normalize().multiplyScalar(39 * Math.max(1, (aspect < .8 ? 1.3 : 1.62) / aspect));
  camera.position.z -= .4; camera.lookAt(0, 0, -.4); camera.updateMatrixWorld();
  const [x, , z] = boardPosition(3), point = new Vector3(x, .36, z).project(camera);
  return { x: box.x + (point.x + 1) * box.width / 2, y: box.y + (1 - point.y) * box.height / 2 };
}

test('real tile exploration, orbit drag, reset and text board stay inside the game without changing coins', async ({ page }) => {
  await page.setViewportSize({ width: 1416, height: 767 });
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await restore(page, readyMission()); await villageReady(page);
  const before = await saved(page), bank = await bankPoint(page);
  await page.mouse.click(bank.x, bank.y);
  await expect(chat(page).getByRole('heading', { name: '3 · Bank', exact: true })).toBeVisible();
  await expect(chat(page).getByRole('button', { name: 'Space 3: Bank', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  for (let i = 0; i < 20; i++) await chat(page).locator('.play-space-picker button').nth(i).click();
  expect(await saved(page)).toBe(before);
  await page.getByRole('button', { name: 'Back to my game' }).click();
  await expect(chat(page).getByRole('heading', { name: 'Where will you land?' })).toBeVisible();
  await page.mouse.move(bank.x, bank.y); await page.mouse.down(); await page.mouse.move(bank.x + 180, bank.y + 75, { steps: 12 }); await page.mouse.up();
  await expect(chat(page).getByRole('heading', { name: 'Where will you land?' })).toBeVisible();
  await expect(chat(page).locator('.play-space-picker')).toHaveCount(0);
  await page.getByRole('button', { name: 'Reset board view' }).click();
  await page.mouse.click(bank.x, bank.y);
  await expect(chat(page).getByRole('button', { name: 'Space 3: Bank', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Back to my game' }).click();
  await page.getByRole('button', { name: 'Use accessible text board' }).click();
  await page.getByRole('button', { name: 'Explore space 13: Returns', exact: true }).click();
  await expect(chat(page).getByRole('heading', { name: '13 · Returns', exact: true })).toBeVisible();
  await expect(chat(page)).toContainText('Practice a kind response');
  expect(await saved(page)).toBe(before);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(errors).toEqual([]);
});

for (const mobile of [false, true]) test(`${mobile ? '390px mobile' : 'desktop'} keeps the board visible through dice, landing choice, result and cold reload`, async ({ page, context }, testInfo) => {
  await page.setViewportSize(mobile ? { width: 390, height: 844 } : { width: 1416, height: 767 });
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  const session = await context.newCDPSession(page);
  await session.send('Network.enable'); await session.send('Network.setCacheDisabled', { cacheDisabled: true });
  let boardLoads = 0;
  page.on('request', request => { if (request.url().endsWith('/models/yatai-board-village.glb')) boardLoads++; });
  await restore(page, readyMission()); await villageReady(page);
  await assertBoardBesideChat(page, mobile);
  const originalCanvas = await canvas(page).elementHandle(), before = await savedGame(page);
  const expected = expectedRoll(before);
  expect(expected.phase).toBe('decision');
  await rollButton(page).click();
  await expect(page.locator('.quest-layout')).toHaveAttribute('data-busy', 'false', { timeout: 30000 });
  await expect(page.locator('.quest-layout')).toHaveAttribute('data-phase', 'decision');
  assertMovement(await savedGame(page), expected);
  await expect(page.getByTestId('mission-roll-result')).toContainText(`Rolled ${expected.lastDie}`);
  await expect(page.getByTestId('mission-roll-result')).toContainText(boardNames[expected.position]);
  await assertBoardBesideChat(page, mobile);
  const landed = await saved(page);
  await firstReply(page).click();
  await assertBoardBesideChat(page, mobile);
  expect(await saved(page), 'A chosen reply waits for the child’s reason').toBe(landed);
  await firstReason(page).click();
  await expect(page.locator('.quest-layout')).toHaveAttribute('data-phase', 'outcome');
  await expect(page.locator('.quest-layout')).toHaveAttribute('data-busy', 'false');
  await expect(page.getByRole('button', { name: 'Next roll', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Next roll', exact: true })).toBeInViewport({ ratio: .99 });
  await expect(page.getByRole('dialog')).toHaveCount(0); await expect(page.locator('table')).toHaveCount(0);
  const after = await savedGame(page);
  assertMovement(after, expected);
  expect(after.events.filter(event => event.type === 'decision')).toHaveLength(before.events.filter(event => event.type === 'decision').length + 1);
  await expect(page.getByTestId('quest-wallet')).toHaveText(String(after.wallet));
  await expect(chat(page).locator('.conversation-outcome')).toBeVisible();
  if (after.outcome?.profit !== undefined) await expect(chat(page).locator('.conversation-result-equation')).toBeVisible();
  expect(await originalCanvas!.evaluate(element => element.isConnected && element === document.querySelector('.play-board-world canvas'))).toBe(true);
  await assertBoardBesideChat(page, mobile);
  await page.screenshot({ path: testInfo.outputPath('choice-outcome.png') });
  const persisted = await saved(page), loadsBeforeReload = boardLoads;
  await page.reload();
  await expect(page.getByRole('button', { name: 'Next roll', exact: true })).toBeVisible({ timeout: 60000 });
  await expect(page.getByRole('button', { name: 'Next roll', exact: true })).toBeInViewport({ ratio: .99 });
  await expect(page.locator('.play-board-world .scene-loading')).toHaveCount(0, { timeout: 60000 });
  await expect.poll(() => boardLoads).toBeGreaterThan(loadsBeforeReload);
  await expect(page.locator('.quest-layout')).toHaveAttribute('data-busy', 'false');
  expect(await saved(page)).toBe(persisted);
  await assertBoardBesideChat(page, mobile);
  await page.getByRole('button', { name: 'Next roll', exact: true }).click();
  await villageReady(page);
  assertMovement(await savedGame(page), expected);
  expect(errors).toEqual([]);
});

for (const mode of ['motion', 'text'] as const) test(`switching ${mode} during a dice roll settles one movement permanently without replay`, async ({ page }) => {
  await restore(page, readyMission()); await villageReady(page);
  const expected = expectedRoll(await savedGame(page));
  expect(expected.phase).toBe('decision');
  await page.clock.install(); await page.clock.pauseAt(new Date(Date.now() + 1000));
  await rollButton(page).click();
  await expect(page.locator('.quest-layout')).toHaveAttribute('data-busy', 'true');
  if (mode === 'motion') {
    await page.locator('.play-menu summary').click();
    await page.getByRole('button', { name: 'Motion: full', exact: true }).click();
    await expect(page.locator('.quest-layout')).toHaveAttribute('data-busy', 'false');
    await page.getByRole('button', { name: 'Motion: reduced', exact: true }).click();
    await page.locator('.play-menu summary').click();
  } else {
    await page.getByRole('button', { name: 'Use accessible text board' }).click();
    await expect(page.locator('.quest-layout')).toHaveAttribute('data-busy', 'false');
    await page.getByRole('button', { name: 'Show 3D board' }).click();
  }
  await expect(page.locator('.quest-layout')).toHaveAttribute('data-busy', 'false');
  await page.clock.runFor(4000);
  await expect(page.locator('.quest-layout')).toHaveAttribute('data-busy', 'false');
  await expect(page.locator('.quest-layout')).toHaveAttribute('data-phase', 'decision');
  await firstReply(page).click();
  await firstReason(page).click();
  await page.clock.runFor(4000);
  await expect(page.locator('.quest-layout')).toHaveAttribute('data-busy', 'false');
  await expect(page.getByRole('button', { name: 'Next roll', exact: true })).toBeVisible();
  const game = await savedGame(page);
  assertMovement(game, expected);
  expect(game.events.filter(event => event.type === 'decision')).toHaveLength(1);
});

test('a replacement mission clears the old plan and keeps its restore notice', async ({ page }) => {
  await restore(page, readyMission(37, true));
  await page.getByRole('slider', { name: 'Menu price', exact: true }).fill('8');
  await page.getByRole('button', { name: 'I will compare the price with my costs.', exact: true }).click();
  const other = readyMission(81, true);
  await page.evaluate(({ game, key }) => localStorage.setItem(key, JSON.stringify(game)), { game: other, key });
  await page.getByRole('button', { name: 'Complete this lesson', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('another tab');
  await expect(page.getByRole('button', { name: 'I will compare the price with my costs.', exact: true })).toHaveAttribute('aria-pressed', 'false');
  await expect(page.getByRole('button', { name: 'Complete this lesson', exact: true })).toBeDisabled();
  await expect(page.getByRole('slider', { name: 'Menu price', exact: true })).toHaveValue('6');
  expect((await savedGame(page)).id).toBe(other.id);
});

test('a same-price replacement mission clears a selected reply and drafted own reason', async ({ page }) => {
  await restore(page, readyMission(37)); await villageReady(page);
  await rollButton(page).click();
  await expect(page.locator('.quest-layout')).toHaveAttribute('data-busy', 'false', { timeout: 30000 });
  await expect(page.locator('.quest-layout')).toHaveAttribute('data-phase', 'decision');
  await firstReply(page).click();
  await page.getByRole('button', { name: 'I have my own reason', exact: true }).click();
  await page.getByRole('textbox', { name: 'My reason', exact: true }).fill('This draft belongs only to my first business plan.');
  await expect(page.locator('.conversation-reply')).toHaveCount(1);
  await expect(page.locator('.conversation-reply')).toHaveAttribute('aria-pressed', 'true');
  const other = readyMission(81);
  expect(other.phase).toBe('board'); expect(other.price).toBe(6);
  await page.evaluate(({ game, key }) => localStorage.setItem(key, JSON.stringify(game)), { game: other, key });
  await page.getByRole('button', { name: 'Try my choice', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('another tab');
  await expect(page.locator('.conversation-reply')).toHaveCount(0);
  await expect(rollButton(page)).toBeEnabled();
  await expect(chat(page).getByRole('heading', { name: 'Where will you land?' })).toBeVisible();
  await expect(page.locator('.conversation-reply[aria-pressed="true"]')).toHaveCount(0);
  await expect(page.getByRole('textbox', { name: 'My reason', exact: true })).toHaveCount(0);
  await expect(page.locator('.conversation-reason')).toHaveCount(0);
  const restored = await savedGame(page);
  expect(restored.id).toBe(other.id); expect(restored.turn).toBe(0);
  expect(restored.events.filter(event => event.type === 'decision' || (event.type === 'die' && event.data.purpose === 'movement'))).toHaveLength(0);
});
