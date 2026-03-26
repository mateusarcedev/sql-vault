import Database from 'better-sqlite3'
import { afterAll, describe, expect, it, vi, beforeEach } from 'vitest'
import path from 'node:path'
import { GET as GET_LIST, POST as CREATE } from '@/app/api/database-contexts/route'
import { GET as GET_ID, PUT as UPDATE, DELETE as DELETE_CONTEXT } from '@/app/api/database-contexts/[id]/route'
import prisma from '@/lib/db'
import { auth } from '@/auth'
import { NextRequest } from 'next/server'

const sqlitePath = path.join(process.cwd(), 'prisma', 'dev.db')
const db = new Database(sqlitePath)

function getTableColumns(tableName: string): Array<{ name: string; dflt_value: unknown }> {
  return db.prepare(`PRAGMA table_info('${tableName}')`).all() as Array<{ name: string; dflt_value: unknown }>
}

function hasIndexWithColumns(tableName: string, expectedColumns: string[]): boolean {
  const indexes = db.prepare(`PRAGMA index_list('${tableName}')`).all() as Array<{ name: string }>

  return indexes.some((index) => {
    const columns = db.prepare(`PRAGMA index_info('${index.name}')`).all() as Array<{ name: string }>
    const columnNames = columns.map((column) => column.name)

    return (
      columnNames.length === expectedColumns.length
      && expectedColumns.every((columnName) => columnNames.includes(columnName))
    )
  })
}

describe('Task 1 — Prisma schema/migração para DatabaseContext', () => {
  afterAll(() => {
    db.close()
  })

  it('cria DatabaseContext e adiciona campos/índices em Query e Routine', () => {
    const tableExists = db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'DatabaseContext'")
      .get() as { name: string } | undefined

    expect(tableExists?.name).toBe('DatabaseContext')

    const queryColumns = getTableColumns('Query')
    const routineColumns = getTableColumns('Routine')
    const contextColumns = getTableColumns('DatabaseContext')

    expect(queryColumns.some((column) => column.name === 'databaseId')).toBe(true)
    expect(queryColumns.some((column) => column.name === 'isPublic')).toBe(true)

    expect(routineColumns.some((column) => column.name === 'databaseId')).toBe(true)
    expect(routineColumns.some((column) => column.name === 'isPublic')).toBe(true)

    expect(contextColumns.some((column) => column.name === 'userId')).toBe(true)
    expect(contextColumns.some((column) => column.name === 'isPublic')).toBe(true)

    expect(hasIndexWithColumns('Query', ['userId', 'isPublic'])).toBe(true)
    expect(hasIndexWithColumns('Query', ['databaseId'])).toBe(true)

    expect(hasIndexWithColumns('Routine', ['userId', 'isPublic'])).toBe(true)
    expect(hasIndexWithColumns('Routine', ['databaseId'])).toBe(true)

    expect(hasIndexWithColumns('DatabaseContext', ['userId', 'isPublic'])).toBe(true)
  })
})

