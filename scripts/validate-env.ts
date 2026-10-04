import "dotenv/config"
import { validateServerEnv } from "../lib/env.ts"

try {
  const env = validateServerEnv(process.env)
  console.log(
    `Environment validation passed for ${env.NODE_ENV} (${new URL(env.DATABASE_URL).protocol})`
  )
} catch (error) {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
}
