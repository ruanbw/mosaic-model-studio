import * as Dialog from '@radix-ui/react-dialog'
import {
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
import { useTranslation } from 'react-i18next'
import { useWebContainer } from '../hooks/useWebContainer'
import type { GenerationResult } from '../types'
import { webContainerManager, type WebContainerPhase } from '../webcontainer'

interface PreviewDialogProps {
  result: GenerationResult | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

const phaseKeys: Record<WebContainerPhase, string> = {
  idle: 'results.web.booting',
  booting: 'results.web.booting',
  mounting: 'results.web.mounting',
  installing: 'results.web.installing',
  starting: 'results.web.starting',
  ready: 'results.web.ready',
  stopping: 'results.web.stopping',
  error: 'results.web.error',
  unsupported: 'results.web.unsupported',
}

export function PreviewDialog({ result, open, onOpenChange }: PreviewDialogProps) {
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
  const statusDescription = state.phase === 'unsupported'
    ? t('results.web.unsupportedDescription')
    : state.error ?? t(state.phase === 'error' ? 'results.web.errorDescription' : isWebProject ? 'results.web.waitingDescription' : 'results.empty')

  const copyResult = async () => {
    const content = webProject
      ? JSON.stringify(webProject, null, 2)
      : result?.html
    if (!content) return
    try {
      await navigator.clipboard.writeText(content)
      toast.success(t(isWebProject ? 'results.projectCopied' : 'results.copy'))
    } catch {
      toast.error(t('results.copyError'))
    }
  }

  const stopProject = () => {
    void webContainerManager.stop().catch(() => undefined)
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[80] bg-[#030507]/85 backdrop-blur-sm" />
        <Dialog.Content className="fixed inset-5 z-[81] flex flex-col overflow-hidden rounded-[11px] border border-line bg-surface shadow-[0_28px_100px_color-mix(in_srgb,#000_55%,transparent)] max-[580px]:inset-2">
          <div className="flex min-h-16 items-center justify-between gap-3 border-b border-line-soft px-4 py-2.5">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="size-[7px] shrink-0 rounded-full shadow-[0_0_0_3px_color-mix(in_srgb,#fff_3.5%,transparent)]" style={{ background: result?.accent ?? '#8ef0c4' }} />
              <div className="min-w-0">
                <Dialog.Title className="truncate font-mono text-xs font-medium text-ink">{result?.model ?? t('results.previewTitle')}</Dialog.Title>
                <Dialog.Description className="mt-1 flex items-center gap-1.5 text-[10px] text-muted">
                  {result?.providerName ?? ''}
                  {webProject && <><span>·</span><FolderCode size={10} /><span>{webProject.title}</span></>}
                  {!isWebProject && <><span>·</span><FileCode2 size={10} /><span>{t('results.staticBadge')}</span></>}
                </Dialog.Description>
              </div>
            </div>
            <div className="flex gap-1">
              {canStop && <button className="inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-[#9aa1a7] transition-colors hover:bg-red/10 hover:text-red" type="button" onClick={stopProject}><CircleStop size={14} /><span className="hidden font-mono text-[9px] sm:inline">{t('results.web.stop')}</span></button>}
              <button className="grid size-7 place-items-center rounded-md text-[#737b82] transition-colors hover:bg-surface-hover hover:text-ink disabled:opacity-50" type="button" onClick={copyResult} disabled={!result?.html && !project} aria-label={t(isWebProject ? 'results.copyProjectLabel' : 'results.copyLabel')}><Copy size={16} /></button>
              <Dialog.Close asChild><button className="grid size-7 place-items-center rounded-md text-[#737b82] transition-colors hover:bg-surface-hover hover:text-ink" type="button" aria-label={t('common.close')}><X size={18} /></button></Dialog.Close>
            </div>
          </div>

          <div className="min-h-0 flex-1 bg-surface-soft p-3 max-[580px]:p-1.5">
            {isWebProject ? (
              <div className="flex size-full min-h-0 flex-col overflow-hidden rounded-md border border-line-soft bg-surface">
                <div className="flex min-h-9 items-center justify-between gap-3 border-b border-line-soft bg-surface-soft px-3">
                  <div className="flex min-w-0 items-center gap-2 text-[10px] text-muted">
                    {(state.phase === 'error' || state.phase === 'unsupported')
                      ? <TriangleAlert className="shrink-0 text-red" size={13} />
                      : <LoaderCircle className={`shrink-0 text-violet ${state.phase === 'ready' ? 'hidden' : 'animate-spin'}`} size={13} />}
                    <span className="truncate">{isSwitching ? t('results.web.switching') : t(phaseKeys[displayedPhase])}</span>
                  </div>
                  {state.phase === 'ready' && !isSwitching && <span className="font-mono text-[8px] uppercase tracking-[0.12em] text-mint">{t('results.web.singleRuntime')}</span>}
                </div>

                {state.phase === 'ready' && !isSwitching && state.previewUrl ? (
                  // WebContainer's cross-origin preview needs same-origin permission for its service-worker bootstrap.
                  <iframe className="min-h-0 flex-1 border-0 bg-white" title={`${result?.model ?? t('results.previewTitle')} — ${t('results.previewTitle')}`} src={state.previewUrl} sandbox="allow-scripts allow-same-origin" referrerPolicy="no-referrer" />
                ) : (
                  <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-6 text-center">
                    <span className={`grid size-11 place-items-center rounded-xl border ${state.phase === 'error' || state.phase === 'unsupported' ? 'border-red/25 bg-red/10 text-red' : 'border-violet/25 bg-violet/10 text-violet'}`}>
                      {state.phase === 'error' || state.phase === 'unsupported' ? <TriangleAlert size={22} /> : <LoaderCircle className="animate-spin" size={22} />}
                    </span>
                    <strong className="mt-4 text-xs font-medium text-ink">{isSwitching ? t('results.web.switching') : t(phaseKeys[displayedPhase])}</strong>
                    <p className="mt-2 max-w-[520px] text-[11px] leading-[1.55] text-muted">{statusDescription}</p>
                    {state.phase === 'ready' && !state.previewUrl && <p className="mt-2 text-[10px] text-faint">{t('results.web.previewUnavailable')}</p>}
                  </div>
                )}

                {visibleLogs && (
                  <div className="max-h-[116px] shrink-0 border-t border-line-soft bg-[#101318] px-3 py-2">
                    <div className="mb-1 flex items-center gap-1.5 font-mono text-[8px] uppercase tracking-[0.1em] text-faint"><Terminal size={10} />{t('results.web.logs')}</div>
                    <pre className="overflow-auto whitespace-pre-wrap break-all font-mono text-[9px] leading-[1.5] text-[#7f8992]">{visibleLogs}</pre>
                  </div>
                )}
              </div>
            ) : result?.html ? (
              <iframe className="size-full rounded-md border-0 bg-white" title={`${result.model} — ${t('results.expand')}`} srcDoc={result.html} sandbox="" referrerPolicy="no-referrer" />
            ) : (
              <div className="grid size-full place-items-center text-[#777f86]">{t('results.empty')}</div>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
