import { randomBytes } from 'node:crypto'

import { auth } from '@/auth'
import db from '@/lib/db'
import { NextResponse } from 'next/server'

export const POST = async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 })
    }

    const { id } = await ctx.params
    const userId = session.user.id

    const apiKey = await db.apiKey.findUnique({ where: { id } })
    if (!apiKey || apiKey.userId !== userId) {
      return NextResponse.json({ message: 'Key not found' }, { status: 404 })
    }

    const token = randomBytes(32).toString('hex')

    const updated = await db.apiKey.update({
      where: { id },
      data: { token, lastUsedAt: null },
      select: {
        id: true,
        name: true,
        token: true,
        createdAt: true,
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('[API_KEY_REGENERATE]', error)
    return NextResponse.json({ message: 'Internal Error' }, { status: 500 })
  }
}