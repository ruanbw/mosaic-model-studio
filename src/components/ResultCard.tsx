import {
  Check,
  ChevronDown,
  Copy,
  Expand,
  FileCode2,
  FolderCode,
  LoaderCircle,
  Play,
  RotateCcw,
  Trash2,
  TriangleAlert,
} from 'lucide-react'
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

export function ResultCard({ result, onExpand, onRetry, onRemove, busy }: ResultCardProps) {
  const { t } = useTranslation()
  const project = result.project
  const webProject = project?.kind === 'web' ? project : undefined
  const isWebProject = Boolean(webProject)
  const hasProject = Boolean(project)
  const canPreview = Boolean(result.html || project)
  const isBusy = result.status === 'running' || result.status === 'queued'
  const errorMessage = result.error ?? t('results.failed')

  const copyText = async (content: string, successMessage: string) => {
    if (!content) return
    try {
      await navigator.clipboard.writeText(content)
      toast.success(successMessage)
    } catch {
      toast.error(t('results.copyError'))
    }
  }

  const copyResult = () => {
    const content = isWebProject ? JSON.stringify(project, null, 2) : result.html
    return copyText(content ?? '', isWebProject ? t('results.projectCopied') : t('results.copy'))
  }

  const copyError = () => copyText(errorMessage, t('results.copy'))

  return (
    <article
      className={`min-w-0 overflow-hidden rounded-[10px] border bg-surface shadow-[0_8px_26px_color-mix(in_srgb,#000_10%,transparent)] ${result.status === 'error' ? 'border-red/30' : 'border-[#2d333b] hover:border-[#414954]'}`}
      aria-busy={isBusy}
    >
      <header className="flex min-h-[61px] items-center justify-between gap-2.5 border-b border-line-soft px-3 py-2.5 pl-3.5">
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <span className="size-[7px] shrink-0 rounded-full shadow-[0_0_0_3px_color-mix(in_srgb,#fff_3.5%,transparent)]" style={{ background: result.accent }} />
          <div className="flex min-w-0 flex-col gap-0.5">
            <strong className="break-words font-mono text-[11px] font-medium leading-[1.35] text-ink [overflow-wrap:anywhere]">{result.model}</strong>
            <span className="break-words text-[10px] text-muted [overflow-wrap:anywhere]">{result.providerName}{result.isDemo && <em className="font-mono text-[9px] not-italic text-mint"> · DEMO</em>}</span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {hasProject && (
            <span className={`hidden items-center gap-1 rounded border px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-[0.08em] sm:inline-flex ${isWebProject ? 'border-violet/25 bg-violet/10 text-violet' : 'border-line bg-surface-soft text-faint'}`}>
              {isWebProject ? <FolderCode size={10} /> : <FileCode2 size={10} />}
              {t(isWebProject ? 'results.projectBadge' : 'results.staticBadge')}
            </span>
          )}
          <span className="inline-flex items-center gap-1 whitespace-nowrap font-mono text-[9px]" role="status" aria-live="polite" aria-atomic="true">
            <span className={result.status === 'success' ? 'text-mint' : result.status === 'error' ? 'text-red' : result.status === 'running' ? 'text-violet' : 'text-[#788087]'}>
              {result.status === 'running' && <LoaderCircle className="animate-spin" size={12} />}
              {result.status === 'error' && <TriangleAlert size={12} />}
              {result.status === 'success' && <Check size={12} />}
              {t(`results.${result.status}`)}
            </span>
          </span>
          <button className="grid min-h-10 min-w-10 place-items-center rounded-md text-[#858d93] transition-colors hover:bg-[#252b33] hover:text-ink disabled:opacity-50" type="button" onClick={() => onExpand(result)} disabled={!canPreview} aria-label={`${isWebProject ? t('results.runProject') : t('results.expand')} ${result.model}`} title={isWebProject ? t('results.runProject') : t('results.expand')}>
            <Expand size={16} />
          </button>
        </div>
      </header>

      <div className="relative h-[355px] min-w-0 bg-surface-soft max-[1080px]:h-[300px] max-[580px]:h-[310px]">
        {result.status === 'success' && isWebProject && project && (
          <div className="flex size-full min-w-0 flex-col items-center justify-center bg-[radial-gradient(circle_at_top,#2a2338_0,transparent_48%)] px-6 text-center sm:px-8">
            <span className="grid size-12 shrink-0 place-items-center rounded-xl border border-violet/25 bg-violet/10 text-violet">
              <FolderCode size={24} />
            </span>
            <span className="mt-4 rounded border border-violet/25 bg-violet/10 px-2 py-1 font-mono text-[9px] uppercase tracking-[0.12em] text-violet">
              {t('results.projectBadge')}
            </span>
            <strong className="mt-3 max-w-full break-words text-center font-medium leading-[1.4] text-ink [overflow-wrap:anywhere]">{project.title}</strong>
            <p className="mt-2 line-clamp-3 max-w-[360px] break-words text-[11px] leading-[1.6] text-muted [overflow-wrap:anywhere]">{project.summary}</p>
            <span className="mt-3 font-mono text-[9px] text-faint">{t('results.fileCount', { count: project.files.length })}</span>
            <button className="mt-5 inline-flex min-h-10 items-center gap-2 rounded-md bg-ink px-4 text-[11px] font-semibold text-canvas transition-opacity hover:opacity-85" type="button" onClick={() => onExpand(result)}>
              <Play size={14} fill="currentColor" />
              {t('results.runProject')}
            </button>
          </div>
        )}
        {result.status === 'success' && !isWebProject && result.html && (
          <iframe className="block size-full border-0 bg-white" title={`${result.model} — ${t('results.previewTitle')}`} srcDoc={result.html} sandbox="" referrerPolicy="no-referrer" />
        )}
        {result.status === 'success' && !canPreview && <div className="grid size-full place-items-center px-6 text-center text-[#777f86]">{t('results.empty')}</div>}
        {result.status === 'running' && (
          <div className="flex size-full min-w-0 flex-col items-center justify-center px-6 text-center">
            <div className="relative grid size-14 place-items-center rounded-full border border-violet/45"><span className="absolute inset-1.5 rounded-full border border-mint/40" /><span className="absolute inset-0 rounded-full border border-orange/35" style={{ transform: 'rotate(55deg) scaleX(0.45)' }} /><span className="size-[7px] rounded-full bg-mint shadow-[0_0_14px_var(--mint)]" /></div>
            <strong className="mt-4 text-xs font-medium text-ink">{t('results.building')}</strong>
            <small className="mt-1 font-mono text-[10px] text-muted">{t('results.wait')}</small>
          </div>
        )}
        {result.status === 'queued' && <div className="flex size-full flex-col items-center justify-center gap-1 text-violet"><LoaderCircle className="animate-spin" size={22} /><strong className="mt-2 text-xs font-medium">{t('results.waiting')}</strong></div>}
        {result.status === 'cancelled' && (
          <div className="flex size-full min-w-0 flex-col items-center justify-center px-6 text-center">
            <span className="grid size-9 place-items-center rounded-full border border-line bg-surface-soft text-muted">×</span>
            <strong className="mt-4 text-xs font-medium text-ink">{t('results.cancelled')}</strong>
            <small className="mt-1 font-mono text-[10px] text-muted">{t('results.cancelledCopy')}</small>
          </div>
        )}
        {result.status === 'error' && (
          <div className="flex size-full min-w-0 flex-col items-center justify-center px-5 text-center sm:px-6">
            <span className="grid size-9 shrink-0 place-items-center rounded-full border border-red/20 bg-red/10 text-red"><TriangleAlert size={18} /></span>
            <strong className="mt-4 text-xs font-medium text-ink">{t('results.failed')}</strong>
            <p className="mt-2 line-clamp-2 max-w-[350px] break-words text-[11px] leading-[1.55] text-[#777f86] [overflow-wrap:anywhere]">{errorMessage}</p>
            <details className="group mt-2 w-full max-w-[350px] text-left">
              <summary className="flex min-h-10 cursor-pointer list-none items-center justify-center gap-1.5 text-[10px] font-semibold text-muted transition-colors hover:text-ink [&::-webkit-details-marker]:hidden">
                {t('results.expand')}
                <ChevronDown className="transition-transform group-open:rotate-180" size={14} />
              </summary>
              <div className="mt-1 rounded-md border border-red/15 bg-red/5 p-2.5">
                <p className="whitespace-pre-wrap break-words text-[10px] leading-[1.55] text-muted [overflow-wrap:anywhere]">{errorMessage}</p>
                <button className="mt-2 inline-flex min-h-10 w-full items-center justify-center gap-1.5 rounded-md border border-line bg-surface-soft px-2.5 text-[10px] font-semibold text-ink transition-colors hover:bg-[#2a3038]" type="button" onClick={copyError} aria-label={`${t('results.copyLabel')} — ${t('results.error')}`}>
                  <Copy size={14} />
                  {t('results.copyLabel')}
                </button>
              </div>
            </details>
            {onRetry && <button className="mt-3 inline-flex min-h-10 items-center gap-1.5 rounded-md border border-line bg-surface-soft px-3 text-[10px] font-semibold text-ink transition-colors hover:bg-[#2a3038]" type="button" onClick={() => onRetry(result)} disabled={busy}><RotateCcw size={14} />{t('results.retry')}</button>}
          </div>
        )}
      </div>

      <footer className="flex min-h-[58px] flex-wrap items-center justify-between gap-2 border-t border-line-soft px-2.5 py-1.5 pl-3.5 font-mono text-[10px] text-muted">
        <span className="min-w-0 break-words [overflow-wrap:anywhere]">{result.elapsedMs ? `${(result.elapsedMs / 1000).toFixed(1)}s` : '—'}</span>
        <div className="flex flex-wrap items-center justify-end gap-1.5">
          {result.status === 'success' && !isWebProject && result.html && <button className="inline-flex min-h-10 items-center gap-1.5 rounded-md px-2 text-[#aeb5b6] transition-colors hover:bg-[#252b33] hover:text-ink" type="button" onClick={() => onExpand(result)} aria-label={`${t('results.expand')} ${result.model}`} title={t('results.expand')}><Expand size={15} />{t('results.expand')}</button>}
          <button className="grid min-h-10 min-w-10 place-items-center rounded-md text-[#858d93] transition-colors hover:bg-[#252b33] hover:text-ink disabled:opacity-50" type="button" onClick={copyResult} disabled={!result.html && !project} aria-label={isWebProject ? t('results.copyProjectLabel') : t('results.copyLabel')} title={isWebProject ? t('results.copyProjectLabel') : t('results.copyLabel')}><Copy size={15} /></button>
          <button className="grid min-h-10 min-w-10 place-items-center rounded-md text-[#858d93] transition-colors hover:bg-red/10 hover:text-red" type="button" onClick={() => onRemove(result.id)} disabled={busy || isBusy} aria-label={t('results.remove')} title={t('results.remove')}><Trash2 size={15} /></button>
        </div>
      </footer>
    </article>
  )
}
