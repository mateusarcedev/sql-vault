import { auth } from '@/auth'
import { NextResponse } from 'next/server'

const STATIC_MODELS: Record<string, string[]> = {
  openai: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'o1-mini'],
  anthropic: ['claude-opus-4-5', 'claude-sonnet-4-5', 'claude-haiku-3-5'],
  gemini: ['gemini-2.0-flash', 'gemini-1.5-pro', 'gemini-1.5-flash'],
}

export const GET = async (req: Request) => {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const provider = searchParams.get('provider')

    if (!provider) {
      return NextResponse.json({ message: 'Provider é obrigatório' }, { status: 400 })
    }

    if (provider === 'ollama') {
      const baseUrl = process.env.OLLAMA_BASE_URL
      if (!baseUrl) {
        return NextResponse.json({ models: [] })
      }
      const response = await fetch(`${baseUrl}/api/tags`)
      if (!response.ok) {
        return NextResponse.json({ models: [] })
      }
      const data = await response.json()
      const models: string[] = (data?.models ?? []).map((m: { name: string }) => m.name)
      return NextResponse.json({ models })
    }

    const models = STATIC_MODELS[provider]
    if (!models) {
      return NextResponse.json({ message: 'Provedor desconhecido' }, { status: 400 })
    }

    return NextResponse.json({ models })
  } catch (error) {
    console.error('[AI_MODELS_GET]', error)
    return NextResponse.json({ message: 'Internal Error' }, { status: 500 })
  }
}
