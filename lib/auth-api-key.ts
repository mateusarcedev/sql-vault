import db from '@/lib/db'
import { NextRequest } from 'next/server'

/**
 * Validates an API Key from the Authorization header and returns the user ID.
 * Updates the lastUsedAt timestamp asynchronously.
 */
export async function getUserFromApiKey(
  req: NextRequest
): Promise<string | null> {
  const authHeader = req.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) return null

  const token = authHeader.slice(7)
  if (!token) return null

  // lib/db.ts exports the prisma client as default
  const apiKey = await db.apiKey.findUnique({
    where: { token },
    select: { userId: true, id: true },
  })

  if (!apiKey) return null

  // Atualizar lastUsedAt sem bloquear a resposta
  db.apiKey.update({
    where: { id: apiKey.id },
    data: { lastUsedAt: new Date() },
  }).catch((err: any) => {
    console.error("[AUTH_API_KEY_UPDATE]", err)
  })

  return apiKey.userId
}
