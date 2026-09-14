import { test, expect, type Page } from './fixtures';
import { applyAction, createMission, options, validSave, type Mission } from '../../packages/money-quest/engine';
import { DIE_MS, DIE_ROLL_MS, STEP_MS, TILE_TOP } from '../../apps/client/board-presentation';
import { sampleDiceRoll } from '../../apps/client/dice-animation';

const SAVE = 'lead-money-quest-v03-local';
let sequence = 0;
const act = (game: Mission, type: string, data: Record<string, unknown> = {}) =>
  applyAction(game, { id: `dice-browser-${++sequence}`, type, ...data });
function ready(seed: number) {
  let game = createMission(seed, 4, 'diva');
  while (game.phase === 'lesson') {
    game = act(game, 'answer', { answer: 0 });
    game = act(game, 'lesson-next', { price: 6, goal: 'Protect profit', reason: 'I compared my price and cost.' });
  }
  return act(act(game, 'deposit'), 'banner');
}
function readyForRepeatedOnes() {
  for (let seed = 0; seed < 500; seed++) {
    const candidate = ready(seed), first = act(candidate, 'roll-dice', { turn: 0 });
    if (first.lastDie !== 1) continue;
    const second = act(act(first, 'continue'), 'roll-dice', { turn: 1 });
    if (second.lastDie === 1) return candidate;
  }
  throw new Error('No deterministic repeated-one fixture found.');
}
function readyForReplacement() {
  const reason = 'I compared the available choices and kept enough coins for costs.';
  for (let seed = 0; seed < 100; seed++) {
    let game = ready(seed);
    for (let step = 0; step < 800 && game.phase !== 'done'; step++) {
      if (game.phase === 'decision' && game.pending === 'returns' && game.sales.some(sale => !sale.returned)) {
        if (!validSave(game)) throw new Error('The replacement fixture is not replayable.');
        return game;
      }
      if (game.phase === 'lesson') game = game.lesson.answered
        ? act(game, 'lesson-next', { price: game.price, goal: game.goal, reason, ready: true })
        : act(game, 'answer', { answer: 0 });
      else if (game.phase === 'deposit' || game.phase === 'banner') game = act(game, game.phase);
      else if (game.phase === 'offers') game = act(game, 'offers', { price: game.price, helper: 'none', save: 0, stock: 0, reinvest: false, reason });
      else if (game.phase === 'board') game = game.wallet === 0
        ? act(game, 'recover', { choice: 'learning', answer: 0, reason })
        : act(game, 'roll-dice', { turn: game.turn });
      else if (game.phase === 'decision') {
        const available = options(game).filter(option => !option.disabled);
        const selected = ['decline', 'keep', '0', 'continue', 'close', 'enjoy']
          .map(id => available.find(option => option.id === id)).find(Boolean) ?? available[0];
        game = act(game, 'choose', { choice: selected.id, reason });
      } else if (game.phase === 'outcome') game = act(game, 'continue');
      else if (game.phase === 'recovery') game = act(game, 'recover', { choice: 'learning', answer: 0, reason });
      else if (game.phase === 'reflection') game = act(game, 'reflect', { changed: reason, next: reason });
      else if (game.phase === 'settlement') game = act(game, 'finish', { reason });
    }
  }
  throw new Error('No deterministic live replacement fixture found.');
}
async function visiblePose(page: Page) {
  return page.locator('.quest-scene canvas').evaluate((canvas: HTMLCanvasElement) => ({
    progress: Number(canvas.dataset.dieProgress),
    rotation: JSON.parse(canvas.dataset.dieRotation!) as number[],
    lift: Number(canvas.dataset.dieLift),
    offsetX: Number(canvas.dataset.dieOffsetX), offsetZ: Number(canvas.dataset.dieOffsetZ),
    scale: Number(canvas.dataset.dieScale),
    pawn: [Number(canvas.dataset.pawnX), Number(canvas.dataset.pawnY), Number(canvas.dataset.pawnZ)],
    travel: Number(canvas.dataset.pawnTravel),
  }));
}

