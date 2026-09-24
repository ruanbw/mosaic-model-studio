export type ProviderKind = 'openai' | 'anthropic' | 'gemini' | 'openai-compatible'

export type AppView = 'studio' | 'providers' | 'settings'

export type GenerationStatus = 'queued' | 'running' | 'success' | 'error'

export interface Provider {
  id: string
  name: string
  kind: ProviderKind
  apiKey: string
  baseUrl?: string
  models: string[]
  accent: string
  enabled: boolean
}

export interface ModelOption {
  key: string
  providerId: string
  providerName: string
  model: string
  accent: string
  kind: ProviderKind
  configured: boolean
}

export interface GenerationResult {
  id: string
  providerId: string
  providerName: string
  model: string
  accent: string
  status: GenerationStatus
  html?: string
  raw?: string
  error?: string
  elapsedMs?: number
  createdAt: number
  isDemo?: boolean
}

export interface ProviderDraft {
  name: string
  kind: ProviderKind
  apiKey: string
  baseUrl: string
  models: string
}

export interface PersistedSettings {
  providers: Provider[]
  selectedModelKeys: string[]
  prompt: string
  demoMode: boolean
}

export const PROVIDER_KIND_LABELS: Record<ProviderKind, string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  gemini: 'Google Gemini',
  'openai-compatible': 'OpenAI 兼容',
}

export const PROVIDER_KIND_DEFAULTS: Record<ProviderKind, { baseUrl: string; models: string[] }> = {
  openai: {
    baseUrl: 'https://api.openai.com/v1',
    models: ['gpt-4o', 'gpt-4o-mini'],
  },
  anthropic: {
    baseUrl: 'https://api.anthropic.com/v1',
    models: ['claude-3-5-sonnet-latest', 'claude-3-5-haiku-latest'],
  },
  gemini: {
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    models: ['gemini-2.0-flash', 'gemini-2.0-flash-lite'],
  },
  'openai-compatible': {
    baseUrl: 'https://openrouter.ai/api/v1',
    models: ['openai/gpt-4o', 'anthropic/claude-3.5-sonnet'],
  },
}

export const DEFAULT_PROVIDERS: Provider[] = [
  {
    id: 'openai',
    name: 'OpenAI',
    kind: 'openai',
    apiKey: '',
    baseUrl: 'https://api.openai.com/v1',
    models: ['gpt-4o', 'gpt-4o-mini'],
    accent: '#8ef0c4',
    enabled: true,
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    kind: 'anthropic',
    apiKey: '',
    baseUrl: 'https://api.anthropic.com/v1',
    models: ['claude-3-5-sonnet-latest', 'claude-3-5-haiku-latest'],
    accent: '#f3b98b',
    enabled: true,
  },
  {
    id: 'gemini',
    name: 'Google Gemini',
    kind: 'gemini',
    apiKey: '',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    models: ['gemini-2.0-flash', 'gemini-2.0-flash-lite'],
    accent: '#a7b8ff',
    enabled: true,
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    kind: 'openai-compatible',
    apiKey: '',
    baseUrl: 'https://openrouter.ai/api/v1',
    models: ['openai/gpt-4o', 'anthropic/claude-3.5-sonnet'],
    accent: '#d5a6ff',
    enabled: true,
  },
]

export const DEFAULT_SELECTED_MODEL_KEYS = ['openai::gpt-4o', 'anthropic::claude-3-5-sonnet-latest']

export const DEFAULT_PROMPT =
  '设计一个面向独立开发者的产品发布页，深色高级感，包含清晰的价值主张、价格卡片和行动按钮。页面要有响应式布局。'
