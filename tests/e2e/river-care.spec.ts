import {test, expect, Page} from "./fixtures";
const riverItems = [
  {name: "Banana peel", bin: "Compost"}, {name: "Clean paper flyer", bin: "Paper"},
  {name: "Empty plastic bottle", bin: "Containers"}, {name: "Apple core", bin: "Compost"},
  {name: "Clean cardboard sleeve", bin: "Paper"}, {name: "Empty drink can", bin: "Containers"},
];

async function sortRemaining(page: Page) {
  for (const item of riverItems) {
    const pickup = page.getByRole("button", {name: `Pick up ${item.name.toLowerCase()}`, exact: true});
    if (!await pickup.count()) continue;
    await pickup.click();
    await page.getByRole("button", {name: new RegExp(`^${item.bin} bin,`)}).click();
    await expect(pickup).toHaveCount(0);
  }
}

test("real drag-and-drop, wrong-bin retry, all six items and one reward across replays", async ({page}) => {
  const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
  await page.goto("/tests/fixtures/river-care.html");
  const game = page.getByRole("region", {name: "River care sorting game"});
  await expect(game).toHaveAttribute("data-sorted", "0");
  await expect(page.getByRole("button", {name: "Collect River Care stamp"})).toHaveCount(0);
  const peel = page.getByRole("button", {name: "Pick up banana peel", exact: true});
  const source = (await peel.boundingBox())!;
  const wrong = (await page.getByRole("button", {name: /^Paper bin,/}).boundingBox())!;
  await page.mouse.move(source.x + source.width / 2, source.y + source.height / 2);
  await page.mouse.down();
  await page.mouse.move(wrong.x + wrong.width / 2, wrong.y + wrong.height / 2, {steps: 15});
  await expect(page.locator('[data-bin="Paper"]')).toHaveAttribute("data-over", "true");
  await page.mouse.up();
  await expect(game).toHaveAttribute("data-sorted", "0");
  await expect(peel).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".river-feedback")).toContainText("food for plants");
  const compost = (await page.getByRole("button", {name: /^Compost bin,/}).boundingBox())!;
  await page.mouse.move(source.x + source.width / 2, source.y + source.height / 2);
  await page.mouse.down();
  await page.mouse.move(compost.x + compost.width / 2, compost.y + compost.height / 2, {steps: 15});
  await page.mouse.up();
  await expect(game).toHaveAttribute("data-sorted", "1");
  await expect(peel).toHaveCount(0);
  await page.screenshot({path: "node_modules/.cache/river-care-playing.png", fullPage: true});
  await sortRemaining(page);
  await expect(game).toHaveAttribute("data-state", "complete");
  await expect(page.locator(".river-results")).toContainText("5 of 6 sorted on the first try");
  await expect(page.getByRole("progressbar", {name: "River cleanup"})).toHaveAttribute("value", "6");
  await page.getByRole("button", {name: "Collect River Care stamp"}).click();
  await expect(page.getByLabel("Stamps awarded")).toHaveText("1");
  await page.screenshot({path: "node_modules/.cache/river-care-complete.png", fullPage: true});
  await page.getByRole("button", {name: "Play again", exact: true}).click();
  await expect(game).toHaveAttribute("data-sorted", "0");
  await sortRemaining(page);
  await expect(page.getByLabel("Stamps awarded")).toHaveText("1");
  await expect(page.getByRole("button", {name: "Collect River Care stamp"})).toHaveCount(0);
  await expect(page.getByRole("button", {name: "Play again", exact: true})).toBeFocused();
  expect(errors).toEqual([]);
});

test("keyboard can pick, cancel and sort without a pointer", async ({page}) => {
  await page.goto("/tests/fixtures/river-care.html");
  const peel = page.getByRole("button", {name: "Pick up banana peel", exact: true});
  await peel.focus(); await page.keyboard.press("Enter");
  await expect(peel).toHaveAttribute("aria-pressed", "true");
  await page.keyboard.press("Escape");
  await expect(peel).toHaveAttribute("aria-pressed", "false");
  await expect(page.getByRole("dialog", {name: "River Care Club"})).toBeVisible();
  for (const item of riverItems) {
    const pickup = page.getByRole("button", {name: `Pick up ${item.name.toLowerCase()}`, exact: true});
    await pickup.focus(); await page.keyboard.press("Space");
    await page.keyboard.press(String(["Compost", "Paper", "Containers"].indexOf(item.bin) + 1));
    await expect(pickup).toHaveCount(0);
  }
  await expect(page.getByRole("button", {name: "Collect River Care stamp"})).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByLabel("Stamps awarded")).toHaveText("1");
});

