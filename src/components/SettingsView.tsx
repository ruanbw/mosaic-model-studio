import { CheckCircle2, Database, Info, RotateCcw, ShieldCheck, Trash2 } from 'lucide-react'
import type { Provider } from '../types'

interface SettingsViewProps {
  providers: Provider[]
  promptLength: number
  selectedCount: number
  onRestore: () => void
  onClear: () => void
}

export function SettingsView({ providers, promptLength, selectedCount, onRestore, onClear }: SettingsViewProps) {
  return (
    <div className="page-content settings-page">
      <div className="page-header">
        <div>
          <p className="eyebrow">03 / PREFERENCES</p>
          <h1>Settings</h1>
          <p className="page-subtitle">管理本地工作区状态和生成偏好。</p>
        </div>
      </div>

      <div className="settings-grid">
        <section className="settings-card">
          <div className="settings-card-heading">
            <div className="settings-icon mint"><Database size={18} /></div>
            <div><h2>本地数据</h2><p>所有配置都保存在当前浏览器的 localStorage。</p></div>
          </div>
          <div className="settings-stat-list">
            <div><span>提供商</span><strong>{providers.length}</strong></div>
            <div><span>已配置密钥</span><strong>{providers.filter((provider) => provider.apiKey).length}</strong></div>
            <div><span>已选模型</span><strong>{selectedCount}</strong></div>
            <div><span>提示词长度</span><strong>{promptLength}</strong></div>
          </div>
          <div className="settings-actions">
            <button className="button secondary" type="button" onClick={onRestore}><RotateCcw size={15} />恢复默认配置</button>
            <button className="button danger-ghost" type="button" onClick={onClear}><Trash2 size={15} />清除本地配置</button>
          </div>
        </section>

        <section className="settings-card security-settings-card">
          <div className="settings-card-heading">
            <div className="settings-icon violet"><ShieldCheck size={18} /></div>
            <div><h2>安全边界</h2><p>这是个人 BYOK 工具，不是生产密钥托管服务。</p></div>
          </div>
          <div className="security-check-list">
            <div><CheckCircle2 size={16} /><span>密钥仅保存于本机浏览器</span></div>
            <div><CheckCircle2 size={16} /><span>模型输出在 sandbox iframe 中预览</span></div>
            <div><CheckCircle2 size={16} /><span>生成前可逐个确认模型</span></div>
          </div>
          <div className="info-callout"><Info size={15} /><p>生产环境请使用后端代理、限制额度，并避免把高价值密钥放进浏览器。</p></div>
        </section>
      </div>

      <div className="settings-shortcuts">
        <div className="subsection-heading"><div><h2>快捷键</h2><span>让提示词流保持在你的节奏里</span></div></div>
        <div className="shortcut-list">
          <div><span>运行生成</span><kbd>⌘</kbd><kbd>↵</kbd></div>
          <div><span>关闭弹窗 / 预览</span><kbd>Esc</kbd></div>
          <div><span>添加提供商</span><kbd>⌘</kbd><kbd>K</kbd></div>
        </div>
      </div>
    </div>
  )
}
