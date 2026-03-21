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

  const whereCondition: any = { 
    userId,
    deletedAt: null 
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
    const routines = await db.routine.findMany({
      where: whereCondition,
      include: {
        tags: true,
      },
      orderBy,
    })

    const parsedRoutines = routines.map(routine => ({
      ...routine,
      parameters: routine.parameters ? JSON.parse(routine.parameters) : []
    }))

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
  const { name, description, type, database, sql, parameters, returnType, status, tagIds } = body

  if (!name || !sql || !type || !database) {
    return NextResponse.json({ message: "Name, type, database and SQL are required" }, { status: 400 })
  }

  try {
    const routine = await db.routine.create({
      data: {
        name,
        description,
        type,
        database,
        sql,
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

    return NextResponse.json(parsedRoutine)
  } catch (error) {
    console.error("[ROUTINES_POST]", error)
    return NextResponse.json({ message: "Internal Error" }, { status: 500 })
  }
}
