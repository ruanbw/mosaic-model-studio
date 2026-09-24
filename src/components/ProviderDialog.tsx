import { zodResolver } from '@hookform/resolvers/zod'
import * as Dialog from '@radix-ui/react-dialog'
import { Eye, EyeOff, KeyRound, Plus, RefreshCw, Server, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState, type MutableRefObject } from 'react'
import { useTranslation } from 'react-i18next'
import { useForm, type FieldErrors, type FieldPath } from 'react-hook-form'
import { toast } from 'sonner'
import { fetchProviderModels, isAbortError, providerErrorMessage } from '../api'
import { providerDraftSchema, type ProviderFormValues } from '../validation'
import { isDefaultProviderBaseUrl } from '../providerUrl'
import { PROVIDER_KIND_DEFAULTS, PROVIDER_KIND_LABELS, type Provider, type ProviderDraft, type ProviderKind } from '../types'

interface ProviderDialogProps { open: boolean; onOpenChange: (open: boolean) => void; provider?: Provider | null; onSave: (draft: ProviderDraft, providerId?: string) => void; onDelete?: (provider: Provider) => void; returnFocusRef?: MutableRefObject<HTMLElement | null> }
interface ModelRequest { id: number; controller: AbortController; providerId?: string }
const emptyValues: ProviderFormValues = { name: '', kind: 'openai-compatible', apiKey: '', baseUrl: PROVIDER_KIND_DEFAULTS['openai-compatible'].baseUrl, models: '' }
const formFieldOrder: FieldPath<ProviderFormValues>[] = ['name', 'apiKey', 'baseUrl', 'models', 'kind']

