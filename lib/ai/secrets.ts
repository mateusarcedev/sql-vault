import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from "node:crypto"

import { getAIEncryptionKey } from "@/lib/env"

const PREFIX = "enc:v1"
const IV_LENGTH = 12

export function isEncryptedAISecret(value: string | null | undefined): boolean {
  return typeof value === "string" && value.startsWith(`${PREFIX}:`)
}

export function encryptAISecret(value: string): string {
  if (isEncryptedAISecret(value)) return value

  const key = getAIEncryptionKey()
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv("aes-256-gcm", key, iv)
  const encrypted = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final(),
  ])
  const tag = cipher.getAuthTag()

  return [
    PREFIX,
    iv.toString("base64"),
    tag.toString("base64"),
    encrypted.toString("base64"),
  ].join(":")
}

export function decryptAISecret(
  value: string | null | undefined
): string | null {
  if (!value) return null

  // Transitional compatibility: existing plaintext values remain readable
  // until the explicit backfill encrypts them.
  if (!isEncryptedAISecret(value)) return value

  const parts = value.split(":")
  if (parts.length !== 6 || `${parts[0]}:${parts[1]}` !== PREFIX) {
    throw new Error("Invalid encrypted AI secret format")
  }

  const [, , , ivBase64, tagBase64, encryptedBase64] = parts
  const key = getAIEncryptionKey()
  const decipher = createDecipheriv(
    "aes-256-gcm",
    key,
    Buffer.from(ivBase64, "base64")
  )
  decipher.setAuthTag(Buffer.from(tagBase64, "base64"))

  return Buffer.concat([
    decipher.update(Buffer.from(encryptedBase64, "base64")),
    decipher.final(),
  ]).toString("utf8")
}