for (const mobile of [false, true]) test(`the complete tumble and readable result precede movement on repeated ones on ${mobile ? 'phone' : 'desktop'}`, async ({ page }, testInfo) => {
  test.setTimeout(180000);
  await page.setViewportSize(mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.addInitScript(game => {
    localStorage.setItem('lead-money-quest-v03-local', JSON.stringify(game));
    localStorage.setItem('lead-graphics-quality-v1', 'balanced');
  }, readyForRepeatedOnes());
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/mission');
  const canvas = page.locator('.quest-scene canvas');
  const layout = page.locator('.quest-layout');
  const button = page.getByRole('button', { name: 'Roll the dice', exact: true });
  await expect(button).toBeEnabled({ timeout: 90000 });
  await expect(canvas).toHaveAttribute('data-pawn-animation', 'Idle');
  await page.clock.install();
  await page.clock.pauseAt(new Date(Date.now() + 1000));
  const rollIds: string[] = [];

  for (let turn = 1; turn <= 2; turn++) {
    const origin = (await visiblePose(page)).pawn;
    await button.dblclick();
    await expect(layout).toHaveAttribute('data-busy', 'true');
    await expect(button).toBeDisabled();
    await expect(canvas).toHaveAttribute('data-die-value', '1');
    const cube = page.locator('.mission-dice-cube');
    const hud = page.locator('.mission-dice');
    await expect(cube.locator('.mission-dice-face')).toHaveCount(6);
    for (let face = 1; face <= 6; face++) {
      await expect(cube.locator(`[data-face="${face}"] .mission-dice-pip[data-lit="true"]`)).toHaveCount(face);
    }
    rollIds.push((await cube.getAttribute('data-roll-id'))!);
    let advanced = 0;
    const advanceTo = async (elapsed: number) => {
      await page.clock.runFor(elapsed - advanced);
      advanced = elapsed;
      return visiblePose(page);
    };
    const orientations: string[] = [], cubeTransforms: string[] = [], lifts: number[] = [];
    for (const elapsed of [120, 420, 850, 1280]) {
      const pose = await advanceTo(elapsed);
      await expect(canvas).toHaveAttribute('data-die-rolling', 'true');
      await expect(hud).toHaveAttribute('data-state', 'rolling');
      expect(pose.pawn).toEqual(origin);
      expect(pose.travel).toBe(0);
      expect(pose.progress).toBeGreaterThan(0);
      expect(pose.progress).toBeLessThan(1);
      const expectedPose = sampleDiceRoll(1, pose.progress);
      pose.rotation.forEach((angle, index) => expect(angle).toBeCloseTo(expectedPose.rotation[index], 2));
      expect(pose.lift).toBeCloseTo(expectedPose.lift, 3);
      expect(pose.offsetX).toBeCloseTo(expectedPose.offsetX, 3);
      expect(pose.offsetZ).toBeCloseTo(expectedPose.offsetZ, 3);
      expect(pose.scale).toBeCloseTo(1.55 * expectedPose.scale, 3);
      expect(Number(await cube.getAttribute('data-progress'))).toBeCloseTo(pose.progress, 3);
      orientations.push(JSON.stringify(pose.rotation));
      cubeTransforms.push(await cube.evaluate(element => (element as HTMLElement).style.transform));
      lifts.push(pose.lift);
      await expect(page.locator('.conversation-outcome')).toHaveCount(0);
      if (turn === 1 && elapsed === 850) await page.screenshot({ path: testInfo.outputPath('mid-tumble.png') });
    }
    expect(new Set(orientations).size).toBe(4);
    expect(new Set(cubeTransforms).size).toBe(4);
    expect(Math.max(...lifts) - Math.min(...lifts)).toBeGreaterThan(.1);

    const settled = await advanceTo(DIE_ROLL_MS + 100);
    expect(settled.progress).toBe(1);
    expect(settled.lift).toBe(0);
    expect(settled.pawn).toEqual(origin);
    expect(settled.travel).toBe(0);
    await expect(canvas).toHaveAttribute('data-die-rolling', 'true');
    await expect(hud).toHaveAttribute('data-state', 'settled');
    await expect(hud).toContainText('You rolled 1');
    await expect(button).toBeDisabled();
    const heldTransform = await cube.evaluate(element => (element as HTMLElement).style.transform);
    const held = await advanceTo(DIE_MS - 70);
    expect(held.rotation).toEqual(settled.rotation);
    expect(held.pawn).toEqual(origin);
    expect(await cube.evaluate(element => (element as HTMLElement).style.transform)).toBe(heldTransform);
    await expect(layout).toHaveAttribute('data-busy', 'true');
    await page.screenshot({ path: testInfo.outputPath(`roll-${turn}-readable-result.png`) });

    const moving = await advanceTo(DIE_MS + STEP_MS * .3);
    expect(moving.travel).toBeGreaterThan(0);
    expect(moving.pawn[1]).toBeCloseTo(TILE_TOP);
    expect(moving.pawn[2]).toBeLessThan(origin[2]);
    await expect(canvas).toHaveAttribute('data-die-rolling', 'false');
    await expect(hud).toHaveAttribute('data-state', 'moving');
    await expect(hud).toContainText('You rolled 1');
    await expect(button).toBeDisabled();
    await advanceTo(DIE_MS + STEP_MS + 100);
    await expect(layout).toHaveAttribute('data-busy', 'false');
    await expect(layout).toHaveAttribute('data-phase', turn === 1 ? 'outcome' : 'decision');
    await expect(page.getByTestId('mission-roll-result')).toContainText('Rolled 1');
    const saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), SAVE);
    expect(validSave(saved)).toBe(true);
    expect(saved.turn).toBe(turn); expect(saved.position).toBe(turn);
    expect(saved.events.filter((event: any) => event.type === 'die' && event.data.purpose === 'movement')).toHaveLength(turn);
    if (turn === 1) await page.getByRole('button', { name: 'Next roll', exact: true }).click();
  }
  expect(rollIds[0]).toBeTruthy();
  expect(rollIds[1]).toBeTruthy();
  expect(rollIds[1]).not.toBe(rollIds[0]);
  expect(errors).toEqual([]);
});

