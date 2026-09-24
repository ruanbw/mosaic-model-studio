import * as Switch from '@radix-ui/react-switch'
import { ArrowUpRight, Command, WandSparkles } from 'lucide-react'
import { useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { PROMPT_TEMPLATES } from '../prompts'

interface PromptComposerProps {
  prompt: string
  selectedCount: number
  demoMode: boolean
  isRunning: boolean
  onPromptChange: (value: string) => void
  onDemoModeChange: (value: boolean) => void
  onGenerate: () => void
  onManageModels: () => void
}

export function PromptComposer({
  prompt,
  selectedCount,
  demoMode,
  isRunning,
  onPromptChange,
  onDemoModeChange,
  onGenerate,
  onManageModels,
}: PromptComposerProps) {
  const { t } = useTranslation()
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault()
      onGenerate()
    }
  }

  return (
    <section aria-labelledby="prompt-heading">
      <div className="mb-3 flex items-center justify-between gap-5">
        <div><p className="eyebrow mb-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-faint">01 / DIRECTIVE</p><h2 id="prompt-heading" className="text-lg font-medium tracking-[-0.03em]">{t('prompt.label')}</h2></div>
        <span className="flex items-center gap-1.5 font-mono text-[10px] text-faint"><Command size={13} /> {t('prompt.shortcut')}</span>
      </div>

      <div className="overflow-hidden rounded-[11px] border border-[#343a43] bg-surface shadow-[0_10px_35px_color-mix(in_srgb,#000_12%,transparent)] transition-[border-color,box-shadow] focus-within:border-mint/50 focus-within:shadow-[0_0_0_3px_color-mix(in_srgb,var(--mint)_6%,transparent)]">
        <textarea
          ref={textareaRef}
          value={prompt}
          onChange={(event) => onPromptChange(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t('prompt.placeholder')}
          rows={5}
          maxLength={4000}
          aria-label={t('prompt.pageLabel')}
          className="block min-h-[135px] w-full resize-y bg-transparent px-5 pb-3 pt-5 text-[15px] leading-[1.65] text-ink outline-none placeholder:text-faint"
        />
        <div className="flex min-h-[49px] flex-col items-start justify-between gap-3 border-t border-line-soft px-3.5 pb-2.5 pt-2.5 min-[580px]:flex-row min-[580px]:items-center min-[580px]:px-5 min-[580px]:pb-2.5 min-[580px]:pt-2.5">
          <div className="flex flex-wrap items-center gap-1.5" aria-label={t('prompt.templatesLabel')}>
            <span className="mr-1 font-mono text-[10px] text-faint max-[580px]:w-full">{t('prompt.quickStart')}</span>
            {PROMPT_TEMPLATES.map((template) => <button className="rounded-md border border-[#30353d] bg-surface-soft px-2 py-1.5 text-[10px] text-muted transition-colors hover:border-mint/35 hover:text-mint" key={template.id} type="button" onClick={() => onPromptChange(t(template.promptKey))}>{t(`templates.${template.id}`)}</button>)}
          </div>
          <span className="shrink-0 self-end font-mono text-[10px] text-faint">{prompt.length.toLocaleString()} / 4,000</span>
        </div>
      </div>

      <div className="mt-3 flex flex-col items-stretch justify-between gap-3 min-[580px]:flex-row min-[580px]:items-center">
        <button className="flex w-fit items-center gap-2 rounded-lg border border-transparent bg-transparent px-2 py-1.5 text-left transition-colors hover:border-line hover:bg-surface" type="button" onClick={onManageModels}>
          <span className="grid size-[30px] place-items-center rounded-[7px] border border-mint/20 bg-mint/10 font-mono text-[10px] text-mint">{String(selectedCount).padStart(2, '0')}</span>
          <span className="flex flex-col gap-0.5"><strong className="text-[11px] font-semibold text-ink">{selectedCount > 0 ? t('prompt.modelsReady', { count: selectedCount }) : t('prompt.selectModels')}</strong><small className="text-[10px] text-faint">{selectedCount > 1 ? t('prompt.parallel') : t('prompt.multiSelect')}</small></span>
          <ArrowUpRight className="ml-1 text-faint" size={15} />
        </button>

        <div className="flex items-center justify-between gap-4 min-[580px]:justify-end">
          <div className="flex items-center gap-2">
            <Switch.Root className="relative h-[18px] w-[31px] shrink-0 rounded-full border border-[#454c55] bg-[#30363e] p-0 transition-colors data-[state=checked]:border-mint/45 data-[state=checked]:bg-mint/30" checked={demoMode} onCheckedChange={onDemoModeChange} id="demo-mode" aria-label={t('prompt.demoSwitch')}><Switch.Thumb className="block size-3 translate-x-0 rounded-full bg-[#a2a8ad] transition-transform data-[state=checked]:translate-x-[13px] data-[state=checked]:bg-mint" /></Switch.Root>
            <label htmlFor="demo-mode" className="flex cursor-pointer flex-col gap-0.5"><span className="text-[11px] text-[#b0b5b7]">{t('prompt.demo')}</span><small className="text-[9px] text-faint">{demoMode ? t('prompt.noApi') : t('prompt.useKeys')}</small></label>
          </div>
          <button className="inline-flex min-h-[39px] min-w-[137px] items-center justify-center gap-2 rounded-[7px] border border-mint bg-mint px-3.5 text-[11px] font-semibold text-[#122018] shadow-[0_5px_18px_color-mix(in_srgb,var(--mint)_12%,transparent)] transition-colors hover:border-[#c0f7d9] hover:bg-[#c0f7d9] disabled:cursor-not-allowed disabled:opacity-50" type="button" onClick={onGenerate} disabled={isRunning || !prompt.trim() || selectedCount === 0}>
            {isRunning ? <span className="size-3.5 animate-spin rounded-full border-2 border-[#122018]/30 border-t-[#122018]" /> : <WandSparkles size={17} />}
            {isRunning ? t('prompt.generating') : t('prompt.generate')}
            {!isRunning && <span className="ml-1 border-l border-[#122018]/20 pl-2 font-mono text-[10px] text-[#122018]/60">⌘↵</span>}
          </button>
        </div>
      </div>
    </section>
  )
}
