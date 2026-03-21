import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET } from '@/app/api/routines/[id]/route'
import { POST } from '@/app/api/routines/route'
import prisma from '@/lib/db'
import { auth } from '@/auth'
import { NextRequest } from 'next/server'

const mockParameters = [
  { name: 'p_id', type: 'INTEGER', direction: 'IN' },
  { name: 'p_result', type: 'VARCHAR(255)', direction: 'OUT' },
]

describe('Routine — serialização de parameters', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(auth).mockResolvedValue({ user: { id: 'user-1' } } as any)
  })

  it('GET desserializa parameters de JSON string para array', async () => {
    vi.mocked(prisma.routine.findUnique).mockResolvedValue({
      id: 'routine-1',
      userId: 'user-1',
      parameters: JSON.stringify(mockParameters),
      tags: [],
      versions: [],
    } as any)

    const req = new NextRequest('http://localhost/api/routines/routine-1')
    const res = await GET(req, { params: { id: 'routine-1' } })
    const body = await res.json()

    expect(body.parameters).toEqual(mockParameters)
    expect(typeof body.parameters).toBe('object')
    expect(Array.isArray(body.parameters)).toBe(true)
  })

  it('GET retorna array vazio se parameters é null', async () => {
    vi.mocked(prisma.routine.findUnique).mockResolvedValue({
      id: 'routine-1',
      userId: 'user-1',
      parameters: null,
      tags: [],
      versions: [],
    } as any)

    const req = new NextRequest('http://localhost/api/routines/routine-1')
    const res = await GET(req, { params: { id: 'routine-1' } })
    const body = await res.json()

    expect(body.parameters).toEqual([])
  })

  it('POST serializa parameters para JSON string antes de persistir', async () => {
    vi.mocked(prisma.routine.create).mockResolvedValue({
      id: 'routine-1',
      parameters: JSON.stringify(mockParameters),
      tags: [],
      versions: [],
    } as any)

    const req = new NextRequest('http://localhost/api/routines', {
      method: 'POST',
      body: JSON.stringify({
        name: 'minha_funcao',
        type: 'function',
        database: 'postgresql',
        sql: 'CREATE OR REPLACE FUNCTION ...',
        parameters: mockParameters,
        status: 'active',
        tagIds: [],
      }),
      headers: { 'content-type': 'application/json' },
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

  it('nunca expõe parameters como string no response', async () => {
    vi.mocked(prisma.routine.findUnique).mockResolvedValue({
      id: 'routine-1',
      userId: 'user-1',
      parameters: JSON.stringify(mockParameters),
      tags: [],
      versions: [],
    } as any)

    const req = new NextRequest('http://localhost/api/routines/routine-1')
    const res = await GET(req, { params: { id: 'routine-1' } })
    const body = await res.json()

    expect(typeof body.parameters).not.toBe('string')
  })
})
