import "dotenv/config"
import { createHash } from "node:crypto"
import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  console.error("DATABASE_URL is required")
  process.exit(1)
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
})

const hashToken = (token) =>
  createHash("sha256").update(token, "utf8").digest("hex")

try {
  const legacyKeys = await prisma.apiKey.findMany({
    where: { tokenHash: null },
    select: { id: true, token: true },
  })

  for (const key of legacyKeys) {
    await prisma.apiKey.update({
      where: { id: key.id },
      data: { tokenHash: hashToken(key.token) },
    })
  }

  console.log(`API key hash backfill complete: ${legacyKeys.length} updated`)
} finally {
  await prisma.$disconnect()
}
