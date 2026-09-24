import {
  Boxes,
  ChevronDown,
  CircleHelp,
  Database,
  KeyRound,
  LayoutGrid,
  Plus,
  Settings2,
  Sparkles,
} from 'lucide-react'
import type { AppView } from '../types'

interface SidebarProps {
  activeView: AppView
  providerCount: number
  configuredCount: number
  onViewChange: (view: AppView) => void
  onAddProvider: () => void
}

const navigation: { id: AppView; label: string; icon: typeof LayoutGrid }[] = [
  { id: 'studio', label: 'Studio', icon: LayoutGrid },
  { id: 'providers', label: 'Providers', icon: Boxes },
  { id: 'settings', label: 'Settings', icon: Settings2 },
]

export function Sidebar({
  activeView,
  providerCount,
  configuredCount,
  onViewChange,
  onAddProvider,
}: SidebarProps) {
  return (
    <aside className="sidebar">
      <div className="brand-lockup">
        <div className="brand-mark"><Sparkles size={16} fill="currentColor" /></div>
        <div>
          <strong>Mosaic</strong>
          <span>MODEL STUDIO</span>
        </div>
      </div>

      <button className="workspace-switcher" type="button">
        <span className="workspace-avatar">P</span>
        <span className="workspace-copy"><strong>Personal workspace</strong><small>Local only</small></span>
        <ChevronDown size={15} />
      </button>

      <div className="sidebar-section-label">Workspace</div>
      <nav className="sidebar-nav" aria-label="主导航">
        {navigation.map((item) => {
          const Icon = item.icon
          const active = activeView === item.id
          return (
            <button
              className={`nav-item ${active ? 'active' : ''}`}
              key={item.id}
              type="button"
              onClick={() => onViewChange(item.id)}
              aria-current={active ? 'page' : undefined}
            >
              <Icon size={17} strokeWidth={active ? 2.2 : 1.7} />
              <span>{item.label}</span>
              {item.id === 'providers' && <em>{providerCount}</em>}
            </button>
          )
        })}
      </nav>

      <div className="sidebar-section-label provider-label">
        <span>Providers</span>
        <button className="sidebar-add" type="button" onClick={onAddProvider} aria-label="添加提供商">
          <Plus size={15} />
        </button>
      </div>
      <div className="sidebar-provider-list">
        <div className="sidebar-provider-summary">
          <span className="summary-icon"><KeyRound size={14} /></span>
          <span><strong>{configuredCount}/{providerCount}</strong><small>已配置密钥</small></span>
        </div>
        <div className="storage-meter"><span style={{ width: `${providerCount ? (configuredCount / providerCount) * 100 : 0}%` }} /></div>
        <button className="manage-link" type="button" onClick={() => onViewChange('providers')}>
          管理连接 <ChevronDown size={14} className="rotate-minus-90" />
        </button>
      </div>

      <div className="sidebar-bottom">
        <div className="local-note"><Database size={14} /><span>数据保存在<br />此浏览器</span></div>
        <button className="help-link" type="button"><CircleHelp size={15} />帮助与快捷键</button>
        <div className="user-row">
          <div className="user-avatar">YC</div>
          <span><strong>Yours truly</strong><small>Local workspace</small></span>
          <button className="icon-button subtle" type="button" aria-label="更多用户选项"><ChevronDown size={14} /></button>
        </div>
      </div>
    </aside>
  )
}
