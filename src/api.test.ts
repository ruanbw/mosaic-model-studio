import { describe, expect, it } from 'vitest'
import { generateWithProvider, providerErrorMessage } from './api'
import type { Provider } from './types'

const provider: Provider = {
  id: 'test-provider',
  name: 'Test provider',
  kind: 'openai-compatible',
  apiKey: 'test-key',
  baseUrl: 'https://example.com/v1',
  models: ['test-model'],
  accent: '#8ef0c4',
  enabled: true,
}

describe('generation cancellation', () => {
  it('rejects before starting a provider request when already aborted', async () => {
    const controller = new AbortController()
    controller.abort()

    await expect(
      generateWithProvider(provider, 'test-model', 'build something', { signal: controller.signal }),
    ).rejects.toMatchObject({ name: 'AbortError' })
  })

  it('maps abort errors to the user-facing cancellation message', () => {
    const error = new DOMException('The operation was aborted.', 'AbortError')

    expect(providerErrorMessage(error)).toBe('请求已取消')
  })
})
