import { beforeEach, describe, expect, it, vi } from "vitest"
import { GET } from "@/app/api/health/route"
import db from "@/lib/db"

const queryRawUnsafe = db.$queryRawUnsafe as unknown as ReturnType<typeof vi.fn>

describe("GET /api/health", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    queryRawUnsafe.mockResolvedValue([{ ok: 1 }])
  })

  it("returns 200 when the database is reachable", async () => {
    const response = await GET()

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ status: "ok" })
    expect(queryRawUnsafe).toHaveBeenCalledWith("SELECT 1")
  })

  it("returns 503 without exposing internal details when the database check fails", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined)
    queryRawUnsafe.mockRejectedValue(new Error("database unavailable"))

    const response = await GET()

    expect(response.status).toBe(503)
    await expect(response.json()).resolves.toEqual({ status: "error" })
    consoleError.mockRestore()
  })
})
