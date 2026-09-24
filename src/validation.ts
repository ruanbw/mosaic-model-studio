import { z } from 'zod'

export const providerDraftSchema = z.object({
  name: z.string().trim().min(2, '请输入提供商名称').max(40, '名称最多 40 个字符'),
  kind: z.enum(['openai', 'anthropic', 'gemini', 'openai-compatible']),
  apiKey: z.string().trim().max(240, '密钥长度异常'),
  baseUrl: z
    .string()
    .trim()
    .max(300, '地址最多 300 个字符')
    .refine(
      (value) =>
        value === '' ||
        /^https:\/\/.+/i.test(value) ||
        /^http:\/\/(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?(?:\/|$)/i.test(value),
      '出于安全考虑，仅允许 HTTPS 或本机 HTTP 地址',
    ),
  models: z.string().trim().max(20_000, '模型列表过长'),
})

export type ProviderFormValues = z.infer<typeof providerDraftSchema>
