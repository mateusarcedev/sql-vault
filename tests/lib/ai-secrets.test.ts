import { beforeEach, describe, expect, it } from "vitest"

import {
  decryptAISecret,
  encryptAISecret,
  isEncryptedAISecret,
} from "@/lib/ai/secrets"
import { resetServerEnvCacheForTests } from "@/lib/env"

const AI_KEY = Buffer.from("0123456789abcdef0123456789abcdef").toString("base64")

describe("AI credential encryption", () => {
  beforeEach(() => {
    process.env.DATABASE_URL = "postgresql://user:pass@localhost:5432/sqlvault"
    process.env.AI_ENCRYPTION_KEY = AI_KEY
    process.env.NODE_ENV = "test"
    resetServerEnvCacheForTests()
  })

  it("encrypts with AES-GCM and decrypts to the original value", () => {
    const encrypted = encryptAISecret("sk-example-secret")

    expect(encrypted).not.toContain("sk-example-secret")
    expect(isEncryptedAISecret(encrypted)).toBe(true)
    expect(decryptAISecret(encrypted)).toBe("sk-example-secret")
  })

  it("keeps legacy plaintext readable during the migration window", () => {
    expect(decryptAISecret("legacy-plaintext-key")).toBe("legacy-plaintext-key")
  })

  it("does not double-encrypt already encrypted values", () => {
    const encrypted = encryptAISecret("secret")
    expect(encryptAISecret(encrypted)).toBe(encrypted)
  })

  it("rejects tampered ciphertext", () => {
    const encrypted = encryptAISecret("secret")
    const tampered = `${encrypted.slice(0, -2)}AA`

    expect(() => decryptAISecret(tampered)).toThrow()
  })
})
