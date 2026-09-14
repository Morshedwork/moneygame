import { test, expect, type Page } from './fixtures';
import { applyAction, createMission } from '../../packages/money-quest/engine';
import { DIE_MS, STEP_MS } from '../../apps/client/board-presentation';

function readyGame(seed: number) {
  let game = createMission(seed, 4, 'lido'), i = 0;
  const act = (type: string, data: Record<string, unknown> = {}) => { game = applyAction(game, { id: `movement-${++i}`, type, ...data }); };
  while (game.phase === 'lesson') { act('answer', { answer: 0 }); act('lesson-next', { price: 6, goal: 'Protect profit', reason: 'Compare cost and price.' }); }
  act('deposit'); act('banner');
  return game;
}
function cornerGame() {
  for (let seed = 1; seed < 100; seed++) {
    const game = readyGame(seed), rolled = applyAction(game, { id: 'inspect-seed', type: 'roll-dice', quarter: game.quarter, turn: game.turn });
    if (rolled.path.length === 6) return game;
  }
  throw new Error('No deterministic six-step fixture found');
}
async function pose(page: Page) {
  return page.locator('.quest-scene canvas').evaluate((canvas: HTMLCanvasElement) => ({
    x: Number(canvas.dataset.pawnX), z: Number(canvas.dataset.pawnZ), facing: Number(canvas.dataset.pawnFacing),
    speed: Number(canvas.dataset.pawnSpeed), distance: Number(canvas.dataset.pawnTravel), animation: canvas.dataset.pawnAnimation,
    clip: Number(canvas.dataset.pawnClipDuration), phase: Number(canvas.dataset.pawnWalkProgress),
  }));
}
for (const mobile of [false, true]) test(`distance-driven board motion rounds a corner and settles on ${mobile ? 'mobile' : 'desktop'}`, async ({ page }, testInfo) => {
  test.setTimeout(180000);
  await page.setViewportSize(mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.addInitScript(game => { localStorage.setItem('lead-money-quest-v03-local', JSON.stringify(game)); localStorage.setItem('lead-graphics-quality-v1', 'balanced'); }, cornerGame());
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', message => { if (/No target node|Couldn't load|Error loading/.test(message.text())) errors.push(message.text()); });
  await page.goto('/mission');
  const roll = page.getByRole('button', { name: 'Roll the dice', exact: true });
  await expect(roll).toBeEnabled({ timeout: 90000 });
  await page.screenshot({ path: testInfo.outputPath('board-rest.png') });
  await page.clock.install();
  await page.clock.pauseAt(new Date(Date.now() + 1000));
  await roll.click();
  await expect(page.locator('.quest-game-layout')).toHaveAttribute('data-busy', 'true');
  await page.clock.runFor(DIE_MS + 65);
  const starting = await pose(page);
  await page.clock.runFor(200);
  const cruising = await pose(page);
  expect(cruising.speed).toBeGreaterThan(starting.speed);
  expect(cruising.animation).toBe('Run'); expect(cruising.clip).toBeLessThan(.75);
  expect(cruising.phase).toBeGreaterThanOrEqual(0); expect(cruising.phase).toBeLessThan(1);
  let previous = cruising;
  // Sample the rendering path including the turn from the north to east edge.
  for (let i = 0; i < 42; i++) {
    await page.clock.runFor(100);
    const now = await pose(page);
    expect(Math.hypot(now.x - previous.x, now.z - previous.z)).toBeLessThan(.8);
    expect(Math.abs(Math.atan2(Math.sin(now.facing - previous.facing), Math.cos(now.facing - previous.facing)))).toBeLessThan(.7);
    expect(now.distance).toBeGreaterThanOrEqual(previous.distance);
    previous = now;
    if (i === 36) await page.screenshot({ path: testInfo.outputPath('board-corner.png') });
  }
  await page.clock.runFor(STEP_MS * 2);
  await expect(page.locator('.quest-game-layout')).toHaveAttribute('data-busy', 'false');
  const landed = await pose(page);
  expect(landed.x).toBeCloseTo(-6); expect(landed.z).toBeCloseTo(-10); expect(landed.animation).toBe('Idle');
  const game = await page.evaluate(() => JSON.parse(localStorage.getItem('lead-money-quest-v03-local')!));
  expect(game.position).toBe(6); expect(game.turn).toBe(1);
  expect(game.events.filter((event: any) => event.type === 'die')).toHaveLength(1);
  expect(errors).toEqual([]);
  await page.screenshot({ path: testInfo.outputPath('board-landed.png') });
});

