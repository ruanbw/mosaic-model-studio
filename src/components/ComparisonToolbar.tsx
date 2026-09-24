import { useTranslation } from 'react-i18next'

export type ResultSort = 'default' | 'newest' | 'oldest' | 'fastest' | 'status'
export type ResultFilter = 'all' | 'success' | 'error' | 'cancelled'

interface ComparisonToolbarProps {
  sort: ResultSort
  filter: ResultFilter
  count: number
  onSortChange: (sort: ResultSort) => void
  onFilterChange: (filter: ResultFilter) => void
  onClear: () => void
}

export function ComparisonToolbar({ sort, filter, count, onSortChange, onFilterChange, onClear }: ComparisonToolbarProps) {
  const { t } = useTranslation()
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2 rounded-[9px] border border-line-soft bg-surface-soft p-2.5" role="group" aria-label={t('comparison.title')}>
      <label className="flex min-w-0 items-center gap-1.5 text-[10px] text-muted">
        <span className="font-mono uppercase tracking-[0.08em]">{t('comparison.sortBy')}</span>
        <select className="min-h-9 rounded-md border border-line bg-surface px-2 text-[10px] text-ink outline-none focus:border-mint/60" value={sort} onChange={(event) => onSortChange(event.target.value as ResultSort)} aria-label={t('comparison.sortBy')}>
          <option value="default">{t('comparison.title')}</option>
          <option value="newest">{t('comparison.sortNewest')}</option>
          <option value="oldest">{t('comparison.sortOldest')}</option>
          <option value="fastest">{t('comparison.sortFastest')}</option>
          <option value="status">{t('comparison.sortStatus')}</option>
        </select>
      </label>
      <label className="flex min-w-0 items-center gap-1.5 text-[10px] text-muted">
        <span className="font-mono uppercase tracking-[0.08em]">{t('comparison.status')}</span>
        <select className="min-h-9 rounded-md border border-line bg-surface px-2 text-[10px] text-ink outline-none focus:border-mint/60" value={filter} onChange={(event) => onFilterChange(event.target.value as ResultFilter)} aria-label={t('comparison.status')}>
          <option value="all">{t('comparison.filterAll')}</option>
          <option value="success">{t('comparison.filterSuccess')}</option>
          <option value="error">{t('comparison.filterError')}</option>
          <option value="cancelled">{t('comparison.filterCancelled')}</option>
        </select>
      </label>
      <span className="ml-auto font-mono text-[10px] text-faint">{t('comparison.resultCount', { count })}</span>
      {(sort !== 'default' || filter !== 'all') && <button className="min-h-9 rounded-md px-2 text-[10px] text-mint hover:bg-surface" type="button" onClick={onClear}>{t('comparison.clearFilters')}</button>}
    </div>
  )
}
