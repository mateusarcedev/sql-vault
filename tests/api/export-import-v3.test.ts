import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { GET as EXPORT_GET } from '@/app/api/export/route'
import { POST as IMPORT_POST } from '@/app/api/import/route'
import prisma from '@/lib/db'
import { auth } from '@/auth'

function makeExportRequest(): NextRequest {
  return new NextRequest('http://localhost/api/export', { method: 'GET' })
}

function makeImportRequest(payload: object): NextRequest {
  return new NextRequest('http://localhost/api/import', {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: { 'content-type': 'application/json' },
  })
}

describe('GET /api/export + POST /api/import (v3 roundtrip)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('exporta em v3 e importa preservando ownership com mapeamento de contextos', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'user-export' } } as any)

    vi.mocked(prisma.query.findMany).mockResolvedValue([
      {
        id: 'query-1',
        title: 'Query Exportada',
        description: null,
        sql: 'SELECT 1',
        database: 'postgresql',
        databaseId: 'ctx-old-1',
        isPublic: true,
        isFavorite: false,
        copyCount: 0,
        status: 'active',
        userId: 'user-export',
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        tags: [],
        versions: [],
      },
    ] as any)

    vi.mocked(prisma.tag.findMany).mockResolvedValue([
      { id: 'tag-1', name: 'tag-1', color: '#3B82F6', userId: 'user-export' },
    ] as any)

    vi.mocked(prisma.routine.findMany).mockResolvedValue([
      {
        id: 'routine-1',
        name: 'Routine Exportada',
        description: null,
        type: 'function',
        database: 'postgresql',
        databaseId: 'ctx-old-1',
        isPublic: true,
        sql: 'CREATE OR REPLACE FUNCTION x() RETURNS INT AS $$ SELECT 1 $$ LANGUAGE SQL;',
        parameters: '[]',
        returnType: 'int',
        status: 'active',
        isFavorite: false,
        copyCount: 0,
        userId: 'user-export',
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        tags: [],
        versions: [],
      },
    ] as any)

    vi.mocked((prisma as any).databaseContext.findMany).mockResolvedValue([
      {
        id: 'ctx-old-1',
        name: 'Contexto Exportado',
        description: 'desc',
        type: 'postgresql',
        schemaFormat: 'sql',
        schemaDefinition: 'CREATE TABLE users(id INT);',
        isPublic: true,
        userId: 'user-export',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ] as any)

    const exportRes = await EXPORT_GET(makeExportRequest())
    expect(exportRes.status).toBe(200)

    const exportPayload = JSON.parse(await exportRes.text())
    expect(exportPayload.version).toBe(3)
    expect(exportPayload.databaseContexts).toHaveLength(1)

    vi.mocked(auth).mockResolvedValue({ user: { id: 'user-import' } } as any)

    vi.mocked(prisma.tag.findUnique).mockResolvedValue(null)
    vi.mocked(prisma.tag.create).mockResolvedValue({ id: 'tag-import-1' } as any)

    vi.mocked((prisma as any).databaseContext.findFirst).mockResolvedValue(null)
    vi.mocked((prisma as any).databaseContext.create).mockResolvedValue({ id: 'ctx-new-1' } as any)

    vi.mocked(prisma.query.findFirst).mockResolvedValue(null)
    vi.mocked(prisma.query.create).mockResolvedValue({ id: 'query-import-1' } as any)

    vi.mocked(prisma.routine.findFirst).mockResolvedValue(null)
    vi.mocked(prisma.routine.create).mockResolvedValue({ id: 'routine-import-1' } as any)

    const importRes = await IMPORT_POST(makeImportRequest(exportPayload))
    expect(importRes.status).toBe(200)

    const importBody = await importRes.json()
    expect(importBody.queriesImported).toBe(1)
    expect(importBody.routinesImported).toBe(1)

    expect(prisma.query.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 'user-import',
          databaseId: 'ctx-new-1',
          isPublic: true,
        }),
      })
    )

    expect(prisma.routine.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 'user-import',
          databaseId: 'ctx-new-1',
          isPublic: true,
        }),
      })
    )
  })
})