test('village walking accelerates, turns, sprints, and stops when focus is lost', async ({ page }, testInfo) => {
  test.setTimeout(180000);
  await page.goto('/');
  await page.evaluate(async () => {
    const rulesUrl = '/packages/game-rules/index.ts', storeUrl = '/apps/client/store.ts', curriculumUrl = '/packages/curriculum/index.ts';
    const rules = await import(rulesUrl), store = await import(storeUrl), curriculum = await import(curriculumUrl);
    let player = rules.createPlayer('practice', 'Motion tester');
    for (const [index, lesson] of curriculum.lessons.entries()) player = rules.applyCommand(player, { id: `motion-lesson-${index}`, type: 'lesson', index, answer: lesson.answer }).player;
    for (const [index, question] of curriculum.gate.entries()) player = rules.applyCommand(player, { id: `motion-gate-${index}`, type: 'gate', index, answer: question.answer }).player;
    player = rules.applyCommand(player, { id: 'motion-business', type: 'setup', name: 'Motion bento', price: 6, color: '#52a7da', goal: 'Explore the village' }, 1972).player;
    player.game.phase = 'village';
    store.useGame.setState({ player: rules.publicPlayer(player), practicePrivate: player, practice: true, page: 'village', reduced: false, busy: false, error: '' });
  });
  const canvas = page.locator('canvas[data-ready="true"]');
  await expect(canvas).toBeVisible({ timeout: 90000 });
  const read = () => canvas.evaluate((el: HTMLCanvasElement) => ({ x: +el.dataset.explorerX!, z: +el.dataset.explorerZ!, facing: +el.dataset.explorerFacing!, speed: +el.dataset.explorerSpeed!, animation: el.dataset.explorerAnimation }));
  await canvas.click();
  // Use real renderer time: Three's animation clock can predate clock.install().
  await page.keyboard.down('w');
  await expect.poll(async () => (await read()).speed).toBeGreaterThan(2);
  const walking = await read(); expect(walking.speed).toBeGreaterThan(2); expect(walking.animation).toBe('Walk');
  await page.keyboard.down('Shift');
  await expect.poll(async () => (await read()).animation).toBe('Run');
  const beforeTurn = await read();
  await page.keyboard.up('w'); await page.keyboard.down('d');
  const turnFrames = await canvas.evaluate((el: HTMLCanvasElement) => new Promise<number[]>(resolve => {
    const headings: number[] = [];
    const sample = () => { headings.push(+el.dataset.explorerFacing!); if (headings.length === 20) resolve(headings); else requestAnimationFrame(sample); };
    requestAnimationFrame(sample);
  }));
  expect(turnFrames.some(facing => Math.abs(facing - beforeTurn.facing) > .03)).toBe(true);
  for (let i = 1; i < turnFrames.length; i++) {
    const change = turnFrames[i] - turnFrames[i - 1];
    // Controller caps long frames at 100 ms and turns at no more than 7 rad/s.
    expect(Math.abs(Math.atan2(Math.sin(change), Math.cos(change)))).toBeLessThan(.75);
  }
  await page.screenshot({ path: testInfo.outputPath('village-run.png') });
  await page.keyboard.up('d'); await page.keyboard.up('Shift');
  await expect.poll(async () => (await read()).animation).toBe('Idle');
  await expect.poll(async () => (await read()).speed).toBe(0);
  await page.keyboard.down('w');
  await expect.poll(async () => (await read()).speed).toBeGreaterThan(1);
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await expect.poll(async () => (await read()).animation).toBe('Idle');
  const stopped = await read();
  // Observe a later rendered frame instead of ending at the blur callback.
  await page.evaluate(() => new Promise<void>(resolve => setTimeout(resolve, 600)));
  const later = await read();
  expect(later.x).toBe(stopped.x); expect(later.z).toBe(stopped.z); expect(later.animation).toBe('Idle');
  await page.keyboard.up('w');
});
