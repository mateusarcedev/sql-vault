import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getUserFromApiKey } from '@/lib/auth-api-key'
import prisma from '@/lib/db'
import { NextRequest } from 'next/server'

function makeRequest(authHeader?: string): NextRequest {
  return new NextRequest('http://localhost/api/test', {
    headers: authHeader ? { authorization: authHeader } : {},
  })
}

describe('getUserFromApiKey', () => {
  beforeEach(() => vi.clearAllMocks())

  it('retorna null se não há header Authorization', async () => {
    const result = await getUserFromApiKey(makeRequest())
    expect(result).toBeNull()
    expect(prisma.apiKey.findUnique).not.toHaveBeenCalled()
  })

  it('retorna null se o header não começa com Bearer', async () => {
    const result = await getUserFromApiKey(makeRequest('Basic abc123'))
    expect(result).toBeNull()
  })

  it('retorna null se o token não existe no banco', async () => {
    vi.mocked(prisma.apiKey.findUnique).mockResolvedValue(null)
    const result = await getUserFromApiKey(makeRequest('Bearer token-invalido'))
    expect(result).toBeNull()
  })

  it('retorna userId se o token é válido', async () => {
    vi.mocked(prisma.apiKey.findUnique).mockResolvedValue({
      id: 'key-1',
      userId: 'user-1',
    } as any)
    const result = await getUserFromApiKey(makeRequest('Bearer token-valido'))
    expect(result).toBe('user-1')
  })

  it('atualiza lastUsedAt quando o token é válido', async () => {
    vi.mocked(prisma.apiKey.findUnique).mockResolvedValue({
      id: 'key-1',
      userId: 'user-1',
    } as any)
    await getUserFromApiKey(makeRequest('Bearer token-valido'))
    // fire-and-forget — aguarda microtask
    await new Promise(resolve => setTimeout(resolve, 0))
    expect(prisma.apiKey.update).toHaveBeenCalledWith({
      where: { id: 'key-1' },
      data: { lastUsedAt: expect.any(Date) },
    })
  })

  it('não lança erro se o update de lastUsedAt falhar', async () => {
    vi.mocked(prisma.apiKey.findUnique).mockResolvedValue({
      id: 'key-1',
      userId: 'user-1',
    } as any)
    vi.mocked(prisma.apiKey.update).mockRejectedValue(new Error('DB error'))
    await expect(
      getUserFromApiKey(makeRequest('Bearer token-valido'))
    ).resolves.toBe('user-1')
  })
})
