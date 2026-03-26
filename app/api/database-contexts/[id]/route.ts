import { auth } from "@/auth"
import db from "@/lib/db"
import { NextResponse } from "next/server"
import { getUserFromApiKey } from "@/lib/auth-api-key"

const VALID_TYPES = ['postgresql', 'mysql', 'sqlite', 'sqlserver', 'oracle', 'other']
const VALID_SCHEMA_FORMATS = ['prisma', 'sql', 'other']
const MAX_SCHEMA_DEFINITION_LENGTH = 10000

export const GET = async (req: any, { params }: any) => {
  const session = await auth()
  const userId = session?.user?.id ?? await getUserFromApiKey(req)

  if (!userId) {
    return NextResponse.json({ message: "Not authenticated" }, { status: 401 })
  }

  const { id } = await params as { id: string }

  try {
    const context = await (db as any).databaseContext.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, name: true },
        },
      },
    })

    if (!context) {
      return NextResponse.json({ message: "Not found" }, { status: 404 })
    }

    // Allow access if owner or if public
    if (context.userId !== userId && !context.isPublic) {
      return NextResponse.json({ message: "Not found" }, { status: 404 })
    }

    return NextResponse.json({
      ...context,
      owner: context.user,
    })
  } catch (error) {
    console.error("[DATABASE_CONTEXT_GET]", error)
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
  const { name, type, schemaFormat, schemaDefinition, description, isPublic } = body

  try {
    const existingContext = await (db as any).databaseContext.findUnique({
      where: { id },
    })

    if (!existingContext) {
      return NextResponse.json({ message: "Not found" }, { status: 404 })
    }

    if (existingContext.userId !== userId) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 })
    }

    // Validate provided fields
    if (type && !VALID_TYPES.includes(type)) {
      return NextResponse.json(
        { message: `Invalid type. Must be one of: ${VALID_TYPES.join(", ")}` },
        { status: 400 }
      )
    }

    if (schemaFormat && !VALID_SCHEMA_FORMATS.includes(schemaFormat)) {
      return NextResponse.json(
        { message: `Invalid schemaFormat. Must be one of: ${VALID_SCHEMA_FORMATS.join(", ")}` },
        { status: 400 }
      )
    }

    if (schemaDefinition && schemaDefinition.length > MAX_SCHEMA_DEFINITION_LENGTH) {
      return NextResponse.json(
        { message: `schemaDefinition must not exceed ${MAX_SCHEMA_DEFINITION_LENGTH} characters` },
        { status: 400 }
      )
    }

    const data: any = {}
    if (name !== undefined) data.name = name
    if (type !== undefined) data.type = type
    if (schemaFormat !== undefined) data.schemaFormat = schemaFormat
    if (schemaDefinition !== undefined) data.schemaDefinition = schemaDefinition
    if (description !== undefined) data.description = description
    if (isPublic !== undefined) data.isPublic = isPublic

    const context = await (db as any).databaseContext.update({
      where: { id },
      data,
      include: {
        user: {
          select: { id: true, name: true },
        },
      },
    })

    return NextResponse.json({
      ...context,
      owner: context.user,
    })
  } catch (error) {
    console.error("[DATABASE_CONTEXT_PUT]", error)
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

  try {
    const existingContext = await (db as any).databaseContext.findUnique({
      where: { id },
    })

    if (!existingContext) {
      return NextResponse.json({ message: "Not found" }, { status: 404 })
    }

    if (existingContext.userId !== userId) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 })
    }

    // Atomic transaction: nullify linked resources, then delete context
    await (db as any).$transaction([
      (db as any).query.updateMany({
        where: { databaseId: id },
        data: { databaseId: null },
      }),
      (db as any).routine.updateMany({
        where: { databaseId: id },
        data: { databaseId: null },
      }),
      (db as any).databaseContext.delete({
        where: { id },
      }),
    ])

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error("[DATABASE_CONTEXT_DELETE]", error)
    return NextResponse.json({ message: "Internal Error" }, { status: 500 })
  }
}
