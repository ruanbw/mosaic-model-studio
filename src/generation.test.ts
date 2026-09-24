import { describe, expect, it } from 'vitest'
import { isAbortError, providerErrorMessage } from './api'

const abortError = () => {
  const error = new Error('The operation was aborted.')
  error.name = 'AbortError'
  return error
}

describe('generation cancellation contract', () => {
  it('recognizes native and SDK cancellation errors', () => {
    const sdkError = new Error('Request was aborted.')
    sdkError.name = 'APIUserAbortError'

    expect(isAbortError(abortError())).toBe(true)
    expect(isAbortError(sdkError)).toBe(true)
    expect(providerErrorMessage(abortError())).toBe('请求已取消')
    expect(providerErrorMessage(sdkError)).toBe('请求已取消')
  })

  it('does not classify unrelated failures as cancellation', () => {
    const error = new Error('Request failed with status 500')

    expect(isAbortError(error)).toBe(false)
    expect(providerErrorMessage(error)).toBe('Request failed with status 500')
  })

  it('rejects an already-aborted signal before a provider request starts', async () => {
    const controller = new AbortController()
    controller.abort()

    const provider = {
      id: 'test',
      name: 'Test',
      kind: 'openai-compatible' as const,
      apiKey: 'key',
      baseUrl: 'https://gateway.example.test/v1',
      models: ['model'],
      accent: '#fff',
      enabled: true,
    }

    await expect(
      import('./api').then(({ generateWithProvider }) =>
        generateWithProvider(provider, 'model', 'prompt', { signal: controller.signal }),
      ),
    ).rejects.toMatchObject({ name: 'AbortError' })
  })
})
