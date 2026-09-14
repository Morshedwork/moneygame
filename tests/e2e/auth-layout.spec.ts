import { expect, test } from '@playwright/test';

test.beforeEach(async ({ context }) => {
  await context.route(/^https:\/\/(fonts\.googleapis\.com|fonts\.gstatic\.com)\//, route => route.abort());
});

for (const width of [375, 768, 1024, 1440]) {
  test(`account screens keep their alignment at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/');
    await page.getByRole('button', { name: 'Start your adventure' }).click();
    await expect(page.getByRole('heading', { name: 'Create your account' })).toBeVisible();

    const checkLayout = async () => {
      const card = await page.locator('.auth-form').boundingBox();
      const input = await page.getByLabel('Email address', { exact: true }).boundingBox();
      expect(card).toBeTruthy();
      expect(input).toBeTruthy();
      expect(input!.x - card!.x).toBeGreaterThanOrEqual(20);
      expect(card!.x + card!.width - input!.x - input!.width).toBeGreaterThanOrEqual(20);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      await expect(page.locator('.auth-story .brand')).toBeVisible();
    };
    await checkLayout();
    await page.getByRole('button', { name: 'Parent', exact: true }).click();
    await expect(page.getByLabel('Your name', { exact: true })).toBeVisible();
    await checkLayout();
    await page.screenshot({ path: test.info().outputPath(`auth-signup-${width}.png`), fullPage: true });
    await page.locator('.auth-switch').getByRole('button', { name: 'Log in', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Welcome back.' })).toBeVisible();
    await checkLayout();
    await page.getByRole('button', { name: 'Forgot your password?' }).click();
    await expect(page.getByRole('heading', { name: 'Forgot your password?' })).toBeVisible();
    await checkLayout();
    await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
    await checkLayout();
  });
}
