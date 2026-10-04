import { expect, test } from "@playwright/test"

import { loginDemo } from "./helpers/auth"

test("creates a SQL query through the UI and finds it via search", async ({ page }) => {
  await loginDemo(page)

  const unique = Date.now()
  const title = `E2E Revenue Query ${unique}`
  const description = "Created by the Playwright end-to-end suite."
  const sql = "SELECT 42 AS answer;"

  await page.goto("/en/consultas?nova=true")

  await expect(page.getByRole("heading", { name: "New Query" })).toBeVisible()
  await page.getByLabel("Title").fill(title)
  await page.getByLabel("Description").fill(description)

  const editor = page.locator(".cm-content[contenteditable='true']").first()
  await editor.click()
  await page.keyboard.insertText(sql)

  await page.getByRole("button", { name: "Create Query", exact: true }).click()

  await expect(page.getByText("Query created!", { exact: true })).toBeVisible()
  await expect(page).toHaveURL(/\/en\/consultas$/)
  await expect(page.getByText(title, { exact: true })).toBeVisible()

  await page.getByPlaceholder("Search...").fill(title)

  await expect(page.getByText(title, { exact: true })).toBeVisible()
  await expect(page.getByText("1 query found", { exact: true })).toBeVisible()
})
