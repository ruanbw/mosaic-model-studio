import { Activity, Sparkles } from 'lucide-react'
import { memo, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ComparisonToolbar, type ResultFilter, type ResultSort } from '../components/ComparisonToolbar'
import { EmptyResults } from '../components/EmptyResults'
import { HistoryPanel } from '../components/HistoryPanel'
import { ResultCard } from '../components/ResultCard'
import type { RunHistoryEntry } from '../project/history'
import { useAppStore } from '../store'
import type { GenerationResult, ModelOption } from '../types'

export interface StudioResultsProps {
  modelOptions: ModelOption[]
  isRunning: boolean
  onLoadDemo: () => void
  onSelectModels: () => void
  onExpand: (result: GenerationResult) => void
  onRemove: (resultId: string) => void
  onRetry: (result: GenerationResult) => void
  onRestoreHistory: (entry: RunHistoryEntry) => void
}

export const StudioResults = memo(function StudioResults({
  modelOptions,
  isRunning,
  onLoadDemo,
  onSelectModels,
  onExpand,
  onRemove,
  onRetry,
  onRestoreHistory,
}: StudioResultsProps) {
  const { t } = useTranslation()
  const results = useAppStore((state) => state.results)
  const demoMode = useAppStore((state) => state.demoMode)
  const [sort, setSort] = useState<ResultSort>('default')
  const [filter, setFilter] = useState<ResultFilter>('all')
  const visibleResults = useMemo(() => {
    const filtered = results.filter((result) => filter === 'all' || result.status === filter)
    if (sort === 'default') return filtered
    return [...filtered].sort((left, right) => {
      if (sort === 'newest') return right.createdAt - left.createdAt
      if (sort === 'oldest') return left.createdAt - right.createdAt
      if (sort === 'fastest')
        return (left.elapsedMs ?? Number.MAX_SAFE_INTEGER) - (right.elapsedMs ?? Number.MAX_SAFE_INTEGER)
      const rank: Record<GenerationResult['status'], number> = {
        success: 0,
        error: 1,
        cancelled: 2,
        running: 3,
        queued: 4,
      }
      return rank[left.status] - rank[right.status]
    })
  }, [filter, results, sort])

  return (
    <>
      <section className="mt-14" aria-labelledby="results-heading">
        <div className="mb-4 flex items-center justify-between gap-5 max-[580px]:flex-col max-[580px]:items-start">
          <div>
            <div className="flex items-center gap-2">
              <h2 id="results-heading" className="m-0 text-[19px] font-medium tracking-[-0.03em]">
                {t('results.title')}
              </h2>
              <span className="min-w-[21px] rounded-md bg-mint/10 px-1.5 py-1 text-center font-mono text-[10px] text-mint">
                {results.length}
              </span>
            </div>
            <p className="mt-1.5 mb-0 text-[11px] text-muted">{demoMode ? t('results.demo') : t('results.sandbox')}</p>
          </div>
          <div className="flex w-full items-center justify-between gap-4 max-[580px]:w-full">
            <span className="flex items-center gap-1.5 font-mono text-[9px] text-faint">
              <Activity size={14} />
              {t('results.grid')}
            </span>
            {results.length > 0 && (
              <button
                className="inline-flex items-center gap-1.5 py-0.5 text-[10px] text-muted transition-colors hover:text-ink"
                type="button"
                onClick={onLoadDemo}
                disabled={isRunning}
              >
                <Sparkles size={14} />
                {t('results.reload')}
              </button>
            )}
          </div>
        </div>
        {results.length === 0 ? (
          <EmptyResults onLoadDemo={onLoadDemo} onSelectModels={onSelectModels} hasModels={modelOptions.length > 0} />
        ) : (
          <>
            <ComparisonToolbar
              sort={sort}
              filter={filter}
              count={visibleResults.length}
              onSortChange={setSort}
              onFilterChange={setFilter}
              onClear={() => {
                setSort('default')
                setFilter('all')
              }}
            />
            {visibleResults.length === 0 ? (
              <p className="rounded-md border border-dashed border-line p-6 text-center text-xs text-faint">
                {t('comparison.empty')}
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-[15px] max-[821px]:grid-cols-1">
                {visibleResults.map((result) => (
                  <ResultCard
                    key={result.id}
                    result={result}
                    busy={isRunning}
                    onExpand={onExpand}
                    onRemove={onRemove}
                    onRetry={onRetry}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </section>
      <HistoryPanel onRestore={onRestoreHistory} />
    </>
  )
})
