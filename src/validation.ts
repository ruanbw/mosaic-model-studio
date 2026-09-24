import { z } from 'zod'

export const providerDraftSchema = z.object({
  name: z.string().trim().min(2, '请输入提供商名称').max(40, '名称最多 40 个字符'),
  kind: z.enum(['openai', 'anthropic', 'gemini', 'openai-compatible']),
  apiKey: z.string().trim().max(240, '密钥长度异常'),
  baseUrl: z
    .string()
    .trim()
    .max(300, '地址最多 300 个字符')
    .refine((value) => value === '' || /^https?:\/\/.+/.test(value), '请输入完整的 HTTP(S) 地址'),
  models: z
    .string()
    .trim()
    .min(1, '至少添加一个模型')
    .refine(
      (value) => value.split(/[\n,]/).map((item) => item.trim()).filter(Boolean).length > 0,
      '至少添加一个模型',
    ),
})

export type ProviderFormValues = z.infer<typeof providerDraftSchema>
