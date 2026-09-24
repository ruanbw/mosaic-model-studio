import * as Dialog from '@radix-ui/react-dialog'
import { Boxes, ChevronDown, CircleHelp, Database, KeyRound, LayoutGrid, Plus, Settings2, Sparkles, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { AppView } from '../types'

interface SidebarProps {
  activeView: AppView
  providerCount: number
  configuredCount: number
  onViewChange: (view: AppView) => void
  onAddProvider: (opener?: HTMLElement) => void
  mobileOpen: boolean
  onMobileOpenChange: (open: boolean) => void
}

interface SidebarContentProps extends Omit<SidebarProps, 'mobileOpen' | 'onMobileOpenChange'> { onClose?: () => void }
const navigation: { id: AppView; icon: typeof LayoutGrid }[] = [{ id: 'studio', icon: LayoutGrid }, { id: 'providers', icon: Boxes }, { id: 'settings', icon: Settings2 }]
const labelKeys: Record<AppView, string> = { studio: 'nav.studio', providers: 'nav.providers', settings: 'nav.settings' }

function SidebarContent({ activeView, providerCount, configuredCount, onViewChange, onAddProvider, onClose }: SidebarContentProps) {
  const { t } = useTranslation()
  const navigate = (view: AppView) => { onViewChange(view); onClose?.() }
  return <>
    <div className="mb-6 flex items-center gap-2.5 px-2.5">
      <div className="grid size-7 shrink-0 place-items-center rounded-lg bg-mint text-[#101710] shadow-[0_0_0_4px_color-mix(in_srgb,var(--mint)_8%,transparent)]"><Sparkles size={16} fill="currentColor" /></div>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5"><strong className="truncate text-[16px] tracking-[-0.03em]">Mosaic</strong><span className="font-mono text-[9px] tracking-[0.12em] text-faint">MODEL STUDIO</span></div>
      {onClose && <Dialog.Close asChild><button className="grid size-10 shrink-0 place-items-center rounded-md text-muted transition-colors hover:bg-surface-hover hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mint/70" type="button" aria-label={`${t('common.close')} ${t('nav.menu')}`}><X size={18} /></button></Dialog.Close>}
    </div>
    <div className="mb-6 flex w-full min-w-0 items-center gap-2 rounded-[9px] border border-line bg-surface px-2 py-2 text-left"><span className="grid size-6 shrink-0 place-items-center rounded-[7px] bg-violet text-xs font-bold text-[#17131e]">P</span><span className="flex min-w-0 flex-1 flex-col gap-0.5"><strong className="truncate text-[11px] font-semibold">Personal workspace</strong><small className="font-mono text-[9px] text-faint">{t('nav.localOnly')}</small></span></div>
    <div className="mb-2 px-2.5 font-mono text-[10px] uppercase tracking-[0.1em] text-faint">{t('nav.workspace')}</div>
    <nav className="grid gap-0.5" aria-label={t('nav.workspace')}>
      {navigation.map((item) => {
        const Icon = item.icon
        const active = activeView === item.id
        return <button className={`flex min-h-11 w-full items-center gap-2.5 rounded-lg border px-2.5 py-2.5 text-left text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-mint/70 ${active ? 'border-mint/20 bg-mint/10 text-mint' : 'border-transparent text-muted hover:bg-surface-hover hover:text-ink'}`} key={item.id} type="button" onClick={() => navigate(item.id)} aria-current={active ? 'page' : undefined}><Icon aria-hidden="true" size={17} strokeWidth={active ? 2.2 : 1.7} /><span>{t(labelKeys[item.id])}</span>{item.id === 'providers' && <em className={`ml-auto min-w-5 rounded-full px-1.5 py-0.5 text-center font-mono text-[10px] not-italic ${active ? 'bg-mint/15 text-mint' : 'bg-surface-hover text-muted'}`}>{providerCount}</em>}</button>
      })}
    </nav>
    <div className="mb-2 mt-7 flex min-h-11 items-center justify-between gap-2 px-2.5 font-mono text-[10px] uppercase tracking-[0.1em] text-faint"><span>{t('nav.providers')}</span><button className="grid size-10 shrink-0 place-items-center rounded-md border border-line text-muted transition-colors hover:border-mint/40 hover:text-mint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mint/70" type="button" onClick={(event) => { onAddProvider(event.currentTarget); onClose?.() }} aria-label={t('providers.add')}><Plus size={15} /></button></div>
    <div className="mx-1 min-w-0 rounded-[9px] border border-line-soft bg-surface p-3">
      <div className="flex min-w-0 items-center gap-2"><span className="grid size-6 shrink-0 place-items-center rounded-[7px] bg-mint/10 text-mint"><KeyRound size={14} /></span><span className="flex min-w-0 flex-col gap-0.5"><strong className="text-xs">{configuredCount}/{providerCount}</strong><small className="text-[10px] text-faint">{t('nav.configured')}</small></span></div>
      <div className="my-3 h-1 overflow-hidden rounded-full bg-surface-hover"><span className="block h-full rounded-full bg-mint transition-[width] duration-300" style={{ width: `${providerCount ? (configuredCount / providerCount) * 100 : 0}%` }} /></div>
      <button className="inline-flex min-h-10 w-full items-center gap-1.5 rounded-md px-1 text-left text-[10px] text-muted transition-colors hover:bg-surface-hover hover:text-mint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mint/70" type="button" onClick={() => navigate('providers')}>{t('nav.manage')} <ChevronDown aria-hidden="true" className="-rotate-90" size={14} /></button>
    </div>
    <div className="mt-auto grid gap-4"><div className="flex min-h-11 items-center gap-2 rounded-lg border border-line-soft bg-surface px-2.5 py-2.5 font-mono text-[10px] leading-[1.4] text-faint"><Database aria-hidden="true" className="shrink-0 text-mint" size={14} /><span className="min-w-0">{t('nav.localData')}</span></div><button className="flex min-h-11 w-full items-center gap-2 rounded-md px-2.5 text-left text-[11px] text-muted transition-colors hover:bg-surface-hover hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-mint/70" type="button" onClick={() => navigate('settings')}><CircleHelp aria-hidden="true" size={15} />{t('nav.help')}</button></div>
  </>
}

export function Sidebar(props: SidebarProps) {
  const { activeView, providerCount, configuredCount, onViewChange, onAddProvider, mobileOpen, onMobileOpenChange } = props
  const { t } = useTranslation()
  const contentProps = { activeView, providerCount, configuredCount, onViewChange, onAddProvider }
  return <>
    <aside id="workspace-sidebar-desktop" aria-label={t('nav.workspace')} className="fixed inset-y-0 left-0 z-20 hidden w-[252px] min-w-0 flex-col border-r border-line-soft bg-sidebar px-3.5 py-6 min-[821px]:flex"><SidebarContent {...contentProps} /></aside>
    <Dialog.Root open={mobileOpen} onOpenChange={onMobileOpenChange}><Dialog.Portal><Dialog.Overlay className="fixed inset-0 z-[50] bg-black/55 backdrop-blur-[1px] min-[821px]:hidden" /><Dialog.Content id="workspace-sidebar" className="fixed inset-y-0 left-0 z-[51] flex w-[min(292px,88vw)] min-w-0 flex-col overflow-y-auto border-r border-line bg-sidebar px-3.5 py-6 shadow-2xl outline-none min-[821px]:hidden"><Dialog.Title className="sr-only">{t('nav.menu')}</Dialog.Title><Dialog.Description className="sr-only">{t('nav.workspace')}</Dialog.Description><SidebarContent {...contentProps} onClose={() => onMobileOpenChange(false)} /></Dialog.Content></Dialog.Portal></Dialog.Root>
  </>
}
