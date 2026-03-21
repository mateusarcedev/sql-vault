import { auth } from "@/auth"
import db from "@/lib/db"
import { NextResponse } from "next/server"
import { getUserFromApiKey } from "@/lib/auth-api-key"

export const GET = async (req: any, { params }: any) => {
  const session = await auth()
  const userId = session?.user?.id ?? await getUserFromApiKey(req)

  if (!userId) {
    return NextResponse.json({ message: "Not authenticated" }, { status: 401 })
  }

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
}

export const PUT = async (req: any, { params }: any) => {
  const session = await auth()
  const userId = session?.user?.id ?? await getUserFromApiKey(req)

  if (!userId) {
    return NextResponse.json({ message: "Not authenticated" }, { status: 401 })
  }

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
}

export const DELETE = async (req: any, { params }: any) => {
  const session = await auth()
  const userId = session?.user?.id ?? await getUserFromApiKey(req)

  if (!userId) {
    return NextResponse.json({ message: "Not authenticated" }, { status: 401 })
  }

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
}
