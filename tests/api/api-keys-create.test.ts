import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

import { POST } from "@/app/api/keys/route"
import { hashApiToken } from "@/lib/api-key-token"
import prisma from "@/lib/db"
import { auth } from "@/auth"

describe("POST /api/keys", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(auth).mockResolvedValue({ user: { id: "user-1" } } as any)
    vi.mocked(prisma.apiKey.create).mockResolvedValue({
      id: "key-1",
      name: "VS Code",
      createdAt: new Date(),
      regeneratedAt: new Date(),
    } as any)
  })

  it("returns the raw token once while persisting its hash", async () => {
    const response = await POST(
      new NextRequest("http://localhost/api/keys", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "VS Code" }),
      })
    )
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.token).toMatch(/^[a-f0-9]{64}$/)

    const create = vi.mocked(prisma.apiKey.create).mock.calls[0][0] as any
    expect(create.data.token).toBe(body.token)
    expect(create.data.tokenHash).toBe(hashApiToken(body.token))
    expect(create.select).not.toHaveProperty("token")
  })
})
