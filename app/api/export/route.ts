import { auth } from "@/auth"
import db from "@/lib/db"
import { NextResponse } from "next/server"
import { getUserFromApiKey } from "@/lib/auth-api-key"

const EXPORT_VERSION_MAP = {
  1: "legacy",
  2: "v1 + routines",
  3: "v2 + databaseContexts + databaseId + isPublic",
} as const

const LATEST_EXPORT_VERSION = 3

function parseRoutineParameters(parameters: string | null) {
  if (!parameters) return null

  try {
    return JSON.parse(parameters)
  } catch {
    return null
  }
}

export async function GET(req: any) {
  try {
    const session = await auth()
    const userId = session?.user?.id ?? await getUserFromApiKey(req)

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const url = new URL(req.url)
    const rawVersion = url.searchParams.get("version")
    const requestedVersion = rawVersion ? Number(rawVersion) : LATEST_EXPORT_VERSION

    if (!Number.isInteger(requestedVersion) || !(requestedVersion in EXPORT_VERSION_MAP)) {
      return NextResponse.json({ error: "Versão de exportação não suportada." }, { status: 400 })
    }

    // Buscar todas as queries do usuário, incluindo deletadas
    const queries = await db.query.findMany({
      where: { userId },
      include: {
        tags: true,
        versions: true,
      },
    })

    // Buscar todas as tags do usuário
    const tags = await db.tag.findMany({
      where: { userId },
    })

    const routines = requestedVersion >= 2
      ? await db.routine.findMany({
          where: { userId },
          include: {
            tags: true,
            versions: true,
          },
        })
      : []

    const databaseContexts = requestedVersion >= 3
      ? await db.databaseContext.findMany({
          where: { userId },
        })
      : []

    // Mapear title para name na resposta
    const mappedQueries = queries.map((q) => {
      const baseQuery = {
        id: q.id,
        name: q.title,
        description: q.description,
        sql: q.sql,
        database: q.database,
        status: q.status,
        isFavorite: q.isFavorite,
        copyCount: q.copyCount,
        createdAt: q.createdAt.toISOString(),
        updatedAt: q.updatedAt.toISOString(),
        deletedAt: q.deletedAt?.toISOString() ?? null,
        tags: q.tags.map((t) => ({ id: t.id, name: t.name, color: t.color })),
        versions: q.versions.map((v) => ({
          id: v.id,
          sql: v.sql,
          description: v.description,
          createdAt: v.createdAt.toISOString(),
        })),
      }

      if (requestedVersion >= 3) {
        return {
          ...baseQuery,
          databaseId: q.databaseId,
          isPublic: q.isPublic,
        }
      }

      return baseQuery
    })

    const mappedRoutines = routines.map((routine) => {
      const baseRoutine = {
        id: routine.id,
        name: routine.name,
        description: routine.description,
        type: routine.type,
        database: routine.database,
        sql: routine.sql,
        parameters: parseRoutineParameters(routine.parameters),
        returnType: routine.returnType,
        status: routine.status,
        isFavorite: routine.isFavorite,
        copyCount: routine.copyCount,
        createdAt: routine.createdAt.toISOString(),
        updatedAt: routine.updatedAt.toISOString(),
        deletedAt: routine.deletedAt?.toISOString() ?? null,
        tags: routine.tags.map((t) => ({ id: t.id, name: t.name, color: t.color })),
        versions: routine.versions.map((v) => ({
          id: v.id,
          sql: v.sql,
          createdAt: v.createdAt.toISOString(),
        })),
      }

      if (requestedVersion >= 3) {
        return {
          ...baseRoutine,
          databaseId: routine.databaseId,
          isPublic: routine.isPublic,
        }
      }

      return {
        ...baseRoutine,
      }
    })

    const payload: Record<string, unknown> = {
      exportedAt: new Date().toISOString(),
      version: requestedVersion,
      versionMap: EXPORT_VERSION_MAP,
      queries: mappedQueries,
      tags: tags.map((t) => ({ id: t.id, name: t.name, color: t.color })),
    }

    if (requestedVersion >= 2) {
      payload.routines = mappedRoutines
    }

    if (requestedVersion >= 3) {
      payload.databaseContexts = databaseContexts.map((ctx) => ({
        id: ctx.id,
        name: ctx.name,
        description: ctx.description,
        type: ctx.type,
        schemaFormat: ctx.schemaFormat,
        schemaDefinition: ctx.schemaDefinition,
        isPublic: ctx.isPublic,
        createdAt: ctx.createdAt.toISOString(),
        updatedAt: ctx.updatedAt.toISOString(),
      }))
    }

    const date = new Date().toISOString().split("T")[0]
    const filename = `sqlvault-export-${date}.json`

    return new Response(JSON.stringify(payload, null, 2), {
      headers: {
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Type": "application/json",
      },
    })
  } catch (error) {
    console.error("Export error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
