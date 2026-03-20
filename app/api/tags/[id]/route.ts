import { auth } from "@/auth"
import db from "@/lib/db"
import { NextResponse } from "next/server"

export const PUT = auth(async (req, { params }) => {
  if (!req.auth) {
    return NextResponse.json({ message: "Not authenticated" }, { status: 401 })
  }

  const userId = req.auth.user?.id
  const { id } = await params as { id: string }
  const body = await req.json()
  const { name, color } = body

  try {
    const tag = await db.tag.update({
      where: {
        id,
        userId,
      },
      data: {
        name,
        color,
      },
    })

    return NextResponse.json(tag)
  } catch (error) {
    console.error("[TAG_PUT]", error)
    return NextResponse.json({ message: "Internal Error" }, { status: 500 })
  }
}) as any

export const DELETE = auth(async (req, { params }) => {
  if (!req.auth) {
    return NextResponse.json({ message: "Not authenticated" }, { status: 401 })
  }

  const userId = req.auth.user?.id
  const { id } = await params as { id: string }

  try {
    await db.tag.delete({
      where: {
        id,
        userId,
      },
    })

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error("[TAG_DELETE]", error)
    return NextResponse.json({ message: "Internal Error" }, { status: 500 })
  }
}) as any
