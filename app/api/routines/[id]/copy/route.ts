import { auth } from "@/auth"
import db from "@/lib/db"
import { NextResponse } from "next/server"

export const POST: any = auth(async (req, ctx) => {
  if (!req.auth) {
    return NextResponse.json({ message: "Not authenticated" }, { status: 401 })
  }

  try {
    const params = await (ctx as any).params
    const routine = await db.routine.update({
      where: {
        id: params.id,
        userId: req.auth.user?.id,
      },
      data: {
        copyCount: {
          increment: 1,
        },
      },
    })

    return NextResponse.json({ copyCount: routine.copyCount })
  } catch (error) {
    console.error("[ROUTINE_COPY_POST]", error)
    return NextResponse.json({ message: "Internal Error" }, { status: 500 })
  }
})
