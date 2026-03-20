import { auth } from "@/auth"
import db from "@/lib/db"
import { NextResponse } from "next/server"

export const GET = auth(async (req, { params }) => {
  if (!req.auth) {
    return NextResponse.json({ message: "Not authenticated" }, { status: 401 })
  }

  const userId = req.auth.user?.id
  const { id } = await params as { id: string }

  try {
    const query = await db.query.findUnique({
      where: {
        id,
        userId,
      },
      include: {
        tags: true,
        versions: {
          orderBy: { createdAt: "desc" },
        },
      },
    })

    if (!query) {
      return NextResponse.json({ message: "Not found" }, { status: 404 })
    }

    return NextResponse.json(query)
  } catch (error) {
    console.error("[QUERY_GET]", error)
    return NextResponse.json({ message: "Internal Error" }, { status: 500 })
  }
}) as any // NextAuth auth() type on server actions/routes can be tricky with params

export const PUT = auth(async (req, { params }) => {
  if (!req.auth) {
    return NextResponse.json({ message: "Not authenticated" }, { status: 401 })
  }

  const userId = req.auth.user?.id
  const { id } = await params as { id: string }
  const body = await req.json()
  const { title, description, sql, database, status, tagIds, isFavorite, restore } = body

  try {
    const existingQuery = await db.query.findUnique({
      where: { id, userId },
    })

    if (!existingQuery) {
      return NextResponse.json({ message: "Not found" }, { status: 404 })
    }

    // If SQL changes, create a new version
    const data: any = {
      title,
      description,
      database,
      status,
      isFavorite,
    }

    if (restore) {
      data.deletedAt = null
    }

    if (sql && sql !== existingQuery.sql) {
      data.sql = sql
      data.versions = {
        create: {
          sql,
          description: `Updated at ${new Date().toISOString()}`,
        },
      }
    }

    if (tagIds) {
      data.tags = {
        set: tagIds.map((id: string) => ({ id })),
      }
    }

    const query = await db.query.update({
      where: { id },
      data,
      include: {
        tags: true,
        versions: {
          orderBy: { createdAt: "desc" },
        },
      },
    })

    return NextResponse.json(query)
  } catch (error) {
    console.error("[QUERY_PUT]", error)
    return NextResponse.json({ message: "Internal Error" }, { status: 500 })
  }
}) as any

export const DELETE = auth(async (req, { params }) => {
  if (!req.auth) {
    return NextResponse.json({ message: "Not authenticated" }, { status: 401 })
  }

  const userId = req.auth.user?.id
  const { id } = await params as { id: string }
  const { searchParams } = new URL(req.url)
  const permanent = searchParams.get("permanent") === "true"

  try {
    if (permanent) {
      await db.query.delete({
        where: { id, userId },
      })
    } else {
      await db.query.update({
        where: { id, userId },
        data: { deletedAt: new Date() },
      })
    }

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error("[QUERY_DELETE]", error)
    return NextResponse.json({ message: "Internal Error" }, { status: 500 })
  }
}) as any
