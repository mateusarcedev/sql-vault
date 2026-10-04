import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

import { PUT } from '@/app/api/ai/config/route'
import prisma from '@/lib/db'
import { auth } from '@/auth'
import { decryptAISecret, isEncryptedAISecret } from '@/lib/ai/secrets'
import { resetServerEnvCacheForTests } from '@/lib/env'

const AI_KEY = Buffer.from('0123456789abcdef0123456789abcdef').toString('base64')

describe('AI Config API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/sqlvault'
    process.env.AI_ENCRYPTION_KEY = AI_KEY
    process.env.NODE_ENV = 'test'
    resetServerEnvCacheForTests()
    vi.mocked(auth).mockResolvedValue({ user: { id: 'user-1' } } as any)
    vi.mocked(prisma.userAIConfig.findUnique).mockResolvedValue(null)
    vi.mocked(prisma.userAIConfig.upsert).mockResolvedValue({
      provider: 'open-webui',
      model: 'llama3.1:8b',
      openaiApiKey: null,
      anthropicApiKey: null,
      geminiApiKey: null,
      modelsUrl: 'https://openwebui.example.com/api/models',
      connectionUrl: 'https://openwebui.example.com/api/chat/completions',
    } as any)
  })

  it('exige URLs customizadas para provider compatível', async () => {
    const req = new NextRequest('http://localhost/api/ai/config', {
      method: 'PUT',
      body: JSON.stringify({
        provider: 'open-webui',
        model: 'llama3.1:8b',
      }),
    })

    const res = await PUT(req)
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.message).toContain('URL de modelos')
  })

  it('encrypts new provider credentials before persistence', async () => {
    vi.mocked(prisma.userAIConfig.upsert).mockImplementation(async (args: any) => ({
      ...args.create,
    }))

    const req = new NextRequest('http://localhost/api/ai/config', {
      method: 'PUT',
      body: JSON.stringify({
        provider: 'openai',
        model: 'gpt-4.1',
        openaiApiKey: 'sk-sensitive-demo',
      }),
    })

    const res = await PUT(req)
    expect(res.status).toBe(200)

    const call = vi.mocked(prisma.userAIConfig.upsert).mock.calls[0][0] as any
    const stored = call.create.openaiApiKey as string

    expect(isEncryptedAISecret(stored)).toBe(true)
    expect(stored).not.toContain('sk-sensitive-demo')
    expect(decryptAISecret(stored)).toBe('sk-sensitive-demo')
  })

  it('salva URLs customizadas válidas', async () => {
    const req = new NextRequest('http://localhost/api/ai/config', {
      method: 'PUT',
      body: JSON.stringify({
        provider: 'open-webui',
        model: 'llama3.1:8b',
        modelsUrl: 'https://openwebui.example.com/api/models',
        connectionUrl: 'https://openwebui.example.com/api/chat/completions',
      }),
    })

    const res = await PUT(req)

    expect(res.status).toBe(200)
    expect(prisma.userAIConfig.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({
          modelsUrl: 'https://openwebui.example.com/api/models',
          connectionUrl: 'https://openwebui.example.com/api/chat/completions',
        }),
      })
    )
  })
})
