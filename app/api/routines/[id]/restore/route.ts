import { auth } from "@/auth"
import db from "@/lib/db"
import { NextResponse } from "next/server"

export const POST: any = auth(async (req, ctx) => {
  if (!req.auth) {
    return NextResponse.json({ message: "Not authenticated" }, { status: 401 })
  }

  const params = await (ctx as any).params

  try {
    const routine = await db.routine.findUnique({
      where: {
        id: params.id,
        userId: req.auth.user?.id,
      },
    })

    if (!routine) {
      return NextResponse.json({ message: "Routine not found" }, { status: 404 })
    }

    const updated = await db.routine.update({
      where: { id: params.id },
      data: {
        deletedAt: null,
      },
      include: {
        tags: true,
        versions: true,
      },
    })

    const parsedRoutine = {
      ...updated,
      parameters: updated.parameters ? JSON.parse(updated.parameters) : []
    }

    return NextResponse.json(parsedRoutine)
  } catch (error) {
    console.error("[ROUTINE_RESTORE_POST]", error)
    return NextResponse.json({ message: "Internal Error" }, { status: 500 })
  }
})
