import { test, expect, type Page } from './fixtures';

async function openShopSetup(page: Page) {
  page.setDefaultTimeout(60000);
  await page.addInitScript(() => localStorage.setItem('lead-graphics-quality-v1', 'balanced'));
  await page.goto('/');
  await page.getByRole('button', { name: 'Try practice', exact: true }).click();

  const modelReady = page.waitForResponse(response =>
    response.url().endsWith('/models/bento-showroom.glb') && response.ok(),
  );
  await page.evaluate(async () => {
    const storePath = performance.getEntriesByType('resource')
      .map(entry => entry.name)
      .find(url => new URL(url).pathname === '/apps/client/store.ts')!;
    const { useGame } = await import(storePath);
    const rulesPath = '/packages/game-rules/index.ts';
    const { publicPlayer } = await import(rulesPath);
    const player = structuredClone(useGame.getState().practicePrivate);
    player.lesson = 6;
    player.gate = 3;
    player.rewarded = true;
    useGame.setState({
      practicePrivate: player,
      player: publicPlayer(player),
      page: 'setup',
      reduced: true,
    });
  });

  await modelReady;
  await expect(page.getByRole('heading', { name: 'Make it yours.' })).toBeVisible();
  const canvas = page.locator('.shop-stage canvas');
  await expect(canvas).toBeVisible();
  await expect(canvas).toHaveAttribute('data-quality', 'balanced');
  await expect(canvas).toHaveAttribute('data-render-size', /^\d+x\d+$/);
  await expect(page.getByText('Preparing your little shop…', { exact: true })).toHaveCount(0, { timeout: 45000 });
  await expect(page.locator('.shop-stage .scene-fallback')).toHaveCount(0);
  return canvas;
}

test('shop setup previews identity, pricing, camera views, roof and interior controls', async ({ page }) => {
  test.setTimeout(150000);
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await openShopSetup(page);

  await page.getByLabel('Your business name', { exact: true }).fill('Moonlight Bento');
  await expect(page.locator('.shop-preview-heading h2')).toHaveText('Moonlight Bento');

  const price = page.getByLabel('Your first bento price', { exact: true });
  await price.press('End');
  await expect(price).toHaveValue('8');
  await expect(page.locator('.shop-maths > div').nth(2).locator('b')).toHaveText('5');

  const coral = page.getByRole('button', { name: 'Coral banner', exact: true });
  await coral.click();
  await expect(coral).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('group', { name: /Banner color/ })).toContainText('Coral');

  const characters = page.getByRole('group', { name: 'Choose your character', exact: true });
  const diva = characters.getByRole('button', { name: 'Diva', exact: true });
  await diva.click();
  await expect(diva).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.shop-owner-title')).toContainText('The Connector');

  const views = page.getByRole('group', { name: 'Shop camera views', exact: true });
  const whole = views.getByRole('button', { name: 'Whole shop', exact: true });
  const counter = views.getByRole('button', { name: 'Bento counter', exact: true });
  const inside = views.getByRole('button', { name: 'Inside the shop', exact: true });
  const preview = page.locator('.shop-stage [aria-label^="Interactive 3D bento shop preview"]');

  await expect(whole).toHaveAttribute('aria-pressed', 'true');
  await counter.click();
  await expect(counter).toHaveAttribute('aria-pressed', 'true');
  await expect(preview).toHaveAttribute('aria-label', /Look closely: rice grains/);

  const fullRoof = page.getByRole('button', { name: 'Show full roof', exact: true });
  await fullRoof.click();
  await expect(whole).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.shop-stage-badge')).toHaveText('FULL ROOF');
  await expect(page.getByRole('button', { name: 'Open the roof', exact: true })).toHaveAttribute('aria-pressed', 'true');

  await inside.click();
  await expect(inside).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.shop-stage-badge')).toHaveText('INTERIOR CUTAWAY');
  await expect(preview).toHaveAttribute('aria-label', /tea tins, rice jars, bowls/);

  await page.getByRole('button', { name: 'Reset shop view', exact: true }).click();
  await expect(whole).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.shop-stage-badge')).toHaveText('OPEN-ROOF VIEW');
  expect(errors).toEqual([]);
});

test('shop preview stays framed without horizontal overflow on a phone', async ({ page }) => {
  test.setTimeout(150000);
  await page.setViewportSize({ width: 390, height: 844 });
  const canvas = await openShopSetup(page);
  await page.getByRole('button', { name: 'Inside the shop', exact: true }).click();
  await expect(page.locator('.shop-stage-badge')).toHaveText('INTERIOR CUTAWAY');

  const frame = await page.evaluate(() => {
    const showroom = document.querySelector('.shop-showroom')!.getBoundingClientRect();
    const stage = document.querySelector('.shop-stage')!.getBoundingClientRect();
    return {
      viewport: window.innerWidth,
      overflow: document.documentElement.scrollWidth > window.innerWidth + 1,
      showroom: { left: showroom.left, right: showroom.right, width: showroom.width },
      stage: { left: stage.left, right: stage.right, width: stage.width },
    };
  });
  expect(frame.overflow).toBe(false);
  expect(frame.showroom.left).toBeGreaterThanOrEqual(-1);
  expect(frame.showroom.right).toBeLessThanOrEqual(frame.viewport + 1);
  expect(frame.stage.left).toBeGreaterThanOrEqual(-1);
  expect(frame.stage.right).toBeLessThanOrEqual(frame.viewport + 1);
  expect(frame.stage.width).toBeLessThanOrEqual(frame.viewport + 1);
  expect(await canvas.evaluate((element: HTMLCanvasElement) => element.width * element.height)).toBeLessThanOrEqual(1920 * 1080);
});
