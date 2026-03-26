import { auth } from "@/auth"
import db from "@/lib/db"
import { NextResponse } from "next/server"
import { getUserFromApiKey } from "@/lib/auth-api-key"

const VALID_TYPES = ['postgresql', 'mysql', 'sqlite', 'sqlserver', 'oracle', 'other']
const VALID_SCHEMA_FORMATS = ['prisma', 'sql', 'other']
const MAX_SCHEMA_DEFINITION_LENGTH = 10000

function toPublicListShape(ctx: any) {
  const { schemaDefinition, user, ...safeContext } = ctx
  return {
    ...safeContext,
    owner: user,
  }
}

export const GET = async (req: any) => {
  const session = await auth()
  const userId = session?.user?.id ?? await getUserFromApiKey(req)

  if (!userId) {
    return NextResponse.json({ message: "Not authenticated" }, { status: 401 })
  }

  const url = new URL(req.url!)
  const scope = url.searchParams.get("scope") || "mine"

  try {
    if (scope === "mine") {
      const contexts = await (db as any).databaseContext.findMany({
        where: { userId },
        include: {
          user: {
            select: { id: true, name: true },
          },
        },
        orderBy: { updatedAt: "desc" },
      })

      return NextResponse.json(contexts.map(toPublicListShape))
    }

    if (scope === "public") {
      const contexts = await (db as any).databaseContext.findMany({
        where: { isPublic: true },
        include: {
          user: {
            select: { id: true, name: true },
          },
        },
        orderBy: { updatedAt: "desc" },
      })

      return NextResponse.json(contexts.map(toPublicListShape))
    }

    if (scope === "all") {
      const contexts = await (db as any).databaseContext.findMany({
        where: {
          OR: [
            { userId },
            { isPublic: true },
          ],
        },
        include: {
          user: {
            select: { id: true, name: true },
          },
        },
        orderBy: { updatedAt: "desc" },
      })

      return NextResponse.json(contexts.map(toPublicListShape))
    }

    return NextResponse.json({ message: "Invalid scope" }, { status: 400 })
  } catch (error) {
    console.error("[DATABASE_CONTEXTS_GET]", error)
    return NextResponse.json({ message: "Internal Error" }, { status: 500 })
  }
}

export const POST = async (req: any) => {
  const session = await auth()
  const userId = session?.user?.id ?? await getUserFromApiKey(req)

  if (!userId) {
    return NextResponse.json({ message: "Not authenticated" }, { status: 401 })
  }

  const body = await req.json()
  const { name, type, schemaFormat, schemaDefinition, description, isPublic } = body

  // Validations
  if (!name || !type || !schemaFormat || !schemaDefinition) {
    return NextResponse.json(
      { message: "name, type, schemaFormat, and schemaDefinition are required" },
      { status: 400 }
    )
  }

  if (!VALID_TYPES.includes(type)) {
    return NextResponse.json(
      { message: `Invalid type. Must be one of: ${VALID_TYPES.join(", ")}` },
      { status: 400 }
    )
  }

  if (!VALID_SCHEMA_FORMATS.includes(schemaFormat)) {
    return NextResponse.json(
      { message: `Invalid schemaFormat. Must be one of: ${VALID_SCHEMA_FORMATS.join(", ")}` },
      { status: 400 }
    )
  }

  if (schemaDefinition.length > MAX_SCHEMA_DEFINITION_LENGTH) {
    return NextResponse.json(
      { message: `schemaDefinition must not exceed ${MAX_SCHEMA_DEFINITION_LENGTH} characters` },
      { status: 400 }
    )
  }

  try {
    const context = await (db as any).databaseContext.create({
      data: {
        name,
        type,
        schemaFormat,
        schemaDefinition,
        description: description || null,
        isPublic: isPublic || false,
        userId,
      },
      include: {
        user: {
          select: { id: true, name: true },
        },
      },
    })

    return NextResponse.json(
      {
        ...context,
        owner: context.user,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("[DATABASE_CONTEXTS_POST]", error)
    return NextResponse.json({ message: "Internal Error" }, { status: 500 })
  }
}