test('reduced motion shows the accepted 3D face and destination immediately', async ({ page }) => {
  test.setTimeout(120000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(game => {
    localStorage.setItem('lead-money-quest-v03-local', JSON.stringify(game));
    localStorage.setItem('lead-graphics-quality-v1', 'balanced');
  }, ready(5));
  await page.goto('/mission');
  const button = page.getByRole('button', { name: 'Roll the dice', exact: true });
  await expect(button).toBeEnabled({ timeout: 90000 });
  await button.dblclick();
  await expect(page.locator('.quest-layout')).toHaveAttribute('data-busy', 'false');
  await expect(page.getByTestId('mission-roll-result')).toContainText('Rolled 1');
  const canvas = page.locator('.quest-scene canvas');
  await expect(canvas).toHaveAttribute('data-die-rolling', 'false');
  await expect(canvas).toHaveAttribute('data-die-value', '1');
  const pose = await visiblePose(page);
  expect(pose.progress).toBe(1);
  expect(pose.lift).toBe(0);
  expect(pose.pawn).toEqual([-10, TILE_TOP, 6]);
  const saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), SAVE);
  expect(saved.turn).toBe(1); expect(saved.position).toBe(1);
  expect(saved.events.filter((event: any) => event.type === 'die' && event.data.purpose === 'movement')).toHaveLength(1);
});

test('profit includes delivery fees and exploring a fortune does not draw it', async ({ page }) => {
  let game = ready(12);
  game = act(game, 'roll-dice', { turn: game.turn });
  if (game.phase === 'decision') game = act(game, 'choose', { choice: options(game).find(option => !option.disabled)!.id, reason: 'I compared the available options.' });
  game = act(act(game, 'continue'), 'roll-dice', { turn: game.turn });
  expect(game.pending).toBe('market'); expect(game.card).toBe(2);
  game = act(game, 'choose', { choice: 'deliver', reason: 'I want to deliver for customers.' });
  expect(validSave(game)).toBe(true);
  await page.addInitScript(game => localStorage.setItem('lead-money-quest-v03-local', JSON.stringify(game)), game);
  await page.goto('/mission');
  await page.getByRole('button', { name: 'Use accessible text board' }).click();
  await expect(page.locator('.conversation-result-equation')).toHaveAttribute('aria-label', 'Revenue 12, minus total costs and refunds 8, equals 4 coins profit on this visit.');
  await expect(page.locator('.play-success')).toContainText('4 coins profit');
  await page.getByRole('button', { name: 'Explore space 12: Omikuji', exact: true }).click();
  await expect(page.locator('.board-conversation-speech')).toContainText('draws a fortune');
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), SAVE)).toEqual(game);
  await page.getByRole('button', { name: 'Back to my game' }).click();
  await expect(page.locator('.conversation-result-equation')).toHaveAttribute('aria-label', /equals 4 coins profit/);
});

