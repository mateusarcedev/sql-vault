import { AIAnalysisResult } from '@/types/ai'
import { buildPrompt } from '../prompt'

function extractJSON(text: string): AIAnalysisResult {
  try {
    return JSON.parse(text)
  } catch {
    const match = text.match(/\{[\s\S]*\}/)
    if (match) return JSON.parse(match[0])
    throw new Error('O modelo não retornou um JSON válido')
  }
}

export async function analyzeWithOllama(
  sql: string,
  dialect: string,
  model: string
): Promise<AIAnalysisResult> {
  const baseUrl = process.env.OLLAMA_BASE_URL
  if (!baseUrl) throw new Error('OLLAMA_BASE_URL não configurado no servidor')

  const { system, user } = buildPrompt(sql, dialect)

  const response = await fetch(`${baseUrl}/v1/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      response_format: { type: 'json_object' },
      stream: false,
    }),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Ollama retornou erro ${response.status}: ${text}`)
  }

  const data = await response.json()
  const content = data?.choices?.[0]?.message?.content
  if (!content) throw new Error('Resposta inesperada do Ollama')

  return extractJSON(content)
}
