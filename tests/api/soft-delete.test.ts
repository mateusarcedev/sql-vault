import { describe, it, expect, vi, beforeEach } from 'vitest'
import { DELETE } from '@/app/api/queries/[id]/route'
import prisma from '@/lib/db'
import { auth } from '@/auth'
import { NextRequest } from 'next/server'

describe('DELETE /api/queries/[id] — soft delete', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(auth).mockResolvedValue({ user: { id: 'user-1' } } as any)
  })

  it('seta deletedAt em vez de remover o registro', async () => {
    vi.mocked(prisma.query.findUnique).mockResolvedValue({
      id: 'query-1',
      userId: 'user-1',
    } as any)
    vi.mocked(prisma.query.update).mockResolvedValue({} as any)

    const req = new NextRequest('http://localhost/api/queries/query-1', {
      method: 'DELETE',
    })
    await DELETE(req, { params: { id: 'query-1' } })

    expect(prisma.query.update).toHaveBeenCalledWith({
      where: { id: 'query-1' },
      data: { deletedAt: expect.any(Date) },
    })
    expect(prisma.query.delete).not.toHaveBeenCalled()
  })

  it('retorna 403 se a query pertence a outro usuário', async () => {
    vi.mocked(prisma.query.findUnique).mockResolvedValue({
      id: 'query-1',
      userId: 'user-outro',
    } as any)

    const req = new NextRequest('http://localhost/api/queries/query-1', {
      method: 'DELETE',
    })
    const res = await DELETE(req, { params: { id: 'query-1' } })

    expect(res.status).toBe(403)
    expect(prisma.query.update).not.toHaveBeenCalled()
  })
})
