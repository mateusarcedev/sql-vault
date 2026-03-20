import { auth } from "@/auth"
import db from "@/lib/db"
import { NextResponse } from "next/server"

export const GET: any = auth(async (req) => {
  if (!req.auth) {
    return NextResponse.json({ message: "Not authenticated" }, { status: 401 })
  }

  const userId = req.auth.user?.id

  try {
    const routines = await db.routine.findMany({
      where: {
        userId,
        deletedAt: {
          not: null,
        },
      },
      orderBy: { deletedAt: "desc" },
      include: {
        tags: true,
      },
    })

    const parsedRoutines = routines.map((r: any) => ({
      ...r,
      parameters: r.parameters ? JSON.parse(r.parameters) : []
    }))

    return NextResponse.json(parsedRoutines)
  } catch (error) {
    console.error("[ROUTINES_TRASH_GET]", error)
    return NextResponse.json({ message: "Internal Error" }, { status: 500 })
  }
})
