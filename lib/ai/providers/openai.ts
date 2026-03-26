import { AIAnalysisResult } from '@/types/ai'
import { buildPrompt } from '../prompt'
import type { DatabaseContext } from '@prisma/client'

export async function analyzeWithOpenAI(
  sql: string,
  dialect: string,
  model: string,
  apiKey: string,
  databaseContext?: DatabaseContext | null
): Promise<AIAnalysisResult> {
  const { system, user } = buildPrompt(sql, dialect, databaseContext)

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      response_format: { type: 'json_object' },
    }),
  })

  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    throw new Error(data?.error?.message || `OpenAI retornou erro ${response.status}`)
  }

  const data = await response.json()
  const content = data?.choices?.[0]?.message?.content
  if (!content) throw new Error('Resposta inesperada da OpenAI')

  return JSON.parse(content)
}
