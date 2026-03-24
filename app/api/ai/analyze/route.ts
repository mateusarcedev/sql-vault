import { auth } from '@/auth'
import db from '@/lib/db'
import { analyzeSQL } from '@/lib/ai'
import { NextResponse } from 'next/server'
import { AIProvider } from '@/types/ai'
import { aiAnalysisResultSchema } from '@/lib/ai/schema'

export const POST = async (req: Request) => {
  const startedAt = Date.now()
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
      const provider = config.provider as AIProvider
      const model = config.model
      const normalizedDialect = dialect ?? 'postgresql'

      const result = await analyzeSQL(sql, normalizedDialect, {
        provider,
        model: config.model,
        openaiApiKey: config.openaiApiKey,
        anthropicApiKey: config.anthropicApiKey,
        geminiApiKey: config.geminiApiKey,
      })

      const parsed = aiAnalysisResultSchema.safeParse(result)
      if (!parsed.success) {
        console.error('[AI_ANALYZE_SCHEMA_INVALID]', {
          userId: session.user.id,
          provider,
          model,
          dialect: normalizedDialect,
          elapsedMs: Date.now() - startedAt,
          issues: parsed.error.issues.map((issue) => issue.path.join('.')),
        })
        return NextResponse.json({ message: 'Resposta inválida do provedor de IA' }, { status: 502 })
      }

      return NextResponse.json(parsed.data)
    } catch (aiError) {
      console.error('[AI_ANALYZE_PROVIDER]', {
        userId: session.user.id,
        provider: config.provider,
        model: config.model,
        dialect: dialect ?? 'postgresql',
        elapsedMs: Date.now() - startedAt,
        error: aiError instanceof Error ? aiError.message : String(aiError),
      })
      const message = aiError instanceof Error ? aiError.message : 'Erro ao chamar o provedor de IA'
      return NextResponse.json({ message }, { status: 502 })
    }
  } catch (error) {
    console.error('[AI_ANALYZE]', error)
    return NextResponse.json({ message: 'Internal Error' }, { status: 500 })
  }
}
