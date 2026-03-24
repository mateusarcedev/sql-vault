export function buildPrompt(sql: string, dialect: string): { system: string; user: string } {
  const system = `Você é um especialista em SQL. Analise o código SQL fornecido e responda APENAS com um JSON válido, sem texto adicional, seguindo exatamente este schema:

{
  "explanation": "string - explicação em português do que o SQL faz",
  "suggestedName": "string - nome descritivo em snake_case, ex: get_top_customers_by_revenue",
  "suggestedTags": ["string"] - array de 1 a 4 tags relevantes em português ou inglês, ex: ["analytics", "clientes", "receita"],
  "performanceReview": [
    {
      "severity": "info | warning | error",
      "title": "string - título curto do problema",
      "description": "string - explicação do problema",
      "suggestion": "string - como corrigir"
    }
  ]
}

Se não houver problemas de performance, retorne performanceReview como array vazio [].
Responda exclusivamente com JSON, sem markdown, sem blocos de código.`

  const user = `Dialeto SQL: ${dialect}\n\nSQL:\n${sql}`

  return { system, user }
}