describe('Task 2 — Database Context API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // Helper to create mocked requests
  function makePostRequest(body: object): NextRequest {
    return new NextRequest('http://localhost/api/database-contexts', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'content-type': 'application/json' },
    })
  }

  function makePutRequest(body: object, id: string = 'ctx-1'): NextRequest {
    return new NextRequest(`http://localhost/api/database-contexts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
      headers: { 'content-type': 'application/json' },
    })
  }

  function makeGetRequest(url: string = '/api/database-contexts'): NextRequest {
    return new NextRequest(`http://localhost${url}`, {
      method: 'GET',
    })
  }

  // AUTH TESTS
  describe('Authentication', () => {
    it('POST returns 401 when not authenticated', async () => {
      vi.mocked(auth).mockResolvedValue(null)

      const req = makePostRequest({ name: 'Test', type: 'postgresql', schemaFormat: 'sql', schemaDefinition: 'SELECT 1' })
      const res = await CREATE(req)

      expect(res.status).toBe(401)
    })

    it('GET returns 401 when not authenticated', async () => {
      vi.mocked(auth).mockResolvedValue(null)

      const req = makeGetRequest()
      const res = await GET_LIST(req)

      expect(res.status).toBe(401)
    })
  })

  // POST VALIDATION TESTS
  describe('POST /api/database-contexts', () => {
    beforeEach(() => {
      vi.mocked(auth).mockResolvedValue({ user: { id: 'user-1' } } as any)
    })

    it('creates context with valid payload', async () => {
      const contextData = {
        id: 'ctx-1',
        name: 'Production DB',
        type: 'postgresql',
        schemaFormat: 'sql',
        schemaDefinition: 'SELECT * FROM users;',
        isPublic: false,
        userId: 'user-1',
        user: { id: 'user-1', name: 'Test User' },
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      vi.mocked(prisma.databaseContext.create).mockResolvedValue(contextData as any)

      const req = makePostRequest({
        name: 'Production DB',
        type: 'postgresql',
        schemaFormat: 'sql',
        schemaDefinition: 'SELECT * FROM users;',
      })

      const res = await CREATE(req)
      expect(res.status).toBe(201)
    })

    it('rejects missing required fields', async () => {
      const req = makePostRequest({ name: 'Test' })
      const res = await CREATE(req)

      expect(res.status).toBe(400)
      const body = await res.json()
      expect(body.message).toContain('required')
    })

    it('rejects invalid type enum', async () => {
      const req = makePostRequest({
        name: 'Test',
        type: 'invalid_db_type',
        schemaFormat: 'sql',
        schemaDefinition: 'SELECT 1',
      })

      const res = await CREATE(req)
      expect(res.status).toBe(400)
      const body = await res.json()
      expect(body.message).toContain('Invalid type')
    })

    it('rejects invalid schemaFormat enum', async () => {
      const req = makePostRequest({
        name: 'Test',
        type: 'postgresql',
        schemaFormat: 'invalid_format',
        schemaDefinition: 'SELECT 1',
      })

      const res = await CREATE(req)
      expect(res.status).toBe(400)
      const body = await res.json()
      expect(body.message).toContain('Invalid schemaFormat')
    })

    it('enforces schemaDefinition max length (10000)', async () => {
      const longSchema = 'a'.repeat(10001)
      const req = makePostRequest({
        name: 'Test',
        type: 'postgresql',
        schemaFormat: 'sql',
        schemaDefinition: longSchema,
      })

      const res = await CREATE(req)
      expect(res.status).toBe(400)
      const body = await res.json()
      expect(body.message).toContain('must not exceed')
    })
  })

  // GET /list TESTS
  describe('GET /api/database-contexts', () => {
    beforeEach(() => {
      vi.mocked(auth).mockResolvedValue({ user: { id: 'user-1' } } as any)
    })

    it('returns only owner contexts on scope=mine', async () => {
      const contexts = [
        {
          id: 'ctx-1',
          name: 'My DB',
          userId: 'user-1',
          isPublic: false,
          user: { id: 'user-1', name: 'User 1' },
        },
      ]

      vi.mocked(prisma.databaseContext.findMany).mockResolvedValue(contexts as any)

      const req = makeGetRequest('/api/database-contexts?scope=mine')
      const res = await GET_LIST(req)

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body[0].schemaDefinition).toBeUndefined()
      expect(prisma.databaseContext.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-1' },
        })
      )
    })

    it('returns public contexts on scope=public', async () => {
      const contexts = [
        {
          id: 'ctx-2',
          name: 'Public DB',
          userId: 'user-2',
          isPublic: true,
          user: { id: 'user-2', name: 'User 2' },
        },
      ]

      vi.mocked(prisma.databaseContext.findMany).mockResolvedValue(contexts as any)

      const req = makeGetRequest('/api/database-contexts?scope=public')
      const res = await GET_LIST(req)

      expect(res.status).toBe(200)
      expect(prisma.databaseContext.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { isPublic: true },
        })
      )
    })

    it('returns owner + public contexts on scope=all', async () => {
      const contexts = [
        {
          id: 'ctx-1',
          name: 'My DB',
          userId: 'user-1',
          isPublic: false,
          user: { id: 'user-1', name: 'User 1' },
        },
        {
          id: 'ctx-2',
          name: 'Public DB',
          userId: 'user-2',
          isPublic: true,
          user: { id: 'user-2', name: 'User 2' },
        },
      ]

      vi.mocked(prisma.databaseContext.findMany).mockResolvedValue(contexts as any)

      const req = makeGetRequest('/api/database-contexts?scope=all')
      const res = await GET_LIST(req)

      expect(res.status).toBe(200)
      expect(prisma.databaseContext.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            OR: [
              { userId: 'user-1' },
              { isPublic: true },
            ],
          },
        })
      )
    })

    it('defaults to scope=mine', async () => {
      vi.mocked(prisma.databaseContext.findMany).mockResolvedValue([])

      const req = makeGetRequest('/api/database-contexts')
      await GET_LIST(req)

      expect(prisma.databaseContext.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-1' },
        })
      )
    })
  })

  // GET /[id] TESTS
  describe('GET /api/database-contexts/[id]', () => {
    beforeEach(() => {
      vi.mocked(auth).mockResolvedValue({ user: { id: 'user-1' } } as any)
    })

    it('returns context for owner', async () => {
      const context = {
        id: 'ctx-1',
        name: 'My DB',
        userId: 'user-1',
        isPublic: false,
        user: { id: 'user-1', name: 'User 1' },
      }

      vi.mocked(prisma.databaseContext.findUnique).mockResolvedValue(context as any)

      const req = makeGetRequest('/api/database-contexts/ctx-1')
      const res = await GET_ID(req, { params: { id: 'ctx-1' } })

      expect(res.status).toBe(200)
    })

    it('returns public context for other users', async () => {
      const context = {
        id: 'ctx-2',
        name: 'Public DB',
        userId: 'user-2',
        isPublic: true,
        user: { id: 'user-2', name: 'User 2' },
      }

      vi.mocked(prisma.databaseContext.findUnique).mockResolvedValue(context as any)

      const req = makeGetRequest('/api/database-contexts/ctx-2')
      const res = await GET_ID(req, { params: { id: 'ctx-2' } })

      expect(res.status).toBe(200)
    })

    it('returns 404 for inaccessible private context', async () => {
      const context = {
        id: 'ctx-2',
        name: 'Private DB',
        userId: 'user-2',
        isPublic: false,
        user: { id: 'user-2', name: 'User 2' },
      }

      vi.mocked(prisma.databaseContext.findUnique).mockResolvedValue(context as any)

      const req = makeGetRequest('/api/database-contexts/ctx-2')
      const res = await GET_ID(req, { params: { id: 'ctx-2' } })

      expect(res.status).toBe(404)
    })

    it('returns 404 for missing context', async () => {
      vi.mocked(prisma.databaseContext.findUnique).mockResolvedValue(null)

      const req = makeGetRequest('/api/database-contexts/missing')
      const res = await GET_ID(req, { params: { id: 'missing' } })

      expect(res.status).toBe(404)
    })
  })

  // PUT TESTS
  describe('PUT /api/database-contexts/[id]', () => {
    beforeEach(() => {
      vi.mocked(auth).mockResolvedValue({ user: { id: 'user-1' } } as any)
    })

    it('updates context for owner', async () => {
      const existing = {
        id: 'ctx-1',
        name: 'My DB',
        userId: 'user-1',
        isPublic: false,
      }

      const updated = {
        ...existing,
        name: 'Updated DB',
        user: { id: 'user-1', name: 'User 1' },
      }

      vi.mocked(prisma.databaseContext.findUnique).mockResolvedValue(existing as any)
      vi.mocked(prisma.databaseContext.update).mockResolvedValue(updated as any)

      const req = makePutRequest({ name: 'Updated DB' })
      const res = await UPDATE(req, { params: { id: 'ctx-1' } })

      expect(res.status).toBe(200)
      expect(prisma.databaseContext.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { name: 'Updated DB' },
        })
      )
    })

    it('enforces ownership on update', async () => {
      const existing = {
        id: 'ctx-2',
        name: 'Other User DB',
        userId: 'user-2',
        isPublic: false,
      }

      vi.mocked(prisma.databaseContext.findUnique).mockResolvedValue(existing as any)

      const req = makePutRequest({ name: 'Hijacked' }, 'ctx-2')
      const res = await UPDATE(req, { params: { id: 'ctx-2' } })

      expect(res.status).toBe(403)
      expect(prisma.databaseContext.update).not.toHaveBeenCalled()
    })

    it('rejects invalid type on update', async () => {
      const existing = {
        id: 'ctx-1',
        name: 'My DB',
        userId: 'user-1',
      }

      vi.mocked(prisma.databaseContext.findUnique).mockResolvedValue(existing as any)

      const req = makePutRequest({ type: 'invalid_type' })
      const res = await UPDATE(req, { params: { id: 'ctx-1' } })

      expect(res.status).toBe(400)
      expect(prisma.databaseContext.update).not.toHaveBeenCalled()
    })

    it('enforces schemaDefinition max length on update', async () => {
      const existing = {
        id: 'ctx-1',
        name: 'My DB',
        userId: 'user-1',
      }

      vi.mocked(prisma.databaseContext.findUnique).mockResolvedValue(existing as any)

      const longSchema = 'a'.repeat(10001)
      const req = makePutRequest({ schemaDefinition: longSchema })
      const res = await UPDATE(req, { params: { id: 'ctx-1' } })

      expect(res.status).toBe(400)
      expect(prisma.databaseContext.update).not.toHaveBeenCalled()
    })
  })

  // DELETE TESTS
  describe('DELETE /api/database-contexts/[id]', () => {
    beforeEach(() => {
      vi.mocked(auth).mockResolvedValue({ user: { id: 'user-1' } } as any)
    })

    it('nullifies linked Query records atomically', async () => {
      const existing = {
        id: 'ctx-1',
        userId: 'user-1',
      }

      vi.mocked(prisma.databaseContext.findUnique).mockResolvedValue(existing as any)
      vi.mocked(prisma.$transaction).mockResolvedValue([{}, {}, {}])

      const req = makeGetRequest('/api/database-contexts/ctx-1')
      const res = await DELETE_CONTEXT(req, { params: { id: 'ctx-1' } })

      expect(res.status).toBe(204)
      expect(prisma.$transaction).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            // query updateMany
          }),
          expect.objectContaining({
            // routine updateMany
          }),
          expect.objectContaining({
            // context delete
          }),
        ])
      )
    })

    it('enforces ownership on delete', async () => {
      const existing = {
        id: 'ctx-2',
        userId: 'user-2',
      }

      vi.mocked(prisma.databaseContext.findUnique).mockResolvedValue(existing as any)

      const req = makeGetRequest('/api/database-contexts/ctx-2')
      const res = await DELETE_CONTEXT(req, { params: { id: 'ctx-2' } })

      expect(res.status).toBe(403)
      expect(prisma.$transaction).not.toHaveBeenCalled()
    })

    it('returns 404 for missing context', async () => {
      vi.mocked(prisma.databaseContext.findUnique).mockResolvedValue(null)

      const req = makeGetRequest('/api/database-contexts/missing')
      const res = await DELETE_CONTEXT(req, { params: { id: 'missing' } })

      expect(res.status).toBe(404)
    })
  })
})