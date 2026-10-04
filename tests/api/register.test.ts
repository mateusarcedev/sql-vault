import { beforeEach, describe, expect, it, vi } from "vitest"

import { POST } from "@/app/api/register/route"
import db from "@/lib/db"

describe("POST /api/register", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(db.user.findUnique).mockResolvedValue(null)
  })

  it("returns only the safe user DTO and never exposes password", async () => {
    vi.mocked(db.user.create).mockResolvedValue({
      id: "user-1",
      name: "Demo User",
      email: "demo@example.com",
    } as any)

    const response = await POST(
      new Request("http://localhost/api/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: "Demo User",
          email: "Demo@Example.com",
          password: "secret123",
        }),
      })
    )

    expect(response.status).toBe(201)
    const body = await response.json()

    expect(body).toEqual({
      id: "user-1",
      name: "Demo User",
      email: "demo@example.com",
    })
    expect(body).not.toHaveProperty("password")
    expect(db.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        select: {
          id: true,
          name: true,
          email: true,
        },
      })
    )
  })

  it("rejects invalid registration payload", async () => {
    const response = await POST(
      new Request("http://localhost/api/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: "not-an-email",
          password: "123",
        }),
      })
    )

    expect(response.status).toBe(400)
    expect(db.user.create).not.toHaveBeenCalled()
  })
})
