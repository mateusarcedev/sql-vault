import type { DatabaseContext } from '@prisma/client'

const SCHEMA_MAX_LENGTH = 8000
const TRUNCATION_SUFFIX = '[...schema truncated]'

export function truncateSchema(
  schema: string,
  maxLength: number = SCHEMA_MAX_LENGTH
): { truncated: string; wasTruncated: boolean } {
  if (schema.length <= maxLength) {
    return { truncated: schema, wasTruncated: false }
  }

  // Log truncation event (safety: no full schema logged)
  console.log('[AI_CONTEXT_SCHEMA_TRUNCATED]', {
    originalLength: schema.length,
    truncatedTo: maxLength,
    suffixLength: TRUNCATION_SUFFIX.length,
  })

  return {
    truncated: schema.substring(0, maxLength - TRUNCATION_SUFFIX.length) + TRUNCATION_SUFFIX,
    wasTruncated: true,
  }
}

export function buildPrompt(
  sql: string,
  dialect: string,
  databaseContext?: DatabaseContext | null
): { system: string; user: string } {
  const system = `Você é um especialista em SQL. Analise o código SQL fornecido e responda APENAS com um JSON válido, sem texto adicional, seguindo exatamente este schema:

{
  "explanation": "string - explicação em português do que o SQL faz",
  "suggestedName": "string - nome descritivo em snake_case, ex: get_top_customers_by_revenue",
  "suggestedDescription": "string - descrição curta e útil (1 frase) para mostrar no campo de descrição",
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

  let user = `Dialeto SQL: ${dialect}\n\nSQL:\n${sql}`

  if (databaseContext) {
    const { truncated: schemaDefinition, wasTruncated: _ } = truncateSchema(databaseContext.schemaDefinition)

    const contextBlock = `

## Contexto do Banco de Dados

**Tipo**: ${databaseContext.type}
**Formato do Schema**: ${databaseContext.schemaFormat}

**Definição do Schema**:
\`\`\`
${schemaDefinition}
\`\`\``

    user += contextBlock
  }

  return { system, user }
}
