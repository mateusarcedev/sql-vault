import { auth } from "@/auth"
import db from "@/lib/db"
import { NextResponse } from "next/server"
import { getUserFromApiKey } from "@/lib/auth-api-key"

export const GET: any = async (req: any) => {
  const session = await auth()
  const userId = session?.user?.id ?? await getUserFromApiKey(req)

  if (!userId) {
    return NextResponse.json({ message: "Not authenticated" }, { status: 401 })
  }

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
}

export const POST: any = async (req: any) => {
  const session = await auth()
  const userId = session?.user?.id ?? await getUserFromApiKey(req)

  if (!userId) {
    return NextResponse.json({ message: "Not authenticated" }, { status: 401 })
  }

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
}
