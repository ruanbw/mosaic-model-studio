import Anthropic from '@anthropic-ai/sdk'
import { GoogleGenAI } from '@google/genai'
import DOMPurify from 'dompurify'
import OpenAI from 'openai'
import { PAGE_GENERATION_SYSTEM_PROMPT } from './prompts'
import type { Provider } from './types'

export interface GenerationOutput {
  raw: string
  html: string
}

export interface GenerationOptions {
  signal?: AbortSignal
}

const getBaseUrl = (provider: Provider) => provider.baseUrl?.trim() || undefined

const escapeHtml = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')

const unwrapCodeFence = (value: string) => {
  const fenced = value.match(/```(?:html)?\s*([\s\S]*?)```/i)
  return (fenced?.[1] ?? value).trim()
}

export const toPreviewDocument = (value: string): string => {
  const candidate = unwrapCodeFence(value)
  const htmlStart = candidate.search(/<(?:!doctype|html|head|body|main|section|div)\b/i)
  const focused = htmlStart > 0 ? candidate.slice(htmlStart) : candidate
  const document = /<(?:!doctype|html|body|main|section|div)\b/i.test(focused)
    ? focused
    : `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Mosaic preview</title></head><body><pre>${escapeHtml(focused)}</pre></body></html>`

  return DOMPurify.sanitize(document, {
    WHOLE_DOCUMENT: true,
    USE_PROFILES: { html: true },
  })
}

const assertConfigured = (provider: Provider) => {
  if (!provider.apiKey.trim()) throw new Error(`${provider.name} 尚未配置 API Key`)
  if (provider.models.length === 0) throw new Error(`${provider.name} 尚未添加模型`)
}

const createOpenAIClient = (provider: Provider) => {
  const isOpenRouter = provider.kind === 'openai-compatible' && provider.baseUrl?.includes('openrouter.ai')
  return new OpenAI({
    apiKey: provider.apiKey,
    baseURL: getBaseUrl(provider),
    dangerouslyAllowBrowser: true,
    maxRetries: 1,
    timeout: 120_000,
    defaultHeaders: isOpenRouter
      ? {
          'HTTP-Referer': typeof window === 'undefined' ? 'https://mosaic.local' : window.location.origin,
          'X-OpenRouter-Title': 'Mosaic Model Studio',
        }
      : undefined,
  })
}

const createAnthropicClient = (provider: Provider) =>
  new Anthropic({
    apiKey: provider.apiKey,
    baseURL: getBaseUrl(provider),
    dangerouslyAllowBrowser: true,
    maxRetries: 1,
    timeout: 120_000,
  })

const createGeminiClient = (provider: Provider) =>
  new GoogleGenAI({
    apiKey: provider.apiKey,
    httpOptions: {
      baseUrl: getBaseUrl(provider),
      timeout: 120_000,
    },
  })

const generateWithOpenAICompatible = async (
  provider: Provider,
  model: string,
  prompt: string,
  options: GenerationOptions,
): Promise<GenerationOutput> => {
  const client = createOpenAIClient(provider)
  const response = await client.chat.completions.create(
    {
      model,
      messages: [
        { role: 'system', content: PAGE_GENERATION_SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
    },
    { signal: options.signal },
  )
  const raw = response.choices[0]?.message.content ?? ''
  if (!raw.trim()) throw new Error('模型返回了空内容')
  return { raw, html: toPreviewDocument(raw) }
}

const generateWithAnthropic = async (
  provider: Provider,
  model: string,
  prompt: string,
  options: GenerationOptions,
): Promise<GenerationOutput> => {
  const client = createAnthropicClient(provider)
  const response = await client.messages.create(
    {
      model,
      max_tokens: 8192,
      system: PAGE_GENERATION_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: prompt }],
    },
    { signal: options.signal },
  )
  const raw = response.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('')
  if (!raw.trim()) throw new Error('模型返回了空内容')
  return { raw, html: toPreviewDocument(raw) }
}

const generateWithGemini = async (
  provider: Provider,
  model: string,
  prompt: string,
  options: GenerationOptions,
): Promise<GenerationOutput> => {
  options.signal?.throwIfAborted()
  const client = createGeminiClient(provider)
  const response = await client.models.generateContent({
    model,
    contents: prompt,
    config: {
      systemInstruction: PAGE_GENERATION_SYSTEM_PROMPT,
    },
  })
  const raw = response.text ?? ''
  if (!raw.trim()) throw new Error('模型返回了空内容')
  return { raw, html: toPreviewDocument(raw) }
}

export const generateWithProvider = async (
  provider: Provider,
  model: string,
  prompt: string,
  options: GenerationOptions = {},
): Promise<GenerationOutput> => {
  assertConfigured(provider)
  options.signal?.throwIfAborted()

  if (provider.kind === 'anthropic') {
    return generateWithAnthropic(provider, model, prompt, options)
  }
  if (provider.kind === 'gemini') {
    return generateWithGemini(provider, model, prompt, options)
  }
  return generateWithOpenAICompatible(provider, model, prompt, options)
}

export const providerErrorMessage = (error: unknown): string => {
  if (error instanceof DOMException && error.name === 'AbortError') return '请求已取消'
  if (error instanceof Error) {
    const candidate = error as Error & { status?: number }
    return candidate.status ? `请求失败（${candidate.status}）：${candidate.message}` : candidate.message
  }
  return '请求失败，请检查密钥、模型名称与浏览器跨域设置。'
}
