import { AIAnalysisResult } from '@/types/ai'
import { buildPrompt } from '../prompt'
import type { DatabaseContext } from '@prisma/client'

export async function analyzeWithOpenAI(
  sql: string,
  dialect: string,
  model: string,
  apiKey: string | null,
  databaseContext?: DatabaseContext | null,
  endpointUrl = 'https://api.openai.com/v1/chat/completions'
): Promise<AIAnalysisResult> {
  const { system, user } = buildPrompt(sql, dialect, databaseContext)

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  if (apiKey) {
    headers.Authorization = `Bearer ${apiKey}`
  }

  const response = await fetch(endpointUrl, {
    method: 'POST',
    headers,
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
