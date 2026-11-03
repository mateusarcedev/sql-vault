import { expect, test } from "@playwright/test"

test.describe("landing page", () => {
  test("renders the public landing for guests", async ({ page }) => {
    await page.goto("/en")

    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Your vault for SQL queries.")
    await expect(page.getByRole("link", { name: "Create account" }).first()).toHaveAttribute("href", "/en/register")
  })

  test("renders the Portuguese landing", async ({ page }) => {
    await page.goto("/pt-BR")

    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Seu cofre para consultas SQL.")
  })

  test("redirects guests from the root to the default locale landing", async ({ page }) => {
    await page.goto("/")

    await expect(page).toHaveURL(/\/en$/)
  })

  test("keeps the dashboard behind authentication", async ({ page }) => {
    await page.goto("/en/dashboard")

    await expect(page).toHaveURL(/\/en\/login$/)
  })
})
