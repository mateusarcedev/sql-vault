import { describe, expect, it } from "vitest"

import { validateServerEnv } from "@/lib/env"

const AI_KEY = Buffer.from("0123456789abcdef0123456789abcdef").toString("base64")

describe("server environment validation", () => {
  it("accepts a minimal development environment", () => {
    expect(
      validateServerEnv({
        NODE_ENV: "development",
        DATABASE_URL: "postgresql://user:pass@localhost:5432/sqlvault",
      })
    ).toMatchObject({
      NODE_ENV: "development",
    })
  })

  it("requires production authentication and encryption secrets", () => {
    expect(() =>
      validateServerEnv({
        NODE_ENV: "production",
        DATABASE_URL: "postgresql://user:pass@localhost:5432/sqlvault",
      })
    ).toThrow(/AUTH_SECRET/)

    expect(() =>
      validateServerEnv({
        NODE_ENV: "production",
        DATABASE_URL: "postgresql://user:pass@localhost:5432/sqlvault",
        AUTH_SECRET: "a".repeat(32),
        NEXTAUTH_URL: "https://sqlvault.example.com",
      })
    ).toThrow(/AI_ENCRYPTION_KEY/)
  })

  it("accepts a complete production environment", () => {
    expect(
      validateServerEnv({
        NODE_ENV: "production",
        DATABASE_URL: "postgresql://user:pass@localhost:5432/sqlvault",
        AUTH_SECRET: "a".repeat(32),
        NEXTAUTH_URL: "https://sqlvault.example.com",
        AI_ENCRYPTION_KEY: AI_KEY,
      })
    ).toMatchObject({
      NODE_ENV: "production",
      NEXTAUTH_URL: "https://sqlvault.example.com",
    })
  })

  it("rejects encryption keys that are not exactly 32 bytes", () => {
    expect(() =>
      validateServerEnv({
        NODE_ENV: "development",
        DATABASE_URL: "postgresql://user:pass@localhost:5432/sqlvault",
        AI_ENCRYPTION_KEY: Buffer.from("short").toString("base64"),
      })
    ).toThrow(/32 bytes/)
  })
})
