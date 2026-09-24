import { Check, Edit3, KeyRound, LockKeyhole, MoreHorizontal, Plus, Server, Trash2, TriangleAlert } from 'lucide-react'
import type { Provider } from '../types'
import { PROVIDER_KIND_LABELS } from '../types'

interface ProvidersViewProps {
  providers: Provider[]
  onAdd: () => void
  onEdit: (provider: Provider) => void
  onDelete: (provider: Provider) => void
}

const providerInitials: Record<string, string> = {
  openai: '◎',
  anthropic: 'A',
  gemini: '✦',
  openrouter: 'OR',
}

export function ProvidersView({ providers, onAdd, onEdit, onDelete }: ProvidersViewProps) {
  const configuredCount = providers.filter((provider) => provider.apiKey.trim()).length

  return (
    <div className="page-content providers-page">
      <div className="page-header">
        <div>
          <p className="eyebrow">02 / CONNECTIONS</p>
          <h1>Providers</h1>
          <p className="page-subtitle">连接你的模型服务，使用个人密钥在本地运行生成任务。</p>
        </div>
        <button className="button primary" type="button" onClick={onAdd}>
          <Plus size={17} />
          添加提供商
        </button>
      </div>

      <div className="provider-security-banner">
        <div className="security-banner-icon"><LockKeyhole size={18} /></div>
        <div>
          <strong>你的密钥只属于这个浏览器</strong>
          <p>配置通过 Zustand persist 写入本机 <code>localStorage</code>。请使用测试密钥并设置供应商额度。</p>
        </div>
        <span className="security-banner-count"><b>{configuredCount}</b> / {providers.length} 已配置</span>
      </div>

      <div className="subsection-heading">
        <div><h2>已连接的提供商</h2><span>选择不同协议，组合你的模型池</span></div>
        <span className="subsection-count">{providers.length} providers</span>
      </div>

      {providers.length === 0 ? (
        <div className="empty-providers">
          <div className="empty-icon"><Server size={22} /></div>
          <h3>还没有提供商</h3>
          <p>添加一个 API 服务和模型，开始你的第一次并行生成。</p>
          <button className="button primary" type="button" onClick={onAdd}><Plus size={16} />添加第一个</button>
        </div>
      ) : (
        <div className="provider-card-grid">
          {providers.map((provider) => {
            const configured = Boolean(provider.apiKey.trim())
            return (
              <article className="provider-card" key={provider.id}>
                <div className="provider-card-topline">
                  <div className="provider-identity">
                    <div className="provider-logo" style={{ background: provider.accent }}>
                      {providerInitials[provider.kind] ?? '·'}
                    </div>
                    <div>
                      <h3>{provider.name}</h3>
                      <span>{PROVIDER_KIND_LABELS[provider.kind]}</span>
                    </div>
                  </div>
                  <button className="icon-button subtle" type="button" onClick={() => onEdit(provider)} aria-label={`编辑 ${provider.name}`}>
                    <MoreHorizontal size={18} />
                  </button>
                </div>
                <div className={`provider-key-status ${configured ? 'configured' : 'unconfigured'}`}>
                  {configured ? <Check size={14} /> : <TriangleAlert size={14} />}
                  <span>{configured ? '密钥已配置' : '等待配置 API Key'}</span>
                  <span className="status-spacer" />
                  <KeyRound size={13} />
                </div>
                <div className="provider-models">
                  {provider.models.slice(0, 3).map((model) => <span key={model}>{model}</span>)}
                  {provider.models.length > 3 && <span>+{provider.models.length - 3}</span>}
                </div>
                <div className="provider-card-footer">
                  <span className="provider-url"><Server size={13} />{provider.baseUrl ?? 'SDK 默认地址'}</span>
                  <div className="provider-card-actions">
                    <button className="icon-button card-action" type="button" onClick={() => onEdit(provider)} aria-label="编辑提供商"><Edit3 size={15} /></button>
                    <button className="icon-button card-action danger-action" type="button" onClick={() => onDelete(provider)} aria-label="删除提供商"><Trash2 size={15} /></button>
                  </div>
                </div>
              </article>
            )
          })}
          <button className="provider-add-card" type="button" onClick={onAdd}>
            <span className="add-card-icon"><Plus size={20} /></span>
            <strong>添加新的提供商</strong>
            <small>OpenAI · Anthropic · Gemini · 兼容接口</small>
          </button>
        </div>
      )}

      <div className="provider-footnote">
        <span className="footnote-icon">↗</span>
        <p>模型名称、Base URL 和密钥都由你掌控。Mosaic 不会代理或上传你的密钥。</p>
      </div>
    </div>
  )
}
