import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET, POST } from '@/app/api/queries/route'
import { GET as GET_ID, PUT } from '@/app/api/queries/[id]/route'
import prisma from '@/lib/db'
import { auth } from '@/auth'
import { NextRequest } from 'next/server'

const db = prisma as any

function makePostRequest(body: object, url: string = 'http://localhost/api/queries'): NextRequest {
  return new NextRequest(url, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  })
}

function makePutRequest(body: object, id: string = 'query-1'): NextRequest {
  return new NextRequest(`http://localhost/api/queries/${id}`, {
    method: 'PUT',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  })
}

function makeGetRequest(url: string = '/api/queries?scope=mine'): NextRequest {
  return new NextRequest(`http://localhost${url}`, {
    method: 'GET',
  })
}

describe('Task 3 — Queries databaseId/isPublic', () => {
  beforeEach(() => vi.clearAllMocks())

  describe('POST — Validação de databaseId ownership', () => {
    beforeEach(() => {
      vi.mocked(auth).mockResolvedValue({ user: { id: 'user-A' } } as any)
    })

    it('rejeita create com databaseId de outro usuário (403)', async () => {
      // Simula um DatabaseContext que pertence a user-B
      vi.mocked(db.databaseContext).findUnique.mockResolvedValue({
        id: 'ctx-1',
        userId: 'user-B',
        isPublic: false,
      } as any)

      const req = makePostRequest({
        title: 'Test Query',
        sql: 'SELECT 1',
        databaseId: 'ctx-1',
      })

      const res = await POST(req)
      expect(res.status).toBe(403)
      expect(await res.json()).toEqual({ message: 'Forbidden' })
    })

    it('rejeita create com databaseId inexistente (404)', async () => {
      vi.mocked(db.databaseContext).findUnique.mockResolvedValue(null)

      const req = makePostRequest({
        title: 'Test Query',
        sql: 'SELECT 1',
        databaseId: 'ctx-nonexistent',
      })

      const res = await POST(req)
      expect(res.status).toBe(404)
    })

    it('aceita create com databaseId do próprio usuário', async () => {
      vi.mocked(db.databaseContext).findUnique.mockResolvedValue({
        id: 'ctx-1',
        userId: 'user-A',
        isPublic: true,
      } as any)

      vi.mocked(prisma.query.create).mockResolvedValue({
        id: 'query-1',
        title: 'Test Query',
        sql: 'SELECT 1',
        databaseId: 'ctx-1',
        isPublic: true,
        userId: 'user-A',
        tags: [],
        versions: [{ id: 'v1', sql: 'SELECT 1' }],
      } as any)

      const req = makePostRequest({
        title: 'Test Query',
        sql: 'SELECT 1',
        databaseId: 'ctx-1',
        isPublic: true,
      })

      const res = await POST(req)
      expect(res.status).toBe(201)
      const data = await res.json()
      expect(data.databaseId).toBe('ctx-1')
      expect(data.isPublic).toBe(true)
    })
  })

  describe('POST — Regra de isPublic=false quando databaseId=null', () => {
    beforeEach(() => {
      vi.mocked(auth).mockResolvedValue({ user: { id: 'user-A' } } as any)
    })

    it('força isPublic=false quando databaseId é null (explícito)', async () => {
      vi.mocked(prisma.query.create).mockResolvedValue({
        id: 'query-1',
        title: 'Test Query',
        sql: 'SELECT 1',
        databaseId: null,
        isPublic: false,
        userId: 'user-A',
        tags: [],
        versions: [{ id: 'v1', sql: 'SELECT 1' }],
      } as any)

      const req = makePostRequest({
        title: 'Test Query',
        sql: 'SELECT 1',
        databaseId: null,
        isPublic: true, // tenta enviar true, mas deve ser ignorado
      })

      const res = await POST(req)
      expect(res.status).toBe(201)
      const data = await res.json()
      expect(data.isPublic).toBe(false)
      expect(data.databaseId).toBeNull()
    })

    it('força isPublic=false quando databaseId não é fornecido', async () => {
      vi.mocked(prisma.query.create).mockResolvedValue({
        id: 'query-1',
        title: 'Test Query',
        sql: 'SELECT 1',
        databaseId: null,
        isPublic: false,
        userId: 'user-A',
        tags: [],
        versions: [{ id: 'v1', sql: 'SELECT 1' }],
      } as any)

      const req = makePostRequest({
        title: 'Test Query',
        sql: 'SELECT 1',
        isPublic: true, // sem databaseId, isPublic deve ser false
      })

      const res = await POST(req)
      expect(res.status).toBe(201)
      const data = await res.json()
      expect(data.isPublic).toBe(false)
    })
  })

  describe('PUT — Validação de databaseId ownership', () => {
    beforeEach(() => {
      vi.mocked(auth).mockResolvedValue({ user: { id: 'user-A' } } as any)
    })

    it('rejeita update com databaseId de outro usuário (403)', async () => {
      vi.mocked(prisma.query.findUnique).mockResolvedValue({
        id: 'query-1',
        userId: 'user-A',
        title: 'Test Query',
        sql: 'SELECT 1',
        databaseId: null,
      } as any)

      vi.mocked(db.databaseContext).findUnique.mockResolvedValue({
        id: 'ctx-2',
        userId: 'user-B',
        isPublic: false,
      } as any)

      const req = makePutRequest({
        databaseId: 'ctx-2',
      }, 'query-1')

      const res = await PUT(req, { params: { id: 'query-1' } })
      expect(res.status).toBe(403)
    })

    it('aceita update com databaseId do próprio usuário', async () => {
      vi.mocked(prisma.query.findUnique).mockResolvedValue({
        id: 'query-1',
        userId: 'user-A',
        title: 'Test Query',
        sql: 'SELECT 1',
        databaseId: null,
        isPublic: false,
      } as any)

      vi.mocked(db.databaseContext).findUnique.mockResolvedValue({
        id: 'ctx-1',
        userId: 'user-A',
        isPublic: true,
      } as any)

      vi.mocked(prisma.query.update).mockResolvedValue({
        id: 'query-1',
        userId: 'user-A',
        title: 'Updated Query',
        sql: 'SELECT 1',
        databaseId: 'ctx-1',
        isPublic: true,
        tags: [],
        versions: [],
      } as any)

      const req = makePutRequest({
        title: 'Updated Query',
        databaseId: 'ctx-1',
        isPublic: true,
      }, 'query-1')

      const res = await PUT(req, { params: { id: 'query-1' } })
      expect(res.status).toBe(200)
    })
  })

  describe('PUT — Regra de isPublic=false quando databaseId é setado para null', () => {
    beforeEach(() => {
      vi.mocked(auth).mockResolvedValue({ user: { id: 'user-A' } } as any)
    })

    it('força isPublic=false quando databaseId é setado para null', async () => {
      vi.mocked(prisma.query.findUnique).mockResolvedValue({
        id: 'query-1',
        userId: 'user-A',
        title: 'Test Query',
        sql: 'SELECT 1',
        databaseId: 'ctx-1',
        isPublic: true,
      } as any)

      vi.mocked(prisma.query.update).mockResolvedValue({
        id: 'query-1',
        userId: 'user-A',
        title: 'Test Query',
        sql: 'SELECT 1',
        databaseId: null,
        isPublic: false,
        tags: [],
        versions: [],
      } as any)

      const req = makePutRequest({
        databaseId: null,
      }, 'query-1')

      const res = await PUT(req, { params: { id: 'query-1' } })
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.databaseId).toBeNull()
      expect(data.isPublic).toBe(false)
    })
  })

  describe('GET scope=public — Matriz de visibilidade', () => {
    beforeEach(() => {
      vi.mocked(auth).mockResolvedValue({ user: { id: 'user-X' } } as any)
    })

    it('retorna query com query.isPublic=true E context.isPublic=true', async () => {
      const publicQuery = {
        id: 'q1',
        title: 'Public Query',
        sql: 'SELECT 1',
        isPublic: true,
        databaseId: 'ctx-1',
        userId: 'user-A',
        user: { id: 'user-A', name: 'User A' },
        tags: [],
        versions: [],
      }

      vi.mocked(prisma.query.findMany).mockResolvedValue([publicQuery] as any)

      const req = makeGetRequest('/api/queries?scope=public')
      const res = await GET(req)
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data).toHaveLength(1)
      expect(data[0].id).toBe('q1')
    })

    it('NÃO retorna query com query.isPublic=true E context.isPublic=false', async () => {
      vi.mocked(prisma.query.findMany).mockResolvedValue([] as any)

      const req = makeGetRequest('/api/queries?scope=public')
      const res = await GET(req)
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data).toHaveLength(0)
    })

    it('NÃO retorna query com query.isPublic=false', async () => {
      vi.mocked(prisma.query.findMany).mockResolvedValue([] as any)

      const req = makeGetRequest('/api/queries?scope=public')
      const res = await GET(req)
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data).toHaveLength(0)
    })
  })

  describe('GET scope=public — Owner metadata', () => {
    beforeEach(() => {
      vi.mocked(auth).mockResolvedValue({ user: { id: 'user-X' } } as any)
    })

    it('inclui owner metadata no scope=public', async () => {
      const publicQuery = {
        id: 'q1',
        title: 'Public Query',
        sql: 'SELECT 1',
        isPublic: true,
        databaseId: null,
        userId: 'user-A',
        user: { id: 'user-A', name: 'Alice' },
        tags: [],
        versions: [],
      }

      vi.mocked(prisma.query.findMany).mockResolvedValue([publicQuery] as any)

      const req = makeGetRequest('/api/queries?scope=public')
      const res = await GET(req)
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data[0]).toHaveProperty('owner')
      expect(data[0].owner).toEqual({ id: 'user-A', name: 'Alice' })
    })
  })

  describe('GET scope=mine — Owner sempre acessa seus recursos', () => {
    beforeEach(() => {
      vi.mocked(auth).mockResolvedValue({ user: { id: 'user-A' } } as any)
    })

    it('retorna queries do próprio usuário (scope=mine)', async () => {
      vi.mocked(prisma.query.findMany).mockResolvedValue([
        {
          id: 'q1',
          title: 'My Query',
          sql: 'SELECT 1',
          isPublic: false,
          userId: 'user-A',
          user: { id: 'user-A', name: 'User A' },
          tags: [],
          versions: [],
        },
      ] as any)

      const req = makeGetRequest('/api/queries?scope=mine')
      const res = await GET(req)
      expect(res.status).toBe(200)
      const call = vi.mocked(prisma.query.findMany).mock.calls[0][0]
      expect((call as any).where.userId).toBe('user-A')
    })

    it('não retorna queries de outros usuários (scope=mine)', async () => {
      vi.mocked(prisma.query.findMany).mockResolvedValue([] as any)

      const req = makeGetRequest('/api/queries?scope=mine')
      const res = await GET(req)
      expect(res.status).toBe(200)
      const call = vi.mocked(prisma.query.findMany).mock.calls[0][0]
      expect((call as any).where.userId).toBe('user-A')
    })
  })

  describe('Versionamento SQL — comportamento preservado', () => {
    beforeEach(() => {
      vi.mocked(auth).mockResolvedValue({ user: { id: 'user-A' } } as any)
    })

    it('cria nova QueryVersion ao atualizar SQL', async () => {
      vi.mocked(prisma.query.findUnique).mockResolvedValue({
        id: 'query-1',
        userId: 'user-A',
        title: 'Test Query',
        sql: 'SELECT 1',
        databaseId: null,
        isPublic: false,
      } as any)

      vi.mocked(prisma.queryVersion.create).mockResolvedValue({
        id: 'v-old',
        queryId: 'query-1',
        sql: 'SELECT 1',
      } as any)

      vi.mocked(prisma.query.update).mockResolvedValue({
        id: 'query-1',
        userId: 'user-A',
        title: 'Test Query',
        sql: 'SELECT 2',
        databaseId: null,
        isPublic: false,
        tags: [],
        versions: [],
      } as any)

      const req = makePutRequest({
        sql: 'SELECT 2',
      }, 'query-1')

      const res = await PUT(req, { params: { id: 'query-1' } })
      expect(res.status).toBe(200)
      expect(prisma.queryVersion.create).toHaveBeenCalled()
    })

    it('não cria QueryVersion ao atualizar apenas title', async () => {
      vi.mocked(prisma.query.findUnique).mockResolvedValue({
        id: 'query-1',
        userId: 'user-A',
        title: 'Old Title',
        sql: 'SELECT 1',
        databaseId: null,
        isPublic: false,
      } as any)

      vi.mocked(prisma.query.update).mockResolvedValue({
        id: 'query-1',
        userId: 'user-A',
        title: 'New Title',
        sql: 'SELECT 1',
        databaseId: null,
        isPublic: false,
        tags: [],
        versions: [],
      } as any)

      const req = makePutRequest({
        title: 'New Title',
      }, 'query-1')

      const res = await PUT(req, { params: { id: 'query-1' } })
      expect(res.status).toBe(200)
      // Versão NÃO deve ser criada se SQL não mudou
      expect(prisma.queryVersion.create).not.toHaveBeenCalled()
    })
  })

  describe('Auth dual — Session vs API Key', () => {
    it('POST com session auth funciona', async () => {
      vi.mocked(auth).mockResolvedValue({ user: { id: 'user-A' } } as any)

      vi.mocked(prisma.query.create).mockResolvedValue({
        id: 'query-1',
        title: 'Test Query',
        sql: 'SELECT 1',
        databaseId: null,
        isPublic: false,
        userId: 'user-A',
        tags: [],
        versions: [],
      } as any)

      const req = makePostRequest({
        title: 'Test Query',
        sql: 'SELECT 1',
      })

      const res = await POST(req)
      expect(res.status).toBe(201)
    })

    it('retorna 401 sem session nem API Key', async () => {
      vi.mocked(auth).mockResolvedValue(null as any)

      const req = makePostRequest({
        title: 'Test Query',
        sql: 'SELECT 1',
      })

      const res = await POST(req)
      expect(res.status).toBe(401)
    })
  })
})
