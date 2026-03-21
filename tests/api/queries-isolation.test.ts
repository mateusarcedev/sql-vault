import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET, POST } from '@/app/api/queries/route'
import prisma from '@/lib/db'
import { auth } from '@/auth'
import { NextRequest } from 'next/server'

describe('GET /api/queries — isolamento por userId', () => {
  beforeEach(() => vi.clearAllMocks())

  it('retorna 401 se não há sessão nem API Key', async () => {
    vi.mocked(auth).mockResolvedValue(null)
    vi.mocked(prisma.apiKey.findUnique).mockResolvedValue(null)
    const req = new NextRequest('http://localhost/api/queries')
    const res = await GET(req)
    expect(res.status).toBe(401)
  })

  it('filtra queries pelo userId da sessão', async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: 'user-A' }
    } as any)
    vi.mocked(prisma.query.findMany).mockResolvedValue([])
    const req = new NextRequest('http://localhost/api/queries')
    await GET(req)
    expect(prisma.query.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: 'user-A', deletedAt: null }),
      })
    )
  })

  it('filtra queries pelo userId da API Key quando não há sessão', async () => {
    vi.mocked(auth).mockResolvedValue(null)
    vi.mocked(prisma.apiKey.findUnique).mockResolvedValue({
      id: 'key-1',
      userId: 'user-B',
    } as any)
    vi.mocked(prisma.query.findMany).mockResolvedValue([])
    const req = new NextRequest('http://localhost/api/queries', {
      headers: { authorization: 'Bearer token-valido' },
    })
    await GET(req)
    expect(prisma.query.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: 'user-B' }),
      })
    )
  })

  it('nunca retorna queries de outro usuário', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'user-A' } } as any)
    vi.mocked(prisma.query.findMany).mockResolvedValue([])
    const req = new NextRequest('http://localhost/api/queries')
    await GET(req)
    const call = vi.mocked(prisma.query.findMany).mock.calls[0][0]
    expect((call as any).where.userId).toBe('user-A')
    expect((call as any).where.userId).not.toBe('user-B')
  })
})