export function ProviderDialog({ open, onOpenChange, provider = null, onSave, onDelete, returnFocusRef }: ProviderDialogProps) {
  const { t } = useTranslation()
  const [showKey, setShowKey] = useState(false)
  const [fetchingModels, setFetchingModels] = useState(false)
  const { register, handleSubmit, reset, setValue, setError, clearErrors, getValues, setFocus, watch, formState: { errors, isSubmitting } } = useForm<ProviderFormValues>({ resolver: zodResolver(providerDraftSchema), defaultValues: emptyValues })
  const kind = watch('kind')
  const contentRef = useRef<HTMLDivElement>(null)
  const nameInputRef = useRef<HTMLInputElement>(null)
  const openerRef = useRef<HTMLElement | null>(null)
  const activeRequestRef = useRef<ModelRequest | null>(null)
  const requestIdRef = useRef(0)
  const openRef = useRef(open)
  const providerIdRef = useRef(provider?.id)
  openRef.current = open
  providerIdRef.current = provider?.id

  const invalidateModelRequest = useCallback(() => {
    requestIdRef.current += 1
    activeRequestRef.current?.controller.abort()
    activeRequestRef.current = null
  }, [])

  const cancelModelRequest = useCallback(() => {
    invalidateModelRequest()
    setFetchingModels(false)
  }, [invalidateModelRequest])

  const beginModelRequest = useCallback((): ModelRequest => {
    activeRequestRef.current?.controller.abort()
    const request: ModelRequest = { id: requestIdRef.current + 1, controller: new AbortController(), providerId: providerIdRef.current }
    requestIdRef.current = request.id
    activeRequestRef.current = request
    return request
  }, [])

  const isCurrentModelRequest = useCallback((request: ModelRequest) => (
    activeRequestRef.current === request &&
    requestIdRef.current === request.id &&
    openRef.current &&
    providerIdRef.current === request.providerId
  ), [])

  const finishModelRequest = useCallback((request: ModelRequest) => {
    if (activeRequestRef.current !== request) return
    activeRequestRef.current = null
    setFetchingModels(false)
  }, [])

  const showSchemaErrors = useCallback((issues: readonly { path: (string | number)[]; message: string }[]) => {
    clearErrors()
    let firstField: FieldPath<ProviderFormValues> | undefined
    for (const issue of issues) {
      const field = issue.path[0]
      if (typeof field !== 'string' || !formFieldOrder.includes(field as FieldPath<ProviderFormValues>)) continue
      setError(field as FieldPath<ProviderFormValues>, { type: 'validation', message: issue.message })
      if (!firstField) firstField = field as FieldPath<ProviderFormValues>
    }
    if (firstField) setFocus(firstField)
  }, [clearErrors, setError, setFocus])

  const parseValues = useCallback((values: ProviderFormValues) => {
    const result = providerDraftSchema.safeParse(values)
    if (!result.success) {
      showSchemaErrors(result.error.issues)
      return null
    }
    clearErrors()
    return result.data
  }, [clearErrors, showSchemaErrors])

  const requestModels = async (values: ProviderFormValues, signal: AbortSignal) => fetchProviderModels({ id: 'draft', name: values.name || 'Draft', kind: values.kind, apiKey: values.apiKey, baseUrl: values.baseUrl || undefined, models: [], accent: '#8ef0c4', enabled: true }, { signal })

  useEffect(() => {
    cancelModelRequest()
    if (!open) return
    reset(provider ? { name: provider.name, kind: provider.kind, apiKey: provider.apiKey, baseUrl: provider.baseUrl ?? '', models: provider.models.join('\n') } : emptyValues)
    setShowKey(false)
  }, [open, provider, reset, cancelModelRequest])

  useEffect(() => () => {
    requestIdRef.current += 1
    activeRequestRef.current?.controller.abort()
    activeRequestRef.current = null
  }, [])

  const handleFetchModels = async () => {
    const values = parseValues(getValues())
    if (!values) return
    if (!values.apiKey) {
      setError('apiKey', { type: 'validation', message: t('dialog.apiKeyRequired') })
      setFocus('apiKey')
      return
    }

    const request = beginModelRequest()
    setFetchingModels(true)
    try {
      const models = await requestModels(values, request.controller.signal)
      if (!isCurrentModelRequest(request)) return
      setValue('models', models.join('\n'), { shouldDirty: true, shouldValidate: true })
      toast.success(t('dialog.modelsFetched', { count: models.length }))
    } catch (error) {
      if (isCurrentModelRequest(request) && !isAbortError(error)) toast.error(providerErrorMessage(error))
    } finally {
      finishModelRequest(request)
    }
  }

  const submit = async (rawValues: ProviderFormValues) => {
    const values = parseValues(rawValues)
    if (!values) return
    cancelModelRequest()
    const submitProviderId = providerIdRef.current
    let models = values.models.trim()
    if (!models && values.apiKey) {
      const request = beginModelRequest()
      setFetchingModels(true)
      try {
        const fetchedModels = await requestModels(values, request.controller.signal)
        if (!isCurrentModelRequest(request)) return
        models = fetchedModels.join('\n')
        setValue('models', models, { shouldDirty: true, shouldValidate: true })
      } catch (error) {
        if (isCurrentModelRequest(request) && !isAbortError(error)) toast.error(providerErrorMessage(error))
        return
      } finally {
        finishModelRequest(request)
      }
    }
    if (!openRef.current || providerIdRef.current !== submitProviderId) return
    if (!models) {
      setError('models', { type: 'validation', message: t('validation.models') })
      setFocus('models')
      return
    }
    onSave({ ...values, models }, submitProviderId)
    toast.success(provider ? t('dialog.updated') : t('dialog.added'))
    handleOpenChange(false)
  }

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      openRef.current = false
      cancelModelRequest()
    }
    onOpenChange(nextOpen)
  }

  const handleInvalid = (formErrors: FieldErrors<ProviderFormValues>) => {
    const firstField = formFieldOrder.find((field) => formErrors[field])
    if (firstField) setFocus(firstField)
  }

  const kindField = register('kind', { onChange: (event) => {
    cancelModelRequest()
    const nextKind = event.target.value as ProviderKind
    const currentBaseUrl = getValues('baseUrl')
    if (!currentBaseUrl || isDefaultProviderBaseUrl(kind, currentBaseUrl)) {
      setValue('baseUrl', PROVIDER_KIND_DEFAULTS[nextKind].baseUrl, { shouldValidate: true })
    }
  } })
  const { ref: nameRhfRef, ...nameField } = register('name', { onChange: cancelModelRequest })
  const baseUrlField = register('baseUrl', { onChange: cancelModelRequest })
  const apiKeyField = register('apiKey', { onChange: cancelModelRequest })
  const modelsField = register('models', { onChange: cancelModelRequest })
  const handleDelete = () => {
    if (!provider || !onDelete) return
    cancelModelRequest()
    onDelete(provider)
  }

  return <Dialog.Root open={open} onOpenChange={handleOpenChange}><Dialog.Portal><Dialog.Overlay className="fixed inset-0 z-[80] bg-[#030507]/72 backdrop-blur-sm" /><Dialog.Content ref={contentRef} className="fixed left-1/2 top-1/2 z-[81] flex max-h-[calc(100vh-30px)] w-[min(560px,calc(100vw-30px))] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-[11px] border border-line bg-surface shadow-[0_28px_80px_color-mix(in_srgb,#000_45%,transparent)] max-[580px]:max-h-[calc(100dvh-16px)] max-[580px]:w-[calc(100vw-16px)]" onOpenAutoFocus={(event) => {
    const activeElement = document.activeElement
    if (activeElement instanceof HTMLElement && !contentRef.current?.contains(activeElement)) openerRef.current = activeElement
    if (nameInputRef.current) {
      event.preventDefault()
      nameInputRef.current.focus()
    }
  }} onCloseAutoFocus={(event) => {
    const opener = returnFocusRef?.current ?? openerRef.current
    const canFocusOpener = opener && opener !== document.body && opener.isConnected && !contentRef.current?.contains(opener) && !opener.hasAttribute('disabled')
    if (canFocusOpener) {
      event.preventDefault()
      opener.focus()
      openerRef.current = null
      return
    }
    const fallback = [...document.querySelectorAll<HTMLElement>('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')].find((element) => {
      if (contentRef.current?.contains(element) || element.hasAttribute('aria-hidden')) return false
      const style = window.getComputedStyle(element)
      return style.display !== 'none' && style.visibility !== 'hidden' && element.getClientRects().length > 0
    })
    if (fallback) {
      event.preventDefault()
      fallback.focus()
    }
    openerRef.current = null
  }}><div className="shrink-0 border-b border-line-soft px-5 pb-4 pt-5 max-[580px]:px-4 max-[580px]:pt-4"><div className="flex items-start justify-between gap-4"><div><p className="eyebrow mb-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-faint">LOCAL CONFIG</p><Dialog.Title className="m-0 text-xl font-medium tracking-[-0.04em] text-ink">{provider ? t('dialog.edit') : t('dialog.add')}</Dialog.Title><Dialog.Description className="mt-2 max-w-[390px] text-[11px] leading-[1.5] text-muted">{t('dialog.description')}</Dialog.Description></div><Dialog.Close asChild><button className="grid size-7 shrink-0 place-items-center rounded-md text-[#737b82] transition-colors hover:bg-surface-hover hover:text-ink" type="button" aria-label={t('common.close')}><X size={17} /></button></Dialog.Close></div></div>
      <form className="flex min-h-0 flex-1 flex-col" onSubmit={handleSubmit(submit, handleInvalid)}><div className="min-h-0 flex-1 overflow-y-auto px-5 pb-4 pt-4 [overscroll-behavior:contain] max-[580px]:px-4"><div className="grid gap-3 min-[580px]:grid-cols-2"><label className="flex flex-col gap-1.5"><span className="text-[11px] font-medium text-[#aab0b1]">{t('dialog.name')}</span><input ref={(element) => { nameInputRef.current = element; nameRhfRef(element) }} id="provider-name" className="w-full rounded-md border border-line bg-surface-soft px-2.5 py-2.5 text-xs text-ink outline-none placeholder:text-faint focus:border-mint/50 aria-[invalid=true]:border-red" {...nameField} placeholder={t('dialog.namePlaceholder')} aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? 'provider-name-error' : undefined} />{errors.name && <small id="provider-name-error" role="alert" className="text-[10px] text-red">{t('validation.name')}</small>}</label><label className="flex flex-col gap-1.5"><span className="text-[11px] font-medium text-[#aab0b1]">{t('dialog.protocol')}</span><select id="provider-kind" className="w-full rounded-md border border-line bg-surface-soft px-2.5 py-2.5 text-xs text-ink outline-none focus:border-mint/50" {...kindField} aria-invalid={Boolean(errors.kind)} aria-describedby={errors.kind ? 'provider-kind-error' : undefined}>{Object.entries(PROVIDER_KIND_LABELS).map(([value]) => <option key={value} value={value}>{t(`providerKind.${value}`)}</option>)}</select>{errors.kind && <small id="provider-kind-error" role="alert" className="text-[10px] text-red">{errors.kind.message ?? t('dialog.protocol')}</small>}</label></div>
        <div className="mt-4 flex flex-col gap-4"><label className="flex flex-col gap-1.5"><span className="text-[11px] font-medium text-[#aab0b1]">{t('dialog.baseUrl')}</span><div className="relative"><Server className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[#707980]" size={16} /><input id="provider-base-url" className="w-full rounded-md border border-line bg-surface-soft py-2.5 pl-8 pr-2.5 text-xs text-ink outline-none placeholder:text-[#5f676e] focus:border-mint/50 aria-[invalid=true]:border-red" {...baseUrlField} placeholder={PROVIDER_KIND_DEFAULTS[kind].baseUrl} spellCheck={false} aria-invalid={Boolean(errors.baseUrl)} aria-describedby={errors.baseUrl ? 'provider-base-url-hint provider-base-url-error' : 'provider-base-url-hint'} /></div><small id="provider-base-url-hint" className="text-[10px] leading-[1.45] text-[#687078]">{t('dialog.urlHint')}</small>{errors.baseUrl && <small id="provider-base-url-error" role="alert" className="text-[10px] text-red">{t('validation.baseUrl')}</small>}</label>
        <label className="flex flex-col gap-1.5"><span className="text-[11px] font-medium text-[#aab0b1]">{t('dialog.key')}</span><div className="relative"><KeyRound className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[#707980]" size={16} /><input id="provider-api-key" className="w-full rounded-md border border-line bg-surface-soft py-2.5 pl-8 pr-9 text-xs text-ink outline-none placeholder:text-[#5f676e] focus:border-mint/50 aria-[invalid=true]:border-red" {...apiKeyField} type={showKey ? 'text' : 'password'} placeholder="sk-..." autoComplete="off" aria-invalid={Boolean(errors.apiKey)} aria-describedby={errors.apiKey ? 'provider-api-key-error' : undefined} /><button className="absolute right-1 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded text-[#737b82] transition-colors hover:bg-surface-hover hover:text-ink" type="button" onClick={() => setShowKey((visible) => !visible)} aria-label={showKey ? t('dialog.hideKey') : t('dialog.showKey')}>{showKey ? <EyeOff size={16} /> : <Eye size={16} />}</button></div>{errors.apiKey && <small id="provider-api-key-error" role="alert" className="text-[10px] text-red">{errors.apiKey.message === t('dialog.apiKeyRequired') ? t('dialog.apiKeyRequired') : t('validation.apiKey')}</small>}</label>
        <label className="flex flex-col gap-1.5"><div className="flex items-center justify-between gap-3"><span className="text-[11px] font-medium text-[#aab0b1]">{t('dialog.models')}</span><button className="inline-flex items-center gap-1.5 rounded-md border border-line bg-surface-soft px-2 py-1 text-[10px] font-medium text-mint transition-colors hover:bg-surface-hover disabled:opacity-50" type="button" onClick={handleFetchModels} disabled={fetchingModels || isSubmitting} aria-busy={fetchingModels}><RefreshCw className={fetchingModels ? 'animate-spin' : ''} size={13} />{fetchingModels ? t('dialog.fetchingModels') : t('dialog.fetchModels')}</button></div><textarea id="provider-models" className="min-h-[84px] w-full resize-y rounded-md border border-line bg-surface-soft px-2.5 py-2.5 text-xs leading-[1.5] text-ink outline-none placeholder:text-[#5f676e] focus:border-mint/50 aria-[invalid=true]:border-red" {...modelsField} rows={4} placeholder={t('dialog.modelsPlaceholder')} aria-invalid={Boolean(errors.models)} aria-describedby={errors.models ? 'provider-model-hint provider-models-error' : 'provider-model-hint'} /><small id="provider-model-hint" className="text-[10px] leading-[1.45] text-[#687078]">{t('dialog.modelHint')}</small>{errors.models && <small id="provider-models-error" role="alert" className="text-[10px] text-red">{t('validation.models')}</small>}</label>
        <div className="flex items-start gap-2 rounded-md border border-yellow/15 bg-yellow/7 p-2.5 text-[#aa9e7c]"><span className="grid size-4 shrink-0 place-items-center rounded-full bg-yellow font-mono text-[10px] font-bold text-[#252014]">!</span><p className="m-0 text-[10px] leading-[1.5]">{t('dialog.security')}</p></div></div></div>
        <div className="shrink-0 border-t border-line-soft bg-surface px-5 py-3 max-[580px]:sticky max-[580px]:bottom-0 max-[580px]:px-4"><div className="flex flex-wrap items-center gap-2">{provider && onDelete && <button className="inline-flex min-h-9 items-center gap-2 rounded-md border border-red/25 bg-transparent px-3 text-[11px] font-semibold text-red transition-colors hover:bg-red/10 max-[580px]:flex" type="button" onClick={handleDelete}>{t('dialog.delete')}</button>}<div className="flex-1" /><Dialog.Close asChild><button className="inline-flex min-h-9 items-center gap-2 rounded-md border border-line bg-surface-soft px-3 text-[11px] font-semibold text-ink transition-colors hover:bg-[#2a3038]" type="button">{t('dialog.cancel')}</button></Dialog.Close><button className="inline-flex min-h-9 items-center gap-2 rounded-md border border-mint bg-mint px-3 text-[11px] font-semibold text-[#122018] transition-colors hover:bg-[#c0f7d9] disabled:opacity-50" type="submit" disabled={isSubmitting}><Plus size={16} />{provider ? t('dialog.save') : t('dialog.add')}</button></div></div>
      </form></Dialog.Content></Dialog.Portal></Dialog.Root>
}
