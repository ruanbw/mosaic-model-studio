import { nanoid } from 'nanoid'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import {
  DEFAULT_PROMPT,
  DEFAULT_PROVIDERS,
  DEFAULT_SELECTED_MODEL_KEYS,
  type AppView,
  type GenerationResult,
  type PersistedSettings,
  type Provider,
  type ProviderDraft,
} from './types'

interface AppState {
  providers: Provider[]
  selectedModelKeys: string[]
  prompt: string
  demoMode: boolean
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
  setRunning: (running: boolean) => void
  replaceResults: (results: GenerationResult[]) => void
  upsertResult: (result: GenerationResult) => void
  removeResult: (resultId: string) => void
  clearResults: () => void
  restoreDefaults: () => void
}

const initialSettings: PersistedSettings = {
  providers: DEFAULT_PROVIDERS,
  selectedModelKeys: DEFAULT_SELECTED_MODEL_KEYS,
  prompt: DEFAULT_PROMPT,
  demoMode: true,
}

const parseModels = (models: string) =>
  [...new Set(models.split(/[\n,]/).map((model) => model.trim()).filter(Boolean))]

const accentPalette = ['#8ef0c4', '#f3b98b', '#a7b8ff', '#d5a6ff', '#f0a6ca', '#91d7ef']

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
        })),
      removeProvider: (providerId) =>
        set((state) => ({
          providers: state.providers.filter((provider) => provider.id !== providerId),
          selectedModelKeys: state.selectedModelKeys.filter(
            (key) => !key.startsWith(`${providerId}::`),
          ),
        })),
      setDemoMode: (demoMode) => set({ demoMode }),
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
      restoreDefaults: () => set({ ...initialSettings }),
    }),
    {
      name: 'mosaic-model-studio',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        providers: state.providers,
        selectedModelKeys: state.selectedModelKeys,
        prompt: state.prompt,
        demoMode: state.demoMode,
      }),
      merge: (persisted, current) => {
        const settings = persisted as Partial<PersistedSettings> | undefined
        return {
          ...current,
          ...settings,
          providers:
            Array.isArray(settings?.providers) && settings.providers.length > 0
              ? settings.providers
              : current.providers,
          selectedModelKeys:
            Array.isArray(settings?.selectedModelKeys) && settings.selectedModelKeys.length > 0
              ? settings.selectedModelKeys
              : current.selectedModelKeys,
        }
      },
    },
  ),
)
