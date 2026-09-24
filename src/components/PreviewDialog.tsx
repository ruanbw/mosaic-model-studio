import * as Dialog from '@radix-ui/react-dialog'
import { Copy, X } from 'lucide-react'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import type { GenerationResult } from '../types'

interface PreviewDialogProps { result: GenerationResult | null; open: boolean; onOpenChange: (open: boolean) => void }

export function PreviewDialog({ result, open, onOpenChange }: PreviewDialogProps) {
  const { t } = useTranslation()
  const copyHtml = async () => {
    if (!result?.html) return
    try { await navigator.clipboard.writeText(result.html); toast.success(t('results.copy')) } catch { toast.error(t('results.copyError')) }
  }
  return <Dialog.Root open={open} onOpenChange={onOpenChange}><Dialog.Portal><Dialog.Overlay className="fixed inset-0 z-[80] bg-[#030507]/85 backdrop-blur-sm" /><Dialog.Content className="fixed inset-5 z-[81] flex flex-col overflow-hidden rounded-[11px] border border-line bg-surface shadow-[0_28px_100px_color-mix(in_srgb,#000_55%,transparent)] max-[580px]:inset-2"><div className="flex min-h-16 items-center justify-between gap-3 border-b border-line-soft px-4 py-2.5"><div className="flex min-w-0 items-center gap-2.5"><span className="size-[7px] shrink-0 rounded-full shadow-[0_0_0_3px_color-mix(in_srgb,#fff_3.5%,transparent)]" style={{ background: result?.accent ?? '#8ef0c4' }} /><div className="min-w-0"><Dialog.Title className="truncate font-mono text-xs font-medium text-ink">{result?.model ?? t('results.previewTitle')}</Dialog.Title><Dialog.Description className="mt-1 text-[10px] text-muted">{result?.providerName ?? ''} · {t('results.sandbox')}</Dialog.Description></div></div><div className="flex gap-1"><button className="grid size-7 place-items-center rounded-md text-[#737b82] transition-colors hover:bg-surface-hover hover:text-ink disabled:opacity-50" type="button" onClick={copyHtml} disabled={!result?.html} aria-label={t('results.copyLabel')}><Copy size={16} /></button><Dialog.Close asChild><button className="grid size-7 place-items-center rounded-md text-[#737b82] transition-colors hover:bg-surface-hover hover:text-ink" type="button" aria-label={t('common.close')}><X size={18} /></button></Dialog.Close></div></div><div className="min-h-0 flex-1 bg-surface-soft p-3 max-[580px]:p-1.5">{result?.html ? <iframe className="size-full rounded-md border-0 bg-white" title={`${result.model} — ${t('results.expand')}`} srcDoc={result.html} sandbox="" /> : <div className="grid size-full place-items-center text-[#777f86]">{t('results.empty')}</div>}</div></Dialog.Content></Dialog.Portal></Dialog.Root>
}
