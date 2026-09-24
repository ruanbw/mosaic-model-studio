import { PROVIDER_KIND_DEFAULTS, type ProviderKind } from './types'

const LEGACY_DEFAULT_BASE_URLS: Record<ProviderKind, readonly string[]> = {
  openai: ['https://api.openai.com/v1'],
  anthropic: ['https://api.anthropic.com/v1'],
  gemini: ['https://generativelanguage.googleapis.com/v1beta'],
  'openai-compatible': ['https://openrouter.ai/api/v1'],
}

const stripTrailingSlashes = (value: string) => value.replace(/\/+$/, '')

export const normalizeProviderBaseUrl = (
  kind: ProviderKind,
  value: string | undefined,
): string | undefined => {
  const trimmed = value?.trim()
  if (!trimmed) return undefined

  const normalized = stripTrailingSlashes(trimmed)
  const legacyDefault = LEGACY_DEFAULT_BASE_URLS[kind]
    .some((candidate) => stripTrailingSlashes(candidate) === normalized)

  return legacyDefault ? PROVIDER_KIND_DEFAULTS[kind].baseUrl : normalized
}

export const isDefaultProviderBaseUrl = (
  kind: ProviderKind,
  value: string | undefined,
): boolean => {
  const normalized = normalizeProviderBaseUrl(kind, value)
  return normalized === PROVIDER_KIND_DEFAULTS[kind].baseUrl
}

export const isAllowedProviderBaseUrl = (value: string | undefined): boolean => {
  const normalized = value?.trim()
  if (!normalized) return false

  try {
    const url = new URL(normalized)
    const loopback = /^(localhost|127(?:\.\d{1,3}){3}|\[::1\])$/i.test(url.hostname)
    const secureProtocol = url.protocol === 'https:' || (url.protocol === 'http:' && loopback)
    return secureProtocol && !url.username && !url.password && !url.hash
  } catch {
    return false
  }
}
