import { auth } from '@/auth'
import db from '@/lib/db'
import { analyzeSQL } from '@/lib/ai'
import { NextResponse } from 'next/server'
import { AIProvider } from '@/types/ai'

export const POST = async (req: Request) => {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 })
    }

    const body = await req.json()
    const { sql, dialect } = body

    if (!sql?.trim()) {
      return NextResponse.json({ message: 'SQL é obrigatório' }, { status: 400 })
    }

    const config = await db.userAIConfig.findUnique({
      where: { userId: session.user.id },
    })

    if (!config) {
      return NextResponse.json(
        { message: 'Configure um provedor de IA nas configurações antes de usar esta funcionalidade' },
        { status: 400 }
      )
    }

    try {
      const result = await analyzeSQL(sql, dialect ?? 'postgresql', {
        provider: config.provider as AIProvider,
        model: config.model,
        openaiApiKey: config.openaiApiKey,
        anthropicApiKey: config.anthropicApiKey,
        geminiApiKey: config.geminiApiKey,
      })
      return NextResponse.json(result)
    } catch (aiError) {
      console.error('[AI_ANALYZE_PROVIDER]', aiError)
      const message = aiError instanceof Error ? aiError.message : 'Erro ao chamar o provedor de IA'
      return NextResponse.json({ message }, { status: 502 })
    }
  } catch (error) {
    console.error('[AI_ANALYZE]', error)
    return NextResponse.json({ message: 'Internal Error' }, { status: 500 })
  }
}
