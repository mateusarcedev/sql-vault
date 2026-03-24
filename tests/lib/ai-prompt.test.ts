import { describe, expect, it } from 'vitest'

import { buildPrompt } from '@/lib/ai/prompt'

describe('AI prompt schema', () => {
  it('inclui suggestedDescription no schema de resposta', () => {
    const { system } = buildPrompt('SELECT 1', 'postgresql')

    expect(system).toContain('"suggestedDescription"')
  })
})
