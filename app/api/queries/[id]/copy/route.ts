import { auth } from "@/auth"
import db from "@/lib/db"
import { NextResponse } from "next/server"

export const POST = auth(async (req, { params }) => {
  if (!req.auth) {
    return NextResponse.json({ message: "Not authenticated" }, { status: 401 })
  }

  const userId = req.auth.user?.id
  const { id } = await params as { id: string }

  try {
    const originalQuery = await db.query.findUnique({
      where: { id, userId },
      include: { tags: true },
    })

    if (!originalQuery) {
      return NextResponse.json({ message: "Not found" }, { status: 404 })
    }

    // Increment copy count on original
    await db.query.update({
      where: { id },
      data: { copyCount: { increment: 1 } },
    })

    // Create copy
    const copy = await db.query.create({
      data: {
        title: `${originalQuery.title} (Cópia)`,
        description: originalQuery.description,
        sql: originalQuery.sql,
        userId: userId!,
        tags: {
          connect: originalQuery.tags.map((tag) => ({ id: tag.id })),
        },
        versions: {
          create: {
            sql: originalQuery.sql,
            description: "Copiado de " + originalQuery.id,
          },
        },
      },
      include: {
        tags: true,
      },
    })

    return NextResponse.json(copy)
  } catch (error) {
    console.error("[QUERY_COPY]", error)
    return NextResponse.json({ message: "Internal Error" }, { status: 500 })
  }
}) as any
