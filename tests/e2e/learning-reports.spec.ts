import { test, expect } from './fixtures';
import { readFile } from 'node:fs/promises';
import { applyAction, createMission } from '../../packages/money-quest/engine';
import { lessonBeats } from '../../packages/money-quest/content';
import { createPlayer } from '../../packages/game-rules';
import { accountReport } from '../../packages/learning-report';

test('learning report updates after feedback, exports real evidence, and fits mobile', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('/');
  await page.getByRole('button', { name: 'Try practice', exact: true }).click();
  await page.getByRole('button', { name: 'Meet Sparko & learn' }).click();
  await page.getByRole('button', { name: 'Try a practice question', exact: true }).click();
  await page.locator('.answer-options button').nth(0).click();
  await expect(page.locator('.lr-pulse')).toContainText('0 correct answers from 1 attempts');
  await page.locator('.answer-options button').nth(1).click();
  await page.getByRole('button', { name: 'View learning report', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'My learning journey', exact: true })).toBeVisible();
  await expect(page.locator('.lr-metric').nth(0)).toContainText('1 / 6');
  await expect(page.locator('.lr-metric').nth(1)).toContainText('50%');
  await expect(page.locator('.lr-metric').nth(2)).toContainText('0%');
  await expect(page.getByRole('region', { name: 'Finance understanding', exact: true })).toContainText('Correct after practice');
  for (const [button, extension] of [['Download report', '.html'], ['Export CSV', '.csv']]) {
    const pending = page.waitForEvent('download'); await page.getByRole('button', { name: button, exact: true }).click();
    const file = await pending; expect(file.suggestedFilename()).toContain(extension);
    const contents = await readFile((await file.path())!, 'utf8');
    expect(contents).toContain('Correct after practice'); expect(contents).toContain('50%');
    expect(contents).toContain('Current practice session');
  }
  await page.screenshot({ path: test.info().outputPath('learning-report-desktop.png'), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator('.sidebar')).not.toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await expect(page.getByRole('button', { name: 'Download report', exact: true })).toBeVisible();
  await page.screenshot({ path: test.info().outputPath('learning-report-mobile.png'), fullPage: true });
  await page.getByRole('button', { name: 'Open village report', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Village learning passport', exact: true })).toBeVisible();
  await expect(page.locator('.lr-local .lr-report')).toContainText('Answer accuracy');
  expect(errors).toEqual([]);
});

test('Money Quest exposes its own local report, including quarterly reflections', async ({ page }) => {
  const initial = createMission(4, 2);
  const beat = lessonBeats(1, initial.lesson.depth)[0];
  const g = applyAction(initial, { id: 'test-report-answer', type: 'answer', answer: (beat.answer + 1) % beat.choices.length });
  await page.addInitScript(g => localStorage.setItem('lead-money-quest-v03-local', JSON.stringify(g)), g);
  await page.goto('/mission');
  await expect(page.locator('.lr-report')).toHaveCount(0);
  await expect(page.getByRole('region', { name: 'Your village game board' })).toBeVisible();
  await page.locator('.play-menu summary').click();
  await page.getByRole('button', { name: 'Parent learning report', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Money Quest learning report', exact: true })).toBeVisible();
  await expect(page.locator('.lr-report')).toContainText('not linked to a child account');
  await expect(page.getByRole('region', { name: 'Quarter-by-quarter learning' }).locator('tbody tr')).toHaveCount(2);
  await expect(page.locator('.lr-metric').nth(1)).toContainText('0%');
  await page.screenshot({ path: test.info().outputPath('learning-report-mission.png'), fullPage: true });
  await page.getByRole('button', { name: 'Back to my board', exact: true }).click();
  await expect(page.locator('.lr-report')).toHaveCount(0);
  await expect(page.locator('.quest-game-layout')).toHaveAttribute('data-phase', 'lesson');
  await expect(page.getByRole('button', { name: 'Continue learning', exact: true })).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('lead-money-quest-v03-local')!))).toEqual(g);
});

test('admin cohort filters and exports use only matching students; missing reports stay unknown', async ({ page }) => {
  // Mount the actual component with isolated synthetic records, never Firebase test accounts.
  const a = createPlayer('a', 'Aki'), b = createPlayer('b', 'Ren');
  a.attempts = [{ kind: 'lesson', index: 0, correct: true, at: 1 }];
  b.attempts = Array.from({ length: 9 }, () => ({ kind: 'lesson', index: 0, correct: false, at: 1 }));
  const rows = [{ id: 'a', name: 'Aki', role: 'student', learningReport: accountReport(a) }, { id: 'b', name: 'Ren', role: 'student', learningReport: accountReport(b) }, { id: 'p', name: 'Parent excluded', role: 'parent' }, { id: 'c', name: 'Unmeasured', role: 'student' }];
  await page.goto('/');
  await page.evaluate(async rows => {
    const load = (path: string) => import(/* @vite-ignore */ path);
    const { mountReports } = await load('/tests/fixtures/learning-report-ui.tsx');
    mountReports(rows);
  }, rows);
  await expect(page.getByRole('heading', { name: 'Learning cohort summary', exact: true })).toBeVisible();
  await expect(page.locator('.lr-metric').nth(1)).toContainText('10%');
  await expect(page.locator('.lr-admin')).toContainText('reports are unavailable');
  await page.getByLabel('Filter learning reports by display name').fill('Aki');
  await expect(page.locator('.lr-metric').nth(1)).toContainText('100%');
  const pending = page.waitForEvent('download'); await page.getByRole('button', { name: 'Export CSV', exact: true }).click();
  const contents = await readFile((await (await pending).path())!, 'utf8');
  expect(contents).toContain('Aki'); expect(contents).not.toContain('Ren'); expect(contents).not.toContain('Parent excluded');
  await page.getByLabel('Open a learner’s full report').selectOption('a');
  await expect(page.getByRole('heading', { name: 'My learning journey', exact: true })).toBeVisible();
});