test('repeated identical dice work in text mode and survive reload without a reroll', async ({ page }) => {
  const game = readyForRepeatedOnes();
  await page.addInitScript(({ game, key }) => {
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(game));
  }, { game, key: SAVE });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/mission');
  await page.getByRole('button', { name: 'Use accessible text board' }).click();
  await page.getByRole('button', { name: 'Roll the dice', exact: true }).dblclick();
  await expect(page.getByTestId('mission-roll-result')).toContainText('Rolled 1');
  await expect(page.locator('.quest-layout')).toHaveAttribute('data-busy', 'false');
  await page.getByRole('button', { name: 'Next roll', exact: true }).click();
  await page.getByRole('button', { name: 'Roll the dice', exact: true }).click();
  await expect(page.getByTestId('mission-roll-result')).toContainText('Rolled 1');
  const saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), SAVE);
  expect(saved.turn).toBe(2); expect(saved.position).toBe(2);
  expect(saved.events.filter((event: any) => event.type === 'die' && event.data.purpose === 'movement')).toHaveLength(2);
  expect(validSave(saved)).toBe(true);
  await page.reload();
  await expect(page.getByTestId('mission-roll-result')).toContainText('Rolled 1');
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), SAVE)).toEqual(saved);
  await expect(page.locator('.quest-error')).toHaveCount(0);
});

test('a replacement animates its own dice result without walking or advancing the turn', async ({ page }, testInfo) => {
  const game = readyForReplacement();
  expect(game.position).toBe(13); expect(game.pending).toBe('returns');
  await page.addInitScript(game => {
    localStorage.setItem('lead-money-quest-v03-local', JSON.stringify(game));
    localStorage.setItem('lead-graphics-quality-v1', 'balanced');
  }, game);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/mission');
  const canvas = page.locator('.quest-scene canvas');
  await expect(canvas).toHaveAttribute('data-die-visible', 'true', { timeout: 90000 });
  await page.getByRole('button', { name: 'Try a replacement', exact: false }).click();
  await page.clock.install();
  await page.clock.pauseAt(new Date(Date.now() + 1000));
  await page.locator('.conversation-reason-options button').first().click();
  await expect(page.getByRole('region', { name: 'Chance roll', exact: true })).toContainText('Your pawn stays here.');
  await expect(canvas).toHaveAttribute('data-die-rolling', 'true');
  await page.clock.runFor(DIE_ROLL_MS + 100);
  await expect(page.locator('.quest-layout')).toHaveAttribute('data-busy', 'true');
  await expect(page.getByRole('region', { name: 'Chance roll', exact: true })).toHaveAttribute('data-state', 'settled');
  await expect(canvas).toHaveAttribute('data-die-progress', '1.0000');
  await expect(canvas).toHaveAttribute('data-pawn-animation', 'Idle');
  await page.clock.runFor(DIE_MS - DIE_ROLL_MS + 100);
  await expect(page.locator('.quest-layout')).toHaveAttribute('data-busy', 'false');
  const saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), SAVE);
  expect(saved.position).toBe(13); expect(saved.turn).toBe(game.turn);
  expect(saved.animation).toBe(game.animation);
  expect(validSave(saved)).toBe(true);
  await expect(canvas).toHaveAttribute('data-die-value', String(saved.outcome.die));
  await expect(canvas).toHaveAttribute('data-pawn-animation', 'Idle');
  await page.screenshot({ path: testInfo.outputPath('replacement-result.png') });
  expect(saved.outcome.die).not.toBe(saved.lastDie);
  await page.getByRole('button', { name: 'Next roll', exact: true }).click();
  await expect(page.locator('.quest-layout')).toHaveAttribute('data-phase', 'board');
  await expect(page.locator('.mission-dice')).toHaveAttribute('data-value', String(saved.lastDie));
  await expect(canvas).toHaveAttribute('data-die-value', String(saved.lastDie));
  await expect(canvas).toHaveAttribute('data-die-rolling', 'false');
  await expect(page.locator('.quest-error')).toHaveCount(0);
});
