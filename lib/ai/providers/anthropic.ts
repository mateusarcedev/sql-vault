import { AIAnalysisResult } from '@/types/ai'
import { buildPrompt } from '../prompt'
import type { DatabaseContext } from '@prisma/client'

export async function analyzeWithAnthropic(
  sql: string,
  dialect: string,
  model: string,
  apiKey: string,
  databaseContext?: DatabaseContext | null
): Promise<AIAnalysisResult> {
  const { system, user } = buildPrompt(sql, dialect, databaseContext)

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      system,
      messages: [{ role: 'user', content: user }],
      max_tokens: 1024,
    }),
  })

  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    throw new Error(data?.error?.message || `Anthropic retornou erro ${response.status}`)
  }

  const data = await response.json()
  const content = data?.content?.[0]?.text
  if (!content) throw new Error('Resposta inesperada da Anthropic')

  try {
    return JSON.parse(content)
  } catch {
    const match = content.match(/\{[\s\S]*\}/)
    if (match) return JSON.parse(match[0])
    throw new Error('O modelo não retornou um JSON válido')
  }
}
