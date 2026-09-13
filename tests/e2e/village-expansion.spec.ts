import { expect, type Page, test } from "./fixtures";

async function openCompletedPracticeVillage(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem("lead-graphics-quality-v1", "balanced");
  });
  await page.goto("/");
  await page.evaluate(async () => {
    const rulesUrl = "/packages/game-rules/index.ts";
    const curriculumUrl = "/packages/curriculum/index.ts";
    const storeUrl = "/apps/client/store.ts";
    const villageSessionUrl = "/apps/client/village/session.ts";
    const [rules, curriculum, store, villageSession] = await Promise.all([
      import(rulesUrl),
      import(curriculumUrl),
      import(storeUrl),
      import(villageSessionUrl),
    ]);

    let player = rules.createPlayer("practice", "Village Explorer");
    for (const [index, lesson] of curriculum.lessons.entries()) {
      player = rules.applyCommand(player, {
        id: `village-lesson-${index}`,
        type: "lesson",
        index,
        answer: lesson.answer,
      }).player;
    }
    for (const [index, question] of curriculum.gate.entries()) {
      player = rules.applyCommand(player, {
        id: `village-gate-${index}`,
        type: "gate",
        index,
        answer: question.answer,
      }).player;
    }
    player = rules.applyCommand(
      player,
      {
        id: "village-business",
        type: "setup",
        name: "Village Bento",
        price: 6,
        color: "#52a7da",
        goal: "Learn through play",
      },
      1972,
    ).player;
    if (!player.game) throw new Error("Practice business was not created.");
    player.game.phase = "village";

    store.useGame.setState({
      player: rules.publicPlayer(player),
      practicePrivate: player,
      practice: true,
      page: "village",
      error: "",
      feedback: null,
      busy: false,
      presenting: false,
    });
    villageSession.useVillageSession.setState({
      district: "festival",
      completed: [],
    });
  });
  await expect(
    page.getByRole("heading", { name: "Stay curious. Wander a little." }),
  ).toBeVisible();
}

async function chooseMap(page: Page, name: string) {
  const map = page
    .getByRole("navigation", { name: "Choose a village map" })
    .getByRole("button", { name: new RegExp(name) });
  await map.click();
  await expect(map).toHaveAttribute("aria-current", "page");
  await expect(page.locator(".v-world-header")).toContainText(name);
}

test("district guidance, one real activity, and passport stamps work together", async ({
  page,
}) => {
  test.setTimeout(180_000);
  await openCompletedPracticeVillage(page);

  await chooseMap(page, "Sakura Riverside");
  await expect(page.getByText("The thoughtful picnic", { exact: true })).toBeVisible();
  await chooseMap(page, "Lantern Craft Lane");
  await expect(page.getByText("Light the lantern pattern", { exact: true })).toBeVisible();
  await chooseMap(page, "Festival Market");
  await expect(page.getByText("Bento kitchen", { exact: true })).toBeVisible();

  const bento = page.locator(".v-activity-list li").filter({
    has: page.getByRole("heading", { name: "Bento kitchen", exact: true }),
  });
  await bento.getByRole("button", { name: "Show me where" }).click();
  await expect(page.locator(".v-destination")).toContainText(
    "Follow the marker to Bento & Co.",
  );
  await expect(page.getByRole("button", { name: "Clear destination" })).toBeVisible();

  const canvas = page.locator(".explore-canvas canvas");
  await expect(canvas).toHaveAttribute("data-ready", "true", { timeout: 60_000 });
  await canvas.click();
  await page.keyboard.down("w");
  try {
    await expect(
      page.getByRole("button", { name: /Explore Bento & Co\./ }),
    ).toBeVisible({ timeout: 25_000 });
  } finally {
    await page.keyboard.up("w");
  }
  await page.keyboard.press("e");

  const dialog = page.getByRole("dialog", { name: "Bento & Co." });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: /^Activity/ }).click();

  const orders = [
    ["Rice", "Tofu", "Carrot"],
    ["Rice", "Edamame", "Cucumber"],
    ["Tofu", "Carrot", "Cucumber"],
  ];
  for (const [index, items] of orders.entries()) {
    for (const item of items) {
      await dialog.getByRole("button", { name: item, exact: true }).click();
    }
    await dialog.getByRole("button", { name: "Serve this bento" }).click();
    await expect(dialog.getByRole("status")).toContainText("Order complete!");
    await dialog
      .getByRole("button", {
        name: index === orders.length - 1 ? "Collect my stamp" : "Next step",
      })
      .click();
  }

  await expect(
    dialog.getByRole("heading", { name: "Your passport has a new stamp!" }),
  ).toBeVisible();
  await dialog.getByRole("button", { name: "Keep exploring" }).click();
  await expect(page.locator(".v-passport-total")).toContainText("1 / 11");
  await expect(bento.locator(".v-stamp")).toHaveClass(/earned/);
  await expect(
    page.getByRole("progressbar", { name: "District activities completed" }),
  ).toHaveAttribute("value", "1");

  await chooseMap(page, "Sakura Riverside");
  await expect(page.locator(".v-passport-total")).toContainText("1 / 11");
  await expect(
    page.getByRole("progressbar", { name: "District activities completed" }),
  ).toHaveAttribute("value", "0");
  await chooseMap(page, "Lantern Craft Lane");
  await expect(page.locator(".v-passport-total")).toContainText("1 / 11");
  await chooseMap(page, "Festival Market");
  await expect(bento.locator(".v-stamp")).toHaveClass(/earned/);
});

test.describe("mobile and keyboard basics", () => {
  test.use({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
    reducedMotion: "reduce",
  });

  test("map, passport, and movement controls stay operable", async ({ page }) => {
    await openCompletedPracticeVillage(page);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth + 1,
      ),
    ).toBe(true);

    const sakura = page
      .getByRole("navigation", { name: "Choose a village map" })
      .getByRole("button", { name: /Sakura Riverside/ });
    await sakura.focus();
    await page.keyboard.press("Enter");
    await expect(sakura).toHaveAttribute("aria-current", "page");

    const passport = page.getByRole("button", { name: "My activity passport" });
    await expect(passport).toHaveAttribute("aria-expanded", "true");
    await passport.focus();
    await page.keyboard.press("Space");
    await expect(passport).toHaveAttribute("aria-expanded", "false");
    await page.keyboard.press("Space");
    await expect(passport).toHaveAttribute("aria-expanded", "true");

    const controls = page.getByLabel("Movement controls");
    await expect(controls).toBeVisible();
    for (const direction of ["forward", "left", "back", "right"]) {
      await expect(
        controls.getByRole("button", { name: `Move ${direction}` }),
      ).toBeVisible();
    }
  });
});
