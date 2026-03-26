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

const basePayloadV3 = {
  version: 3,
  exportedAt: new Date().toISOString(),
  queries: [
    {
      name: 'Query V3',
      sql: 'SELECT 42',
      database: 'postgresql',
      databaseId: 'ctx-old-1',
      isPublic: true,
      status: 'active',
      tags: [],
      deletedAt: null,
    },
  ],
  routines: [
    {
      name: 'Routine V3',
      sql: 'CREATE OR REPLACE FUNCTION routine_v3() RETURNS INT AS $$ SELECT 1 $$ LANGUAGE SQL;',
      type: 'function',
      database: 'postgresql',
      databaseId: 'ctx-old-1',
      isPublic: true,
      status: 'active',
      parameters: [],
      tags: [],
      deletedAt: null,
    },
  ],
  databaseContexts: [
    {
      id: 'ctx-old-1',
      name: 'Contexto legado',
      type: 'postgresql',
      schemaFormat: 'sql',
      schemaDefinition: 'CREATE TABLE users(id INT);',
      isPublic: true,
    },
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
    vi.mocked(prisma.query.findFirst).mockResolvedValue(null)
    vi.mocked(prisma.query.create).mockResolvedValue({} as any)
    vi.mocked(prisma.query.update).mockResolvedValue({} as any)
    vi.mocked(prisma.routine.findFirst).mockResolvedValue(null)
    vi.mocked(prisma.routine.create).mockResolvedValue({} as any)
    vi.mocked(prisma.routine.update).mockResolvedValue({} as any)
    vi.mocked(prisma.databaseContext.findFirst).mockResolvedValue(null)
    vi.mocked(prisma.databaseContext.create).mockResolvedValue({ id: 'ctx-new-1' } as any)
  })

  it('retorna 401 se não há sessão', async () => {
    vi.mocked(auth).mockResolvedValue(null)
    const res = await POST(makeImportRequest(basePayloadV1))
    expect(res.status).toBe(401)
  })

  it('retorna 400 se version não é 1 nem 2 nem 3', async () => {
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

  it('version 3 importa databaseContexts e mapeia databaseId para queries/routines', async () => {
    const res = await POST(makeImportRequest(basePayloadV3))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.queriesImported).toBe(1)
    expect(body.routinesImported).toBe(1)

    expect(prisma.databaseContext.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: 'Contexto legado',
          userId: 'user-1',
          isPublic: true,
        }),
      })
    )

    expect(prisma.query.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 'user-1',
          databaseId: 'ctx-new-1',
          isPublic: true,
        }),
      })
    )

    expect(prisma.routine.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 'user-1',
          databaseId: 'ctx-new-1',
          isPublic: true,
        }),
      })
    )
  })

  it('version 3 faz fallback de databaseId para null quando mapping não existe', async () => {
    const payloadSemMap = {
      ...basePayloadV3,
      queries: [
        {
          ...basePayloadV3.queries[0],
          name: 'Query sem contexto mapeado',
          databaseId: 'ctx-nao-existe',
          isPublic: true,
        },
      ],
      routines: [
        {
          ...basePayloadV3.routines[0],
          name: 'Routine sem contexto mapeado',
          databaseId: 'ctx-nao-existe',
          isPublic: true,
        },
      ],
      databaseContexts: [],
    }

    const res = await POST(makeImportRequest(payloadSemMap))
    expect(res.status).toBe(200)

    expect(prisma.query.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          databaseId: null,
          isPublic: false,
        }),
      })
    )

    expect(prisma.routine.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          databaseId: null,
          isPublic: false,
        }),
      })
    )
  })
})
