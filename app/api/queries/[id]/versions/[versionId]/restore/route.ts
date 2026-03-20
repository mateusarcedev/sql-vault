import { auth } from "@/auth"
import db from "@/lib/db"
import { NextResponse } from "next/server"

export const POST = auth(async (req, { params }) => {
  if (!req.auth) {
    return NextResponse.json({ message: "Not authenticated" }, { status: 401 })
  }

  const userId = req.auth.user?.id
  const { id, versionId } = await params as { id: string, versionId: string }

  try {
    // 1. Check query ownership
    const query = await db.query.findUnique({
      where: { id, userId },
      select: { id: true, sql: true }
    })

    if (!query) {
      return NextResponse.json({ message: "Query not found or access denied" }, { status: 403 })
    }

    // 2. Get the target version
    const version = await db.queryVersion.findUnique({
      where: { id: versionId, queryId: id }
    })

    if (!version) {
      return NextResponse.json({ message: "Version not found" }, { status: 404 })
    }

    // 3. Create a backup of current SQL as a new version
    await db.queryVersion.create({
      data: {
        queryId: id,
        sql: query.sql,
        description: "Versão anterior à restauração"
      }
    })

    // 4. Update the query with version SQL
    const updatedQuery = await db.query.update({
      where: { id },
      data: {
        sql: version.sql,
        updatedAt: new Date()
      },
      include: {
        tags: true,
        versions: {
          orderBy: { createdAt: "desc" },
          take: 1
        }
      }
    })

    return NextResponse.json(updatedQuery)
  } catch (error) {
    console.error("[QUERY_RESTORE_POST]", error)
    return NextResponse.json({ message: "Internal Error" }, { status: 500 })
  }
}) as any
