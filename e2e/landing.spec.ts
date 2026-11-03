import { expect, test } from "@playwright/test"

test.describe("landing page", () => {
  test("renders the public landing for guests", async ({ page }) => {
    await page.goto("/en")

    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Your vault for SQL queries.")
    await expect(page.getByRole("link", { name: "Install with Docker" }).first()).toHaveAttribute("href", "#self-hosted")
    await expect(page.getByRole("link", { name: "Create account" })).toHaveCount(0)
    await expect(page.getByRole("link", { name: "Sign in" })).toHaveCount(0)
  })

  test("renders the Portuguese landing", async ({ page }) => {
    await page.goto("/pt-BR")

    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Seu cofre para consultas SQL.")
  })

  test("opens a larger view of a screenshot and closes it with Escape", async ({ page }) => {
    await page.goto("/en")

    await page.getByRole("button", { name: /Enlarge image/ }).first().click()
    const dialog = page.getByRole("dialog")
    await expect(dialog).toBeVisible()

    await page.keyboard.press("Escape")
    await expect(dialog).toHaveCount(0)
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
