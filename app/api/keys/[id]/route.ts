import { auth } from "@/auth"
import db from "@/lib/db"
import { NextResponse } from "next/server"

export const DELETE = async (req: any, ctx: any) => {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Not authenticated" }, { status: 401 })
    }

    const userId = session.user.id
    const params = await ctx.params
    const { id } = params

    const apiKey = await db.apiKey.findUnique({
      where: { id },
    })

    if (!apiKey || apiKey.userId !== userId) {
      return NextResponse.json({ message: "Key not found" }, { status: 404 })
    }

    await db.apiKey.delete({
      where: { id },
    })

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error("[API_KEY_DELETE] Full error:", error)
    return NextResponse.json({ message: "Internal Error", details: error instanceof Error ? error.message : String(error) }, { status: 500 })
  }
}
