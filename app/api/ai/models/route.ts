import { auth } from '@/auth'
import db from '@/lib/db'
import { NextResponse } from 'next/server'

const MODELS_CACHE_TTL_MS = 60_000
const modelsCache = new Map<string, { expiresAt: number; models: string[] }>()

const fetchOllamaModels = async (baseUrl: string): Promise<string[]> => {
  const response = await fetch(`${baseUrl}/api/tags`)
  if (!response.ok) return []

  const data = await response.json()
  return (data?.models ?? []).map((model: { name: string }) => model.name)
}

const normalizeModelList = (payload: unknown): string[] => {
  if (Array.isArray(payload)) {
    return payload
      .map((item) => {
        if (typeof item === 'string') return item
        if (item && typeof item === 'object') {
          const model = item as { id?: string; name?: string }
          return model.id ?? model.name ?? null
        }
        return null
      })
      .filter((id): id is string => Boolean(id))
      .sort((a, b) => a.localeCompare(b))
  }

  if (!payload || typeof payload !== 'object') return []

  const data = payload as {
    data?: Array<{ id?: string }>
    models?: Array<{ id?: string; name?: string }>
  }

  if (Array.isArray(data.data)) {
    return data.data
      .map((model) => model.id)
      .filter((id): id is string => Boolean(id))
      .sort((a, b) => a.localeCompare(b))
  }

  if (Array.isArray(data.models)) {
    return data.models
      .map((model) => model.id ?? model.name)
      .filter((id): id is string => Boolean(id))
      .sort((a, b) => a.localeCompare(b))
  }

  return []
}

const fetchCustomModels = async (modelsUrl: string, apiKey?: string | null): Promise<string[]> => {
  const headers: Record<string, string> = {}
  if (apiKey) {
    headers.Authorization = `Bearer ${apiKey}`
  }

  const response = await fetch(modelsUrl, { headers })
  if (!response.ok) return []

  const data = await response.json()
  return normalizeModelList(data)
}

const fetchOpenAIModels = async (apiKey: string): Promise<string[]> => {
  const response = await fetch('https://api.openai.com/v1/models', {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  })

  if (!response.ok) return []

  const data = await response.json()
  const ids = (data?.data ?? []).map((model: { id: string }) => model.id)

  return ids
    .filter((id: string) => /^(gpt|o\d)/i.test(id))
    .sort((a: string, b: string) => a.localeCompare(b))
}

const fetchAnthropicModels = async (apiKey: string): Promise<string[]> => {
  const response = await fetch('https://api.anthropic.com/v1/models', {
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
  })

  if (!response.ok) return []

  const data = await response.json()

  return (data?.data ?? [])
    .map((model: { id: string }) => model.id)
    .sort((a: string, b: string) => a.localeCompare(b))
}

const fetchGeminiModels = async (apiKey: string): Promise<string[]> => {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
  )

  if (!response.ok) return []

  const data = await response.json()

  return (data?.models ?? [])
    .filter(
      (model: { supportedGenerationMethods?: string[] }) =>
        model.supportedGenerationMethods?.includes('generateContent')
    )
    .map((model: { name: string }) => model.name.replace(/^models\//, ''))
    .sort((a: string, b: string) => a.localeCompare(b))
}

export const GET = async (req: Request) => {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const provider = searchParams.get('provider')
    const refreshToken = searchParams.get('refresh')

    if (!provider) {
      return NextResponse.json({ message: 'Provider é obrigatório' }, { status: 400 })
    }

    if (provider === 'ollama') {
      const baseUrl = process.env.OLLAMA_BASE_URL
      if (!baseUrl) {
        return NextResponse.json({ models: [] })
      }

      const cacheKey = `${session.user.id}:ollama`
      const cached = modelsCache.get(cacheKey)
      const forceRefresh = Boolean(refreshToken)

      if (!forceRefresh && cached && cached.expiresAt > Date.now()) {
        return NextResponse.json({ models: cached.models, cached: true })
      }

      const models = await fetchOllamaModels(baseUrl)
      modelsCache.set(cacheKey, { models, expiresAt: Date.now() + MODELS_CACHE_TTL_MS })
      return NextResponse.json({ models, cached: false })
    }

    if (![
      'openai',
      'anthropic',
      'gemini',
      'openai-compatible',
      'ollama-compatible',
      'open-webui',
    ].includes(provider)) {
      return NextResponse.json({ message: 'Provedor desconhecido' }, { status: 400 })
    }

    const config = await db.userAIConfig.findUnique({
      where: { userId: session.user.id },
      select: {
        openaiApiKey: true,
        anthropicApiKey: true,
        geminiApiKey: true,
        modelsUrl: true,
      },
    })

    let models: string[] = []
    const cacheSuffix =
      provider === 'openai-compatible' || provider === 'ollama-compatible' || provider === 'open-webui'
        ? `:${config?.modelsUrl ?? ''}`
        : ''
    const cacheKey = `${session.user.id}:${provider}${cacheSuffix}`
    const cached = modelsCache.get(cacheKey)
    const forceRefresh = Boolean(refreshToken)

    if (!forceRefresh && cached && cached.expiresAt > Date.now()) {
      return NextResponse.json({ models: cached.models, cached: true })
    }

    if (provider === 'openai' && config?.openaiApiKey) {
      models = await fetchOpenAIModels(config.openaiApiKey)
    }

    if (provider === 'anthropic' && config?.anthropicApiKey) {
      models = await fetchAnthropicModels(config.anthropicApiKey)
    }

    if (provider === 'gemini' && config?.geminiApiKey) {
      models = await fetchGeminiModels(config.geminiApiKey)
    }

    if (provider === 'openai-compatible' && config?.modelsUrl) {
      models = await fetchCustomModels(config.modelsUrl, config.openaiApiKey)
    }

    if (provider === 'open-webui' && config?.modelsUrl) {
      models = await fetchCustomModels(config.modelsUrl, config.openaiApiKey)
    }

    if (provider === 'ollama-compatible' && config?.modelsUrl) {
      models = await fetchCustomModels(config.modelsUrl)
    }

    modelsCache.set(cacheKey, { models, expiresAt: Date.now() + MODELS_CACHE_TTL_MS })

    return NextResponse.json({ models, cached: false })
  } catch (error) {
    console.error('[AI_MODELS_GET]', error)
    return NextResponse.json({ message: 'Internal Error' }, { status: 500 })
  }
}
