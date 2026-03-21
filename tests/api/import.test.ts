import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '@/app/api/import/route'
import prisma from '@/lib/db'
import { auth } from '@/auth'
import { NextRequest } from 'next/server'

function makeImportRequest(payload: object): NextRequest {
  return new NextRequest('http://localhost/api/import', {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: { 'content-type': 'application/json' },
  })
}

const basePayloadV1 = {
  version: 1,
  exportedAt: new Date().toISOString(),
  queries: [
    { name: 'Query A', sql: 'SELECT 1', database: 'postgresql',
      status: 'active', tags: [], deletedAt: null },
  ],
  tags: [{ name: 'tag-1', color: '#3B82F6' }],
}

describe('POST /api/import', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(auth).mockResolvedValue({ user: { id: 'user-1' } } as any)
    vi.mocked(prisma.tag.findUnique).mockResolvedValue(null)
    vi.mocked(prisma.tag.create).mockResolvedValue({ id: 'tag-novo' } as any)
    vi.mocked(prisma.query.findUnique).mockResolvedValue(null)
    vi.mocked(prisma.query.create).mockResolvedValue({} as any)
    vi.mocked(prisma.query.update).mockResolvedValue({} as any)
  })

  it('retorna 401 se não há sessão', async () => {
    vi.mocked(auth).mockResolvedValue(null)
    const res = await POST(makeImportRequest(basePayloadV1))
    expect(res.status).toBe(401)
  })

  it('retorna 400 se version não é 1 nem 2', async () => {
    const res = await POST(makeImportRequest({ ...basePayloadV1, version: 99 }))
    expect(res.status).toBe(400)
  })

  it('importa queries de payload version 1', async () => {
    const res = await POST(makeImportRequest(basePayloadV1))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.queriesImported).toBe(1)
  })

  it('não importa queries com deletedAt preenchido', async () => {
    const payload = {
      ...basePayloadV1,
      queries: [
        { ...basePayloadV1.queries[0], deletedAt: new Date().toISOString() },
      ],
    }
    const res = await POST(makeImportRequest(payload))
    const body = await res.json()
    expect(body.queriesImported).toBe(0)
    expect(prisma.query.create).not.toHaveBeenCalled()
  })

  it('faz upsert por nome — atualiza se query já existe', async () => {
    vi.mocked(prisma.query.findFirst).mockResolvedValue({
      id: 'query-existente',
      title: 'Query A',
      userId: 'user-1',
    } as any)
    const res = await POST(makeImportRequest(basePayloadV1))
    const body = await res.json()
    expect(prisma.query.update).toHaveBeenCalled()
    expect(prisma.query.create).not.toHaveBeenCalled()
    expect(body.queriesSkipped).toBe(1)
  })

  it('não duplica tags já existentes', async () => {
    vi.mocked(prisma.tag.findUnique).mockResolvedValue({
      id: 'tag-existente',
      name: 'tag-1',
      userId: 'user-1',
    } as any)
    await POST(makeImportRequest(basePayloadV1))
    expect(prisma.tag.create).not.toHaveBeenCalled()
  })

  it('version 2 processa routines além de queries', async () => {
    vi.mocked(prisma.routine.findFirst).mockResolvedValue(null)
    vi.mocked(prisma.routine.create).mockResolvedValue({} as any)

    const payloadV2 = {
      ...basePayloadV1,
      version: 2,
      routines: [
        { name: 'Routine A', sql: 'CREATE OR REPLACE FUNCTION ...',
          type: 'function', database: 'postgresql', status: 'active',
          parameters: [], tags: [], deletedAt: null },
      ],
    }
    const res = await POST(makeImportRequest(payloadV2))
    const body = await res.json()
    expect(body.routinesImported).toBe(1)
  })
})
