import { expect, test } from "@playwright/test"

import { DEMO_EMAIL, DEMO_PASSWORD, loginDemo } from "./helpers/auth"

test.describe("authentication", () => {
  test("redirects unauthenticated users from protected pages to login", async ({ page }) => {
    await page.goto("/en/settings")

    await expect(page).toHaveURL(/\/en\/login$/)
    await expect(page.getByRole("heading", { name: "Login" })).toBeVisible()
  })

  test("rejects invalid credentials", async ({ page }) => {
    await page.goto("/en/login")
    await page.getByLabel("Email").fill(DEMO_EMAIL)
    await page.getByLabel("Password").fill("definitely-wrong-password")
    await page.getByRole("button", { name: "Login", exact: true }).click()

    await expect(page.getByText("Invalid credentials", { exact: true })).toBeVisible()
    await expect(page).toHaveURL(/\/en\/login$/)
  })

  test("registers a new account and authenticates with it", async ({ page }) => {
    const email = `e2e-${Date.now()}@sqlvault.local`
    const password = "E2ePass2026!"

    await page.goto("/en/register")
    await page.getByLabel("Name").fill("E2E User")
    await page.getByLabel("Email").fill(email)
    await page.getByLabel("Password").fill(password)
    await page.getByRole("button", { name: "Register", exact: true }).click()

    await expect(page).toHaveURL(/\/en\/login$/)

    await page.getByLabel("Email").fill(email)
    await page.getByLabel("Password").fill(password)
    await page.getByRole("button", { name: "Login", exact: true }).click()

    await expect(page).toHaveURL(/\/en\/?$/)
    await expect(page.getByText(email, { exact: true })).toBeVisible()
  })

  test("logs in with the seeded demo user", async ({ page }) => {
    await loginDemo(page)

    await expect(page.getByText("SQL Vault", { exact: true })).toBeVisible()
    await expect(page.getByText("Dashboard", { exact: true }).first()).toBeVisible()
  })

  test("renders the Portuguese authentication experience", async ({ page }) => {
    await page.goto("/pt-BR/login")

    await expect(page.getByText("Entre com seu email e senha", { exact: true })).toBeVisible()
    await expect(page.getByLabel("Senha")).toBeVisible()
    await expect(page.getByRole("button", { name: "Entrar", exact: true })).toBeVisible()
  })

  test("signs the authenticated user out", async ({ page }) => {
    await loginDemo(page)

    await page.locator("button:has(svg.lucide-log-out)").click()

    await expect(page).toHaveURL(/\/en\/login$/)
    await expect(page.getByRole("heading", { name: "Login" })).toBeVisible()
  })
})
