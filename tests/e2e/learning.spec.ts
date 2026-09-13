import { expect, test } from "./fixtures";

test("teaches the finance terms before practice and the final quiz", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Try practice", exact: true }).click();
  await page.getByRole("button", { name: "Meet Sparko & learn" }).click();

  await expect(
    page.getByRole("heading", { name: "Learn it. See it. Try it." }),
  ).toBeVisible();
  await expect(page.getByText("Why it matters", { exact: true })).toBeVisible();
  await expect(page.getByText("Worked example", { exact: true })).toBeVisible();
  await expect(
    page.getByText("The amount a customer is asked to pay for one item."),
  ).toBeVisible();
  await expect(page.locator(".question-card")).toHaveCount(0);

  const answers = [1, 2, 1, 0, 1, 2];
  for (const [lessonIndex, answer] of answers.entries()) {
    await page
      .getByRole("button", { name: "Try a practice question", exact: true })
      .click();
    await expect(page.locator(".question-card")).toBeVisible();
    await expect(page.locator(".question-card h3")).toBeFocused();
    await page.locator(".answer-options button").nth(answer).click();
    await page
      .getByRole("button", {
        name: /^(Continue to next lesson|Review terms before final quiz)$/,
      })
      .click();

    if (lessonIndex < answers.length - 1)
      await expect(page.locator(".question-card")).toHaveCount(0);
  }

  await expect(
    page.getByRole("heading", { name: "Words worth knowing" }),
  ).toBeVisible();
  await expect(page.getByText("Refund", { exact: true })).toBeVisible();
  await expect(page.getByText("Risk", { exact: true })).toBeVisible();
  await expect(page.locator(".question-card")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Start the final quiz", exact: true })
    .click();

  for (const [questionIndex, answer] of [0, 1, 1].entries()) {
    await page.locator(".answer-options button").nth(answer).click();
    if (questionIndex < 2) {
      await expect(page.locator(".chapter-chip")).toHaveText(
        `QUESTION ${questionIndex + 1} / 3`,
      );
      await page
        .getByRole("button", { name: "Next question", exact: true })
        .click();
    }
  }

  await expect(
    page.getByRole("heading", { name: "Your first five coins." }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Your first five coins." }),
  ).toBeFocused();

  await page.getByRole("button", { name: "Overview", exact: true }).click();
  await page.getByRole("button", { name: "Learning", exact: true }).click();
  await expect(page.locator(".question-card")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Try a practice question", exact: true }),
  ).toBeVisible();
});
