import { auth } from "@/auth"
import db from "@/lib/db"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json().catch(() => null)
    if (!body) {
      return NextResponse.json({ error: "Inválido payload JSON" }, { status: 400 })
    }

    if (body.version !== 1) {
      return NextResponse.json({ error: "Formato de exportação não suportado." }, { status: 400 })
    }

    const { queries, tags } = body
    if (!Array.isArray(queries) || !Array.isArray(tags)) {
      return NextResponse.json({ error: "Payload malformado." }, { status: 400 })
    }

    let imported = 0
    let skipped = 0

    // Reconstruir Tags por nome
    const tagIdMap = new Map<string, string>()

    for (const t of tags) {
      if (!t.name) continue

      let existingTag = await db.tag.findUnique({
        where: { name_userId: { name: t.name, userId: session.user.id } },
      })

      if (!existingTag) {
        existingTag = await db.tag.create({
          data: {
            name: t.name,
            color: t.color || "#3B82F6",
            userId: session.user.id,
          },
        })
      }
      tagIdMap.set(t.id, existingTag.id)
    }

    // Processar queries
    for (const q of queries) {
      if (q.deletedAt) {
        skipped++
        continue
      }

      if (!q.name || !q.sql || !q.database) {
        skipped++
        continue
      }

      const currentTagsConnect =
        q.tags
          ?.map((t: any) => {
            const mappedId = tagIdMap.get(t.id)
            if (mappedId) return { id: mappedId }
            return undefined
          })
          .filter(Boolean) || []

      const versionsData =
        q.versions?.map((v: any) => ({
          sql: v.sql,
          description: v.description,
          createdAt: v.createdAt ? new Date(v.createdAt) : undefined,
        })) || []

      const queryData = {
        title: q.name,
        description: q.description || null,
        sql: q.sql,
        database: q.database,
        status: q.status || "active",
        isFavorite: q.isFavorite || false,
        copyCount: q.copyCount || 0,
        createdAt: q.createdAt ? new Date(q.createdAt) : undefined,
        updatedAt: q.updatedAt ? new Date(q.updatedAt) : undefined,
        userId: session.user.id,
      }

      // Upsert por nome (title) e userId
      const existingQuery = await db.query.findFirst({
        where: { title: q.name, userId: session.user.id, deletedAt: null },
      })

      if (existingQuery) {
        // Limpar versões antigas e inserir as novas para garantir sincronização
        await db.queryVersion.deleteMany({
          where: { queryId: existingQuery.id },
        })

        await db.query.update({
          where: { id: existingQuery.id },
          data: {
            ...queryData,
            tags: {
              set: currentTagsConnect,
            },
            versions: {
              create: versionsData,
            },
          },
        })
        imported++
      } else {
        await db.query.create({
          data: {
            ...queryData,
            tags: {
              connect: currentTagsConnect,
            },
            versions: {
              create: versionsData,
            },
          },
        })
        imported++
      }
    }

    return NextResponse.json({ imported, skipped })
  } catch (error) {
    console.error("Import error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
