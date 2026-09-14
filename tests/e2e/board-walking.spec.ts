import { test, expect, type Page } from './fixtures';
import { applyAction, createMission } from '../../packages/money-quest/engine';
import { DIE_MS, STEP_MS, TILE_TOP } from '../../apps/client/board-presentation';
import { RUN_STRIDE, smooth01, travelEnvelope } from '../../apps/client/locomotion';

function readyMission() {
  let game = createMission(5, 4, 'lido'), sequence = 0;
  const act = (type: string, data: Record<string, unknown> = {}) => {
    game = applyAction(game, { id: `full-walk-${++sequence}`, type, ...data });
  };
  while (game.phase === 'lesson') {
    act('answer', { answer: 0 });
    act('lesson-next', { price: 6, goal: 'Protect profit', reason: 'I am comparing price and cost.' });
  }
  act('deposit'); act('banner');
  return game;
}
async function pose(page: Page) {
  return page.locator('.quest-scene canvas').evaluate((canvas: HTMLCanvasElement) => ({
    animation: canvas.dataset.pawnAnimation,
    progress: Number(canvas.dataset.pawnWalkProgress),
    time: Number(canvas.dataset.pawnClipTime),
    duration: Number(canvas.dataset.pawnClipDuration),
    x: Number(canvas.dataset.pawnX), y: Number(canvas.dataset.pawnY), z: Number(canvas.dataset.pawnZ),
    distance: Number(canvas.dataset.pawnTravel), speed: Number(canvas.dataset.pawnSpeed),
    gaitDistance: Number(canvas.dataset.gaitDistance), gaitSpeed: Number(canvas.dataset.gaitSpeed),
  }));
}

function expectDistanceDrivenGait(sample: Awaited<ReturnType<typeof pose>>) {
  expect(sample.animation).toBe('Run');
  expect(sample.progress).toBeGreaterThanOrEqual(0);
  expect(sample.progress).toBeLessThan(1);
  expect(sample.time).toBeCloseTo(sample.duration * sample.progress, 2);
  expect(sample.gaitDistance).toBeCloseTo(sample.distance, 3);
  expect(sample.gaitSpeed).toBeCloseTo(sample.speed, 3);
  // Lido's source-preserving model scale and board pawn scale convert world
  // distance into stride cycles; gait phase is independent of tile time.
  const phase = (sample.distance / (RUN_STRIDE * .84 * 1.1)) % 1;
  expect(Math.abs(Math.atan2(Math.sin((sample.progress - phase) * Math.PI * 2), Math.cos((sample.progress - phase) * Math.PI * 2)))).toBeLessThan(.03);
  expect(sample.x).toBeCloseTo(-10);
  expect(sample.y).toBeCloseTo(TILE_TOP);
  expect(sample.speed).toBeGreaterThan(4);
  expect(sample.speed).toBeLessThan(7);
  // The short Start doorway offset fades out smoothly as the route begins.
  const startOffset = 1.05 * smooth01(1 - sample.distance / 2.4);
  expect(sample.z).toBeCloseTo(10 - sample.distance - startOffset, 3);
}

for (const mobile of [false, true]) test(`the grounded distance-driven stride stays visible before the result on ${mobile ? 'phone' : 'desktop'}`, async ({ page }, testInfo) => {
  test.setTimeout(120000);
  await page.setViewportSize(mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.addInitScript(game => {
    localStorage.setItem('lead-money-quest-v03-local', JSON.stringify(game));
    localStorage.setItem('lead-graphics-quality-v1', 'balanced');
  }, readyMission());
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/mission');
  const roll = page.getByRole('button', { name: 'Roll the dice', exact: true });
  await expect(roll).toBeEnabled({ timeout: 90000 });
  await page.clock.install();
  await page.clock.pauseAt(new Date(Date.now() + 1000));
  await roll.click();
  const layout = page.locator('.quest-layout');
  const canvas = page.locator('.quest-scene canvas');
  await expect(layout).toHaveAttribute('data-busy', 'true');
  await expect(canvas).toHaveAttribute('data-die-value', '1');
  await expect(canvas).toHaveAttribute('data-die-rolling', 'true');
  await expect(page.locator('.conversation-outcome')).toHaveCount(0);
  await page.clock.runFor(DIE_MS + STEP_MS * .25 + 40);
  const leftStride = await pose(page);
  expectDistanceDrivenGait(leftStride);
  expect(leftStride.distance).toBeGreaterThan(4 * travelEnvelope(.2, STEP_MS / 1000).progress);
  expect(leftStride.distance).toBeLessThan(4 * travelEnvelope(.35, STEP_MS / 1000).progress);
  expect(leftStride.z).toBeGreaterThan(6);
  await expect(canvas).toHaveAttribute('data-die-rolling', 'false');
  await expect(canvas).toHaveAttribute('data-die-visible', 'true');
  await expect(layout).toHaveAttribute('data-busy', 'true');
  await page.screenshot({ path: testInfo.outputPath('first-stride.png') });

  await page.clock.runFor(STEP_MS * .5);
  const rightStride = await pose(page);
  expectDistanceDrivenGait(rightStride);
  expect(rightStride.distance).toBeGreaterThan(4 * travelEnvelope(.7, STEP_MS / 1000).progress);
  expect(rightStride.distance).toBeLessThan(4 * travelEnvelope(.85, STEP_MS / 1000).progress);
  expect(rightStride.distance - leftStride.distance).toBeGreaterThan(RUN_STRIDE * .84 * 1.1);
  expect(rightStride.z).toBeLessThan(leftStride.z);
  expect(rightStride.z).toBeGreaterThan(6);
  await expect(page.locator('.conversation-outcome')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Next roll' })).toHaveCount(0);
  await page.screenshot({ path: testInfo.outputPath('opposite-stride.png') });

  await page.clock.runFor(STEP_MS * .25 + 80);
  const landed = await pose(page);
  expect(landed.animation).toBe('Idle');
  expect(landed.speed).toBe(0);
  expect(landed.y).toBeCloseTo(TILE_TOP);
  expect(landed.z).toBeCloseTo(6);
  await expect(layout).toHaveAttribute('data-busy', 'false');
  await expect(layout).toHaveAttribute('data-phase', 'outcome');
  await expect(page.getByRole('button', { name: 'Next roll' })).toBeInViewport();
  await expect(page.getByTestId('mission-roll-result')).toContainText('Rolled 1');
  await page.clock.runFor(1800);
  await expect(canvas).toHaveAttribute('data-die-value', '1');
  await expect(canvas).toHaveAttribute('data-die-visible', 'true');
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('lead-money-quest-v03-local')!));
  expect(saved.position).toBe(1); expect(saved.turn).toBe(1);
  expect(saved.events.filter((event: any) => event.type === 'die' && event.data.purpose === 'movement')).toHaveLength(1);
  expect(errors).toEqual([]);
});
