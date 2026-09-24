import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_PROVIDERS, DEFAULT_SELECTED_MODEL_KEYS, DEFAULT_PROMPT } from './types'

const storage = new Map<string, string>()

const localStorageMock = {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => storage.set(key, value),
  removeItem: (key: string) => storage.delete(key),
  clear: () => storage.clear(),
  key: (index: number) => [...storage.keys()][index] ?? null,
  get length() {
    return storage.size
  },
}

vi.stubGlobal('localStorage', localStorageMock)

const loadStore = async () => {
  vi.resetModules()
  return import('./store')
}

describe('app store persistence', () => {
  beforeEach(() => {
    storage.clear()
  })

  it('merges valid persisted settings and prunes unavailable model keys', async () => {
    storage.set(
      'mosaic-model-studio',
      JSON.stringify({
        state: {
          providers: [
            {
              id: 'custom',
              name: 'Custom',
              kind: 'openai-compatible',
              apiKey: 'key',
              baseUrl: 'https://example.com/v1',
              models: ['model-a', 'model-b'],
              accent: '#abcdef',
              enabled: true,
            },
          ],
          selectedModelKeys: ['custom::model-a', 'custom::missing', 'not-a-key'],
          prompt: 'persisted prompt',
          demoMode: false,
          theme: 'light',
        },
        version: 0,
      }),
    )

    const { useAppStore } = await loadStore()
    await useAppStore.persist.rehydrate()
    const state = useAppStore.getState()

    expect(state.providers).toHaveLength(1)
    expect(state.providers[0]?.id).toBe('custom')
    expect(state.selectedModelKeys).toContain('custom::model-a')
    expect(state.prompt).toBe('persisted prompt')
    expect(state.demoMode).toBe(false)
    expect(state.theme).toBe('light')
  })

  it('falls back safely for malformed persisted data', async () => {
    storage.set(
      'mosaic-model-studio',
      JSON.stringify({
        state: {
          providers: 'corrupted-provider-list',
          selectedModelKeys: { corrupted: true },
          theme: null,
        },
        version: 0,
      }),
    )

    const { useAppStore } = await loadStore()
    await useAppStore.persist.rehydrate()
    const state = useAppStore.getState()

    expect(state.providers).toEqual(DEFAULT_PROVIDERS)
    expect(state.selectedModelKeys).toEqual(DEFAULT_SELECTED_MODEL_KEYS)
    expect(state.prompt).toBe(DEFAULT_PROMPT)
    expect(state.demoMode).toBe(true)
    expect(state.theme).toBe('dark')
  })
})
