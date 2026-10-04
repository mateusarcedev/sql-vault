import { expect, type Page } from "@playwright/test"

export const DEMO_EMAIL = "demo@sqlvault.local"
export const DEMO_PASSWORD = "DemoVault2026!"

export async function loginDemo(page: Page) {
  await page.goto("/en/login")
  await page.getByLabel("Email").fill(DEMO_EMAIL)
  await page.getByLabel("Password").fill(DEMO_PASSWORD)
  await page.getByRole("button", { name: "Login", exact: true }).click()

  await expect(page).toHaveURL(/\/en\/?$/)
  await expect(page.getByText(DEMO_EMAIL, { exact: true })).toBeVisible()
}
