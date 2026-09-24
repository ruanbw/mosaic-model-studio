import { zodResolver } from '@hookform/resolvers/zod'
import * as Dialog from '@radix-ui/react-dialog'
import { Eye, EyeOff, KeyRound, Plus, Server, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { providerDraftSchema, type ProviderFormValues } from '../validation'
import {
  PROVIDER_KIND_DEFAULTS,
  PROVIDER_KIND_LABELS,
  type Provider,
  type ProviderDraft,
} from '../types'

interface ProviderDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  provider?: Provider | null
  onSave: (draft: ProviderDraft, providerId?: string) => void
  onDelete?: (provider: Provider) => void
}

const emptyValues: ProviderFormValues = {
  name: '',
  kind: 'openai-compatible',
  apiKey: '',
  baseUrl: PROVIDER_KIND_DEFAULTS['openai-compatible'].baseUrl,
  models: '',
}

export function ProviderDialog({
  open,
  onOpenChange,
  provider = null,
  onSave,
  onDelete,
}: ProviderDialogProps) {
  const [showKey, setShowKey] = useState(false)
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ProviderFormValues>({
    resolver: zodResolver(providerDraftSchema),
    defaultValues: emptyValues,
  })
  const kind = watch('kind')

  useEffect(() => {
    if (!open) return
    reset(
      provider
        ? {
            name: provider.name,
            kind: provider.kind,
            apiKey: provider.apiKey,
            baseUrl: provider.baseUrl ?? '',
            models: provider.models.join('\n'),
          }
        : emptyValues,
    )
    setShowKey(false)
  }, [open, provider, reset])

  const submit = (values: ProviderFormValues) => {
    onSave(values, provider?.id)
    toast.success(provider ? '提供商已更新' : '提供商已添加')
    onOpenChange(false)
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className="dialog-content provider-dialog">
          <div className="dialog-header">
            <div>
              <p className="eyebrow">LOCAL CONFIG</p>
              <Dialog.Title>{provider ? '编辑提供商' : '添加提供商'}</Dialog.Title>
              <Dialog.Description>
                密钥只保存在当前浏览器的本地存储中，不会发送到 Mosaic 服务器。
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button className="icon-button subtle" type="button" aria-label="关闭弹窗">
                <X size={17} />
              </button>
            </Dialog.Close>
          </div>

          <form className="provider-form" onSubmit={handleSubmit(submit)}>
            <div className="form-grid two-columns">
              <label className="field">
                <span>提供商名称</span>
                <input {...register('name')} placeholder="例如：OpenRouter" autoFocus />
                {errors.name && <small className="field-error">{errors.name.message}</small>}
              </label>
              <label className="field">
                <span>接口协议</span>
                <select {...register('kind')}>
                  {Object.entries(PROVIDER_KIND_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="field">
              <span>Base URL</span>
              <div className="input-with-icon">
                <Server size={16} />
                <input
                  {...register('baseUrl')}
                  placeholder={PROVIDER_KIND_DEFAULTS[kind].baseUrl}
                  spellCheck={false}
                />
              </div>
              {errors.baseUrl && <small className="field-error">{errors.baseUrl.message}</small>}
            </label>

            <label className="field">
              <span>API Key</span>
              <div className="input-with-icon key-input">
                <KeyRound size={16} />
                <input
                  {...register('apiKey')}
                  type={showKey ? 'text' : 'password'}
                  placeholder="sk-..."
                  autoComplete="off"
                />
                <button
                  className="input-action"
                  type="button"
                  onClick={() => setShowKey((visible) => !visible)}
                  aria-label={showKey ? '隐藏 API Key' : '显示 API Key'}
                >
                  {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.apiKey && <small className="field-error">{errors.apiKey.message}</small>}
            </label>

            <label className="field">
              <span>模型 ID</span>
              <textarea
                {...register('models')}
                rows={4}
                placeholder={'每行一个模型，例如：\ngpt-4o\nmy-provider/model'}
              />
              <small className="field-hint">支持换行或逗号分隔；模型名称由对应服务商定义。</small>
              {errors.models && <small className="field-error">{errors.models.message}</small>}
            </label>

            <div className="security-note">
              <span className="security-note-mark">!</span>
              <p>
                这是个人 BYOK 工具。浏览器本地存储可被同源脚本读取，请使用测试密钥、设置额度并定期撤销。
              </p>
            </div>

            <div className="dialog-actions">
              {provider && onDelete && (
                <button
                  className="button danger-ghost mobile-delete"
                  type="button"
                  onClick={() => onDelete(provider)}
                >
                  删除提供商
                </button>
              )}
              <div className="dialog-actions-spacer" />
              <Dialog.Close asChild>
                <button className="button secondary" type="button">
                  取消
                </button>
              </Dialog.Close>
              <button className="button primary" type="submit" disabled={isSubmitting}>
                <Plus size={16} />
                {provider ? '保存修改' : '添加提供商'}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
