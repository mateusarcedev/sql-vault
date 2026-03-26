import { auth } from "@/auth"
import db from "@/lib/db"
import { NextResponse } from "next/server"
import { getUserFromApiKey } from "@/lib/auth-api-key"

function toPublicListShape(query: any) {
  return {
    ...query,
    owner: {
      id: query.user.id,
      name: query.user.name,
    },
  }
}

export const GET: any = async (req: any) => {
  const session = await auth()
  const userId = session?.user?.id ?? await getUserFromApiKey(req)

  if (!userId) {
    return NextResponse.json({ message: "Not authenticated" }, { status: 401 })
  }

  const url = new URL(req.url!)
  const search = url.searchParams.get("search")
  const scope = url.searchParams.get("scope") || "mine"

  try {
    if (scope === "mine") {
      const whereCondition: any = { userId, deletedAt: null }
      if (search) {
        whereCondition.OR = [
          { title: { contains: search } },
          { description: { contains: search } },
          { sql: { contains: search } },
        ]
      }

      const queries = await db.query.findMany({
        where: whereCondition,
        include: {
          tags: true,
          user: {
            select: { id: true, name: true },
          },
          versions: {
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
        orderBy: { updatedAt: "desc" },
      })

      return NextResponse.json(queries)
    }

    if (scope === "public") {
      // Queries com isPublic=true E seu databaseContext (se houver) também isPublic=true
      const queries = await db.query.findMany({
        where: {
          deletedAt: null,
          isPublic: true,
          OR: [
            { databaseId: null },
            {
              databaseContext: {
                isPublic: true,
              },
            },
          ],
        },
        include: {
          tags: true,
          user: {
            select: { id: true, name: true },
          },
          versions: {
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
        orderBy: { updatedAt: "desc" },
      })

      return NextResponse.json(queries.map(toPublicListShape))
    }

    return NextResponse.json({ message: "Invalid scope" }, { status: 400 })
  } catch (error) {
    console.error("[QUERIES_GET]", error)
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
  const { title, description, sql, database, status, tagIds, databaseId, isPublic } = body

  if (!title || !sql) {
    return NextResponse.json({ message: "Title and SQL are required" }, { status: 400 })
  }

  // Validar ownership de databaseId se fornecido
  if (databaseId) {
    try {
      const dbContext = await db.databaseContext.findUnique({
        where: { id: databaseId },
      })

      if (!dbContext) {
        return NextResponse.json({ message: "Database context not found" }, { status: 404 })
      }

      if (dbContext.userId !== userId) {
        return NextResponse.json({ message: "Forbidden" }, { status: 403 })
      }
    } catch (error) {
      console.error("[QUERIES_POST_VALIDATE_DB]", error)
      return NextResponse.json({ message: "Internal Error" }, { status: 500 })
    }
  }

  // Força isPublic=false se databaseId é null
  const effectiveIsPublic = databaseId === null ? false : (isPublic ?? false)

  try {
    const query = await db.query.create({
      data: {
        title,
        description,
        sql,
        database,
        databaseId: databaseId || null,
        isPublic: effectiveIsPublic,
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

    return NextResponse.json(query, { status: 201 })
  } catch (error) {
    console.error("[QUERIES_POST]", error)
    return NextResponse.json({ message: "Internal Error" }, { status: 500 })
  }
}
