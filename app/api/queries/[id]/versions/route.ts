import { auth } from "@/auth"
import db from "@/lib/db"
import { NextResponse } from "next/server"

export const GET = auth(async (req, { params }) => {
  if (!req.auth) {
    return NextResponse.json({ message: "Not authenticated" }, { status: 401 })
  }

  const userId = req.auth.user?.id
  const { id } = await params as { id: string }

  try {
    const query = await db.query.findUnique({
      where: { id, userId },
      select: { id: true }
    })

    if (!query) {
      return NextResponse.json({ message: "Query not found or access denied" }, { status: 403 })
    }

    const versions = await db.queryVersion.findMany({
      where: { queryId: id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        sql: true,
        description: true,
        createdAt: true,
      }
    })

    return NextResponse.json(versions)
  } catch (error) {
    console.error("[QUERY_VERSIONS_GET]", error)
    return NextResponse.json({ message: "Internal Error" }, { status: 500 })
  }
}) as any
