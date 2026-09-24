import { History, RotateCcw, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { deserializeRunHistory, type RunHistoryEntry } from '../project/history'

export const RUN_HISTORY_STORAGE_KEY = 'mosaic-run-history'
const HISTORY_CHANGED_EVENT = 'mosaic-history-changed'

interface HistoryPanelProps {
  onRestore: (entry: RunHistoryEntry) => void
}

const readHistory = () => {
  if (typeof window === 'undefined') return []
  return deserializeRunHistory(window.localStorage.getItem(RUN_HISTORY_STORAGE_KEY))
}

export function HistoryPanel({ onRestore }: HistoryPanelProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [entries, setEntries] = useState<RunHistoryEntry[]>([])

  useEffect(() => {
    const refresh = () => setEntries(readHistory())
    refresh()
    window.addEventListener(HISTORY_CHANGED_EVENT, refresh)
    window.addEventListener('storage', refresh)
    return () => {
      window.removeEventListener(HISTORY_CHANGED_EVENT, refresh)
      window.removeEventListener('storage', refresh)
    }
  }, [])

  const clear = () => {
    if (!window.confirm(t('history.clearConfirm'))) return
    window.localStorage.removeItem(RUN_HISTORY_STORAGE_KEY)
    setEntries([])
    window.dispatchEvent(new Event(HISTORY_CHANGED_EVENT))
  }

  return (
    <section className="mt-8 rounded-[10px] border border-line-soft bg-surface-soft p-4" aria-labelledby="history-heading">
      <div className="flex flex-wrap items-center gap-2">
        <span className="grid size-8 place-items-center rounded-lg bg-violet/10 text-violet"><History size={17} /></span>
        <div className="min-w-0 flex-1"><h2 id="history-heading" className="m-0 text-sm font-medium">{t('history.title')}</h2><p className="mt-1 text-[10px] text-muted">{t('history.subtitle')}</p></div>
        <span className="font-mono text-[10px] text-faint">{t('history.runCount', { count: entries.length })}</span>
        <button className="min-h-9 rounded-md border border-line bg-surface px-2.5 text-[10px] text-muted hover:text-ink" type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open}>{t('history.open')}</button>
        {entries.length > 0 && <button className="grid size-9 place-items-center rounded-md text-muted hover:bg-red/10 hover:text-red" type="button" onClick={clear} aria-label={t('history.clear')}><Trash2 size={14} /></button>}
      </div>
      {open && <div className="mt-4 grid gap-2">
        {entries.length === 0 ? <p className="rounded-md border border-dashed border-line p-4 text-center text-[11px] text-faint">{t('history.empty')}</p> : entries.map((entry) => <article key={entry.id} className="rounded-md border border-line bg-surface p-3"><div className="flex flex-wrap items-center gap-2 text-[10px] text-faint"><span>{entry.demoMode ? t('history.demoRun') : t('history.liveRun')}</span><time dateTime={new Date(entry.createdAt).toISOString()}>{Number.isFinite(entry.createdAt) ? new Date(entry.createdAt).toLocaleString() : t('history.unknownTime')}</time></div><p className="mt-2 line-clamp-2 text-[11px] leading-[1.5] text-ink">{entry.prompt}</p><p className="mt-1 truncate font-mono text-[9px] text-muted">{entry.models.join(' · ')}</p><div className="mt-2 flex items-center justify-between gap-2"><span className="min-w-0 truncate text-[10px] text-faint">{entry.resultSummary || t('history.result')}</span><button className="inline-flex min-h-9 items-center gap-1 rounded-md border border-line px-2 text-[10px] text-mint hover:bg-mint/10" type="button" onClick={() => onRestore(entry)}><RotateCcw size={13} />{t('history.restore')}</button></div></article>)}
      </div>}
    </section>
  )
}
