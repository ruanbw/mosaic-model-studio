import type OpenAI from 'openai'
import { normalizeGeneratedProject } from './project/normalize'
import type { GenerationOutput } from './project/types'
import { PROJECT_GENERATION_SYSTEM_PROMPT } from './prompts'
import { isAllowedProviderBaseUrl, normalizeProviderBaseUrl } from './providerUrl'
import type { Provider } from './types'

export type { GenerationOutput } from './project/types'

export interface GenerationOptions {
  signal?: AbortSignal
}

const MAX_GENERATION_TOKENS = 8_192

const PROJECT_JSON_SCHEMA = {
  type: 'object' as const,
  additionalProperties: false as const,
  properties: {
    schemaVersion: { type: 'integer', enum: [1] },
    title: { type: 'string' },
    summary: { type: 'string' },
    files: {
      type: 'array',
      minItems: 1,
      maxItems: 32,
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          path: { type: 'string' },
          content: { type: 'string' },
        },
        required: ['path', 'content'],
      },
    },
  },
  required: ['schemaVersion', 'title', 'summary', 'files'],
}

const getBaseUrl = (provider: Provider) => {
  const baseUrl = normalizeProviderBaseUrl(provider.kind, provider.baseUrl)
  if (!baseUrl) return undefined
  if (!isAllowedProviderBaseUrl(baseUrl)) {
    throw new Error(`${provider.name} 的 Base URL 不安全`)
  }
  return baseUrl
}

const assertApiKey = (provider: Provider) => {
  if (!provider.apiKey.trim()) throw new Error(`${provider.name} 尚未配置 API Key`)
}

const assertGenerationConfigured = (provider: Provider) => {
  assertApiKey(provider)
  if (provider.models.length === 0) throw new Error(`${provider.name} 尚未添加模型`)
}

