import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

import { GET } from '@/app/api/ai/models/route'
import prisma from '@/lib/db'
import { auth } from '@/auth'

describe('AI Models API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('fetch', vi.fn())
    vi.mocked(auth).mockResolvedValue({ user: { id: 'user-1' } } as any)
  })

  it('retorna somente modelos Gemini com generateContent', async () => {
    vi.mocked(prisma.userAIConfig.findUnique).mockResolvedValue({
      userId: 'user-1',
      geminiApiKey: 'gem-key',
    } as any)

    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        models: [
          { name: 'models/gemini-1.5-flash', supportedGenerationMethods: ['generateContent'] },
          { name: 'models/text-embedding-004', supportedGenerationMethods: ['embedContent'] },
          { name: 'models/gemini-1.5-pro', supportedGenerationMethods: ['generateContent', 'countTokens'] },
        ],
      }),
    } as any)

    const req = new NextRequest('http://localhost/api/ai/models?provider=gemini&refresh=1')
    const res = await GET(req)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.models).toEqual(['gemini-1.5-flash', 'gemini-1.5-pro'])
  })

  it('retorna vazio quando não há chave configurada para provider remoto', async () => {
    vi.mocked(prisma.userAIConfig.findUnique).mockResolvedValue({
      userId: 'user-1',
      geminiApiKey: null,
      openaiApiKey: null,
      anthropicApiKey: null,
    } as any)

    const req = new NextRequest('http://localhost/api/ai/models?provider=gemini&refresh=1')
    const res = await GET(req)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.models).toEqual([])
  })

  it('retorna modelos para Open WebUI via URL customizada', async () => {
    vi.mocked(prisma.userAIConfig.findUnique).mockResolvedValue({
      userId: 'user-1',
      openaiApiKey: 'owui-key',
      modelsUrl: 'https://openwebui.example.com/api/models',
    } as any)

    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [
          { id: 'llama3.1:8b' },
          { id: 'qwen2.5:14b' },
        ],
      }),
    } as any)

    const req = new NextRequest('http://localhost/api/ai/models?provider=open-webui&refresh=1')
    const res = await GET(req)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.models).toEqual(['llama3.1:8b', 'qwen2.5:14b'])
    expect(fetch).toHaveBeenCalledWith('https://openwebui.example.com/api/models', {
      headers: {
        Authorization: 'Bearer owui-key',
      },
    })
  })

  it('retorna modelos para Ollama-compatible via URL customizada', async () => {
    vi.mocked(prisma.userAIConfig.findUnique).mockResolvedValue({
      userId: 'user-1',
      modelsUrl: 'https://ollama.example.com/api/tags',
    } as any)

    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        models: [
          { name: 'llama3.2:3b' },
          { name: 'mistral:latest' },
        ],
      }),
    } as any)

    const req = new NextRequest('http://localhost/api/ai/models?provider=ollama-compatible&refresh=1')
    const res = await GET(req)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.models).toEqual(['llama3.2:3b', 'mistral:latest'])
    expect(fetch).toHaveBeenCalledWith('https://ollama.example.com/api/tags', {
      headers: {},
    })
  })
})
