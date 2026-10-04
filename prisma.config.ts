import "dotenv/config"
import { defineConfig } from "@prisma/config"

const DEFAULT_DATABASE_URL =
  "postgresql://sqlvault:sqlvault@localhost:5432/sqlvault?schema=public"

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: process.env.DATABASE_URL || DEFAULT_DATABASE_URL,
  },
})
