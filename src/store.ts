import { nanoid } from 'nanoid'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { isAllowedProviderBaseUrl, normalizeProviderBaseUrl } from './providerUrl'
import {
  DEFAULT_PROMPT,
  DEFAULT_PROVIDERS,
  DEFAULT_SELECTED_MODEL_KEYS,
  type AppView,
  type GenerationResult,
  type PersistedSettings,
  type Provider,
  type ProviderDraft,
  type ThemeMode,
} from './types'

interface AppState {
  providers: Provider[]
  selectedModelKeys: string[]
  prompt: string
  demoMode: boolean
  theme: ThemeMode
  activeView: AppView
  results: GenerationResult[]
  isRunning: boolean
  setPrompt: (prompt: string) => void
  setActiveView: (view: AppView) => void
  toggleModel: (modelKey: string) => void
  clearModelSelection: () => void
  addProvider: (draft: ProviderDraft) => Provider
  updateProvider: (providerId: string, updates: Partial<Omit<Provider, 'id'>>) => void
  removeProvider: (providerId: string) => void
  setDemoMode: (enabled: boolean) => void
  setTheme: (theme: ThemeMode) => void
  setRunning: (running: boolean) => void
  replaceResults: (results: GenerationResult[]) => void
  upsertResult: (result: GenerationResult) => void
  removeResult: (resultId: string) => void
  clearResults: () => void
  clearConfiguration: () => void
  restoreDefaults: () => void
}

const initialSettings: PersistedSettings = {
  providers: DEFAULT_PROVIDERS,
  selectedModelKeys: DEFAULT_SELECTED_MODEL_KEYS,
  prompt: DEFAULT_PROMPT,
  demoMode: true,
  theme: 'dark' as ThemeMode,
}

const parseModels = (models: string) =>
  [...new Set(models.split(/[\n,]/).map((model) => model.trim()).filter(Boolean))]

const accentPalette = ['#8ef0c4', '#f3b98b', '#a7b8ff', '#d5a6ff', '#f0a6ca', '#91d7ef']

const PERSIST_VERSION = 1
const providerKinds = new Set<string>(['openai', 'anthropic', 'gemini', 'openai-compatible'])
const themeModes = new Set<string>(['dark', 'light', 'system'])

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isProviderKind = (value: unknown): value is Provider['kind'] =>
  typeof value === 'string' && providerKinds.has(value)

const isThemeMode = (value: unknown): value is ThemeMode =>
  typeof value === 'string' && themeModes.has(value)

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0

const sanitizeProvider = (value: unknown): Provider | null => {
  if (!isRecord(value) || !isNonEmptyString(value.id)) return null

  const id = value.id.trim()
  const fallback = DEFAULT_PROVIDERS.find((provider) => provider.id === id)
  const name = isNonEmptyString(value.name)
    ? value.name.trim()
    : fallback?.name ?? id
  const kind = isProviderKind(value.kind) ? value.kind : fallback?.kind ?? 'openai-compatible'
  const apiKey = typeof value.apiKey === 'string' ? value.apiKey.trim() : fallback?.apiKey ?? ''
  const normalizedBaseUrl = typeof value.baseUrl === 'string'
    ? normalizeProviderBaseUrl(kind, value.baseUrl)
    : fallback?.baseUrl
  const baseUrl = normalizedBaseUrl && isAllowedProviderBaseUrl(normalizedBaseUrl)
    ? normalizedBaseUrl
    : fallback?.baseUrl
  const models = Array.isArray(value.models)
    ? [...new Set(value.models
        .filter((model): model is string => typeof model === 'string')
        .map((model) => model.trim())
        .filter(Boolean))]
    : fallback?.models ?? []
  const accent = isNonEmptyString(value.accent)
    ? value.accent.trim()
    : fallback?.accent ?? accentPalette[0]!
  const enabled = typeof value.enabled === 'boolean' ? value.enabled : fallback?.enabled ?? true

  return { id, name, kind, apiKey, baseUrl, models, accent, enabled }
}

const sanitizeProviders = (value: unknown, fallback: Provider[]): Provider[] => {
  if (!Array.isArray(value)) return fallback

  const providers: Provider[] = []
  const ids = new Set<string>()
  for (const item of value) {
    const provider = sanitizeProvider(item)
    if (!provider || ids.has(provider.id)) continue
    providers.push(provider)
    ids.add(provider.id)
  }

  // An explicit empty array is a valid cleared configuration. Only fall back
  // when a non-empty persisted array contained no usable provider records.
  return value.length > 0 && providers.length === 0 ? fallback : providers
}

