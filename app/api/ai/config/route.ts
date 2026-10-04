import { auth } from '@/auth'
import db from '@/lib/db'
import { NextResponse } from 'next/server'
import { AIProvider } from '@/types/ai'
import { encryptAISecret } from '@/lib/ai/secrets'
import { getServerEnv } from '@/lib/env'

const VALID_PROVIDERS: AIProvider[] = [
  'ollama',
  'openai',
  'anthropic',
  'gemini',
  'openai-compatible',
  'ollama-compatible',
  'open-webui',
]

const CUSTOM_ENDPOINT_PROVIDERS = new Set<AIProvider>([
  'openai-compatible',
  'ollama-compatible',
  'open-webui',
])

const normalizeOptionalUrl = (value: unknown): string | null => {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

const resolveSecret = (
  incoming: unknown,
  existing: string | null | undefined
): string | null => {
  if (incoming === '' || incoming === undefined || incoming === null) {
    return existing ?? null
  }

  if (typeof incoming !== 'string') {
    return existing ?? null
  }

  const trimmed = incoming.trim()
  if (!trimmed) return existing ?? null

  return encryptAISecret(trimmed)
}

const isValidUrl = (value: string): boolean => {
  try {
    const parsed = new URL(value)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

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
      ollamaAvailable: !!getServerEnv().OLLAMA_BASE_URL,
      modelsUrl: config?.modelsUrl ?? null,
      connectionUrl: config?.connectionUrl ?? null,
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
    const { provider, model, openaiApiKey, anthropicApiKey, geminiApiKey, modelsUrl, connectionUrl } = body

    if (!provider || !VALID_PROVIDERS.includes(provider)) {
      return NextResponse.json({ message: 'Provedor inválido' }, { status: 400 })
    }
    if (!model) {
      return NextResponse.json({ message: 'Modelo é obrigatório' }, { status: 400 })
    }

    const normalizedModelsUrl = normalizeOptionalUrl(modelsUrl)
    const normalizedConnectionUrl = normalizeOptionalUrl(connectionUrl)
    const requiresCustomUrls = CUSTOM_ENDPOINT_PROVIDERS.has(provider)

    if (requiresCustomUrls && (!normalizedModelsUrl || !normalizedConnectionUrl)) {
      return NextResponse.json(
        { message: 'URL de modelos e URL de conexão são obrigatórias para este provedor' },
        { status: 400 }
      )
    }

    if (normalizedModelsUrl && !isValidUrl(normalizedModelsUrl)) {
      return NextResponse.json({ message: 'URL de modelos inválida' }, { status: 400 })
    }

    if (normalizedConnectionUrl && !isValidUrl(normalizedConnectionUrl)) {
      return NextResponse.json({ message: 'URL de conexão inválida' }, { status: 400 })
    }

    const existing = await db.userAIConfig.findUnique({
      where: { userId: session.user.id },
    })

    const data = {
      provider,
      model,
      // Empty/undefined keeps the existing value; new values are encrypted at rest.
      openaiApiKey: resolveSecret(openaiApiKey, existing?.openaiApiKey),
      anthropicApiKey: resolveSecret(anthropicApiKey, existing?.anthropicApiKey),
      geminiApiKey: resolveSecret(geminiApiKey, existing?.geminiApiKey),
      modelsUrl: requiresCustomUrls
        ? normalizedModelsUrl
        : null,
      connectionUrl: requiresCustomUrls
        ? normalizedConnectionUrl
        : null,
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
      ollamaAvailable: !!getServerEnv().OLLAMA_BASE_URL,
      modelsUrl: config.modelsUrl,
      connectionUrl: config.connectionUrl,
    })
  } catch (error) {
    console.error('[AI_CONFIG_PUT]', error)
    return NextResponse.json({ message: 'Internal Error' }, { status: 500 })
  }
}
