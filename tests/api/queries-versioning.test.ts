import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PUT } from '@/app/api/queries/[id]/route'
import prisma from '@/lib/db'
import { auth } from '@/auth'
import { NextRequest } from 'next/server'

function makePutRequest(body: object): NextRequest {
  return new NextRequest('http://localhost/api/queries/query-1', {
    method: 'PUT',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  })
}

describe('PUT /api/queries/[id] — versionamento automático', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(auth).mockResolvedValue({ user: { id: 'user-1' } } as any)
  })

  it('cria QueryVersion quando o SQL muda', async () => {
    vi.mocked(prisma.query.findUnique).mockResolvedValue({
      id: 'query-1',
      userId: 'user-1',
      sql: 'SELECT 1',
    } as any)
    vi.mocked(prisma.query.update).mockResolvedValue({} as any)
    vi.mocked(prisma.queryVersion.create).mockResolvedValue({} as any)

    const req = makePutRequest({ sql: 'SELECT 2' })
    await PUT(req, { params: { id: 'query-1' } })

    expect(prisma.queryVersion.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        queryId: 'query-1',
        sql: 'SELECT 1', // SQL anterior, não o novo
      }),
    })
  })

  it('NÃO cria QueryVersion quando o SQL não muda', async () => {
    vi.mocked(prisma.query.findUnique).mockResolvedValue({
      id: 'query-1',
      userId: 'user-1',
      sql: 'SELECT 1',
    } as any)
    vi.mocked(prisma.query.update).mockResolvedValue({} as any)

    const req = makePutRequest({ sql: 'SELECT 1', name: 'Novo nome' })
    await PUT(req, { params: { id: 'query-1' } })

    expect(prisma.queryVersion.create).not.toHaveBeenCalled()
  })

  it('NÃO cria QueryVersion quando o body não contém sql', async () => {
    vi.mocked(prisma.query.findUnique).mockResolvedValue({
      id: 'query-1',
      userId: 'user-1',
      sql: 'SELECT 1',
    } as any)
    vi.mocked(prisma.query.update).mockResolvedValue({} as any)

    const req = makePutRequest({ name: 'Apenas nome' })
    await PUT(req, { params: { id: 'query-1' } })

    expect(prisma.queryVersion.create).not.toHaveBeenCalled()
  })

  it('retorna 403 se a query pertence a outro usuário', async () => {
    vi.mocked(prisma.query.findUnique).mockResolvedValue({
      id: 'query-1',
      userId: 'user-outro',
      sql: 'SELECT 1',
    } as any)

    const req = makePutRequest({ sql: 'SELECT 2' })
    const res = await PUT(req, { params: { id: 'query-1' } })

    expect(res.status).toBe(403)
    expect(prisma.query.update).not.toHaveBeenCalled()
  })

  it('retorna 404 se a query não existe', async () => {
    vi.mocked(prisma.query.findUnique).mockResolvedValue(null)
    const req = makePutRequest({ sql: 'SELECT 2' })
    const res = await PUT(req, { params: { id: 'query-inexistente' } })
    expect(res.status).toBe(404)
  })
})
