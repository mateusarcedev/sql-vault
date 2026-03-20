import { auth } from "@/auth"
import db from "@/lib/db"
import { NextResponse } from "next/server"

export const GET = auth(async (req) => {
  if (!req.auth) {
    return NextResponse.json({ message: "Not authenticated" }, { status: 401 })
  }

  const userId = req.auth.user?.id

  try {
    const tags = await db.tag.findMany({
      where: { userId },
      include: {
        _count: {
          select: { queries: true },
        },
      },
    })

    return NextResponse.json(tags)
  } catch (error) {
    console.error("[TAGS_GET]", error)
    return NextResponse.json({ message: "Internal Error" }, { status: 500 })
  }
})

export const POST = auth(async (req) => {
  if (!req.auth) {
    return NextResponse.json({ message: "Not authenticated" }, { status: 401 })
  }

  const userId = req.auth.user?.id
  const body = await req.json()
  const { name, color } = body

  if (!name) {
    return NextResponse.json({ message: "Name is required" }, { status: 400 })
  }

  try {
    const tag = await db.tag.create({
      data: {
        name,
        color,
        userId: userId!,
      },
    })

    return NextResponse.json(tag)
  } catch (error) {
    console.error("[TAGS_POST]", error)
    if (error instanceof Error && (error.message.includes("Unique constraint failed") || (error as any).code === 'P2002')) {
      return NextResponse.json({ message: "Tag already exists" }, { status: 400 })
    }
    return NextResponse.json({ message: "Internal Error" }, { status: 500 })
  }
})
