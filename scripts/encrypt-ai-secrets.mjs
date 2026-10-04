import "dotenv/config"
import {
  createCipheriv,
  randomBytes,
} from "node:crypto"
import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"

const connectionString = process.env.DATABASE_URL
const encodedKey = process.env.AI_ENCRYPTION_KEY

if (!connectionString) {
  console.error("DATABASE_URL is required")
  process.exit(1)
}

if (!encodedKey) {
  console.error("AI_ENCRYPTION_KEY is required")
  process.exit(1)
}

const encryptionKey = Buffer.from(encodedKey, "base64")
if (encryptionKey.length !== 32) {
  console.error("AI_ENCRYPTION_KEY must decode to exactly 32 bytes")
  process.exit(1)
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
})

const prefix = "enc:v1"
const encrypt = (value) => {
  if (!value || value.startsWith(`${prefix}:`)) return value

  const iv = randomBytes(12)
  const cipher = createCipheriv("aes-256-gcm", encryptionKey, iv)
  const encrypted = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final(),
  ])
  const tag = cipher.getAuthTag()

  return [
    prefix,
    iv.toString("base64"),
    tag.toString("base64"),
    encrypted.toString("base64"),
  ].join(":")
}

try {
  const configs = await prisma.userAIConfig.findMany({
    select: {
      id: true,
      openaiApiKey: true,
      anthropicApiKey: true,
      geminiApiKey: true,
    },
  })

  let updated = 0
  for (const config of configs) {
    const next = {
      openaiApiKey: encrypt(config.openaiApiKey),
      anthropicApiKey: encrypt(config.anthropicApiKey),
      geminiApiKey: encrypt(config.geminiApiKey),
    }

    if (
      next.openaiApiKey === config.openaiApiKey &&
      next.anthropicApiKey === config.anthropicApiKey &&
      next.geminiApiKey === config.geminiApiKey
    ) {
      continue
    }

    await prisma.userAIConfig.update({
      where: { id: config.id },
      data: next,
    })
    updated += 1
  }

  console.log(`AI secret encryption backfill complete: ${updated} updated`)
} finally {
  await prisma.$disconnect()
}
