import db from "@/lib/db"
import { hashApiToken } from "@/lib/api-key-token"
import { NextRequest } from "next/server"

/**
 * Validates an API key without requiring new clients to change token format.
 * Hashed lookup is primary; plaintext lookup is transitional fallback for
 * keys created before the security migration.
 */
export async function getUserFromApiKey(
  req: NextRequest
): Promise<string | null> {
  const authHeader = req.headers.get("authorization")
  if (!authHeader?.startsWith("Bearer ")) return null

  const token = authHeader.slice(7)
  if (!token) return null

  const tokenHash = hashApiToken(token)

  let apiKey = await db.apiKey.findUnique({
    where: { tokenHash },
    select: { userId: true, id: true, tokenHash: true },
  })

  if (!apiKey) {
    const legacyKey = await db.apiKey.findUnique({
      where: { token },
      select: { userId: true, id: true, tokenHash: true },
    })

    if (!legacyKey) return null

    apiKey = legacyKey

    if (!legacyKey.tokenHash) {
      db.apiKey
        .update({
          where: { id: legacyKey.id },
          data: { tokenHash },
        })
        .catch((error: unknown) => {
          console.error("[AUTH_API_KEY_HASH_BACKFILL]", error)
        })
    }
  }

  db.apiKey
    .update({
      where: { id: apiKey.id },
      data: { lastUsedAt: new Date() },
    })
    .catch((error: unknown) => {
      console.error("[AUTH_API_KEY_UPDATE]", error)
    })

  return apiKey.userId
}
