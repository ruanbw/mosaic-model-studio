import * as Popover from '@radix-ui/react-popover'
import { Check, ChevronDown, Layers3, Settings2, Sparkles, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { ModelOption } from '../types'

interface ModelPickerProps {
  models: ModelOption[]
  selectedKeys: string[]
  onToggle: (modelKey: string) => void
  onClear: () => void
  onManage: () => void
}

export function ModelPicker({ models, selectedKeys, onToggle, onClear, onManage }: ModelPickerProps) {
  const { t } = useTranslation()
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button className="flex min-w-[148px] items-center gap-2 rounded-[7px] border border-[#363c44] bg-surface-soft px-2 py-1.5 text-left text-[#b6bcbd] transition-colors hover:bg-surface-hover" type="button" aria-label={t('models.select')}>
          <span className="grid size-6 place-items-center rounded-md bg-violet/10 text-violet"><Layers3 size={16} strokeWidth={1.8} /></span>
          <span className="flex min-w-0 flex-1 flex-col gap-0.5"><span className="font-mono text-[9px] text-faint">{t('models.set')}</span><span className="truncate text-[10px] text-ink">{selectedKeys.length > 0 ? t('models.selected', { count: selectedKeys.length }) : t('prompt.selectModels')}</span></span>
          <ChevronDown className="text-[#707980]" size={16} />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content className="z-[60] w-[325px] max-w-[calc(100vw-24px)] rounded-[10px] border border-[#3a414a] bg-surface p-3.5 text-ink shadow-[0_18px_50px_color-mix(in_srgb,#000_22%,transparent)]" sideOffset={10} align="start">
          <div className="flex items-start justify-between gap-2.5 border-b border-line-soft px-0.5 pb-3 pt-0.5">
            <div><p className="eyebrow mb-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-faint">MODEL SET</p><h3 className="m-0 text-[13px] font-medium">{t('models.select')}</h3></div>
            <Popover.Close asChild><button className="grid size-7 place-items-center rounded-md text-[#737b82] transition-colors hover:bg-surface-hover hover:text-ink" type="button" aria-label={t('models.close')}><X size={16} /></button></Popover.Close>
          </div>
          <fieldset className="max-h-[300px] overflow-y-auto py-2"><legend className="sr-only">{t('models.select')}</legend>
            {models.length === 0 ? <div className="flex items-center justify-center gap-2 px-2.5 py-7 text-[11px] text-faint"><Sparkles size={18} /><span>{t('models.empty')}</span></div> : models.map((model) => {
              const selected = selectedKeys.includes(model.key)
              return <button className={`flex w-full items-center gap-2 rounded-[7px] border px-2 py-2 text-left text-muted transition-colors hover:bg-surface-hover ${selected ? 'border-mint/15 bg-mint/10 text-ink' : 'border-transparent'}`} key={model.key} type="button" aria-pressed={selected} onClick={() => onToggle(model.key)}>
                <span className={`grid size-[17px] place-items-center rounded border ${selected ? 'border-mint bg-mint text-[#112019]' : 'border-[#4b535b]'}`}>{selected && <Check size={13} />}</span>
                <span className="size-[7px] shrink-0 rounded-full shadow-[0_0_0_3px_color-mix(in_srgb,#fff_3.5%,transparent)]" style={{ background: model.accent }} />
                <span className="flex min-w-0 flex-1 flex-col gap-0.5"><strong className="truncate font-mono text-[10px] font-medium">{model.model}</strong><small className="text-[10px] text-[#737b82]">{model.providerName}</small></span>
                {!model.configured && <span className="rounded bg-yellow/10 px-1.5 py-1 font-mono text-[9px] text-yellow">{t('models.notConfigured')}</span>}
              </button>
            })}
          </fieldset>
          <div className="flex items-center justify-between border-t border-line-soft px-0.5 pb-0.5 pt-2.5">
            <button className="inline-flex items-center gap-1.5 py-0.5 text-[10px] text-[#8c9499] transition-colors hover:text-ink disabled:opacity-50" type="button" onClick={onClear} disabled={!selectedKeys.length}>{t('models.clear')}</button>
            <button className="inline-flex items-center gap-1.5 py-0.5 text-[10px] text-mint transition-colors hover:text-[#c0f7d9]" type="button" onClick={onManage}><Settings2 size={14} />{t('models.manage')}</button>
          </div>
          <Popover.Arrow className="fill-[#3a414a]" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
