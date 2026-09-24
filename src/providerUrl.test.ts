import { describe, expect, it } from 'vitest'
import { isAllowedProviderBaseUrl, isDefaultProviderBaseUrl, normalizeProviderBaseUrl } from './providerUrl'

describe('provider URL normalization', () => {
  it('canonicalizes legacy versioned defaults', () => {
    expect(normalizeProviderBaseUrl('anthropic', 'https://api.anthropic.com/v1')).toBe('https://api.anthropic.com')
    expect(normalizeProviderBaseUrl('gemini', 'https://generativelanguage.googleapis.com/v1beta/')).toBe('https://generativelanguage.googleapis.com')
  })

  it('recognizes legacy defaults when switching protocols', () => {
    expect(isDefaultProviderBaseUrl('anthropic', 'https://api.anthropic.com/v1')).toBe(true)
    expect(isDefaultProviderBaseUrl('gemini', 'https://generativelanguage.googleapis.com/v1beta')).toBe(true)
  })

  it('keeps custom gateways while removing trailing slashes', () => {
    expect(normalizeProviderBaseUrl('openai-compatible', 'https://gateway.example.test/api/')).toBe('https://gateway.example.test/api')
  })

  it('rejects credentials, fragments, remote HTTP, and malformed URLs', () => {
    expect(isAllowedProviderBaseUrl('https://user:pass@example.test')).toBe(false)
    expect(isAllowedProviderBaseUrl('https://example.test#fragment')).toBe(false)
    expect(isAllowedProviderBaseUrl('https://example.test/api?tenant=x')).toBe(false)
    expect(isAllowedProviderBaseUrl('http://evil.example.test')).toBe(false)
    expect(isAllowedProviderBaseUrl('not a url')).toBe(false)
    expect(isAllowedProviderBaseUrl('http://localhost:4173')).toBe(true)
  })
})
