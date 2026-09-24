import * as Dialog from '@radix-ui/react-dialog'
import {
  Check,
  ChevronDown,
  CircleStop,
  Copy,
  FileCode2,
  FolderCode,
  LoaderCircle,
  Terminal,
  TriangleAlert,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { useEffect } from 'react'
import type { MutableRefObject } from 'react'
import { useTranslation } from 'react-i18next'
import { useWebContainer } from '../hooks/useWebContainer'
import type { GenerationResult } from '../types'
import { webContainerManager, type WebContainerPhase } from '../webcontainer'

interface PreviewDialogProps {
  result: GenerationResult | null
  open: boolean
  onOpenChange: (open: boolean) => void
  returnFocusRef?: MutableRefObject<HTMLElement | null>
}

const phaseKeys: Record<WebContainerPhase, string> = {
  idle: 'results.empty',
  booting: 'results.web.booting',
  mounting: 'results.web.mounting',
  installing: 'results.web.installing',
  starting: 'results.web.starting',
  ready: 'results.web.ready',
  stopping: 'results.web.stopping',
  error: 'results.web.error',
  unsupported: 'results.web.unsupported',
}

export function PreviewDialog({ result, open, onOpenChange, returnFocusRef }: PreviewDialogProps) {
  const { t } = useTranslation()
  const project = result?.project
  const webProject = project?.kind === 'web' ? project : undefined
  const isWebProject = Boolean(webProject)
  const state = useWebContainer(open && isWebProject, webProject, result?.id)

  useEffect(() => {
    if (open && isWebProject) return
    if (webContainerManager.getState().phase === 'idle') return
    void webContainerManager.stop().catch(() => undefined)
  }, [open, isWebProject, result?.id])

  const isSwitching = Boolean(
    isWebProject && result?.id && state.projectId && state.projectId !== result.id,
  )
  const displayedPhase: WebContainerPhase = isSwitching ? 'idle' : state.phase
  const canStop = Boolean(
    isWebProject && state.projectId === result?.id && state.phase !== 'idle' && state.phase !== 'unsupported',
  )
  const visibleLogs = state.logs
    .slice(-80)
    .map((line: string) => line.length > 500 ? `${line.slice(0, 500)}…` : line)
    .join('\n')
  const logText = state.logs.join('\n')
  const statusDescription = state.phase === 'unsupported'
    ? t('results.web.unsupportedDescription')
    : state.error ?? t(state.phase === 'error' ? 'results.web.errorDescription' : state.phase === 'idle' ? 'results.empty' : isWebProject ? 'results.web.waitingDescription' : 'results.empty')

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
    const content = isWebProject ? JSON.stringify(webProject, null, 2) : result?.html
    return copyText(content ?? '', isWebProject ? t('results.projectCopied') : t('results.copy'))
  }
  const copyLogs = () => copyText(logText, t('results.copy'))

  const stopProject = () => {
    void webContainerManager.stop().catch(() => undefined)
  }

  const phaseLabel = isSwitching ? t('results.web.switching') : t(phaseKeys[displayedPhase])
  const isActivePhase = displayedPhase !== 'idle' && displayedPhase !== 'ready' && displayedPhase !== 'error' && displayedPhase !== 'unsupported' && displayedPhase !== 'stopping'
  const isPreviewBusy = isSwitching || isActivePhase

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[80] bg-[#030507]/85 backdrop-blur-sm" />
        <Dialog.Content className="fixed inset-5 z-[81] flex min-w-0 flex-col overflow-hidden rounded-[11px] border border-line bg-surface shadow-[0_28px_100px_color-mix(in_srgb,#000_55%,transparent)] max-[580px]:inset-2" onCloseAutoFocus={(event) => {
          const opener = returnFocusRef?.current
          const visible = opener && opener.isConnected && getComputedStyle(opener).display !== 'none' && getComputedStyle(opener).visibility !== 'hidden' && opener.getClientRects().length > 0
          if (visible) {
            event.preventDefault()
            opener.focus()
            if (returnFocusRef) returnFocusRef.current = null
          }
        }}>
          <div className="flex min-h-16 items-center justify-between gap-3 border-b border-line-soft px-4 py-2.5">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="size-[7px] shrink-0 rounded-full shadow-[0_0_0_3px_color-mix(in_srgb,#fff_3.5%,transparent)]" style={{ background: result?.accent ?? '#8ef0c4' }} />
              <div className="min-w-0">
                <Dialog.Title className="break-words font-mono text-xs font-medium leading-[1.4] text-ink [overflow-wrap:anywhere]">{result?.model ?? t('results.previewTitle')}</Dialog.Title>
                <Dialog.Description className="mt-1 flex min-w-0 flex-wrap items-center gap-1.5 text-[10px] text-muted">
                  <span className="break-all [overflow-wrap:anywhere]">{result?.providerName ?? ''}</span>
                  {webProject && <><span>·</span><FolderCode size={10} /><span className="break-all [overflow-wrap:anywhere]">{webProject.title}</span></>}
                  {!isWebProject && <><span>·</span><FileCode2 size={10} /><span>{t('results.staticBadge')}</span></>}
                </Dialog.Description>
              </div>
            </div>
            <div className="flex shrink-0 gap-1">
              {canStop && <button className="inline-flex min-h-10 min-w-[72px] items-center justify-center gap-1.5 rounded-md px-2 text-[#9aa1a7] transition-colors hover:bg-red/10 hover:text-red" type="button" onClick={stopProject} aria-label={t('results.web.stop')}><CircleStop size={14} /><span className="whitespace-nowrap font-mono text-[9px]">{t('results.web.stop')}</span></button>}
              <button className="grid min-h-10 min-w-10 place-items-center rounded-md text-[#737b82] transition-colors hover:bg-surface-hover hover:text-ink disabled:opacity-50" type="button" onClick={copyResult} disabled={!result?.html && !project} aria-label={isWebProject ? t('results.copyProjectLabel') : t('results.copyLabel')} title={isWebProject ? t('results.copyProjectLabel') : t('results.copyLabel')}><Copy size={16} /></button>
              <Dialog.Close asChild><button className="grid min-h-10 min-w-10 place-items-center rounded-md text-[#737b82] transition-colors hover:bg-surface-hover hover:text-ink" type="button" aria-label={t('common.close')}><X size={18} /></button></Dialog.Close>
            </div>
          </div>

          <div className="min-h-0 min-w-0 flex-1 bg-surface-soft p-3 max-[580px]:p-1.5">
            {isWebProject ? (
              <div className="flex size-full min-h-0 min-w-0 flex-col overflow-hidden rounded-md border border-line-soft bg-surface">
                <div className="flex min-h-10 items-center justify-between gap-3 border-b border-line-soft bg-surface-soft px-3">
                  <div className="flex min-w-0 items-center gap-2 text-[10px] text-muted" role="status" aria-live="polite" aria-atomic="true" aria-busy={isPreviewBusy}>
                    {(state.phase === 'error' || state.phase === 'unsupported')
                      ? <TriangleAlert className="shrink-0 text-red" size={13} />
                      : state.phase === 'ready' ? <Check className="shrink-0 text-mint" size={13} /> : isPreviewBusy ? <LoaderCircle className="shrink-0 animate-spin text-violet" size={13} /> : <CircleStop className="shrink-0 text-faint" size={13} />}
                    <span className="break-words [overflow-wrap:anywhere]">{phaseLabel}</span>
                  </div>
                  {state.phase === 'ready' && !isSwitching && <span className="hidden font-mono text-[8px] uppercase tracking-[0.12em] text-mint sm:inline">{t('results.web.singleRuntime')}</span>}
                </div>

                {state.phase === 'ready' && !isSwitching && state.previewUrl ? (
                  // WebContainer's cross-origin preview needs same-origin permission for its service-worker bootstrap.
                  <iframe className="min-h-0 min-w-0 flex-1 border-0 bg-white" title={`${result?.model ?? t('results.previewTitle')} — ${t('results.previewTitle')}`} src={state.previewUrl} sandbox="allow-scripts allow-same-origin" referrerPolicy="no-referrer" />
                ) : (
                  <div className="flex min-h-0 min-w-0 flex-1 flex-col items-center justify-center px-6 text-center">
                    <span className={`grid size-11 shrink-0 place-items-center rounded-xl border ${state.phase === 'error' || state.phase === 'unsupported' ? 'border-red/25 bg-red/10 text-red' : isPreviewBusy ? 'border-violet/25 bg-violet/10 text-violet' : 'border-line bg-surface-soft text-faint'}`}>
                      {state.phase === 'error' || state.phase === 'unsupported' ? <TriangleAlert size={22} /> : state.phase === 'ready' ? <Check size={22} /> : isPreviewBusy ? <LoaderCircle className="animate-spin" size={22} /> : <CircleStop size={22} />}
                    </span>
                    <strong className="mt-4 break-words text-xs font-medium text-ink [overflow-wrap:anywhere]">{phaseLabel}</strong>
                    <p className="mt-2 max-w-[520px] break-words text-[11px] leading-[1.55] text-muted [overflow-wrap:anywhere]">{statusDescription}</p>
                    {state.phase === 'ready' && !state.previewUrl && <p className="mt-2 text-[10px] text-faint">{t('results.web.previewUnavailable')}</p>}
                  </div>
                )}

                {visibleLogs && (
                  <details className="group max-h-[148px] shrink-0 overflow-y-auto border-t border-line-soft bg-[#101318] px-3 py-1.5">
                    <summary className="flex min-h-11 cursor-pointer list-none items-center gap-1.5 font-mono text-[8px] uppercase tracking-[0.1em] text-faint [&::-webkit-details-marker]:hidden">
                      <Terminal size={10} />
                      {t('results.web.logs')}
                      <ChevronDown className="ml-auto transition-transform group-open:rotate-180" size={12} />
                    </summary>
                    <div className="mb-1 flex justify-end">
                      <button className="inline-flex min-h-9 items-center gap-1.5 rounded px-1.5 text-[9px] text-muted transition-colors hover:bg-white/5 hover:text-ink" type="button" onClick={copyLogs} aria-label={`${t('results.web.logs')} · ${t('results.copyLabel')}`}><Copy size={12} />{t('results.copyLabel')}</button>
                    </div>
                    <pre className="overflow-auto whitespace-pre-wrap break-words font-mono text-[9px] leading-[1.5] text-[#7f8992] [overflow-wrap:anywhere]">{visibleLogs}</pre>
                  </details>
                )}
              </div>
            ) : result?.html ? (
              <iframe className="size-full min-w-0 rounded-md border-0 bg-white" title={`${result.model} — ${t('results.expand')}`} srcDoc={result.html} sandbox="" referrerPolicy="no-referrer" />
            ) : (
              <div className="grid size-full place-items-center px-6 text-center text-[#777f86]">{t('results.empty')}</div>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
