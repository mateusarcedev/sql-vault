import { auth } from "@/auth"
import db from "@/lib/db"
import { NextResponse } from "next/server"

export const GET: any = auth(async (req) => {
  if (!req.auth) {
    return NextResponse.json({ message: "Not authenticated" }, { status: 401 })
  }

  const userId = req.auth.user?.id
  const url = new URL(req.url!)
  const search = url.searchParams.get("search")

  const whereCondition: any = { userId }
  if (search) {
    // Prisma SQLite doesn't support mode: 'insensitive' easily, but standard contains does LIKE %search%
    whereCondition.OR = [
      { title: { contains: search } },
      { description: { contains: search } },
      { sql: { contains: search } },
    ]
  }

  try {
    const queries = await db.query.findMany({
      where: whereCondition,
      include: {
        tags: true,
        versions: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
      orderBy: { updatedAt: "desc" },
    })

    return NextResponse.json(queries)
  } catch (error) {
    console.error("[QUERIES_GET]", error)
    return NextResponse.json({ message: "Internal Error" }, { status: 500 })
  }
})

export const POST: any = auth(async (req) => {
  if (!req.auth) {
    return NextResponse.json({ message: "Not authenticated" }, { status: 401 })
  }

  const userId = req.auth.user?.id
  const body = await req.json()
  const { title, description, sql, database, status, tagIds } = body

  if (!title || !sql) {
    return NextResponse.json({ message: "Title and SQL are required" }, { status: 400 })
  }

  try {
    const query = await db.query.create({
      data: {
        title,
        description,
        sql,
        database,
        status: status || 'active',
        userId: userId!,
        tags: {
          connect: tagIds?.map((id: string) => ({ id })) || [],
        },
        versions: {
          create: {
            sql,
            description: "Initial version",
          },
        },
      },
      include: {
        tags: true,
        versions: true,
      },
    })

    return NextResponse.json(query)
  } catch (error) {
    console.error("[QUERIES_POST]", error)
    return NextResponse.json({ message: "Internal Error" }, { status: 500 })
  }
})
