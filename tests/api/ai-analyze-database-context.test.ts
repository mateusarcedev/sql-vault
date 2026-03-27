import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

import { POST } from '@/app/api/ai/analyze/route'
import db from '@/lib/db'
const prisma = db as any
import { auth } from '@/auth'
import { truncateSchema } from '@/lib/ai/prompt'

describe('AI Analyze API /api/ai/analyze', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(auth).mockResolvedValue({ user: { id: 'user-1' } } as any)
    vi.spyOn(console, 'log').mockImplementation(() => undefined)
  })

  describe('analyze sem databaseId', () => {
    it('continua funcionando sem databaseId', async () => {
      vi.mocked(prisma.userAIConfig.findUnique).mockResolvedValue({
        userId: 'user-1',
        provider: 'openai',
        model: 'gpt-4',
        openaiApiKey: 'sk-test',
        anthropicApiKey: null,
        geminiApiKey: null,
      } as any)

      // Mock fetch para simular resposta da OpenAI
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  explanation: 'Query simples',
                  suggestedName: 'select_one',
                  suggestedDescription: 'Retorna 1',
                  suggestedTags: [],
                  performanceReview: [],
                }),
              },
            },
          ],
        }),
      } as any))

      const body = JSON.stringify({ sql: 'SELECT 1', dialect: 'postgresql' })
      const req = new NextRequest('http://localhost/api/ai/analyze', {
        method: 'POST',
        body,
      })

      const res = await POST(req)
      expect(res.status).toBe(200)
    })

    it('usa endpoint customizado para Open WebUI', async () => {
      vi.mocked(prisma.userAIConfig.findUnique).mockResolvedValue({
        userId: 'user-1',
        provider: 'open-webui',
        model: 'llama3.1:8b',
        openaiApiKey: null,
        anthropicApiKey: null,
        geminiApiKey: null,
        connectionUrl: 'https://openwebui.example.com/api/chat/completions',
        modelsUrl: 'https://openwebui.example.com/api/models',
      } as any)

      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  explanation: 'Query simples',
                  suggestedName: 'select_one',
                  suggestedDescription: 'Retorna 1',
                  suggestedTags: [],
                  performanceReview: [],
                }),
              },
            },
          ],
        }),
      } as any))

      const body = JSON.stringify({ sql: 'SELECT 1', dialect: 'postgresql' })
      const req = new NextRequest('http://localhost/api/ai/analyze', {
        method: 'POST',
        body,
      })

      const res = await POST(req)
      expect(res.status).toBe(200)
      expect(fetch).toHaveBeenCalledWith(
        'https://openwebui.example.com/api/chat/completions',
        expect.any(Object)
      )
    })
  })

  describe('analyze com databaseId válido', () => {
    it('retorna 404 quando databaseId não existe', async () => {
      vi.mocked(prisma.databaseContext).findFirst.mockResolvedValue(null)

      const body = JSON.stringify({
        sql: 'SELECT 1',
        dialect: 'postgresql',
        databaseId: 'context-id-1',
      })
      const req = new NextRequest('http://localhost/api/ai/analyze', {
        method: 'POST',
        body,
      })

      const res = await POST(req)
      expect(res.status).toBe(404)
      const resBody = await res.json()
      expect(resBody.message).toContain('não encontrado')
    })

    it('retorna 404 quando databaseId pertence a outro usuário e não é público', async () => {
      vi.mocked(prisma.databaseContext).findFirst.mockResolvedValue(null)

      const body = JSON.stringify({
        sql: 'SELECT 1',
        dialect: 'postgresql',
        databaseId: 'context-id-1',
      })
      const req = new NextRequest('http://localhost/api/ai/analyze', {
        method: 'POST',
        body,
      })

      const res = await POST(req)
      expect(res.status).toBe(404)
    })

    it('injeta contexto quando databaseId válido (usuário proprietário)', async () => {
      const databaseContext = {
        id: 'context-id-1',
        userId: 'user-1',
        isPublic: false,
        type: 'postgresql',
        schemaFormat: 'DDL',
        schemaDefinition: 'CREATE TABLE users (id INT, name TEXT);',
        name: 'My DB',
        description: 'Test DB',
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      vi.mocked(prisma.databaseContext).findFirst.mockResolvedValue(databaseContext as any)
      vi.mocked(prisma.userAIConfig.findUnique).mockResolvedValue({
        userId: 'user-1',
        provider: 'openai',
        model: 'gpt-4',
        openaiApiKey: 'sk-test',
        anthropicApiKey: null,
        geminiApiKey: null,
      } as any)

      // Mock fetch para capturar e verificar o prompt
      let capturedPrompt = ''
      vi.stubGlobal('fetch', vi.fn().mockImplementation(async (url, options) => {
        if ((url as string).includes('openai.com')) {
          const body = JSON.parse((options as any).body)
          capturedPrompt = body.messages[1].content
        }
        return {
          ok: true,
          json: async () => ({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    explanation: 'Query com contexto',
                    suggestedName: 'select_all',
                    suggestedDescription: 'Retorna tudo',
                    suggestedTags: [],
                    performanceReview: [],
                  }),
                },
              },
            ],
          }),
        }
      }))

      const body = JSON.stringify({
        sql: 'SELECT * FROM users',
        dialect: 'postgresql',
        databaseId: 'context-id-1',
      })
      const req = new NextRequest('http://localhost/api/ai/analyze', {
        method: 'POST',
        body,
      })

      const res = await POST(req)
      expect(res.status).toBe(200)

      // Verificar que o contexto foi injetado no prompt
      expect(capturedPrompt).toContain('Contexto do Banco de Dados')
      expect(capturedPrompt).toContain('postgresql')
      expect(capturedPrompt).toContain('CREATE TABLE users')
    })

    it('injeta contexto quando databaseId é público', async () => {
      const databaseContext = {
        id: 'context-id-public',
        userId: 'user-2',
        isPublic: true,
        type: 'mysql',
        schemaFormat: 'DDL',
        schemaDefinition: 'CREATE TABLE products (id INT, name VARCHAR(100));',
        name: 'Public DB',
        description: 'Public Database',
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      vi.mocked(prisma.databaseContext).findFirst.mockResolvedValue(databaseContext as any)
      vi.mocked(prisma.userAIConfig.findUnique).mockResolvedValue({
        userId: 'user-1',
        provider: 'openai',
        model: 'gpt-4',
        openaiApiKey: 'sk-test',
        anthropicApiKey: null,
        geminiApiKey: null,
      } as any)

      let capturedPrompt = ''
      vi.stubGlobal('fetch', vi.fn().mockImplementation(async (url, options) => {
        if ((url as string).includes('openai.com')) {
          const body = JSON.parse((options as any).body)
          capturedPrompt = body.messages[1].content
        }
        return {
          ok: true,
          json: async () => ({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    explanation: 'Query com contexto público',
                    suggestedName: 'select_products',
                    suggestedDescription: 'Retorna produtos',
                    suggestedTags: [],
                    performanceReview: [],
                  }),
                },
              },
            ],
          }),
        }
      }))

      const body = JSON.stringify({
        sql: 'SELECT * FROM products',
        dialect: 'mysql',
        databaseId: 'context-id-public',
      })
      const req = new NextRequest('http://localhost/api/ai/analyze', {
        method: 'POST',
        body,
      })

      const res = await POST(req)
      expect(res.status).toBe(200)
      expect(capturedPrompt).toContain('mysql')
      expect(capturedPrompt).toContain('CREATE TABLE products')
    })
  })

  describe('truncação de schemaDefinition', () => {
    it('trunca schemaDefinition maior que 8000 caracteres', async () => {
      const longSchema = 'A'.repeat(10000)
      const { truncated, wasTruncated } = truncateSchema(longSchema)

      expect(wasTruncated).toBe(true)
      expect(truncated.length).toBe(8000)
      expect(truncated).toMatch(/\[\.\.\.\w+\s\w+\]$/)
    })

    it('não trunca schemaDefinition menor ou igual a 8000 caracteres', async () => {
      const shortSchema = 'A'.repeat(5000)
      const { truncated, wasTruncated } = truncateSchema(shortSchema)

      expect(wasTruncated).toBe(false)
      expect(truncated).toBe(shortSchema)
    })

    it('registra evento de truncamento sem logar schema completo', async () => {
      const longSchema = 'X'.repeat(9000)
      const logSpy = vi.spyOn(console, 'log')

      truncateSchema(longSchema)

      expect(logSpy).toHaveBeenCalledWith(
        '[AI_CONTEXT_SCHEMA_TRUNCATED]',
        expect.objectContaining({
          originalLength: 9000,
          truncatedTo: 8000,
          suffixLength: expect.any(Number),
        })
      )

      // Verificar que a schema completa NÃO foi logada
      const callAtIndex = logSpy.mock.calls.find(
        (call) => call[0] === '[AI_CONTEXT_SCHEMA_TRUNCATED]'
      )
      if (callAtIndex) {
        const loggedObject = callAtIndex[1]
        expect(JSON.stringify(loggedObject)).not.toContain('X')
      }
    })

    it('injeta contexto truncado no prompt quando schemaDefinition > 8000', async () => {
      const longSchema = 'B'.repeat(9000)
      const databaseContext = {
        id: 'context-id-long',
        userId: 'user-1',
        isPublic: false,
        type: 'postgresql',
        schemaFormat: 'DDL',
        schemaDefinition: longSchema,
        name: 'Large Schema DB',
        description: 'DB with large schema',
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      vi.mocked(prisma.databaseContext).findFirst.mockResolvedValue(databaseContext as any)
      vi.mocked(prisma.userAIConfig.findUnique).mockResolvedValue({
        userId: 'user-1',
        provider: 'openai',
        model: 'gpt-4',
        openaiApiKey: 'sk-test',
        anthropicApiKey: null,
        geminiApiKey: null,
      } as any)

      let capturedPrompt = ''
      vi.stubGlobal('fetch', vi.fn().mockImplementation(async (url, options) => {
        if ((url as string).includes('openai.com')) {
          const body = JSON.parse((options as any).body)
          capturedPrompt = body.messages[1].content
        }
        return {
          ok: true,
          json: async () => ({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    explanation: 'Query com schema truncado',
                    suggestedName: 'select_truncated',
                    suggestedDescription: 'Retorna dados',
                    suggestedTags: [],
                    performanceReview: [],
                  }),
                },
              },
            ],
          }),
        }
      }))

      const body = JSON.stringify({
        sql: 'SELECT 1',
        dialect: 'postgresql',
        databaseId: 'context-id-long',
      })
      const req = new NextRequest('http://localhost/api/ai/analyze', {
        method: 'POST',
        body,
      })

      const res = await POST(req)
      expect(res.status).toBe(200)

      // Verificar que o schema foi truncado no prompt
      expect(capturedPrompt).toContain('[...schema truncated]')
      // Verificar que não contém a schema completa
      expect(capturedPrompt.split('B').length - 1).toBeLessThan(9000)
    })
  })
})
