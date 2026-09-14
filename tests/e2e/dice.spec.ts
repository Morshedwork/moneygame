import { test, expect, Page } from "./fixtures";
import { DIE_HOLD_MS, DIE_MS, DIE_ROLL_MS, STEP_MS } from "../../apps/client/board-presentation";

// Deterministic, unsaved practice fixtures only. No Firebase records or test backdoors.
async function board(page: Page, overrides: Record<string, unknown> = {}) {
  await page.goto("/");
  await page.getByRole("button", { name: "Try practice", exact: true }).click();
  await page.evaluate(async (overrides) => {
    const storePath = performance.getEntriesByType("resource").map(e => e.name).find(url => new URL(url).pathname === "/apps/client/store.ts")!;
    const rulesPath = "/packages/game-rules/index.ts";
    const { useGame } = await import(storePath);
    const { applyCommand, publicPlayer } = await import(rulesPath);
    const p = structuredClone(useGame.getState().practicePrivate);
    p.rewarded = true;
    p.gate = 3;
    p.lesson = 6;
    const ready = applyCommand(p, { id: "dice-fixture-setup", type: "setup", name: "Sakura Bento", price: 6, color: "#52a7da", goal: "Learn through play" }, 1972).player;
    Object.assign(ready.game, overrides);
    useGame.setState({ practicePrivate: ready, player: publicPlayer(ready), page: "board", reduced: false, presenting: false });
  }, overrides);
  await expect(page.getByRole("button", { name: "Open business journal" })).toBeVisible();
  if (Number(overrides.turn) > 0) {
    await page.getByRole("button", { name: "Close card and look at board" }).click();
  }
}
async function resetRng(page: Page) {
  await page.evaluate(async () => {
    const modulePath = "/apps/client/store.ts";
    const { useGame } = await import(modulePath);
    useGame.getState().practicePrivate.game.rng = 1972; // Current LCG produces a one, independently on both turns.
  });
}
async function pauseAnimationClock(page: Page) {
  await expect(page.getByRole("button", { name: /^(Roll the die|Open decision card)$/ })).toBeEnabled({ timeout: 30000 });
  await page.clock.install();
  await page.clock.pauseAt(new Date(Date.now() + 1000));
}
async function advanceAnimationClock(page: Page, milliseconds: number) {
  for (let remaining = milliseconds; remaining > 0;) {
    const frame = Math.min(50, remaining);
    await page.clock.runFor(frame);
    remaining -= frame;
  }
}
test("die settles, pawn walks, repeated ones animate, remount does not replay", async ({ page }) => {
  await board(page);
  await pauseAnimationClock(page);
  for (let tile = 1; tile <= 2; tile++) {
    await resetRng(page);
    await page.getByRole("button", { name: "Roll the die", exact: true }).click();
    const view = page.locator(".board-layout");
    await expect(view).toHaveAttribute("data-roll-stage", "rolling");
    await expect(view).toHaveAttribute("data-pawn-tile", String(tile - 1));
    await expect(view).toHaveAttribute("data-die-value", "1");
    await advanceAnimationClock(page, DIE_MS + 20);
    await expect(view).toHaveAttribute("data-roll-stage", "walking");
    await expect(page.getByRole("button", { name: /^(Open decision card|Read event card)$/ })).toBeDisabled();
    await advanceAnimationClock(page, STEP_MS + 60);
    await expect(view).toHaveAttribute("data-roll-stage", "complete");
    await expect(view).toHaveAttribute("data-pawn-tile", String(tile));
    await expect(page.locator(".dice-caption")).toContainText("You rolled 1 · 1 space");
    await page.getByRole("button", { name: "Close card and look at board" }).click();
  }
  await page.getByRole("button", { name: "Open business journal" }).click();
  await page.getByRole("button", { name: "My adventure", exact: true }).click();
  await expect(page.locator(".board-layout")).toHaveAttribute("data-roll-stage", "complete");
  await expect(page.locator(".board-layout")).toHaveAttribute("data-pawn-tile", "2");
});
test("background time cannot skip the tumble, result hold, or walk", async ({ page }) => {
  await board(page);
  await pauseAnimationClock(page);
  await resetRng(page);
  const view = page.locator(".board-layout");
  const canvas = page.locator(".board-canvas canvas");
  await page.getByRole("button", { name: "Roll the die", exact: true }).click();
  await expect(view).toHaveAttribute("data-roll-stage", "rolling");
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", { configurable: true, get: () => true });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await page.clock.fastForward(60_000);
  await expect(view).toHaveAttribute("data-roll-stage", "rolling");
  await expect(view).toHaveAttribute("data-pawn-tile", "0");
  await expect(canvas).toHaveAttribute("data-die-progress", "0.0000");
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", { configurable: true, get: () => false });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await advanceAnimationClock(page, 100);
  await expect(view).toHaveAttribute("data-roll-stage", "rolling");
  await advanceAnimationClock(page, DIE_ROLL_MS);
  await expect(canvas).toHaveAttribute("data-die-progress", "1.0000");
  await expect(view).toHaveAttribute("data-roll-stage", "rolling");
  await expect(view).toHaveAttribute("data-pawn-tile", "0");
  await advanceAnimationClock(page, DIE_HOLD_MS + 40);
  await expect(view).toHaveAttribute("data-roll-stage", "walking");
  await advanceAnimationClock(page, STEP_MS + 60);
  await expect(view).toHaveAttribute("data-roll-stage", "complete");
  await expect(view).toHaveAttribute("data-pawn-tile", "1");
});
test("last roll stays on board until the pawn reaches Start", async ({ page }) => {
  await board(page, { position: 19, turn: 8, path: [18, 19], lastDie: 2 });
  await pauseAnimationClock(page);
  await page.getByRole("button", { name: "Roll the die", exact: true }).click();
  await expect(page.locator(".board-layout")).toHaveAttribute("data-roll-stage", "rolling");
  await expect(page.getByRole("heading", { name: "Look how far you’ve come." })).toHaveCount(0);
  await advanceAnimationClock(page, DIE_MS + 20);
  await expect(page.locator(".board-layout")).toHaveAttribute("data-roll-stage", "walking");
  await advanceAnimationClock(page, STEP_MS + 60);
  await expect(page.getByRole("heading", { name: "Look how far you’ve come." })).toBeVisible();
});
test("replacement shows its own result and never moves the pawn", async ({ page }) => {
  await board(page, { position: 13, turn: 5, lastDie: 6, pending: "returns", wallet: 30, sales: [{ id: "test-sale", price: 6, cost: 3, returned: false }] });
  await pauseAnimationClock(page);
  await page.getByRole("button", { name: "Open decision card" }).click();
  await page.getByRole("radio", { name: /Try a replacement · 3 coins/ }).check();
  await page.getByRole("button", { name: "Try replacement & roll" }).click();
  await expect(page.locator(".board-layout")).toHaveAttribute("data-roll-stage", "rolling");
  await expect(page.locator(".board-layout")).toHaveAttribute("data-die-value", "1");
  await expect(page.locator(".board-layout")).toHaveAttribute("data-pawn-tile", "13");
  await advanceAnimationClock(page, DIE_MS + 20);
  await expect(page.locator(".board-layout")).toHaveAttribute("data-roll-stage", "complete");
  await expect(page.locator(".dice-caption")).toContainText("Replacement 1 · Stay on this space");
});
test("same-task double send is blocked and reducing motion cancels permanently", async ({ page }) => {
  await board(page);
  await expect(page.getByRole("button", { name: "Roll the die", exact: true })).toBeEnabled({ timeout: 30000 });
  const result = await page.evaluate(async () => {
    const modulePath = performance.getEntriesByType("resource").map(e => e.name).find(url => new URL(url).pathname === "/apps/client/store.ts")!;
    const { useGame } = await import(modulePath);
    return Promise.all([useGame.getState().send("roll"), useGame.getState().send("roll")]);
  });
  expect(result).toEqual([true, false]);
  await expect(page.locator(".board-layout")).toHaveAttribute("data-roll-stage", "rolling");
  await page.evaluate(async () => { const path = performance.getEntriesByType("resource").map(e => e.name).find(url => new URL(url).pathname === "/apps/client/store.ts")!; (await import(path)).useGame.getState().toggleMotion(); });
  await expect(page.locator(".board-layout")).toHaveAttribute("data-roll-stage", "complete");
  await expect(page.getByRole("button", { name: "Roll the die", exact: true })).toBeEnabled();
  await page.evaluate(async () => { const path = performance.getEntriesByType("resource").map(e => e.name).find(url => new URL(url).pathname === "/apps/client/store.ts")!; (await import(path)).useGame.getState().toggleMotion(); });
  await expect(page.locator(".board-layout")).toHaveAttribute("data-roll-stage", "complete");
});
test("cold scene waits for assets and offers explicit text-only play", async ({ page }) => {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  await page.route("**/models/*.glb", async (route) => { await gate; await route.continue(); });
  try {
    await board(page);
    await expect(page.getByRole("button", { name: "Roll the die", exact: true })).toBeDisabled();
    await expect(page.locator(".board-layout")).toHaveAttribute("data-roll-stage", "complete");
    await page.getByRole("button", { name: "Play with text controls" }).click();
    await expect(page.getByRole("button", { name: "Roll the die", exact: true })).toBeEnabled();
  } finally { release(); }
});
