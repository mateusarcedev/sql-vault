import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '@/app/api/queries/[id]/usage/route'
import prisma from '@/lib/db'
import { auth } from '@/auth'
import { getUserFromApiKey } from '@/lib/auth-api-key'
import { NextRequest } from 'next/server'

const db = prisma as any

function makeRequest(id: string, token?: string): [NextRequest, { params: Promise<{ id: string }> }] {
  const req = new NextRequest(`http://localhost/api/queries/${id}/usage`, {
    method: 'POST',
    headers: token ? { authorization: `Bearer ${token}` } : {},
  })
  return [req, { params: Promise.resolve({ id }) }]
}

describe('POST /api/queries/[id]/usage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(auth).mockResolvedValue(null as any)
  })

  it('returns 401 without session or API key', async () => {
    vi.mocked(getUserFromApiKey).mockResolvedValue(null)

    const res = await POST(...makeRequest('query-1'))

    expect(res.status).toBe(401)
    expect(db.query.updateMany).not.toHaveBeenCalled()
  })

  it('increments copyCount for the API key owner without creating a query', async () => {
    vi.mocked(getUserFromApiKey).mockResolvedValue('user-A')
    db.query.updateMany.mockResolvedValue({ count: 1 })

    const res = await POST(...makeRequest('query-1', 'sqlvault_token'))

    expect(res.status).toBe(204)
    expect(db.query.updateMany).toHaveBeenCalledWith({
      where: { id: 'query-1', userId: 'user-A', deletedAt: null },
      data: { copyCount: { increment: 1 } },
    })
    expect(db.query.create).not.toHaveBeenCalled()
  })

  it('accepts a NextAuth session', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'user-B' } } as any)
    db.query.updateMany.mockResolvedValue({ count: 1 })

    const res = await POST(...makeRequest('query-2'))

    expect(res.status).toBe(204)
    expect(db.query.updateMany.mock.calls[0][0].where.userId).toBe('user-B')
  })

  it("returns 404 for another user's, missing or soft-deleted query", async () => {
    vi.mocked(getUserFromApiKey).mockResolvedValue('user-A')
    db.query.updateMany.mockResolvedValue({ count: 0 })

    const res = await POST(...makeRequest('query-of-user-B', 'sqlvault_token'))

    expect(res.status).toBe(404)
  })
})
