import { auth } from '@/auth'
import db from '@/lib/db'
import { NextResponse } from 'next/server'
import { AIProvider } from '@/types/ai'

const VALID_PROVIDERS: AIProvider[] = ['ollama', 'openai', 'anthropic', 'gemini']

export const GET = async () => {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 })
    }

    const config = await db.userAIConfig.findUnique({
      where: { userId: session.user.id },
    })

    return NextResponse.json({
      provider: config?.provider ?? null,
      model: config?.model ?? null,
      hasOpenaiKey: !!config?.openaiApiKey,
      hasAnthropicKey: !!config?.anthropicApiKey,
      hasGeminiKey: !!config?.geminiApiKey,
      ollamaAvailable: !!process.env.OLLAMA_BASE_URL,
    })
  } catch (error) {
    console.error('[AI_CONFIG_GET]', error)
    return NextResponse.json({ message: 'Internal Error' }, { status: 500 })
  }
}

export const PUT = async (req: Request) => {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 })
    }

    const body = await req.json()
    const { provider, model, openaiApiKey, anthropicApiKey, geminiApiKey } = body

    if (!provider || !VALID_PROVIDERS.includes(provider)) {
      return NextResponse.json({ message: 'Provedor inválido' }, { status: 400 })
    }
    if (!model) {
      return NextResponse.json({ message: 'Modelo é obrigatório' }, { status: 400 })
    }

    const existing = await db.userAIConfig.findUnique({
      where: { userId: session.user.id },
    })

    const data = {
      provider,
      model,
      // Empty string = keep existing; new value = overwrite; undefined = keep existing
      openaiApiKey:
        openaiApiKey === '' ? existing?.openaiApiKey ?? null : (openaiApiKey ?? existing?.openaiApiKey ?? null),
      anthropicApiKey:
        anthropicApiKey === '' ? existing?.anthropicApiKey ?? null : (anthropicApiKey ?? existing?.anthropicApiKey ?? null),
      geminiApiKey:
        geminiApiKey === '' ? existing?.geminiApiKey ?? null : (geminiApiKey ?? existing?.geminiApiKey ?? null),
    }

    const config = await db.userAIConfig.upsert({
      where: { userId: session.user.id },
      create: { userId: session.user.id, ...data },
      update: data,
    })

    return NextResponse.json({
      provider: config.provider,
      model: config.model,
      hasOpenaiKey: !!config.openaiApiKey,
      hasAnthropicKey: !!config.anthropicApiKey,
      hasGeminiKey: !!config.geminiApiKey,
      ollamaAvailable: !!process.env.OLLAMA_BASE_URL,
    })
  } catch (error) {
    console.error('[AI_CONFIG_PUT]', error)
    return NextResponse.json({ message: 'Internal Error' }, { status: 500 })
  }
}