test("outside drop and pointer cancellation never remove an item", async ({page}) => {
  await page.goto("/tests/fixtures/river-care.html");
  const peel = page.getByRole("button", {name: "Pick up banana peel", exact: true});
  const source = (await peel.boundingBox())!;
  await page.mouse.move(source.x + source.width / 2, source.y + 30);
  await page.mouse.down(); await page.mouse.move(source.x + 30, source.y + 50, {steps: 5}); await page.mouse.up();
  await expect(page.locator(".river-game")).toHaveAttribute("data-sorted", "0");
  await expect(peel).not.toHaveAttribute("data-dragging", "true");
  await page.mouse.move(source.x + source.width / 2, source.y + 30);
  await page.mouse.down(); await page.mouse.move(source.x + 30, source.y + 50, {steps: 5});
  await peel.dispatchEvent("pointercancel", {pointerId: 1}); await page.mouse.up();
  await expect(peel).not.toHaveAttribute("data-dragging", "true");
  await expect(page.locator(".river-game")).toHaveAttribute("data-sorted", "0");
  await page.getByRole("button", {name: /^Compost bin,/}).click();
  await expect(page.locator(".river-game")).toHaveAttribute("data-sorted", "1");
});

test.describe("mobile controls", () => {
test.use({viewport: {width: 390, height: 844}, hasTouch: true, isMobile: true, reducedMotion: "reduce"});
test("mobile tap gameplay and reduced motion fit the modal", async ({page}) => {
  await page.goto("/tests/fixtures/river-care.html?earned=1");
  await expect(page.getByRole("button", {name: "Pick up banana peel", exact: true})).toBeVisible();
  await page.screenshot({path: "node_modules/.cache/river-care-mobile.png", fullPage: true});
  const modalSize = await page.locator(".v-modal").evaluate(element => ({scroll: element.scrollWidth, client: element.clientWidth}));
  expect(modalSize.scroll, JSON.stringify(modalSize)).toBeLessThanOrEqual(modalSize.client + 1);
  expect(await page.locator(".river-fish").evaluate(element => getComputedStyle(element).animationName)).toBe("none");
  for (const item of riverItems) {
    await page.getByRole("button", {name: `Pick up ${item.name.toLowerCase()}`, exact: true}).tap();
    await page.getByRole("button", {name: new RegExp(`^${item.bin} bin,`)}).tap();
  }
  await expect(page.locator(".river-game")).toHaveAttribute("data-state", "complete");
  await expect(page.getByLabel("Stamps awarded")).toHaveText("0");
  await expect(page.getByRole("button", {name: "Play again", exact: true})).toBeVisible();
  await page.setViewportSize({width: 320, height: 740});
  expect(await page.locator(".v-modal").evaluate(element => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
  await page.getByRole("button", {name: "Play again", exact: true}).tap();
  expect(await page.locator(".v-modal").evaluate(element => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
});

test("touchscreen drag deposits an item without a follow-up answer button", async ({page}) => {
  await page.goto("/tests/fixtures/river-care.html");
  const source = (await page.getByRole("button", {name: "Pick up banana peel", exact: true}).boundingBox())!;
  const target = (await page.getByRole("button", {name: /^Compost bin,/}).boundingBox())!;
  const start = {x: source.x + source.width / 2, y: source.y + source.height / 2};
  const end = {x: target.x + target.width / 2, y: target.y + target.height / 2};
  const touch = await page.context().newCDPSession(page);
  await touch.send("Input.dispatchTouchEvent", {type: "touchStart", touchPoints: [start]});
  for (let step = 1; step <= 12; step++) await touch.send("Input.dispatchTouchEvent", {type: "touchMove", touchPoints: [{x: start.x + (end.x - start.x) * step / 12, y: start.y + (end.y - start.y) * step / 12}]});
  await touch.send("Input.dispatchTouchEvent", {type: "touchEnd", touchPoints: []});
  await expect(page.locator(".river-game")).toHaveAttribute("data-sorted", "1");
  await expect(page.getByRole("button", {name: "Pick up banana peel", exact: true})).toHaveCount(0);
  await touch.detach();
});
});
