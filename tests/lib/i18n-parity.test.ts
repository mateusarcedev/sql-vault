import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

const flattenKeys = (value: unknown, prefix = ''): string[] => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return [prefix]
  }

  return Object.entries(value as Record<string, unknown>).flatMap(([key, nested]) =>
    flattenKeys(nested, prefix ? `${prefix}.${key}` : key)
  )
}

describe('i18n parity', () => {
  it('pt-BR and en have the same translation keys', () => {
    const messagesDir = path.join(process.cwd(), 'messages')
    const en = JSON.parse(fs.readFileSync(path.join(messagesDir, 'en.json'), 'utf8'))
    const pt = JSON.parse(fs.readFileSync(path.join(messagesDir, 'pt-BR.json'), 'utf8'))

    const enKeys = new Set(flattenKeys(en))
    const ptKeys = new Set(flattenKeys(pt))

    const onlyEn = [...enKeys].filter((key) => !ptKeys.has(key))
    const onlyPt = [...ptKeys].filter((key) => !enKeys.has(key))

    expect(onlyEn).toEqual([])
    expect(onlyPt).toEqual([])
  })
})
