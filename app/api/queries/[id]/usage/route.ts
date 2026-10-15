import { auth } from "@/auth"
import db from "@/lib/db"
import { NextResponse } from "next/server"
import { getUserFromApiKey } from "@/lib/auth-api-key"

// Records that a query was used (e.g. inserted from the VS Code extension)
// by incrementing copyCount. Unlike /copy, it never creates a new query.
export const POST = async (req: any, { params }: any) => {
  const session = await auth()
  const userId = session?.user?.id ?? await getUserFromApiKey(req)

  if (!userId) {
    return NextResponse.json({ message: "Not authenticated" }, { status: 401 })
  }

  const { id } = await params as { id: string }

  try {
    const result = await db.query.updateMany({
      where: { id, userId, deletedAt: null },
      data: { copyCount: { increment: 1 } },
    })

    if (result.count === 0) {
      return NextResponse.json({ message: "Not found" }, { status: 404 })
    }

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error("[QUERY_USAGE]", error)
    return NextResponse.json({ message: "Internal Error" }, { status: 500 })
  }
}
