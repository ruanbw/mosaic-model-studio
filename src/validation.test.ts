import { describe, expect, it } from 'vitest'
import { providerDraftSchema } from './validation'

const validDraft = {
  name: 'Local provider',
  kind: 'openai-compatible' as const,
  apiKey: 'test-key',
  baseUrl: 'https://example.com/v1',
  models: 'model-a, model-b',
}

describe('providerDraftSchema', () => {
  it.each([
    'https://api.example.com/v1',
    'http://localhost:3000',
    'http://127.0.0.1:8080/v1',
    'http://[::1]:3000/v1',
    '',
  ])('accepts safe base URL %s', (baseUrl) => {
    expect(providerDraftSchema.safeParse({ ...validDraft, baseUrl }).success).toBe(true)
  })

  it.each([
    'http://example.com/v1',
    'ftp://example.com/v1',
    'https://',
    'http://localhost.evil.example/v1',
  ])('rejects unsafe or malformed base URL %s', (baseUrl) => {
    const result = providerDraftSchema.safeParse({ ...validDraft, baseUrl })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path.includes('baseUrl'))).toBe(true)
    }
  })
})
