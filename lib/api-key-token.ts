import { createHash, randomBytes } from "node:crypto"

export function hashApiToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex")
}

export function createApiToken(): { token: string; tokenHash: string } {
  const token = randomBytes(32).toString("hex")
  return { token, tokenHash: hashApiToken(token) }
}
