import { auth } from "@/auth"
import db from "@/lib/db"
import { NextResponse } from "next/server"

export const POST: any = auth(async (req, ctx) => {
  if (!req.auth) {
    return NextResponse.json({ message: "Not authenticated" }, { status: 401 })
  }

  const userId = req.auth.user?.id
  const params = await (ctx as any).params

  const routineId = params.id
  const versionId = params.versionId

  try {
    // Ensure ownership
    const routine = await db.routine.findUnique({
      where: {
        id: routineId,
        userId,
      },
    })

    if (!routine) {
      return NextResponse.json({ message: "Routine not found" }, { status: 404 })
    }

    // Get the version to restore
    const version = await db.routineVersion.findUnique({
      where: {
        id: versionId,
        routineId, // ensures the version belongs to the routine
      },
    })

    if (!version) {
      return NextResponse.json({ message: "Version not found" }, { status: 404 })
    }

    // Update routine sql and track the restored version as a new version
    const updatedRoutine = await db.routine.update({
      where: { id: routineId },
      data: {
        sql: version.sql,
        versions: {
          create: {
            sql: version.sql,
          },
        },
      },
      include: {
        tags: true,
        versions: {
          orderBy: { createdAt: "desc" },
        },
      },
    })

    const parsedRoutine = {
      ...updatedRoutine,
      parameters: updatedRoutine.parameters ? JSON.parse(updatedRoutine.parameters) : []
    }

    return NextResponse.json(parsedRoutine)
  } catch (error) {
    console.error("[ROUTINE_VERSION_RESTORE]", error)
    return NextResponse.json({ message: "Internal Error" }, { status: 500 })
  }
})
