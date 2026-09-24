import { Check, Edit3, KeyRound, LockKeyhole, Plus, Server, Trash2, TriangleAlert } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { Provider } from '../types'

interface ProvidersViewProps { providers: Provider[]; onAdd: (opener?: HTMLElement) => void; onEdit: (provider: Provider, opener?: HTMLElement) => void; onDelete: (provider: Provider) => void }
const providerInitials: Record<string, string> = { openai: '◎', anthropic: 'A', gemini: '✦', openrouter: 'OR' }

export function ProvidersView({ providers, onAdd, onEdit, onDelete }: ProvidersViewProps) {
  const { t } = useTranslation()
  const configuredCount = providers.filter((provider) => provider.apiKey.trim()).length

  return (
    <div className="mx-auto w-full max-w-[1120px] min-w-0 px-4 pb-20 pt-[52px] max-[580px]:px-[15px] max-[580px]:pt-8">
      <div className="mb-9 flex min-w-0 items-end justify-between gap-5 max-[580px]:flex-col max-[580px]:items-stretch">
        <div className="min-w-0">
          <p className="eyebrow mb-2 font-mono text-[10px] uppercase tracking-[0.12em] text-faint">02 / CONNECTIONS</p>
          <h1 className="m-0 max-w-full break-words text-[39px] font-medium tracking-[-0.06em] max-[580px]:text-[34px]">{t('providers.title')}</h1>
          <p className="mt-2 max-w-[68ch] break-words text-[13px] text-muted">{t('providers.subtitle')}</p>
        </div>
        <button className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-md border border-mint bg-mint px-3.5 text-[11px] font-semibold text-[#122018] transition-colors hover:bg-[#c0f7d9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mint/70 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas max-[580px]:w-full" type="button" onClick={(event) => onAdd(event.currentTarget)}><Plus aria-hidden="true" size={17} />{t('providers.add')}</button>
      </div>

      <div className="mb-10 flex min-w-0 flex-wrap items-center gap-3 rounded-[9px] border border-mint/20 bg-mint/5 p-4 max-[580px]:items-start max-[580px]:flex-col">
        <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-mint/10 text-mint"><LockKeyhole aria-hidden="true" size={18} /></div>
        <div className="min-w-0 flex-1"><strong className="text-xs font-semibold text-ink">{t('providers.securityTitle')}</strong><p className="mt-1 max-w-[70ch] break-words text-[11px] leading-[1.5] text-muted">{t('providers.securityCopy')}</p></div>
        <span className="ml-auto whitespace-nowrap font-mono text-[10px] text-[#84958a] max-[580px]:ml-11 max-[580px]:self-end"><b className="font-medium text-mint">{configuredCount}</b> / {providers.length} {t('providers.configured')}</span>
      </div>

      <div className="mb-4 flex min-w-0 items-center justify-between gap-4"><div className="min-w-0"><h2 className="m-0 break-words text-base font-medium tracking-[-0.02em]">{t('providers.connected')}</h2><span className="mt-1 block max-w-[60ch] break-words text-[11px] text-faint">{t('providers.connectedCopy')}</span></div><span className="shrink-0 font-mono text-[10px] text-faint">{t('providers.count', { count: providers.length })}</span></div>

      {providers.length === 0 ? (
        <div className="min-w-0 rounded-[10px] border border-dashed border-line bg-surface-soft px-5 py-[75px] text-center">
          <div className="mx-auto mb-4 grid size-11 place-items-center rounded-[11px] bg-mint/10 text-mint"><Server aria-hidden="true" size={22} /></div>
          <h3 className="m-0 text-[17px] font-medium text-ink">{t('providers.none')}</h3>
          <p className="mx-auto my-2 max-w-[48ch] break-words text-xs text-muted">{t('providers.noneCopy')}</p>
          <button className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-mint bg-mint px-3.5 text-[11px] font-semibold text-[#122018] transition-colors hover:bg-[#c0f7d9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mint/70" type="button" onClick={(event) => onAdd(event.currentTarget)}><Plus aria-hidden="true" size={16} />{t('providers.first')}</button>
        </div>
      ) : (
        <div className="grid min-w-0 gap-3 min-[821px]:grid-cols-2">
          {providers.map((provider) => {
            const configured = Boolean(provider.apiKey.trim())
            return (
              <article className="min-w-0 rounded-[9px] border border-[#2d333b] bg-surface p-4 transition-colors hover:border-[#414954]" key={provider.id} aria-label={provider.name}>
                <div className="flex min-w-0 items-center gap-2.5">
                  <div className="grid size-9 shrink-0 place-items-center rounded-[9px] font-mono text-sm font-bold text-[#162019]" style={{ background: provider.accent }}>{providerInitials[provider.kind] ?? '·'}</div>
                  <div className="flex min-w-0 flex-col gap-0.5"><h3 className="m-0 truncate text-sm font-semibold">{provider.name}</h3><span className="truncate font-mono text-[10px] text-[#737b82]">{t(`providerKind.${provider.kind}`)}</span></div>
                </div>
                <div className={`my-4 flex min-w-0 items-center gap-1.5 rounded-md px-2 py-2 text-[10px] ${configured ? 'bg-mint/8 text-mint' : 'bg-yellow/8 text-yellow'}`}>{configured ? <Check aria-hidden="true" className="shrink-0" size={14} /> : <TriangleAlert aria-hidden="true" className="shrink-0" size={14} />}<span className="min-w-0 truncate">{configured ? t('providers.keyReady') : t('providers.keyMissing')}</span><span className="flex-1" /><KeyRound aria-hidden="true" className="shrink-0" size={13} /></div>
                <div className="flex min-h-7 min-w-0 flex-wrap items-center gap-1.5">{provider.models.slice(0, 3).map((model) => <span className="max-w-full truncate rounded border border-[#30363e] bg-surface-soft px-2 py-1 font-mono text-[9px] text-[#9ba2a5]" key={model}>{model}</span>)}{provider.models.length > 3 && <span className="rounded border border-[#30363e] bg-surface-soft px-2 py-1 font-mono text-[9px] text-[#9ba2a5]">+{provider.models.length - 3}</span>}</div>
                <div className="mt-4 flex min-w-0 items-center justify-between gap-2 border-t border-line-soft pt-3"><span className="flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden font-mono text-[9px] text-[#697179]"><Server aria-hidden="true" className="shrink-0" size={13} /><span className="truncate">{provider.baseUrl ?? t('providers.defaultUrl')}</span></span><div className="flex shrink-0 gap-1"><button className="grid size-10 place-items-center rounded-md text-[#858d93] transition-colors hover:bg-surface-hover hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mint/70" type="button" onClick={(event) => onEdit(provider, event.currentTarget)} aria-label={`${t('providers.edit')} ${provider.name}`}><Edit3 aria-hidden="true" size={15} /></button><button className="grid size-10 place-items-center rounded-md text-[#858d93] transition-colors hover:bg-red/10 hover:text-red focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red/70" type="button" onClick={() => onDelete(provider)} aria-label={`${t('providers.delete')} ${provider.name}`}><Trash2 aria-hidden="true" size={15} /></button></div></div>
              </article>
            )
          })}
          <button className="flex min-h-[185px] min-w-0 flex-col items-center justify-center gap-1.5 rounded-[9px] border border-dashed border-[#3a414a] text-[#7b8389] transition-colors hover:border-mint/40 hover:bg-mint/5 hover:text-mint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mint/70" type="button" onClick={(event) => onAdd(event.currentTarget)}><span className="mb-1 grid size-9 place-items-center rounded-[9px] bg-mint/10 text-mint"><Plus aria-hidden="true" size={20} /></span><strong className="text-xs font-medium">{t('providers.addNew')}</strong><small className="max-w-full break-words text-center font-mono text-[9px] text-[#646c74]">{t('providers.addNewCopy')}</small></button>
        </div>
      )}

      <div className="mt-5 flex min-w-0 items-start gap-2 text-[10px] text-[#687078]"><span aria-hidden="true" className="shrink-0 text-base text-mint">↗</span><p className="m-0 min-w-0 break-words">{t('providers.footnote')}</p></div>
    </div>
  )
}
