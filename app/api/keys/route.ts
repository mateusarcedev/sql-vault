import { auth } from "@/auth"
import db from "@/lib/db"
import { createApiToken } from "@/lib/api-key-token"
import { NextResponse } from "next/server"

export const GET: any = async () => {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Not authenticated" }, { status: 401 })
    }

    const apiKeys = await db.apiKey.findMany({
      where: { userId: session.user.id },
      select: {
        id: true,
        name: true,
        lastUsedAt: true,
        regeneratedAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json(apiKeys)
  } catch (error) {
    console.error("[API_KEYS_GET]", error)
    return NextResponse.json({ message: "Internal Error" }, { status: 500 })
  }
}

export const POST: any = async (req: Request) => {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Not authenticated" }, { status: 401 })
    }

    const body = await req.json()
    const name = typeof body?.name === "string" ? body.name.trim() : ""

    if (!name) {
      return NextResponse.json({ message: "Name is required" }, { status: 400 })
    }

    if (name.length > 50) {
      return NextResponse.json(
        { message: "Name must be at most 50 characters" },
        { status: 400 }
      )
    }

    const { token, tokenHash } = createApiToken()

    const apiKey = await db.apiKey.create({
      data: {
        name,
        token,
        tokenHash,
        regeneratedAt: new Date(),
        userId: session.user.id,
      },
      select: {
        id: true,
        name: true,
        regeneratedAt: true,
        createdAt: true,
      },
    })

    return NextResponse.json({ ...apiKey, token })
  } catch (error) {
    console.error("[API_KEYS_POST]", error)
    return NextResponse.json({ message: "Internal Error" }, { status: 500 })
  }
}
