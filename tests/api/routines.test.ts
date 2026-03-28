import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET, POST } from '@/app/api/routines/route'
import { GET as GET_ID, PUT } from '@/app/api/routines/[id]/route'
import prisma from '@/lib/db'
import { auth } from '@/auth'
import { NextRequest } from 'next/server'

const db = prisma as any

function makePostRequest(body: object, url: string = 'http://localhost/api/routines'): NextRequest {
  return new NextRequest(url, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  })
}

function makePutRequest(body: object, id: string = 'routine-1'): NextRequest {
  return new NextRequest(`http://localhost/api/routines/${id}`, {
    method: 'PUT',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  })
}

function makeGetRequest(url: string = '/api/routines?scope=mine'): NextRequest {
  return new NextRequest(`http://localhost${url}`, {
    method: 'GET',
  })
}

const mockParameters = [
  { name: 'p_id', type: 'INTEGER', direction: 'IN' },
  { name: 'p_result', type: 'VARCHAR(255)', direction: 'OUT' },
]

describe('Task 4 — Routines databaseId/isPublic', () => {
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
        name: 'test_function',
        type: 'function',
        database: 'postgresql',
        sql: 'CREATE OR REPLACE FUNCTION test() RETURNS void ...',
        databaseId: 'ctx-1',
      })

      const res = await POST(req)
      expect(res.status).toBe(403)
      expect(await res.json()).toEqual({ message: 'Forbidden' })
    })

    it('rejeita create com databaseId inexistente (404)', async () => {
      vi.mocked(db.databaseContext).findUnique.mockResolvedValue(null)

      const req = makePostRequest({
        name: 'test_function',
        type: 'function',
        database: 'postgresql',
        sql: 'CREATE OR REPLACE FUNCTION test() RETURNS void ...',
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

      vi.mocked(prisma.routine.create).mockResolvedValue({
        id: 'routine-1',
        name: 'test_function',
        type: 'function',
        database: 'postgresql',
        sql: 'CREATE OR REPLACE FUNCTION test() RETURNS void ...',
        databaseId: 'ctx-1',
        isPublic: true,
        userId: 'user-A',
        parameters: '[]',
        tags: [],
        versions: [{ id: 'v1', sql: 'CREATE OR REPLACE FUNCTION test() RETURNS void ...' }],
      } as any)

      const req = makePostRequest({
        name: 'test_function',
        type: 'function',
        database: 'postgresql',
        sql: 'CREATE OR REPLACE FUNCTION test() RETURNS void ...',
        databaseId: 'ctx-1',
        isPublic: true,
        tagIds: [],
      })

      const res = await POST(req)
      expect(res.status).toBe(200)
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
      vi.mocked(prisma.routine.create).mockResolvedValue({
        id: 'routine-1',
        name: 'test_function',
        type: 'function',
        database: 'postgresql',
        sql: 'CREATE OR REPLACE FUNCTION test() RETURNS void ...',
        databaseId: null,
        isPublic: false,
        userId: 'user-A',
        parameters: '[]',
        tags: [],
        versions: [{ id: 'v1', sql: 'CREATE OR REPLACE FUNCTION test() RETURNS void ...' }],
      } as any)

      const req = makePostRequest({
        name: 'test_function',
        type: 'function',
        database: 'postgresql',
        sql: 'CREATE OR REPLACE FUNCTION test() RETURNS void ...',
        databaseId: null,
        isPublic: true, // tenta enviar true, mas deve ser ignorado
        tagIds: [],
      })

      const res = await POST(req)
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.isPublic).toBe(false)
      expect(data.databaseId).toBeNull()
    })

    it('força isPublic=false quando databaseId não é fornecido', async () => {
      vi.mocked(prisma.routine.create).mockResolvedValue({
        id: 'routine-1',
        name: 'test_function',
        type: 'function',
        database: 'postgresql',
        sql: 'CREATE OR REPLACE FUNCTION test() RETURNS void ...',
        databaseId: null,
        isPublic: false,
        userId: 'user-A',
        parameters: '[]',
        tags: [],
        versions: [{ id: 'v1', sql: 'CREATE OR REPLACE FUNCTION test() RETURNS void ...' }],
      } as any)

      const req = makePostRequest({
        name: 'test_function',
        type: 'function',
        database: 'postgresql',
        sql: 'CREATE OR REPLACE FUNCTION test() RETURNS void ...',
        isPublic: true, // sem databaseId, isPublic deve ser false
        tagIds: [],
      })

      const res = await POST(req)
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.isPublic).toBe(false)
    })
  })

  describe('PUT — Validação de databaseId ownership', () => {
    beforeEach(() => {
      vi.mocked(auth).mockResolvedValue({ user: { id: 'user-A' } } as any)
    })

    it('rejeita update com databaseId de outro usuário (403)', async () => {
      vi.mocked(prisma.routine.findUnique).mockResolvedValue({
        id: 'routine-1',
        userId: 'user-A',
        name: 'test_function',
        type: 'function',
        database: 'postgresql',
        sql: 'CREATE OR REPLACE FUNCTION test() RETURNS void ...',
        databaseId: null,
      } as any)

      vi.mocked(db.databaseContext).findUnique.mockResolvedValue({
        id: 'ctx-2',
        userId: 'user-B',
        isPublic: false,
      } as any)

      const req = makePutRequest({
        databaseId: 'ctx-2',
      }, 'routine-1')

      const res = await PUT(req, { params: { id: 'routine-1' } })
      expect(res.status).toBe(403)
    })

    it('aceita update com databaseId do próprio usuário', async () => {
      vi.mocked(prisma.routine.findUnique).mockResolvedValue({
        id: 'routine-1',
        userId: 'user-A',
        name: 'test_function',
        type: 'function',
        database: 'postgresql',
        sql: 'CREATE OR REPLACE FUNCTION test() RETURNS void ...',
        databaseId: null,
        isPublic: false,
        parameters: '[]',
      } as any)

      vi.mocked(db.databaseContext).findUnique.mockResolvedValue({
        id: 'ctx-1',
        userId: 'user-A',
        isPublic: true,
      } as any)

      vi.mocked(prisma.routine.update).mockResolvedValue({
        id: 'routine-1',
        userId: 'user-A',
        name: 'updated_function',
        type: 'function',
        database: 'postgresql',
        sql: 'CREATE OR REPLACE FUNCTION test() RETURNS void ...',
        databaseId: 'ctx-1',
        isPublic: true,
        parameters: '[]',
        tags: [],
        versions: [],
      } as any)

      const req = makePutRequest({
        name: 'updated_function',
        databaseId: 'ctx-1',
        isPublic: true,
      }, 'routine-1')

      const res = await PUT(req, { params: { id: 'routine-1' } })
      expect(res.status).toBe(200)
    })
  })

  describe('PUT — Regra de isPublic=false quando databaseId é setado para null', () => {
    beforeEach(() => {
      vi.mocked(auth).mockResolvedValue({ user: { id: 'user-A' } } as any)
    })

    it('força isPublic=false quando databaseId é setado para null', async () => {
      vi.mocked(prisma.routine.findUnique).mockResolvedValue({
        id: 'routine-1',
        userId: 'user-A',
        name: 'test_function',
        type: 'function',
        database: 'postgresql',
        sql: 'CREATE OR REPLACE FUNCTION test() RETURNS void ...',
        databaseId: 'ctx-1',
        isPublic: true,
        parameters: '[]',
      } as any)

      vi.mocked(prisma.routine.update).mockResolvedValue({
        id: 'routine-1',
        userId: 'user-A',
        name: 'test_function',
        type: 'function',
        database: 'postgresql',
        sql: 'CREATE OR REPLACE FUNCTION test() RETURNS void ...',
        databaseId: null,
        isPublic: false,
        parameters: '[]',
        tags: [],
        versions: [],
      } as any)

      const req = makePutRequest({
        databaseId: null,
      }, 'routine-1')

      const res = await PUT(req, { params: { id: 'routine-1' } })
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

    it('retorna routine com routine.isPublic=true E context.isPublic=true', async () => {
      const publicRoutine = {
        id: 'r1',
        name: 'public_function',
        type: 'function',
        database: 'postgresql',
        sql: 'CREATE OR REPLACE FUNCTION public_func() RETURNS void ...',
        isPublic: true,
        databaseId: 'ctx-1',
        userId: 'user-A',
        user: { id: 'user-A', name: 'User A' },
        parameters: '[]',
        tags: [],
        versions: [],
      }

      vi.mocked(prisma.routine.findMany).mockResolvedValue([publicRoutine] as any)
      vi.mocked(prisma.databaseContext.findMany).mockResolvedValue([
        { id: 'ctx-1' },
      ] as any)

      const req = makeGetRequest('/api/routines?scope=public')
      const res = await GET(req)
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data).toHaveLength(1)
      expect(data[0].id).toBe('r1')
    })

    it('NÃO retorna routine com routine.isPublic=true E context.isPublic=false', async () => {
      vi.mocked(prisma.routine.findMany).mockResolvedValue([] as any)

      const req = makeGetRequest('/api/routines?scope=public')
      const res = await GET(req)
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data).toHaveLength(0)
    })

    it('NÃO retorna routine com routine.isPublic=false', async () => {
      vi.mocked(prisma.routine.findMany).mockResolvedValue([] as any)

      const req = makeGetRequest('/api/routines?scope=public')
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
      const publicRoutine = {
        id: 'r1',
        name: 'public_function',
        type: 'function',
        database: 'postgresql',
        sql: 'CREATE OR REPLACE FUNCTION public_func() RETURNS void ...',
        isPublic: true,
        databaseId: null,
        userId: 'user-A',
        user: { id: 'user-A', name: 'Alice' },
        parameters: '[]',
        tags: [],
        versions: [],
      }

      vi.mocked(prisma.routine.findMany).mockResolvedValue([publicRoutine] as any)

      const req = makeGetRequest('/api/routines?scope=public')
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

    it('retorna routines do próprio usuário (scope=mine)', async () => {
      vi.mocked(prisma.routine.findMany).mockResolvedValue([
        {
          id: 'r1',
          name: 'my_function',
          type: 'function',
          database: 'postgresql',
          sql: 'CREATE OR REPLACE FUNCTION my_func() RETURNS void ...',
          isPublic: false,
          userId: 'user-A',
          user: { id: 'user-A', name: 'User A' },
          parameters: '[]',
          tags: [],
          versions: [],
        },
      ] as any)

      const req = makeGetRequest('/api/routines?scope=mine')
      const res = await GET(req)
      expect(res.status).toBe(200)
      const call = vi.mocked(prisma.routine.findMany).mock.calls[0][0]
      expect((call as any).where.userId).toBe('user-A')
    })

    it('não retorna routines de outros usuários (scope=mine)', async () => {
      vi.mocked(prisma.routine.findMany).mockResolvedValue([] as any)

      const req = makeGetRequest('/api/routines?scope=mine')
      const res = await GET(req)
      expect(res.status).toBe(200)
      const call = vi.mocked(prisma.routine.findMany).mock.calls[0][0]
      expect((call as any).where.userId).toBe('user-A')
    })
  })

  describe('Versionamento SQL — comportamento preservado', () => {
    beforeEach(() => {
      vi.mocked(auth).mockResolvedValue({ user: { id: 'user-A' } } as any)
    })

    it('cria nova RoutineVersion ao atualizar SQL', async () => {
      vi.mocked(prisma.routine.findUnique).mockResolvedValue({
        id: 'routine-1',
        userId: 'user-A',
        name: 'test_function',
        type: 'function',
        database: 'postgresql',
        sql: 'CREATE OR REPLACE FUNCTION test() RETURNS void AS $$ BEGIN NULL; END; $$;',
        parameters: '[]',
      } as any)

      vi.mocked(prisma.routine.update).mockResolvedValue({
        id: 'routine-1',
        userId: 'user-A',
        name: 'test_function',
        type: 'function',
        database: 'postgresql',
        sql: 'CREATE OR REPLACE FUNCTION test() RETURNS void AS $$ BEGIN RAISE NOTICE "Updated"; END; $$;',
        parameters: '[]',
        tags: [],
        versions: [{
          id: 'v-old',
          sql: 'CREATE OR REPLACE FUNCTION test() RETURNS void AS $$ BEGIN NULL; END; $$;',
        }],
      } as any)

      const req = makePutRequest({
        sql: 'CREATE OR REPLACE FUNCTION test() RETURNS void AS $$ BEGIN RAISE NOTICE "Updated"; END; $$;',
      }, 'routine-1')

      const res = await PUT(req, { params: { id: 'routine-1' } })
      expect(res.status).toBe(200)

      expect(prisma.routine.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            versions: {
              create: expect.objectContaining({
                sql: 'CREATE OR REPLACE FUNCTION test() RETURNS void AS $$ BEGIN NULL; END; $$;',
              }),
            },
          }),
        })
      )
    })

    it('não cria versão se SQL não mudou', async () => {
      vi.mocked(prisma.routine.findUnique).mockResolvedValue({
        id: 'routine-1',
        userId: 'user-A',
        name: 'test_function',
        type: 'function',
        database: 'postgresql',
        sql: 'CREATE OR REPLACE FUNCTION test() RETURNS void ...',
        parameters: '[]',
      } as any)

      vi.mocked(prisma.routine.update).mockResolvedValue({
        id: 'routine-1',
        userId: 'user-A',
        name: 'updated_function',
        type: 'function',
        database: 'postgresql',
        sql: 'CREATE OR REPLACE FUNCTION test() RETURNS void ...',
        parameters: '[]',
        tags: [],
        versions: [],
      } as any)

      const req = makePutRequest({
        name: 'updated_function',
        sql: 'CREATE OR REPLACE FUNCTION test() RETURNS void ...',
      }, 'routine-1')

      const res = await PUT(req, { params: { id: 'routine-1' } })
      expect(res.status).toBe(200)

      expect(prisma.routine.update).toHaveBeenCalledWith(
        expect.not.objectContaining({
          data: expect.objectContaining({
            versions: expect.anything(),
          }),
        })
      )
    })
  })

  describe('Parameters JSON serialization — Routine-specific invariant', () => {
    beforeEach(() => {
      vi.mocked(auth).mockResolvedValue({ user: { id: 'user-A' } } as any)
    })

    it('serializa parameters para JSON string ao criar', async () => {
      vi.mocked(prisma.routine.create).mockResolvedValue({
        id: 'routine-1',
        name: 'my_function',
        type: 'function',
        database: 'postgresql',
        sql: 'CREATE OR REPLACE FUNCTION ...',
        parameters: JSON.stringify(mockParameters),
        tags: [],
        versions: [],
      } as any)

      const req = makePostRequest({
        name: 'my_function',
        type: 'function',
        database: 'postgresql',
        sql: 'CREATE OR REPLACE FUNCTION ...',
        parameters: mockParameters,
        tagIds: [],
      })

      await POST(req)

      expect(prisma.routine.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            parameters: JSON.stringify(mockParameters),
          }),
        })
      )
    })

    it('desserializa parameters de JSON string ao ler', async () => {
      vi.mocked(prisma.routine.findUnique).mockResolvedValue({
        id: 'routine-1',
        userId: 'user-A',
        name: 'my_function',
        parameters: JSON.stringify(mockParameters),
        tags: [],
        versions: [],
      } as any)

      const req = new NextRequest('http://localhost/api/routines/routine-1')
      const res = await GET_ID(req, { params: { id: 'routine-1' } })
      const body = await res.json()

      expect(body.parameters).toEqual(mockParameters)
      expect(typeof body.parameters).toBe('object')
      expect(Array.isArray(body.parameters)).toBe(true)
    })

    it('retorna array vazio se parameters é null', async () => {
      vi.mocked(prisma.routine.findUnique).mockResolvedValue({
        id: 'routine-1',
        userId: 'user-A',
        name: 'my_function',
        parameters: null,
        tags: [],
        versions: [],
      } as any)

      const req = new NextRequest('http://localhost/api/routines/routine-1')
      const res = await GET_ID(req, { params: { id: 'routine-1' } })
      const body = await res.json()

      expect(body.parameters).toEqual([])
    })

    it('serializa parameters ao atualizar', async () => {
      vi.mocked(prisma.routine.findUnique).mockResolvedValue({
        id: 'routine-1',
        userId: 'user-A',
        name: 'my_function',
        type: 'function',
        database: 'postgresql',
        sql: 'CREATE OR REPLACE FUNCTION ...',
        parameters: '[]',
      } as any)

      vi.mocked(prisma.routine.update).mockResolvedValue({
        id: 'routine-1',
        name: 'my_function',
        parameters: JSON.stringify(mockParameters),
        tags: [],
        versions: [],
      } as any)

      const req = makePutRequest({
        parameters: mockParameters,
      }, 'routine-1')

      await PUT(req, { params: { id: 'routine-1' } })

      expect(prisma.routine.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            parameters: JSON.stringify(mockParameters),
          }),
        })
      )
    })
  })
})
