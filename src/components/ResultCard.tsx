import { Check, Copy, Expand, LoaderCircle, RotateCcw, Trash2, TriangleAlert } from 'lucide-react'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import type { GenerationResult } from '../types'

interface ResultCardProps {
  result: GenerationResult
  onExpand: (result: GenerationResult) => void
  onRemove: (resultId: string) => void
  onRetry?: (result: GenerationResult) => void
  busy: boolean
}

export function ResultCard({ result, onExpand, onRemove, onRetry, busy }: ResultCardProps) {
  const { t } = useTranslation()
  const copyHtml = async () => {
    if (!result.html) return
    try { await navigator.clipboard.writeText(result.html); toast.success(t('results.copy')) } catch { toast.error(t('results.copyError')) }
  }

  return (
    <article className={`min-w-0 overflow-hidden rounded-[10px] border bg-surface shadow-[0_8px_26px_color-mix(in_srgb,#000_10%,transparent)] ${result.status === 'error' ? 'border-red/30' : 'border-[#2d333b] hover:border-[#414954]'}`}>
      <header className="flex min-h-[57px] items-center justify-between gap-2.5 border-b border-line-soft px-3 py-2.5 pl-3.5">
        <div className="flex min-w-0 items-center gap-2.5"><span className="size-[7px] shrink-0 rounded-full shadow-[0_0_0_3px_color-mix(in_srgb,#fff_3.5%,transparent)]" style={{ background: result.accent }} /><div className="flex min-w-0 flex-col gap-0.5"><strong className="truncate font-mono text-[11px] font-medium text-ink">{result.model}</strong><span className="text-[10px] text-muted">{result.providerName}{result.isDemo && <em className="font-mono text-[9px] not-italic text-mint"> · DEMO</em>}</span></div></div>
        <div className="flex items-center gap-1.5"><span className={`inline-flex items-center gap-1 whitespace-nowrap font-mono text-[9px] ${result.status === 'success' ? 'text-mint' : result.status === 'error' ? 'text-red' : result.status === 'running' ? 'text-violet' : 'text-[#788087]'}`}>{result.status === 'running' && <LoaderCircle className="animate-spin" size={12} />}{result.status === 'error' && <TriangleAlert size={12} />}{result.status === 'success' && <Check size={12} />}{t(`results.${result.status}`)}</span><button className="grid size-7 place-items-center rounded-md text-[#858d93] transition-colors hover:bg-[#252b33] hover:text-ink disabled:opacity-50" type="button" onClick={() => onExpand(result)} disabled={!result.html} aria-label={`${t('results.expand')} ${result.model}`} title={t('results.expand')}><Expand size={16} /></button></div>
      </header>

      <div className="relative h-[355px] bg-surface-soft max-[1080px]:h-[300px] max-[580px]:h-[310px]">
        {result.status === 'success' && result.html && <iframe className="block size-full border-0 bg-white" title={`${result.model} — ${t('results.previewTitle')}`} srcDoc={result.html} sandbox="" />}
        {result.status === 'running' && <div className="flex size-full flex-col items-center justify-center px-6 text-center"><div className="relative grid size-14 place-items-center rounded-full border border-violet/45"><span className="absolute inset-1.5 rounded-full border border-mint/40" /><span className="absolute inset-0 rounded-full border border-orange/35" style={{ transform: 'rotate(55deg) scaleX(0.45)' }} /><span className="size-[7px] rounded-full bg-mint shadow-[0_0_14px_var(--mint)]" /></div><strong className="mt-4 text-xs font-medium text-ink">{t('results.building')}</strong><small className="mt-1 font-mono text-[10px] text-muted">{t('results.wait')}</small></div>}
        {result.status === 'queued' && <div className="flex size-full flex-col items-center justify-center gap-1 text-violet"><LoaderCircle className="animate-spin" size={22} /><strong className="mt-2 text-xs font-medium">{t('results.waiting')}</strong></div>}
        {result.status === 'error' && <div className="flex size-full flex-col items-center justify-center px-6 text-center"><span className="grid size-9 place-items-center rounded-full border border-red/20 bg-red/10 text-red"><TriangleAlert size={18} /></span><strong className="mt-4 text-xs font-medium text-ink">{t('results.failed')}</strong><p className="mb-4 mt-2 max-w-[350px] text-[11px] leading-[1.55] text-[#777f86]">{result.error}</p>{onRetry && <button className="inline-flex min-h-8 items-center gap-1.5 rounded-md border border-line bg-surface-soft px-2.5 text-[10px] font-semibold text-ink transition-colors hover:bg-[#2a3038]" type="button" onClick={() => onRetry(result)} disabled={busy}><RotateCcw size={14} />{t('results.retry')}</button>}</div>}
      </div>

      <footer className="flex min-h-[42px] items-center justify-between border-t border-line-soft px-2.5 py-1.5 pl-3.5 font-mono text-[10px] text-muted"><span>{result.elapsedMs ? `${(result.elapsedMs / 1000).toFixed(1)}s` : '—'}</span><div className="flex gap-0.5"><button className="grid size-7 place-items-center rounded-md text-[#858d93] transition-colors hover:bg-[#252b33] hover:text-ink disabled:opacity-50" type="button" onClick={copyHtml} disabled={!result.html} aria-label={t('results.copyLabel')} title={t('results.copyLabel')}><Copy size={15} /></button><button className="grid size-7 place-items-center rounded-md text-[#858d93] transition-colors hover:bg-red/10 hover:text-red" type="button" onClick={() => onRemove(result.id)} disabled={busy || result.status === 'running' || result.status === 'queued'} aria-label={t('results.remove')} title={t('results.remove')}><Trash2 size={15} /></button></div></footer>
    </article>
  )
}
