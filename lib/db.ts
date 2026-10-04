// Prisma Client singleton
import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"

const DEFAULT_DATABASE_URL =
  "postgresql://sqlvault:sqlvault@localhost:5432/sqlvault?schema=public"

const prismaClientSingleton = () => {
  const connectionString = process.env.DATABASE_URL || DEFAULT_DATABASE_URL
  const adapter = new PrismaPg({ connectionString })

  return new PrismaClient({ adapter })
}

declare global {
  var prisma: undefined | ReturnType<typeof prismaClientSingleton>
}

const db = globalThis.prisma ?? prismaClientSingleton()

export default db

if (process.env.NODE_ENV !== "production") globalThis.prisma = db
