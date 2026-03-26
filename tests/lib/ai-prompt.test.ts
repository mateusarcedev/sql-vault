import { describe, expect, it } from 'vitest'

import { buildPrompt } from '@/lib/ai/prompt'
import { truncateSchema } from '@/lib/ai/prompt'

describe('AI prompt schema', () => {
  it('inclui suggestedDescription no schema de resposta', () => {
    const { system } = buildPrompt('SELECT 1', 'postgresql')

    expect(system).toContain('"suggestedDescription"')
  })

  it('inclui contexto do banco de dados cuando databaseContext é fornecido', () => {
    const mockContext = {
      id: 'ctx-1',
      name: 'Test DB',
      description: 'Test Description',
      type: 'postgresql',
      schemaFormat: 'DDL',
      schemaDefinition: 'CREATE TABLE users (id INT);',
      isPublic: false,
      userId: 'user-1',
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const { user } = buildPrompt('SELECT * FROM users', 'postgresql', mockContext)

    expect(user).toContain('Contexto do Banco de Dados')
    expect(user).toContain('postgresql')
    expect(user).toContain('CREATE TABLE users')
  })

  it('não inclui contexto cuando databaseContext é null', () => {
    const { user } = buildPrompt('SELECT 1', 'postgresql', null)

    expect(user).not.toContain('Contexto do Banco de Dados')
  })
})

describe('truncateSchema', () => {
  it('não trunca quando schema é menor que 8000 caracteres', () => {
    const schema = 'A'.repeat(5000)
    const { truncated, wasTruncated } = truncateSchema(schema)

    expect(wasTruncated).toBe(false)
    expect(truncated).toBe(schema)
  })

  it('trunca quando schema é maior que 8000 caracteres', () => {
    const schema = 'B'.repeat(9000)
    const { truncated, wasTruncated } = truncateSchema(schema)

    expect(wasTruncated).toBe(true)
    expect(truncated.length).toBe(8000)
    expect(truncated).toMatch(/\[\.\.\.\w+\s\w+\]$/)
  })

  it('preserva tamanho exato de 8000 caracteres com sufixo', () => {
    const schema = 'C'.repeat(10000)
    const { truncated } = truncateSchema(schema)

    // Total deve ser 8000: (8000 - 19) + 19 (sufixo)
    expect(truncated.length).toBe(8000)
  })
})
