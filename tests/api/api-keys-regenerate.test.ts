import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

import { POST } from "@/app/api/keys/[id]/regenerate/route"
import { hashApiToken } from "@/lib/api-key-token"
import prisma from "@/lib/db"
import { auth } from "@/auth"

describe("API Key Regenerate", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(auth).mockResolvedValue({ user: { id: "user-1" } } as any)
  })

  it("regenerates the raw token once and persists its hash", async () => {
    vi.mocked(prisma.apiKey.findUnique).mockResolvedValue({
      id: "key-1",
      userId: "user-1",
    } as any)

    vi.mocked(prisma.apiKey.update).mockResolvedValue({
      id: "key-1",
      name: "VS Code",
      createdAt: new Date("2026-03-23T10:00:00Z"),
      regeneratedAt: new Date(),
    } as any)

    const req = new NextRequest(
      "http://localhost/api/keys/key-1/regenerate",
      { method: "POST" }
    )
    const res = await POST(req, { params: { id: "key-1" } } as any)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.token).toMatch(/^[a-f0-9]{64}$/)

    const update = vi.mocked(prisma.apiKey.update).mock.calls[0][0] as any
    expect(update.data.token).toBe(body.token)
    expect(update.data.tokenHash).toBe(hashApiToken(body.token))
    expect(update.select).not.toHaveProperty("token")
  })

  it("returns 404 when the key belongs to another user", async () => {
    vi.mocked(prisma.apiKey.findUnique).mockResolvedValue({
      id: "key-1",
      userId: "other-user",
    } as any)

    const req = new NextRequest(
      "http://localhost/api/keys/key-1/regenerate",
      { method: "POST" }
    )
    const res = await POST(req, { params: { id: "key-1" } } as any)

    expect(res.status).toBe(404)
    expect(prisma.apiKey.update).not.toHaveBeenCalled()
  })
})
