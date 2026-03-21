import { auth } from "@/auth"
import db from "@/lib/db"
import { NextResponse } from "next/server"
import { getUserFromApiKey } from "@/lib/auth-api-key"

export async function GET(req: any) {
  try {
    const session = await auth()
    const userId = session?.user?.id ?? await getUserFromApiKey(req)

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
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

    // Mapear title para name na resposta
    const mappedQueries = queries.map((q) => {
      const { title, ...rest } = q
      return {
        ...rest,
        name: title,
        tags: q.tags.map((t) => ({ id: t.id, name: t.name, color: t.color })),
        versions: q.versions.map((v) => ({
          id: v.id,
          sql: v.sql,
          description: v.description,
          createdAt: v.createdAt.toISOString(),
        })),
      }
    })

    const payload = {
      exportedAt: new Date().toISOString(),
      version: 1,
      queries: mappedQueries,
      tags: tags.map((t) => ({ id: t.id, name: t.name, color: t.color })),
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
