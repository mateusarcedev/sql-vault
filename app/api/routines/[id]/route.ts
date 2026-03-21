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
    const { name, description, type, database, sql, parameters, returnType, status, isFavorite, tagIds } = body

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

    if (sql !== undefined && sql !== existingRoutine.sql) {
      updateData.sql = sql
      updateData.versions = {
        create: {
          sql,
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

    return NextResponse.json(parsedRoutine)
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
