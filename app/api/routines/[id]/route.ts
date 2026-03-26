import { auth } from "@/auth"
import db from "@/lib/db"
import { NextResponse } from "next/server"
import { getUserFromApiKey } from "@/lib/auth-api-key"

export const GET: any = async (req: any, ctx: any) => {
  const session = await auth()
  const userId = session?.user?.id ?? await getUserFromApiKey(req)

  if (!userId) {
    return NextResponse.json({ message: "Not authenticated" }, { status: 401 })
  }

  try {
    const params = await ctx.params
    const routine = await db.routine.findUnique({
      where: {
        id: params.id,
        userId,
      },
      include: {
        tags: true,
        versions: {
          orderBy: { createdAt: "desc" },
        },
      },
    })

    if (!routine) {
      return NextResponse.json({ message: "Routine not found" }, { status: 404 })
    }

    const parsedRoutine = {
      ...routine,
      parameters: routine.parameters ? JSON.parse(routine.parameters) : []
    }

    return NextResponse.json(parsedRoutine)
  } catch (error) {
    console.error("[ROUTINE_GET]", error)
    return NextResponse.json({ message: "Internal Error" }, { status: 500 })
  }
}

export const PUT: any = async (req: any, ctx: any) => {
  const session = await auth()
  const userId = session?.user?.id ?? await getUserFromApiKey(req)

  if (!userId) {
    return NextResponse.json({ message: "Not authenticated" }, { status: 401 })
  }

  const params = await ctx.params
  
  try {
    const existingRoutine = await db.routine.findUnique({
      where: {
        id: params.id,
        userId,
      },
    })

    if (!existingRoutine) {
      return NextResponse.json({ message: "Routine not found" }, { status: 404 })
    }

    const body = await req.json()
    const { name, description, type, database, sql, parameters, returnType, status, isFavorite, tagIds, databaseId, isPublic } = body

    const updateData: any = {}
    if (name !== undefined) updateData.name = name
    if (description !== undefined) updateData.description = description
    if (type !== undefined) updateData.type = type
    if (database !== undefined) updateData.database = database
    if (status !== undefined) updateData.status = status
    if (isFavorite !== undefined) updateData.isFavorite = isFavorite
    if (returnType !== undefined) updateData.returnType = type === 'function' ? returnType : null
    
    if (parameters !== undefined) {
      updateData.parameters = JSON.stringify(parameters)
    }

    if (tagIds !== undefined) {
      updateData.tags = {
        set: tagIds.map((id: string) => ({ id })),
      }
    }

    // Validar ownership de databaseId se fornecido
    if (databaseId !== undefined) {
      if (databaseId === null) {
        // Setando para null, força isPublic=false
        updateData.databaseId = null
        updateData.isPublic = false
      } else {
        // Validar que o context pertence ao usuário
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

        updateData.databaseId = databaseId
        // Se isPublic não é especificado, mantém o valor atual; caso contrário, atualiza
        if (isPublic !== undefined) {
          updateData.isPublic = isPublic
        }
      }
    } else if (isPublic !== undefined) {
      // Atualizando apenas isPublic sem alterar databaseId
      if (existingRoutine.databaseId === null) {
        // Se databaseId é null, forçar isPublic=false
        updateData.isPublic = false
      } else {
        updateData.isPublic = isPublic
      }
    }

    if (sql !== undefined && sql !== existingRoutine.sql) {
      updateData.sql = sql
      updateData.versions = {
        create: {
          sql: existingRoutine.sql,
        },
      }
    }

    const routine = await db.routine.update({
      where: { id: params.id },
      data: updateData,
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
    console.error("[ROUTINE_PUT]", error)
    return NextResponse.json({ message: "Internal Error" }, { status: 500 })
  }
}

export const DELETE: any = async (req: any, ctx: any) => {
  const session = await auth()
  const userId = session?.user?.id ?? await getUserFromApiKey(req)

  if (!userId) {
    return NextResponse.json({ message: "Not authenticated" }, { status: 401 })
  }

  const params = await ctx.params

  try {
    const routine = await db.routine.findUnique({
      where: {
        id: params.id,
        userId,
      },
    })

    if (!routine) {
      return NextResponse.json({ message: "Routine not found" }, { status: 404 })
    }

    await db.routine.update({
      where: { id: params.id },
      data: {
        deletedAt: new Date(),
      },
    })

    return NextResponse.json({ message: "Routine marked as deleted" })
  } catch (error) {
    console.error("[ROUTINE_DELETE]", error)
    return NextResponse.json({ message: "Internal Error" }, { status: 500 })
  }
}
