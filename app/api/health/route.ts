import db from "@/lib/db"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    await db.$queryRawUnsafe("SELECT 1")
    return NextResponse.json({ status: "ok" })
  } catch (error) {
    console.error("[HEALTH_CHECK]", error)
    return NextResponse.json({ status: "error" }, { status: 503 })
  }
}
