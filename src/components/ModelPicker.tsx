import * as Popover from '@radix-ui/react-popover'
import { Check, ChevronDown, Layers3, Search, Settings2, Sparkles, X } from 'lucide-react'
import { useId, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { ModelOption } from '../types'

interface ModelPickerProps {
  models: ModelOption[]
  selectedKeys: string[]
  onToggle: (modelKey: string) => void
  onClear: () => void
  onManage: () => void
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

interface ProviderModelGroup {
  providerId: string
  providerName: string
  accent: string
  models: ModelOption[]
}

export function ModelPicker({ models, selectedKeys, onToggle, onClear, onManage, open, onOpenChange }: ModelPickerProps) {
  const { t } = useTranslation()
  const [searchQuery, setSearchQuery] = useState('')
  const searchInputRef = useRef<HTMLInputElement>(null)
  const titleId = useId()
  const selectedKeySet = useMemo(() => new Set(selectedKeys), [selectedKeys])
  const selectedCount = selectedKeySet.size
  const uniqueModels = useMemo(() => {
    const seenModelKeys = new Set<string>()
    return models.filter((model) => {
      if (seenModelKeys.has(model.key)) return false
      seenModelKeys.add(model.key)
      return true
    })
  }, [models])
  const groupedModels = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase()
    const groups: ProviderModelGroup[] = []
    const groupsByProvider = new Map<string, ProviderModelGroup>()

    for (const model of uniqueModels) {
      const matchesQuery = !query || [model.model, model.providerName, model.providerId].some((value) => value.toLocaleLowerCase().includes(query))
      if (!matchesQuery) continue

      const existingGroup = groupsByProvider.get(model.providerId)
      if (existingGroup) {
        existingGroup.models.push(model)
        continue
      }

      const group = { providerId: model.providerId, providerName: model.providerName, accent: model.accent, models: [model] }
      groups.push(group)
      groupsByProvider.set(model.providerId, group)
    }

    return groups
  }, [searchQuery, uniqueModels])

  const selectionLabel = selectedCount > 0 ? t('models.selected', { count: selectedCount }) : t('models.none')
  const selectedLabel = selectedCount > 0 ? t('models.selected', { count: selectedCount }) : t('models.none')
  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) setSearchQuery('')
    onOpenChange?.(nextOpen)
  }

  return (
    <Popover.Root open={open} onOpenChange={handleOpenChange}>
      <Popover.Trigger asChild>
        <button
          className="flex min-h-10 min-w-[148px] items-center gap-2 rounded-[7px] border border-[#363c44] bg-surface-soft px-2 py-1.5 text-left text-[#b6bcbd] transition-colors hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mint/70 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
          type="button"
          aria-label={`${t('models.select')}: ${selectionLabel}`}
        >
          <span className="grid size-6 place-items-center rounded-md bg-violet/10 text-violet"><Layers3 size={16} strokeWidth={1.8} /></span>
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="font-mono text-[9px] text-faint">{t('models.set')}</span>
            <span className="truncate text-[10px] text-ink">{selectionLabel}</span>
          </span>
          <ChevronDown aria-hidden="true" className="text-[#707980]" size={16} />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          role="dialog"
          aria-labelledby={titleId}
          className="z-[60] w-[325px] max-w-[calc(100vw-24px)] rounded-[10px] border border-[#3a414a] bg-surface p-3.5 text-ink shadow-[0_18px_50px_color-mix(in_srgb,#000_22%,transparent)] outline-none"
          sideOffset={10}
          align="start"
          onOpenAutoFocus={(event) => {
            event.preventDefault()
            searchInputRef.current?.focus()
          }}
        >
          <div className="flex items-start justify-between gap-2.5 border-b border-line-soft px-0.5 pb-3 pt-0.5">
            <div className="min-w-0">
              <p className="eyebrow mb-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-faint">MODEL SET</p>
              <h3 id={titleId} className="m-0 text-[13px] font-medium">{t('models.select')}</h3>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <span aria-live="polite" className="rounded-md bg-mint/10 px-2 py-1 text-[9px] font-medium text-mint">{selectedLabel}</span>
              <Popover.Close asChild>
                <button
                  className="grid size-10 shrink-0 place-items-center rounded-md text-[#737b82] transition-colors hover:bg-surface-hover hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mint/70"
                  type="button"
                  aria-label={t('models.close')}
                >
                  <X size={16} />
                </button>
              </Popover.Close>
            </div>
          </div>
          <div className="py-3">
            <div className="relative">
              <Search aria-hidden="true" className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-faint" size={14} />
              <input
                ref={searchInputRef}
                aria-label={t('models.select')}
                className="w-full rounded-md border border-line bg-surface-soft py-2 pl-8 pr-2.5 text-[11px] text-ink outline-none placeholder:text-faint focus:border-mint/50"
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder={`${t('models.select')}…`}
                autoComplete="off"
                spellCheck={false}
              />
            </div>
          </div>
          <fieldset className="max-h-[300px] overflow-y-auto pb-2">
            <legend className="sr-only">{t('models.select')}</legend>
            {uniqueModels.length === 0 || groupedModels.length === 0 ? (
              <div className="flex items-center justify-center gap-2 px-2.5 py-7 text-[11px] text-faint" role="status">
                <Sparkles aria-hidden="true" size={18} />
                <span>{uniqueModels.length === 0 ? t('models.empty') : t('models.none')}</span>
              </div>
            ) : groupedModels.map((group, groupIndex) => {
              const groupHeadingId = `${titleId}-provider-${groupIndex}`
              return (
                <section key={group.providerId} aria-labelledby={groupHeadingId}>
                  <h4 id={groupHeadingId} className="sticky top-0 z-10 flex min-h-8 items-center gap-2 bg-surface/95 px-2 font-mono text-[9px] font-medium uppercase tracking-[0.08em] text-faint backdrop-blur-sm">
                    <span aria-hidden="true" className="size-[7px] shrink-0 rounded-full" style={{ background: group.accent }} />
                    <span className="min-w-0 flex-1 truncate">{group.providerName}</span>
                    <span>{group.models.length}</span>
                  </h4>
                  {group.models.map((model) => {
                    const selected = selectedKeySet.has(model.key)
                    const modelLabel = `${model.model} · ${model.providerName}${model.configured ? '' : ` · ${t('models.notConfigured')}`}`
                    return (
                      <button
                        className={`flex min-h-11 w-full items-center gap-2 rounded-[7px] border px-2 py-2 text-left text-muted transition-colors hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-mint/70 ${selected ? 'border-mint/15 bg-mint/10 text-ink' : 'border-transparent'}`}
                        key={model.key}
                        type="button"
                        aria-label={modelLabel}
                        aria-pressed={selected}
                        onClick={() => onToggle(model.key)}
                      >
                        <span className={`grid size-[17px] shrink-0 place-items-center rounded border ${selected ? 'border-mint bg-mint text-[#112019]' : 'border-[#4b535b]'}`}>
                          {selected && <Check aria-hidden="true" size={13} />}
                        </span>
                        <span className="size-[7px] shrink-0 rounded-full shadow-[0_0_0_3px_color-mix(in_srgb,#fff_3.5%,transparent)]" style={{ background: model.accent }} />
                        <strong className="min-w-0 flex-1 truncate font-mono text-[10px] font-medium">{model.model}</strong>
                        {!model.configured && <span className="shrink-0 rounded bg-yellow/10 px-1.5 py-1 font-mono text-[9px] text-yellow">{t('models.notConfigured')}</span>}
                      </button>
                    )
                  })}
                </section>
              )
            })}
          </fieldset>
          <div className="flex items-center justify-between gap-2 border-t border-line-soft px-0.5 pb-0.5 pt-2.5">
            <button
              className="inline-flex min-h-10 items-center gap-1.5 rounded-md px-1 text-[10px] text-[#8c9499] transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mint/70 disabled:opacity-50"
              type="button"
              onClick={onClear}
              disabled={!selectedCount}
            >
              {t('models.clear')}
            </button>
            <button
              className="inline-flex min-h-10 items-center gap-1.5 rounded-md px-1 text-[10px] text-mint transition-colors hover:text-[#c0f7d9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mint/70"
              type="button"
              onClick={onManage}
              aria-label={`${t('models.manage')}: ${t('nav.providers')}`}
            >
              <Settings2 aria-hidden="true" size={14} />
              {t('models.manage')}
            </button>
          </div>
          <Popover.Arrow className="fill-[#3a414a]" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
