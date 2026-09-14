import { test, expect } from './fixtures';
import { applyAction, createMission, type Mission } from '../../packages/money-quest/engine';

const SAVE = 'lead-money-quest-v03-local';

function readyMission(): Mission {
  let game = createMission(5, 4, 'lido');
  let sequence = 0;
  while (game.phase === 'lesson') {
    game = applyAction(game, { id: `readiness-${++sequence}`, type: 'answer', answer: 0 });
    game = applyAction(game, {
      id: `readiness-${++sequence}`,
      type: 'lesson-next',
      price: 6,
      goal: 'Protect profit',
      reason: 'I compared my price and cost.',
    });
  }
  game = applyAction(game, { id: `readiness-${++sequence}`, type: 'deposit' });
  return applyAction(game, { id: `readiness-${++sequence}`, type: 'banner' });
}

test('the essential board can roll while decorative scenery is still loading', async ({ page }) => {
  test.setTimeout(120_000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(({ game, key }) => {
    localStorage.setItem(key, JSON.stringify(game));
    localStorage.setItem('lead-graphics-quality-v1', 'balanced');
  }, { game: readyMission(), key: SAVE });

  let releaseScenery!: () => void;
  let sceneryReleased = false;
  let sceneryPending = false;
  let sceneryResponse = false;
  const requested = new Set<string>();
  const sceneryGate = new Promise<void>(resolve => {
    releaseScenery = () => {
      sceneryReleased = true;
      resolve();
    };
  });
  page.on('request', request => requested.add(new URL(request.url()).pathname));
  page.on('response', response => {
    if (new URL(response.url()).pathname === '/models/yatai-board-village.glb' && response.ok()) sceneryResponse = true;
  });
  await page.route('**/models/yatai-board-village.glb', async route => {
    sceneryPending = true;
    await sceneryGate;
    await route.continue();
  });

  try {
    await page.goto('/mission', { waitUntil: 'domcontentloaded' });
    await expect.poll(() => sceneryPending, { timeout: 45_000 }).toBe(true);

    const roll = page.getByRole('button', { name: 'Roll the dice', exact: true });
    await expect(roll).toBeEnabled({ timeout: 10_000 });
    expect(sceneryReleased).toBe(false);
    for (const asset of [
      '/models/yatai-reference-board.glb',
      '/models/lido.glb',
      '/models/motion/lido.glb',
      '/models/lead-die.glb',
      '/models/yatai-board-village.glb',
    ]) expect(requested.has(asset), `${asset} should be requested`).toBe(true);

    await roll.click();
    await expect(page.locator('.quest-layout')).toHaveAttribute('data-busy', 'false');
    await expect(page.getByTestId('mission-roll-result')).toContainText('Rolled 1');
    expect(sceneryReleased).toBe(false);
  } finally {
    releaseScenery();
  }

  await expect.poll(() => sceneryResponse, { timeout: 45_000 }).toBe(true);
  await expect(page.locator('.scene-fallback')).toHaveCount(0);
});