const createOpenAIClient = async (provider: Provider) => {
  const { default: OpenAI } = await import('openai')
  const baseUrl = getBaseUrl(provider)
  const isOpenRouter = provider.kind === 'openai-compatible' && baseUrl?.includes('openrouter.ai')
  return new OpenAI({
    apiKey: provider.apiKey,
    baseURL: baseUrl,
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

const createAnthropicClient = async (provider: Provider) => {
  const { default: Anthropic } = await import('@anthropic-ai/sdk')
  return new Anthropic({
    apiKey: provider.apiKey,
    baseURL: getBaseUrl(provider),
    dangerouslyAllowBrowser: true,
    maxRetries: 1,
    timeout: 120_000,
  })
}

const createGeminiClient = async (provider: Provider) => {
  const { GoogleGenAI } = await import('@google/genai')
  return new GoogleGenAI({
    apiKey: provider.apiKey,
    httpOptions: {
      baseUrl: getBaseUrl(provider),
      timeout: 120_000,
    },
  })
}

export const fetchProviderModels = async (
  provider: Provider,
  options: GenerationOptions = {},
): Promise<string[]> => {
  assertApiKey(provider)
  const modelIds: string[] = []

  if (provider.kind === 'gemini') {
    const client = await createGeminiClient(provider)
    const pager = await client.models.list({
      config: { pageSize: 200, abortSignal: options.signal },
    })
    for await (const model of pager) {
      if (model.name) modelIds.push(model.name.replace(/^models\//, ''))
    }
  } else if (provider.kind === 'anthropic') {
    const client = await createAnthropicClient(provider)
    const page = await client.models.list({ limit: 200 }, { signal: options.signal })
    for await (const model of page) modelIds.push(model.id)
  } else {
    const client = await createOpenAIClient(provider)
    const page = await client.models.list({ signal: options.signal })
    for await (const model of page) modelIds.push(model.id)
  }

  const uniqueModels = [...new Set(modelIds)].sort((left, right) => left.localeCompare(right))
  if (uniqueModels.length === 0) throw new Error('该服务没有返回可用模型')
  return uniqueModels
}

type OpenAIChoice = NonNullable<OpenAI.Chat.Completions.ChatCompletion['choices']>[number]

const assertOpenAICompletion = (choice: OpenAIChoice | undefined) => {
  if (!choice) throw new Error('模型没有返回候选结果')
  if (choice.finish_reason === 'length') throw new Error('模型输出达到 token 上限，项目 JSON 不完整')
  if (choice.finish_reason === 'content_filter') throw new Error('模型因安全策略拒绝了本次生成')
  if (choice.message.refusal?.trim()) throw new Error(`模型拒绝了本次生成：${choice.message.refusal.trim()}`)
}

const isResponseFormatUnsupported = (error: unknown) => {
  if (!(error instanceof Error)) return false
  const candidate = error as Error & { status?: number }
  if (![400, 404, 422].includes(candidate.status ?? 0)) return false
  return /response.?format|json.?mode|output.?config|json.?schema|structured.?output|unsupported|unexpected.?keyword/i.test(candidate.message)
}

const generateWithOpenAICompatible = async (
  provider: Provider,
  model: string,
  prompt: string,
  options: GenerationOptions,
): Promise<GenerationOutput> => {
  const client = await createOpenAIClient(provider)
  const messages = [
    { role: 'system' as const, content: PROJECT_GENERATION_SYSTEM_PROMPT },
    { role: 'user' as const, content: prompt },
  ]
  const request = {
    model,
    messages,
    ...(provider.kind === 'openai'
      ? {
          max_completion_tokens: MAX_GENERATION_TOKENS,
          response_format: {
            type: 'json_schema' as const,
            json_schema: {
              name: 'generated_project',
              strict: true,
              schema: PROJECT_JSON_SCHEMA,
            },
          },
        }
      : {
          max_tokens: MAX_GENERATION_TOKENS,
          response_format: { type: 'json_object' as const },
        }),
  }

  let response
  try {
    response = await client.chat.completions.create(request, { signal: options.signal })
  } catch (error) {
    if (provider.kind !== 'openai-compatible' || !isResponseFormatUnsupported(error)) throw error
    // Older OpenAI-compatible gateways may not implement JSON mode. In that case,
    // request plain text and rely on the host's fenced-JSON normalizer.
    response = await client.chat.completions.create(
      { model, messages, max_tokens: MAX_GENERATION_TOKENS },
      { signal: options.signal },
    )
  }

  const choice = response.choices[0]
  assertOpenAICompletion(choice)
  const raw = choice?.message.content ?? ''
  if (!raw.trim()) throw new Error('模型返回了空内容')
  return normalizeGeneratedProject(raw, model)
}

const generateWithAnthropic = async (
  provider: Provider,
  model: string,
  prompt: string,
  options: GenerationOptions,
): Promise<GenerationOutput> => {
  const client = await createAnthropicClient(provider)
  const baseRequest = {
    model,
    max_tokens: MAX_GENERATION_TOKENS,
    system: PROJECT_GENERATION_SYSTEM_PROMPT,
    messages: [{ role: 'user' as const, content: prompt }],
  }
  let response
  try {
    response = await client.messages.create(
      {
        ...baseRequest,
        output_config: {
          format: {
            type: 'json_schema',
            schema: PROJECT_JSON_SCHEMA,
          },
        },
      },
      { signal: options.signal },
    )
  } catch (error) {
    if (!isResponseFormatUnsupported(error)) throw error
    response = await client.messages.create(baseRequest, { signal: options.signal })
  }
  if (response.stop_reason === 'max_tokens') throw new Error('模型输出达到 token 上限，项目 JSON 不完整')
  if (response.stop_reason === 'refusal') throw new Error('模型拒绝了本次生成')

  const raw = response.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('')
  if (!raw.trim()) throw new Error('模型返回了空内容')
  return normalizeGeneratedProject(raw, model)
}

const generateWithGemini = async (
  provider: Provider,
  model: string,
  prompt: string,
  options: GenerationOptions,
): Promise<GenerationOutput> => {
  options.signal?.throwIfAborted()
  const client = await createGeminiClient(provider)
  const response = await client.models.generateContent({
    model,
    contents: prompt,
    config: {
      systemInstruction: PROJECT_GENERATION_SYSTEM_PROMPT,
      responseMimeType: 'application/json',
      responseJsonSchema: PROJECT_JSON_SCHEMA,
      maxOutputTokens: MAX_GENERATION_TOKENS,
      abortSignal: options.signal,
    },
  })

  if (response.promptFeedback?.blockReason) {
    throw new Error(`模型因安全策略拒绝了本次生成（${response.promptFeedback.blockReason}）`)
  }
  const finishReason = response.candidates?.[0]?.finishReason
  if (finishReason === 'MAX_TOKENS') throw new Error('模型输出达到 token 上限，项目 JSON 不完整')
  if (finishReason && !['STOP', 'FINISH_REASON_UNSPECIFIED'].includes(finishReason)) {
    throw new Error(`模型未完成项目生成（${finishReason}）`)
  }

  const raw = response.text ?? ''
  if (!raw.trim()) throw new Error('模型返回了空内容')
  return normalizeGeneratedProject(raw, model)
}

export const generateWithProvider = async (
  provider: Provider,
  model: string,
  prompt: string,
  options: GenerationOptions = {},
): Promise<GenerationOutput> => {
  assertGenerationConfigured(provider)
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
