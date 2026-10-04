import { z } from "zod"

const optionalUrl = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.string().url().optional()
)

const optionalString = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.string().optional()
)

const serverEnvSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    DATABASE_URL: z
      .string()
      .min(1, "DATABASE_URL is required")
      .refine(
        (value) => value.startsWith("postgresql://") || value.startsWith("postgres://"),
        "DATABASE_URL must be a PostgreSQL connection URL"
      ),
    AUTH_SECRET: optionalString,
    NEXTAUTH_URL: optionalUrl,
    OLLAMA_BASE_URL: optionalUrl,
    AI_ENCRYPTION_KEY: optionalString,
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV !== "production") return

    if (!env.AUTH_SECRET || env.AUTH_SECRET.length < 32) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["AUTH_SECRET"],
        message: "AUTH_SECRET must be at least 32 characters in production",
      })
    }

    if (!env.NEXTAUTH_URL) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["NEXTAUTH_URL"],
        message: "NEXTAUTH_URL is required in production",
      })
    }

    if (!env.AI_ENCRYPTION_KEY) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["AI_ENCRYPTION_KEY"],
        message: "AI_ENCRYPTION_KEY is required in production",
      })
    }
  })

export type ServerEnv = z.infer<typeof serverEnvSchema>

let cachedEnv: ServerEnv | undefined

function validateEncryptionKey(value: string | undefined): void {
  if (!value) return

  let decoded: Buffer
  try {
    decoded = Buffer.from(value, "base64")
  } catch {
    throw new Error("[ENV_VALIDATION] AI_ENCRYPTION_KEY must be valid base64")
  }

  if (decoded.length !== 32) {
    throw new Error(
      "[ENV_VALIDATION] AI_ENCRYPTION_KEY must decode to exactly 32 bytes"
    )
  }
}

export function validateServerEnv(
  source: NodeJS.ProcessEnv = process.env
): ServerEnv {
  const parsed = serverEnvSchema.safeParse(source)

  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join(".") || "environment"}: ${issue.message}`)
      .join("; ")

    throw new Error(`[ENV_VALIDATION] ${details}`)
  }

  validateEncryptionKey(parsed.data.AI_ENCRYPTION_KEY)

  return parsed.data
}

export function getServerEnv(): ServerEnv {
  cachedEnv ??= validateServerEnv(process.env)
  return cachedEnv
}

export function resetServerEnvCacheForTests(): void {
  cachedEnv = undefined
}

export function getAIEncryptionKey(): Buffer {
  const value = getServerEnv().AI_ENCRYPTION_KEY

  if (!value) {
    throw new Error(
      "[ENV_VALIDATION] AI_ENCRYPTION_KEY is required to store or read encrypted AI credentials"
    )
  }

  const key = Buffer.from(value, "base64")
  if (key.length !== 32) {
    throw new Error(
      "[ENV_VALIDATION] AI_ENCRYPTION_KEY must decode to exactly 32 bytes"
    )
  }

  return key
}
