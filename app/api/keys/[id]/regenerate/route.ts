import { auth } from "@/auth"
import db from "@/lib/db"
import { createApiToken } from "@/lib/api-key-token"
import { NextResponse } from "next/server"

export const POST = async (
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) => {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Not authenticated" }, { status: 401 })
    }

    const { id } = await ctx.params
    const apiKey = await db.apiKey.findUnique({
      where: { id },
      select: { id: true, userId: true },
    })

    if (!apiKey || apiKey.userId !== session.user.id) {
      return NextResponse.json({ message: "Key not found" }, { status: 404 })
    }

    const { token, tokenHash } = createApiToken()

    const updated = await db.apiKey.update({
      where: { id },
      data: {
        token,
        tokenHash,
        lastUsedAt: null,
        regeneratedAt: new Date(),
      },
      select: {
        id: true,
        name: true,
        regeneratedAt: true,
        createdAt: true,
      },
    })

    return NextResponse.json({ ...updated, token })
  } catch (error) {
    console.error("[API_KEY_REGENERATE]", error)
    return NextResponse.json({ message: "Internal Error" }, { status: 500 })
  }
}
