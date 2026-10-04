import { expect, test } from "@playwright/test"

import { loginDemo } from "./helpers/auth"

test("creates an API key and only exposes the raw token in the one-time dialog", async ({ page }) => {
  await loginDemo(page)

  const keyName = `Playwright E2E ${Date.now()}`

  await page.goto("/en/settings")
  await page.getByRole("button", { name: "New API Key", exact: true }).click()

  await expect(page.getByRole("dialog").getByText("New API Key", { exact: true })).toBeVisible()
  await page.getByLabel("Key Name").fill(keyName)
  await page.getByRole("button", { name: "Create Key", exact: true }).click()

  await expect(page.getByRole("dialog").getByText("API Key Created!", { exact: true })).toBeVisible()

  const tokenInput = page.getByRole("dialog").locator("input").first()
  await expect(tokenInput).toHaveValue(/^[a-f0-9]{64}$/)
  const token = await tokenInput.inputValue()
  expect(token).toMatch(/^[a-f0-9]{64}$/)

  await page.getByRole("button", { name: "Understood, I've already copied the key", exact: true }).click()

  await expect(page.getByText(keyName, { exact: true })).toBeVisible()
  await expect(page.getByDisplayValue(token)).toHaveCount(0)
  await expect(page.getByText(token, { exact: true })).toHaveCount(0)
})
