import { auth } from "@/auth"
import db from "@/lib/db"
import { NextResponse } from "next/server"

export const GET: any = auth(async (req, ctx) => {
  if (!req.auth) {
    return NextResponse.json({ message: "Not authenticated" }, { status: 401 })
  }

  const userId = req.auth.user?.id
  const params = await (ctx as any).params

  try {
    // Check ownership
    const routine = await db.routine.findUnique({
      where: {
        id: params.id,
        userId,
      },
    })

    if (!routine) {
      return NextResponse.json({ message: "Routine not found" }, { status: 404 })
    }

    const versions = await db.routineVersion.findMany({
      where: { routineId: params.id },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json(versions)
  } catch (error) {
    console.error("[ROUTINE_VERSIONS_GET]", error)
    return NextResponse.json({ message: "Internal Error" }, { status: 500 })
  }
})
