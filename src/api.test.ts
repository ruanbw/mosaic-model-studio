import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('dompurify', () => ({
  default: { sanitize: (value: string) => value },
}))

import { generateWithProvider, isAbortError, providerErrorMessage } from './api'
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

const openaiMocks = vi.hoisted(() => ({
  create: vi.fn(),
}))
const anthropicMocks = vi.hoisted(() => ({
  create: vi.fn(),
}))
const geminiMocks = vi.hoisted(() => ({
  generateContent: vi.fn(),
}))

vi.mock('openai', () => ({
  default: class {
    chat = { completions: { create: openaiMocks.create } }
  },
}))

vi.mock('@anthropic-ai/sdk', () => ({
  default: class {
    messages = { create: anthropicMocks.create }
  },
}))

vi.mock('@google/genai', () => ({
  GoogleGenAI: class {
    models = { generateContent: geminiMocks.generateContent }
  },
}))

const validProject = JSON.stringify({
  schemaVersion: 1,
  title: 'Test project',
  summary: 'A test',
  files: [{ path: 'index.html', content: '<h1>Hello</h1>' }],
})

beforeEach(() => {
  openaiMocks.create.mockReset()
  anthropicMocks.create.mockReset()
  geminiMocks.generateContent.mockReset()
})

describe('generation cancellation', () => {
  it('rejects before starting a provider request when already aborted', async () => {
    const controller = new AbortController()
    controller.abort()

    await expect(
      generateWithProvider(provider, 'test-model', 'build something', { signal: controller.signal }),
    ).rejects.toMatchObject({ name: 'AbortError' })
  })

  it('maps SDK abort errors to the user-facing cancellation message', () => {
    const domError = new DOMException('The operation was aborted.', 'AbortError')
    const sdkError = new Error('Request was aborted.')
    sdkError.name = 'APIUserAbortError'
    const googleError = new Error('Request aborted by client')
    googleError.name = 'RequestAbortedError'
    const wrappedError = new Error('transport failed', { cause: new DOMException('aborted', 'AbortError') })

    for (const error of [domError, sdkError, googleError, wrappedError]) {
      expect(isAbortError(error)).toBe(true)
      expect(providerErrorMessage(error)).toBe('请求已取消')
    }
  })
})

describe('provider SDK signal forwarding', () => {
  it('passes the signal to the OpenAI SDK request', async () => {
    const controller = new AbortController()
    openaiMocks.create.mockResolvedValue({ choices: [{ finish_reason: 'stop', message: { content: validProject } }] })

    await generateWithProvider({ ...provider, kind: 'openai' }, 'test-model', 'build something', { signal: controller.signal })

    expect(openaiMocks.create).toHaveBeenCalledWith(
      expect.objectContaining({ model: 'test-model' }),
      { signal: controller.signal },
    )
  })

  it('passes the signal to the Anthropic SDK request', async () => {
    const controller = new AbortController()
    anthropicMocks.create.mockResolvedValue({ stop_reason: 'end_turn', content: [{ type: 'text', text: validProject }] })

    await generateWithProvider({ ...provider, kind: 'anthropic' }, 'test-model', 'build something', { signal: controller.signal })

    expect(anthropicMocks.create).toHaveBeenCalledWith(
      expect.objectContaining({ model: 'test-model' }),
      { signal: controller.signal },
    )
  })

  it('passes the signal to the Gemini SDK request', async () => {
    const controller = new AbortController()
    geminiMocks.generateContent.mockResolvedValue({ text: validProject, candidates: [{ finishReason: 'STOP' }] })

    await generateWithProvider({ ...provider, kind: 'gemini' }, 'test-model', 'build something', { signal: controller.signal })

    expect(geminiMocks.generateContent).toHaveBeenCalledWith(expect.objectContaining({
      model: 'test-model',
      config: expect.objectContaining({ abortSignal: controller.signal }),
    }))
  })
})

describe('generation token and finish boundaries', () => {
  it('caps OpenAI output tokens and reports a length finish', async () => {
    openaiMocks.create.mockResolvedValue({ choices: [{ finish_reason: 'length', message: { content: '' } }] })

    await expect(generateWithProvider({ ...provider, kind: 'openai' }, 'test-model', 'build something'))
      .rejects.toThrow('模型输出达到 token 上限，项目 JSON 不完整')
    expect(openaiMocks.create).toHaveBeenCalledWith(
      expect.objectContaining({ max_completion_tokens: 8_192 }),
      { signal: undefined },
    )
  })

  it('caps Anthropic output tokens and reports max_tokens', async () => {
    anthropicMocks.create.mockResolvedValue({ stop_reason: 'max_tokens', content: [] })

    await expect(generateWithProvider({ ...provider, kind: 'anthropic' }, 'test-model', 'build something'))
      .rejects.toThrow('模型输出达到 token 上限，项目 JSON 不完整')
    expect(anthropicMocks.create).toHaveBeenCalledWith(
      expect.objectContaining({ max_tokens: 8_192 }),
      { signal: undefined },
    )
  })

  it('caps Gemini output tokens and reports MAX_TOKENS', async () => {
    geminiMocks.generateContent.mockResolvedValue({ candidates: [{ finishReason: 'MAX_TOKENS' }] })

    await expect(generateWithProvider({ ...provider, kind: 'gemini' }, 'test-model', 'build something'))
      .rejects.toThrow('模型输出达到 token 上限，项目 JSON 不完整')
    expect(geminiMocks.generateContent).toHaveBeenCalledWith(expect.objectContaining({
      config: expect.objectContaining({ maxOutputTokens: 8_192 }),
    }))
  })

  it.each([
    ['OpenAI content filter', { kind: 'openai' as const }, 'content_filter', '模型因安全策略拒绝了本次生成'],
    ['Anthropic refusal', { kind: 'anthropic' as const }, 'refusal', '模型拒绝了本次生成'],
    ['Gemini safety', { kind: 'gemini' as const }, 'SAFETY', '模型未完成项目生成（SAFETY）'],
  ])('rejects a non-success finish reason: %s', async (_name, providerOverride, finishReason, message) => {
    if (providerOverride.kind === 'openai') {
      openaiMocks.create.mockResolvedValue({ choices: [{ finish_reason: finishReason, message: { content: '' } }] })
    } else if (providerOverride.kind === 'anthropic') {
      anthropicMocks.create.mockResolvedValue({ stop_reason: finishReason, content: [] })
    } else {
      geminiMocks.generateContent.mockResolvedValue({ candidates: [{ finishReason }] })
    }

    await expect(generateWithProvider({ ...provider, ...providerOverride }, 'test-model', 'build something')).rejects.toThrow(message)
  })

  it('rejects an OpenAI refusal message', async () => {
    openaiMocks.create.mockResolvedValue({ choices: [{ finish_reason: 'stop', message: { content: '', refusal: 'I cannot help with that.' } }] })

    await expect(generateWithProvider({ ...provider, kind: 'openai' }, 'test-model', 'build something'))
      .rejects.toThrow('模型拒绝了本次生成：I cannot help with that.')
  })
})
