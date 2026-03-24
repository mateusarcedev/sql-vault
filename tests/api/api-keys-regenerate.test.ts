import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

import { POST } from '@/app/api/keys/[id]/regenerate/route'
import prisma from '@/lib/db'
import { auth } from '@/auth'

describe('API Key Regenerate', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(auth).mockResolvedValue({ user: { id: 'user-1' } } as any)
  })

  it('regenera token para chave do próprio usuário', async () => {
    vi.mocked(prisma.apiKey.findUnique).mockResolvedValue({
      id: 'key-1',
      userId: 'user-1',
      name: 'VS Code',
      createdAt: new Date('2026-03-23T10:00:00Z'),
    } as any)

    vi.mocked(prisma.apiKey.update).mockResolvedValue({
      id: 'key-1',
      name: 'VS Code',
      token: 'new-token',
      createdAt: new Date('2026-03-23T10:00:00Z'),
      lastUsedAt: null,
    } as any)

    const req = new NextRequest('http://localhost/api/keys/key-1/regenerate', { method: 'POST' })
    const res = await POST(req, { params: { id: 'key-1' } } as any)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body).toEqual(
      expect.objectContaining({
        id: 'key-1',
        name: 'VS Code',
        token: 'new-token',
      })
    )
    expect(prisma.apiKey.update).toHaveBeenCalled()
  })

  it('retorna 404 se chave não pertence ao usuário', async () => {
    vi.mocked(prisma.apiKey.findUnique).mockResolvedValue({
      id: 'key-1',
      userId: 'other-user',
    } as any)

    const req = new NextRequest('http://localhost/api/keys/key-1/regenerate', { method: 'POST' })
    const res = await POST(req, { params: { id: 'key-1' } } as any)

    expect(res.status).toBe(404)
    expect(prisma.apiKey.update).not.toHaveBeenCalled()
  })
})
