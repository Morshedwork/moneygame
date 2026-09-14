import { test, expect, Page } from './fixtures';
import { heroUnits, strengths, jobs, goalSteps, storySteps, observations, improvements, audiences, needs, offers, brandColorNames } from '../../packages/hero-lab';

async function radio(page: Page, legend: string, option: string) {
  await page.getByRole('group', { name: legend, exact: true }).getByRole('radio', { name: option, exact: true }).check();
}
async function open(page: Page) {
  await page.addInitScript(() => localStorage.setItem('lead-graphics-quality-v1', 'balanced'));
  await page.goto('/');
  await page.getByRole('button', { name: 'Try practice', exact: true }).click();
  await page.getByRole('button', { name: 'Explore the Hero Lab' }).click();
  await expect(page.getByRole('heading', { name: 'Little ideas. Wonderful possibilities.' })).toBeVisible();
}
async function lesson(page: Page, i: number) {
  const u = heroUnits[i];
  await expect(page.getByRole('heading', { name: u.title, exact: true })).toBeVisible();
  await radio(page, u.question, u.options[u.answer]);
  await page.getByRole('button', { name: 'Check my understanding' }).click();
  await expect(page.getByRole('heading', { name: u.activity, exact: true })).toBeVisible();
}
async function stamp(page: Page, i: number) {
  await page.getByRole('button', { name: 'Check my activity', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Pause. Notice. Grow.' })).toBeVisible();
  await radio(page, heroUnits[i].reflection, heroUnits[i].reflections[0]);
  await page.getByRole('button', { name: 'Add my passport stamp' }).click();
  await expect(page.getByRole('heading', { name: i === 11 ? 'Your Hero Lab passport is complete!' : 'A new stamp. A new possibility.' })).toBeVisible();
}
test('twelve guidebook units: lessons, real activities, retries, keepsakes and final passport', async ({ page }) => {
  test.setTimeout(300000);
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  await open(page);
  await expect(page.locator('.hl-unit')).toHaveCount(12);
  await expect(page.locator('.hl-unit').nth(1)).toBeDisabled();
  await expect(page.locator('.hl-mentor canvas')).toHaveAttribute('data-character-renderer', '3d');
  await expect(page.locator('.hl-mentor').getByRole('img', { name: 'Oty interactive 3D character', exact: true })).toBeVisible();
  await expect(page.locator('.hl-mentor .scene-loading')).toHaveCount(0, { timeout: 45000 });
  await page.screenshot({ path: test.info().outputPath('hero-lab-passport.png'), fullPage: true });
  await page.getByRole('button', { name: 'Begin my learning trail' }).click();
  await radio(page, heroUnits[0].question, heroUnits[0].options[0]);
  await page.getByRole('button', { name: 'Check my understanding' }).click();
  await expect(page.getByText(/You can try again; there is no penalty/)).toBeVisible();
  await lesson(page, 0);
  for (const s of [strengths[0], strengths[1], strengths[4]]) await page.getByRole('checkbox', { name: s, exact: true }).check();
  await radio(page, 'Your festival job', jobs[0]);
  await stamp(page, 0);
  for (let i = 1; i < 12; i++) {
    await page.getByRole('button', { name: `Continue to unit ${i + 1}`, exact: true }).click();
    await lesson(page, i);
    switch (heroUnits[i].id) {
      case 'power-house':
        for (const [scene, response] of [
          ['A sign falls down. Oty feels frustrated.', 'Pause and breathe'],
          ['The queue grows. Lido feels overwhelmed.', 'Ask for support'],
          ['Prena is nervous about sharing an idea.', 'Try a smaller step'],
        ]) await radio(page, scene, response);
        break;
      case 'future-board':
        for (const step of goalSteps) {
          await page.getByRole('button', { name: step, exact: true }).focus();
          await page.keyboard.press('Enter');
          await expect(page.locator('.hl-order-pool button:focus, button:focus').filter({ hasText: /Try the step|Choose a goal|Plan one small step|Review and adjust|Reset lantern order/ })).toHaveCount(1);
        }
        await page.getByRole('textbox', { name: 'Your fictional festival goal' }).fill('Make our festival more welcoming');
        break;
      case 'entrepreneur':
        await radio(page, 'Who would you like to help?', audiences[1]);
        await radio(page, 'What do they need?', needs[1]);
        await radio(page, 'What could you offer?', offers[1]);
        break;
      case 'hero-senses':
        for (const clue of observations) await radio(page, clue.text, clue.observed ? 'Observed' : 'Needs checking');
        break;
      case 'solutions':
        for (const n of [0, 2]) await page.getByRole('checkbox', { name: new RegExp(improvements[n].label) }).check();
        await page.getByRole('button', { name: 'Check my activity' }).click();
        await expect(page.getByRole('alert')).toContainText('more than four effort tokens');
        await page.getByRole('checkbox', { name: /Decorative arch/ }).uncheck();
        await page.getByRole('checkbox', { name: /Path marker/ }).check();
        break;
      case 'story':
        for (const step of storySteps) await page.getByRole('button', { name: step, exact: true }).click();
        break;
      case 'prototype':
        await radio(page, 'Change one feature', 'Add a clear water symbol');
        await radio(page, 'Make a prediction', 'More visitors will find it');
        await page.getByRole('button', { name: 'Run fictional test' }).click();
        await expect(page.getByText('Second test: 3 of 4 visitors found the station.')).toBeVisible();
        await radio(page, 'What does this tell us?', 'It suggests a result for this small group; we should test again');
        break;
      case 'brand':
        await page.getByRole('textbox', { name: 'Fictional brand name' }).fill('Water Lantern');
        await page.getByRole('textbox', { name: 'Clear purpose label' }).fill('Water station this way');
        await radio(page, 'Choose a LEAD colour', brandColorNames[1]);
        await page.getByRole('checkbox', { name: 'Check the sign without colour' }).check();
        await expect(page.locator('.hl-brand-preview')).toHaveClass(/grayscale/);
        await expect(page.locator('.hl-brand-preview')).toContainText('Water station this way');
        await page.screenshot({ path: test.info().outputPath('hero-lab-brand-studio.png'), fullPage: true });
        break;
      case 'money':
        await page.getByRole('spinbutton', { name: 'Sign', exact: true }).fill('2');
        await page.getByRole('spinbutton', { name: 'Reserve', exact: true }).fill('4');
        await page.getByRole('spinbutton', { name: 'Profit after supplies and sign' }).fill('4');
        break;
      case 'pitch':
        await page.getByRole('textbox', { name: 'What do visitors need?' }).fill('Visitors need to find water');
        await page.getByRole('textbox', { name: 'What is your idea?' }).fill('A sign with a clear water symbol');
        await page.getByRole('textbox', { name: 'What next step will you ask for?' }).fill('Please try the sign and tell me what is clear');
        await radio(page, 'A listener asks: How will you know it helps?', 'Try a small test and listen to feedback');
        break;
      case 'make-real':
        for (const [label, value] of [['Project goal', 'Help visitors find water'], ['First step', 'Sketch a water sign'], ['Next step', 'Ask a trusted adult for feedback'], ['Last step', 'Improve one detail and test again'], ['Materials already available', 'Paper and pencils']]) await page.getByRole('textbox', { name: label, exact: false }).fill(value);
        await radio(page, 'Who could help with a safe trial?', 'A trusted adult, with permission');
        await radio(page, 'Your review question', 'What helped visitors?');
    }
    await stamp(page, i);
  }
  await page.getByText('See my activity keepsake', { exact: true }).click();
  await expect(page.locator('.hl-keepsake')).toContainText('Sketch a water sign');
  await expect(page.locator('.hl-keepsake')).toContainText('Support: A trusted adult, with permission');
  await expect(page.locator('.hl-keepsake')).toContainText('Review: What helped visitors?');
  await page.screenshot({ path: test.info().outputPath('hero-lab-complete.png'), fullPage: true });
  await page.getByRole('button', { name: 'See my complete passport' }).click();
  await expect(page.getByText('12 / 12 stamps', { exact: true })).toBeVisible();
  await expect(page.locator('.hl-unit.done')).toHaveCount(12);
  await page.locator('.hl-unit').first().click();
  await page.getByRole('button', { name: 'Revisit lesson' }).click();
  await expect(page.getByRole('heading', { name: 'A small idea to take with you.' })).toBeVisible();
  await page.getByRole('button', { name: 'Overview', exact: true }).click();
  await expect(page.getByText('0%', { exact: true })).toBeVisible();
  await expect(page.getByText(/12 of 12 learning stamps collected/)).toBeVisible();
  expect(errors).toEqual([]);
});

test('mobile and keyboard: accessible activities, bonus memory, challenge wheel, unsaved practice', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await open(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Open bonus activities' }).click();
  await page.getByRole('button', { name: 'Spin a challenge' }).click();
  await expect(page.locator('.hl-wheel .hl-note')).toBeVisible();
  for (const [a, b] of [[1, 6], [3, 8], [5, 2], [7, 4]]) {
    await page.getByRole('button', { name: `Reveal card ${a}`, exact: true }).focus();
    await page.keyboard.press('Enter');
    await page.getByRole('button', { name: `Reveal card ${b}`, exact: true }).click();
    if (a !== 7) await page.getByRole('button', { name: 'Try another pair' }).click();
  }
  await expect(page.getByText('All four connections found. You know your team!')).toBeVisible();
  await page.getByRole('button', { name: 'Begin my learning trail' }).click();
  await lesson(page, 0);
  for (const s of [strengths[0], strengths[1], strengths[4]]) await page.getByRole('checkbox', { name: s, exact: true }).check();
  await radio(page, 'Your festival job', jobs[0]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: test.info().outputPath('hero-lab-mobile.png'), fullPage: true });
  await stamp(page, 0);
  await page.getByRole('button', { name: 'Back to my passport' }).click();
  await expect(page.getByText('1 / 12 stamps', { exact: true })).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: 'Try practice', exact: true }).click();
  await page.getByRole('button', { name: 'Explore the Hero Lab' }).click();
  await expect(page.getByText('0 / 12 stamps', { exact: true })).toBeVisible();
});
