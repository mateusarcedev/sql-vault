import { describe, it, expect, vi, beforeEach } from "vitest"
import { getUserFromApiKey } from "@/lib/auth-api-key"
import { hashApiToken } from "@/lib/api-key-token"
import prisma from "@/lib/db"
import { NextRequest } from "next/server"

function makeRequest(authHeader?: string): NextRequest {
  return new NextRequest("http://localhost/api/test", {
    headers: authHeader ? { authorization: authHeader } : {},
  })
}

describe("getUserFromApiKey", () => {
  beforeEach(() => vi.clearAllMocks())

  it("returns null without Authorization header", async () => {
    const result = await getUserFromApiKey(makeRequest())
    expect(result).toBeNull()
    expect(prisma.apiKey.findUnique).not.toHaveBeenCalled()
  })

  it("returns null for non-Bearer authorization", async () => {
    const result = await getUserFromApiKey(makeRequest("Basic abc123"))
    expect(result).toBeNull()
  })

  it("looks up active tokens by SHA-256 hash", async () => {
    vi.mocked(prisma.apiKey.findUnique).mockResolvedValue({
      id: "key-1",
      userId: "user-1",
      tokenHash: hashApiToken("token-valido"),
    } as any)

    const result = await getUserFromApiKey(makeRequest("Bearer token-valido"))

    expect(result).toBe("user-1")
    expect(prisma.apiKey.findUnique).toHaveBeenCalledWith({
      where: { tokenHash: hashApiToken("token-valido") },
      select: { userId: true, id: true, tokenHash: true },
    })
  })

  it("falls back to legacy plaintext and opportunistically stores its hash", async () => {
    vi.mocked(prisma.apiKey.findUnique)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: "legacy-key",
        userId: "user-1",
        tokenHash: null,
      } as any)

    const result = await getUserFromApiKey(makeRequest("Bearer legacy-token"))
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(result).toBe("user-1")
    expect(prisma.apiKey.findUnique).toHaveBeenNthCalledWith(2, {
      where: { token: "legacy-token" },
      select: { userId: true, id: true, tokenHash: true },
    })
    expect(prisma.apiKey.update).toHaveBeenCalledWith({
      where: { id: "legacy-key" },
      data: { tokenHash: hashApiToken("legacy-token") },
    })
  })

  it("returns null when neither hash nor legacy token exists", async () => {
    vi.mocked(prisma.apiKey.findUnique).mockResolvedValue(null)

    await expect(
      getUserFromApiKey(makeRequest("Bearer invalid-token"))
    ).resolves.toBeNull()
  })

  it("updates lastUsedAt for a valid token without blocking the response", async () => {
    vi.mocked(prisma.apiKey.findUnique).mockResolvedValue({
      id: "key-1",
      userId: "user-1",
      tokenHash: hashApiToken("token-valido"),
    } as any)

    await getUserFromApiKey(makeRequest("Bearer token-valido"))
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(prisma.apiKey.update).toHaveBeenCalledWith({
      where: { id: "key-1" },
      data: { lastUsedAt: expect.any(Date) },
    })
  })

  it("does not throw if lastUsedAt update fails", async () => {
    vi.mocked(prisma.apiKey.findUnique).mockResolvedValue({
      id: "key-1",
      userId: "user-1",
      tokenHash: hashApiToken("token-valido"),
    } as any)
    vi.mocked(prisma.apiKey.update).mockRejectedValue(new Error("DB error"))

    await expect(
      getUserFromApiKey(makeRequest("Bearer token-valido"))
    ).resolves.toBe("user-1")
  })
})
