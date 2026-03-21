import { auth } from "@/auth"
import db from "@/lib/db"
import { NextResponse } from "next/server"
import { randomBytes } from "node:crypto"

export const GET: any = async (req: any) => {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Not authenticated" }, { status: 401 })
    }

    const userId = session.user.id

    const apiKeys = await db.apiKey.findMany({
      where: { userId },
      select: {
        id: true,
        name: true,
        lastUsedAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json(apiKeys)
  } catch (error) {
    console.error("[API_KEYS_GET] Full error:", error)
    return NextResponse.json({ message: "Internal Error", details: error instanceof Error ? error.message : String(error) }, { status: 500 })
  }
}

export const POST: any = async (req: any) => {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Not authenticated" }, { status: 401 })
    }

    const userId = session.user.id
    const body = await req.json()
    const { name } = body

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json({ message: "Name is required" }, { status: 400 })
    }

    if (name.length > 50) {
      return NextResponse.json({ message: "Name must be at most 50 characters" }, { status: 400 })
    }

    const token = randomBytes(32).toString('hex')

    const apiKey = await db.apiKey.create({
      data: {
        name: name.trim(),
        token,
        userId,
      },
      select: {
        id: true,
        name: true,
        token: true,
        createdAt: true,
      }
    })

    return NextResponse.json(apiKey)
  } catch (error) {
    console.error("[API_KEYS_POST] Full error:", error)
    return NextResponse.json({ message: "Internal Error", details: error instanceof Error ? error.message : String(error) }, { status: 500 })
  }
}
