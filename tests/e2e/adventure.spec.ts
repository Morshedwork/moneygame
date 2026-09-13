import { test, expect, Page } from "@playwright/test";
async function learn(page: Page) {
  await page.getByRole("button", { name: "Try practice", exact: true }).click();
  await page.getByRole("button", { name: "Meet Sparko & learn" }).click();
  await page
    .getByRole("button", { name: "Try a practice question", exact: true })
    .click();
  await page.locator(".answer-options button").nth(0).click();
  await expect(page.getByText("Let’s look at it another way.")).toBeVisible();
  for (const [lessonIndex, answer] of [1, 2, 1, 0, 1, 2].entries()) {
    if (lessonIndex > 0)
      await page
        .getByRole("button", {
          name: "Try a practice question",
          exact: true,
        })
        .click();
    await page.locator(".answer-options button").nth(answer).click();
    await page
      .getByRole("button", {
        name: /^(Continue to next lesson|Review terms before final quiz)$/,
      })
      .click();
  }
  await page
    .getByRole("button", { name: "Start the final quiz", exact: true })
    .click();
  for (const [i, answer] of [0, 1, 1].entries()) {
    await page.locator(".answer-options button").nth(answer).click();
    if (i < 2)
      await page
        .getByRole("button", { name: "Next question", exact: true })
        .click();
  }
  await expect(
    page.getByRole("heading", { name: "Your first five coins." }),
  ).toBeVisible();
}
test("complete practice: learning → business → full quarter → reflection → walk in village", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Small steps. Big possibilities." }),
  ).toBeVisible();
  await learn(page);
  await page.getByRole("button", { name: "Create my bento business" }).click();
  await page.getByLabel("Your business name").fill("Aki’s Bento");
  await page.getByRole("button", { name: "Open my business" }).click();
  for (let i = 0; i < 40; i++) {
    if (
      await page
        .getByRole("heading", { name: "Look how far you’ve come." })
        .count()
    )
      break;
    await page.locator('.board-layout[data-roll-stage="rolling"], .board-layout[data-roll-stage="walking"]').waitFor({ state: "hidden" });
    if (await page.getByRole("heading", { name: "Look how far you’ve come." }).count()) break;
    let found = false;
    for (const pattern of [
      /^Roll the die$/,
      /^Keep price/,
      /^Save 0 coins$/,
      /^Contribute 0 coins$/,
      /^0 coins →/,
      /^Give a fair refund$/,
      /^Keep my coins$/,
      /^A moment to reflect$/,
    ]) {
      const button = page.getByRole("button", { name: pattern });
      if (await button.count()) {
        await button.first().click();
        found = true;
        break;
      }
    }
    expect(found, "Every board state must have an actionable choice").toBe(
      true,
    );
  }
  await expect(
    page.getByRole("heading", { name: "Look how far you’ve come." }),
  ).toBeVisible();
  await page
    .getByLabel(
      "What choice taught you something? What might you try differently?",
    )
    .fill(
      "I learned that different customers have different budgets. Next time I will try saving some of my profit.",
    );
  await page.getByRole("button", { name: "Step into Yatai Village" }).click();
  await expect(
    page.getByRole("heading", { name: "Yatai Village", exact: true }),
  ).toBeVisible();
  await expect(page.locator('.explore-canvas canvas[data-ready="true"]')).toBeVisible({ timeout: 30000 });
  await page.keyboard.down("w");
  try {
    await expect(
      page.getByRole("button", { name: /Explore Bento & Co/ }),
    ).toBeVisible({ timeout: 20000 });
  } finally {
    await page.keyboard.up("w");
  }
  await page.keyboard.press("e");
  await expect(page.getByRole("dialog", { name: "Bento & Co." })).toBeVisible();
  await page.getByRole("button", { name: "Keep exploring" }).click();
  await page.getByRole("button", { name: "My business", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Every coin has a story." }),
  ).toBeVisible();
  await expect(
    page.getByText(/different customers have different budgets/),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
test("locked village and no silent persistence", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Try practice", exact: true }).click();
  await page
    .getByRole("button", { name: "Yatai Village", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "A village of possibilities awaits." }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Try practice", exact: true }),
  ).toBeVisible();
});
test("mobile landing and signup validation", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Start your adventure" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Start your adventure" }).click();
  await expect(
    page.getByRole("heading", { name: "Create your account" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Parent", exact: true }).click();
  await expect(page.getByLabel("Your name", { exact: true })).toBeVisible();
  await page.getByLabel("Your name", { exact: true }).fill("Test Parent");
  await page.getByLabel("Email address").fill("qa@example.invalid");
  await page
    .getByLabel("Password", { exact: true })
    .fill("not-a-real-password");
  await page.getByRole("checkbox").check();
  await page.route("**/accounts:signUp?**", (route) =>
    route.fulfill({
      status: 400,
      contentType: "application/json",
      body: JSON.stringify({
        error: { code: 400, message: "CONFIGURATION_NOT_FOUND" },
      }),
    }),
  );
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText(
    "Firebase sign-in is not enabled",
  );
});