const sanitizeSelectedModelKeys = (
  value: unknown,
  providers: Provider[],
  fallback: string[],
): string[] => {
  if (!Array.isArray(value)) return fallback

  const keys = [...new Set(value
    .filter((key): key is string => typeof key === 'string')
    .map((key) => key.trim())
    .filter(Boolean))]
  if (value.length > 0 && keys.length === 0) return fallback

  const availableKeys = new Set(providers
    .filter((provider) => provider.enabled)
    .flatMap((provider) => provider.models.map((model) => `${provider.id}::${model}`)))
  return keys.filter((key) => availableKeys.has(key))
}

const sanitizePersistedSettings = (
  persisted: unknown,
  current: PersistedSettings,
): PersistedSettings => {
  const source = isRecord(persisted) ? persisted : {}
  const providers = sanitizeProviders(source.providers, current.providers)
  return {
    providers,
    selectedModelKeys: sanitizeSelectedModelKeys(
      source.selectedModelKeys,
      providers,
      current.selectedModelKeys,
    ),
    prompt: typeof source.prompt === 'string' ? source.prompt : current.prompt,
    demoMode: typeof source.demoMode === 'boolean' ? source.demoMode : current.demoMode,
    theme: isThemeMode(source.theme) ? source.theme : current.theme,
  }
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      ...initialSettings,
      activeView: 'studio',
      results: [],
      isRunning: false,
      setPrompt: (prompt) => set({ prompt }),
      setActiveView: (activeView) => set({ activeView }),
      toggleModel: (modelKey) =>
        set((state) => ({
          selectedModelKeys: state.selectedModelKeys.includes(modelKey)
            ? state.selectedModelKeys.filter((key) => key !== modelKey)
            : [...state.selectedModelKeys, modelKey],
        })),
      clearModelSelection: () => set({ selectedModelKeys: [] }),
      addProvider: (draft) => {
        const provider: Provider = {
          id: nanoid(10),
          name: draft.name.trim(),
          kind: draft.kind,
          apiKey: draft.apiKey.trim(),
          baseUrl: draft.baseUrl.trim() || undefined,
          models: parseModels(draft.models),
          accent: accentPalette[Math.floor(Math.random() * accentPalette.length)] ?? '#8ef0c4',
          enabled: true,
        }
        set((state) => ({ providers: [...state.providers, provider] }))
        return provider
      },
      updateProvider: (providerId, updates) =>
        set((state) => ({
          providers: state.providers.map((provider) =>
            provider.id === providerId ? { ...provider, ...updates } : provider,
          ),
          selectedModelKeys: updates.models
            ? state.selectedModelKeys.filter((key) => {
                if (!key.startsWith(`${providerId}::`)) return true
                return updates.models?.includes(key.slice(providerId.length + 2)) ?? true
              })
            : state.selectedModelKeys,
        })),
      removeProvider: (providerId) =>
        set((state) => ({
          providers: state.providers.filter((provider) => provider.id !== providerId),
          selectedModelKeys: state.selectedModelKeys.filter(
            (key) => !key.startsWith(`${providerId}::`),
          ),
        })),
      setDemoMode: (demoMode) => set({ demoMode }),
      setTheme: (theme) => set({ theme }),
      setRunning: (isRunning) => set({ isRunning }),
      replaceResults: (results) => set({ results }),
      upsertResult: (result) =>
        set((state) => {
          const existingIndex = state.results.findIndex((item) => item.id === result.id)
          if (existingIndex === -1) return { results: [...state.results, result] }
          const results = [...state.results]
          results[existingIndex] = result
          return { results }
        }),
      removeResult: (resultId) =>
        set((state) => ({ results: state.results.filter((result) => result.id !== resultId) })),
      clearResults: () => set({ results: [] }),
      clearConfiguration: () =>
        set({ providers: [], selectedModelKeys: [], prompt: '', demoMode: true, results: [] }),
      restoreDefaults: () => set({ ...initialSettings }),
    }),
    {
      name: 'mosaic-model-studio',
      version: PERSIST_VERSION,
      storage: createJSONStorage(() => localStorage),
      // Keep the persisted boundary explicit. Results and isRunning are
      // runtime-only, while provider apiKey values intentionally remain for BYOK.
      partialize: (state): PersistedSettings => ({
        providers: state.providers,
        selectedModelKeys: state.selectedModelKeys,
        prompt: state.prompt,
        demoMode: state.demoMode,
        theme: state.theme,
      }),
      migrate: (persisted) => sanitizePersistedSettings(persisted, initialSettings),
      merge: (persisted, current) => ({
        ...current,
        ...sanitizePersistedSettings(persisted, current),
        // Never rehydrate transient generation state from localStorage.
        activeView: current.activeView,
        results: current.results,
        isRunning: current.isRunning,
      }),
    },
  ),
)
