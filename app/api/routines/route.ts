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

  const url = new URL(req.url!)
  const search = url.searchParams.get("search")
  const type = url.searchParams.get("type")
  const database = url.searchParams.get("database")
  const tagsParam = url.searchParams.get("tags")
  const sortBy = url.searchParams.get("sortBy") as 'createdAt' | 'name' | 'copyCount' | null
  const scope = url.searchParams.get("scope") as 'mine' | 'public' | null

  let whereCondition: any = { deletedAt: null }

  if (scope === 'public') {
    // Apenas routines públicas (isPublic=true)
    whereCondition.isPublic = true
  } else {
    // Escopo padrão: routines do usuário autenticado (scope=mine)
    whereCondition.userId = userId
  }

  if (search) {
    whereCondition.OR = [
      { name: { contains: search } },
      { description: { contains: search } },
      { sql: { contains: search } },
    ]
  }

  if (type) whereCondition.type = type
  if (database) whereCondition.database = database
  
  if (tagsParam) {
    const tagsArray = tagsParam.split(',')
    whereCondition.tags = {
      some: {
        id: { in: tagsArray }
      }
    }
  }

  let orderBy: any = { createdAt: "desc" }
  if (sortBy === 'name') orderBy = { name: "asc" }
  if (sortBy === 'copyCount') orderBy = { copyCount: "desc" }

  try {
    const include: any = {
      tags: true,
      ...(scope === 'public' ? { user: true } : {}),
    }

    const routines = await db.routine.findMany({
      where: whereCondition,
      include,
      orderBy,
    })

    // Filtra routines com contexto privado na listagem pública sem depender
    // da relação `databaseContext` no include (evita incompatibilidade de client Prisma).
    let filteredRoutines = routines
    if (scope === 'public') {
      const contextIds = Array.from(
        new Set(
          routines
            .map((routine) => routine.databaseId)
            .filter((id): id is string => Boolean(id))
        )
      )

      let publicContextIds = new Set<string>()
      if (contextIds.length > 0) {
        const publicContexts = await db.databaseContext.findMany({
          where: {
            id: { in: contextIds },
            isPublic: true,
          },
          select: { id: true },
        })
        publicContextIds = new Set(publicContexts.map((context) => context.id))
      }

      filteredRoutines = routines.filter(routine => {
        if (routine.databaseId) {
          return publicContextIds.has(routine.databaseId)
        }
        // Se não tem databaseId, mantém (databaseId=null com isPublic=true é válido)
        return true
      })
    }

    const parsedRoutines = filteredRoutines.map(routine => {
      const parsed: any = {
        ...routine,
        parameters: routine.parameters ? JSON.parse(routine.parameters) : []
      }

      // Inclui owner metadata em listagem pública
      if (scope === 'public' && routine.user) {
        parsed.owner = {
          id: routine.user.id,
          name: routine.user.name,
        }
        delete parsed.user
      }

      return parsed
    })

    return NextResponse.json(parsedRoutines)
  } catch (error) {
    console.error("[ROUTINES_GET]", error)
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
  const { name, description, type, database, sql, parameters, returnType, status, tagIds, databaseId, isPublic } = body

  if (!name || !sql || !type || !database) {
    return NextResponse.json({ message: "Name, type, database and SQL are required" }, { status: 400 })
  }

  try {
    // Validar ownership de databaseId se fornecido
    let effectiveIsPublic = Boolean(isPublic)
    let effectiveDatabaseId = databaseId || null

    if (databaseId) {
      const context = await db.databaseContext.findUnique({
        where: { id: databaseId },
        select: { userId: true },
      })

      if (!context) {
        return NextResponse.json({ message: "Database context not found" }, { status: 404 })
      }

      if (context.userId !== userId) {
        return NextResponse.json({ message: "Forbidden" }, { status: 403 })
      }

      // Se databaseId é válido, manter isPublic solicitado
      effectiveIsPublic = Boolean(isPublic)
    } else {
      // Sem databaseId também pode ser público
      effectiveIsPublic = Boolean(isPublic)
      effectiveDatabaseId = null
    }

    const routine = await db.routine.create({
      data: {
        name,
        description,
        type,
        database,
        sql,
        databaseId: effectiveDatabaseId,
        isPublic: effectiveIsPublic,
        parameters: parameters ? JSON.stringify(parameters) : '[]',
        returnType: type === 'function' ? returnType : null,
        status: status || 'active',
        userId: userId!,
        tags: {
          connect: tagIds?.map((id: string) => ({ id })) || [],
        },
        versions: {
          create: {
            sql,
          },
        },
      },
      include: {
        tags: true,
        versions: true,
      },
    })

    const parsedRoutine = {
      ...routine,
      parameters: routine.parameters ? JSON.parse(routine.parameters) : []
    }

    return NextResponse.json(parsedRoutine, { status: 200 })
  } catch (error) {
    console.error("[ROUTINES_POST]", error)
    return NextResponse.json({ message: "Internal Error" }, { status: 500 })
  }
}
