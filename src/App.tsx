import { useMutation } from '@tanstack/react-query'
import { nanoid } from 'nanoid'
import {
  Activity,
  ArrowUpRight,
  ChevronRight,
  Layers3,
  Settings2,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { generateWithProvider, providerErrorMessage } from './api'
import { EmptyResults } from './components/EmptyResults'
import { ModelPicker } from './components/ModelPicker'
import { PreviewDialog } from './components/PreviewDialog'
import { PromptComposer } from './components/PromptComposer'
import { ProviderDialog } from './components/ProviderDialog'
import { ProvidersView } from './components/ProvidersView'
import { ResultCard } from './components/ResultCard'
import { SettingsView } from './components/SettingsView'
import { Sidebar } from './components/Sidebar'
import { ThemePicker } from './components/ThemePicker'
import { createDemoResult, createInitialDemoResults } from './demo'
import { useAppStore } from './store'
import type { AppView, GenerationResult, ModelOption, Provider, ProviderDraft } from './types'
import './styles.css'

interface GenerationPayload {
  models: ModelOption[]
  prompt: string
  demoMode: boolean
  signal: AbortSignal
}

const modelKey = (providerId: string, model: string) => `${providerId}::${model}`

const parseModelIds = (value: string) => [...new Set(value.split(/[\n,]/).map((item) => item.trim()).filter(Boolean))]

function App() {
  const {
    providers,
    selectedModelKeys,
    prompt,
    demoMode,
    activeView,
    results,
    isRunning,
    setPrompt,
    setActiveView,
    toggleModel,
    clearModelSelection,
    addProvider,
    updateProvider,
    removeProvider,
    setDemoMode,
    setRunning,
    replaceResults,
    upsertResult,
    removeResult,
    clearResults,
    clearConfiguration,
    restoreDefaults,
  } = useAppStore()
  const [providerDialogOpen, setProviderDialogOpen] = useState(false)
  const [editingProvider, setEditingProvider] = useState<Provider | null>(null)
  const [previewResult, setPreviewResult] = useState<GenerationResult | null>(null)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const abortControllerRef = useRef<AbortController | null>(null)
  const initialDemoSeeded = useRef(false)

  const modelOptions = useMemo<ModelOption[]>(
    () =>
      providers
        .filter((provider) => provider.enabled)
        .flatMap((provider) =>
          provider.models.map((model) => ({
            key: modelKey(provider.id, model),
            providerId: provider.id,
            providerName: provider.name,
            model,
            accent: provider.accent,
            kind: provider.kind,
            configured: Boolean(provider.apiKey.trim()),
          })),
        ),
    [providers],
  )

  const selectedModels = useMemo(
    () => selectedModelKeys.map((key) => modelOptions.find((model) => model.key === key)).filter((model): model is ModelOption => Boolean(model)),
    [modelOptions, selectedModelKeys],
  )

  useEffect(() => {
    if (initialDemoSeeded.current || results.length > 0 || modelOptions.length === 0) return
    initialDemoSeeded.current = true
    const demoModels = selectedModels.length > 0 ? selectedModels : modelOptions
    replaceResults(createInitialDemoResults(demoModels))
  }, [modelOptions, replaceResults, results.length, selectedModels])

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setEditingProvider(null)
        setProviderDialogOpen(true)
      }
    }
    window.addEventListener('keydown', handleShortcut)
    return () => window.removeEventListener('keydown', handleShortcut)
  }, [])

  const generationMutation = useMutation<GenerationResult[], Error, GenerationPayload>({
    mutationFn: async ({ models, prompt: currentPrompt, demoMode: useDemo, signal }) => {
      const runningResults = models.map((model) => ({
        id: `${model.key}-${nanoid(8)}`,
        providerId: model.providerId,
        providerName: model.providerName,
        model: model.model,
        accent: model.accent,
        status: 'running' as const,
        createdAt: Date.now(),
      }))
      runningResults.forEach((result) => upsertResult(result))

      return Promise.all(
        models.map(async (model, index) => {
          const startedAt = Date.now()
          try {
            if (useDemo) {
              const demo = createDemoResult(model, index)
              const result: GenerationResult = {
                ...demo,
                id: runningResults[index].id,
                elapsedMs: Date.now() - startedAt,
              }
              upsertResult(result)
              return result
            }
            const provider = providers.find((item) => item.id === model.providerId)
            if (!provider) throw new Error('找不到对应的提供商配置')
            const output = await generateWithProvider(provider, model.model, currentPrompt, { signal })
            const result: GenerationResult = {
              id: runningResults[index].id,
              providerId: model.providerId,
              providerName: model.providerName,
              model: model.model,
              accent: model.accent,
              status: 'success',
              html: output.html,
              raw: output.raw,
              elapsedMs: Date.now() - startedAt,
              createdAt: Date.now(),
            }
            upsertResult(result)
            return result
          } catch (error) {
            const result: GenerationResult = {
              id: runningResults[index].id,
              providerId: model.providerId,
              providerName: model.providerName,
              model: model.model,
              accent: model.accent,
              status: 'error',
              error: providerErrorMessage(error),
              elapsedMs: Date.now() - startedAt,
              createdAt: Date.now(),
            }
            upsertResult(result)
            return result
          }
        }),
      )
    },
    onError: (error) => {
      toast.error(providerErrorMessage(error))
    },
    onSettled: () => {
      setRunning(false)
      abortControllerRef.current = null
    },
  })

  const startGeneration = (
    models: ModelOption[],
    currentPrompt = prompt,
    useDemo = demoMode,
    preserveResults = false,
  ) => {
    if (isRunning) return
    if (!currentPrompt.trim()) {
      toast.error('先写一段提示词再开始生成')
      return
    }
    if (models.length === 0) {
      toast.error('至少选择一个模型')
      return
    }
    const controller = new AbortController()
    abortControllerRef.current = controller
    if (!preserveResults) replaceResults([])
    setRunning(true)
    generationMutation.mutate({ models, prompt: currentPrompt.trim(), demoMode: useDemo, signal: controller.signal })
  }

  const handleGenerate = () => startGeneration(selectedModels)

  const handleRetry = (result: GenerationResult) => {
    const model = modelOptions.find((item) => item.providerId === result.providerId && item.model === result.model)
    if (!model) {
      toast.error('这个模型已经从提供商配置中移除')
      return
    }
    removeResult(result.id)
    startGeneration([model], prompt, demoMode, true)
  }

  const openAddProvider = () => {
    setEditingProvider(null)
    setProviderDialogOpen(true)
    setMobileSidebarOpen(false)
  }

  const openEditProvider = (provider: Provider) => {
    setEditingProvider(provider)
    setProviderDialogOpen(true)
  }

  const handleSaveProvider = (draft: ProviderDraft, providerId?: string) => {
    const normalized: ProviderDraft = {
      ...draft,
      baseUrl: draft.baseUrl.trim(),
      models: parseModelIds(draft.models).join('\n'),
    }
    if (providerId) {
      updateProvider(providerId, {
        name: normalized.name.trim(),
        kind: normalized.kind,
        apiKey: normalized.apiKey.trim(),
        baseUrl: normalized.baseUrl || undefined,
        models: parseModelIds(normalized.models),
      })
    } else {
      addProvider(normalized)
    }
  }

  const handleDeleteProvider = (provider: Provider) => {
    if (!window.confirm(`确定删除 ${provider.name} 吗？`)) return
    removeProvider(provider.id)
    if (editingProvider?.id === provider.id) setProviderDialogOpen(false)
    toast.success('提供商已删除')
  }

  const handleRestore = () => {
    if (!window.confirm('恢复默认配置会覆盖当前提供商和提示词，确定继续吗？')) return
    restoreDefaults()
    clearResults()
    toast.success('已恢复默认配置')
  }

  const handleClear = () => {
    if (!window.confirm('确定清除当前浏览器中的所有本地配置吗？')) return
    clearConfiguration()
    toast.success('本地配置已清除')
  }

  const handleViewChange = (view: AppView) => {
    setActiveView(view)
    setMobileSidebarOpen(false)
  }

  const loadDemo = () => {
    const demoModels = selectedModels.length > 0 ? selectedModels : modelOptions
    if (demoModels.length === 0) {
      toast.error('请先添加至少一个模型')
      return
    }
    replaceResults(createInitialDemoResults(demoModels))
    toast.success('已加载示例结果')
  }

  const viewTitle: Record<AppView, string> = {
    studio: 'Studio',
    providers: 'Providers',
    settings: 'Settings',
  }

  return (
    <div className="app-shell">
      <div className={`mobile-sidebar-backdrop ${mobileSidebarOpen ? 'visible' : ''}`} onClick={() => setMobileSidebarOpen(false)} />
      <div className={`sidebar-shell ${mobileSidebarOpen ? 'mobile-open' : ''}`}>
        <Sidebar
          activeView={activeView}
          providerCount={providers.length}
          configuredCount={providers.filter((provider) => provider.apiKey.trim()).length}
          onViewChange={handleViewChange}
          onAddProvider={openAddProvider}
        />
      </div>

      <main className="main-shell">
        <header className="topbar">
          <div className="topbar-left">
            <button className="mobile-menu-button icon-button subtle" type="button" onClick={() => setMobileSidebarOpen(true)} aria-label="打开导航">
              <Layers3 size={18} />
            </button>
            <div className="breadcrumbs"><span>Workspace</span><ChevronRight size={13} /><strong>{viewTitle[activeView]}</strong></div>
          </div>
          <div className="topbar-actions">
            <div className="local-status"><span className="status-pulse" />Local workspace</div>
            <ThemePicker />
            <button className="icon-button subtle" type="button" onClick={() => toast.info('所有密钥和配置都只保存在当前浏览器。')} aria-label="安全说明" title="安全说明"><ShieldCheck size={17} /></button>
            <button className="icon-button subtle" type="button" onClick={() => handleViewChange('settings')} aria-label="打开设置" title="设置"><Settings2 size={17} /></button>
          </div>
        </header>

        {activeView === 'studio' && (
          <div className="page-content studio-page">
            <div className="studio-intro">
              <div>
                <div className="intro-kicker"><span className="kicker-line" />MULTI-MODEL PLAYGROUND</div>
                <h1>让一个想法，<em>同时发生。</em></h1>
                <p>把同一份 brief 交给多个模型，比较它们如何理解你的想法。</p>
              </div>
              <div className="intro-aside">
                <div className="intro-aside-icon"><Sparkles size={18} /></div>
                <div><strong>Canvas ready</strong><span>选择一个方向开始</span></div>
                <ArrowUpRight size={16} />
              </div>
            </div>

            <PromptComposer
              prompt={prompt}
              selectedCount={selectedModels.length}
              demoMode={demoMode}
              isRunning={isRunning}
              onPromptChange={setPrompt}
              onDemoModeChange={setDemoMode}
              onGenerate={handleGenerate}
              onManageModels={() => handleViewChange('providers')}
            />

            <div className="model-selection-bar">
              <div className="model-selection-heading">
                <div><span className="eyebrow">MODEL SET</span><strong>{selectedModels.length > 0 ? '本次运行目标' : '还没有选择模型'}</strong></div>
                <span>{selectedModels.length > 0 ? `${selectedModels.length} 个并行任务` : '可多选'}</span>
              </div>
              <div className="selected-models-list">
                {selectedModels.length > 0 ? selectedModels.map((model) => (
                  <button className="selected-model-chip" type="button" key={model.key} onClick={() => toggleModel(model.key)} title="移除模型">
                    <span className="provider-dot" style={{ background: model.accent }} />
                    <span>{model.model}</span>
                    <X size={13} />
                  </button>
                )) : <span className="no-models-copy">从右侧选择模型开始组合</span>}
              </div>
              <ModelPicker
                models={modelOptions}
                selectedKeys={selectedModels.map((model) => model.key)}
                onToggle={toggleModel}
                onClear={clearModelSelection}
                onManage={() => handleViewChange('providers')}
              />
            </div>

            <section className="results-section" aria-labelledby="results-heading">
              <div className="results-heading-row">
                <div>
                  <div className="results-title-line"><h2 id="results-heading">生成结果</h2><span className="result-count">{results.length}</span></div>
                  <p>{demoMode ? '当前为演示模式 · 不会调用外部 API' : '每个模型都在独立 sandbox 中渲染'}</p>
                </div>
                <div className="results-heading-actions">
                  {results.length > 0 && <button className="text-button" type="button" onClick={loadDemo}><Sparkles size={14} />重新载入示例</button>}
                  <span className="results-view-label"><Activity size={14} />GRID VIEW</span>
                </div>
              </div>
              {results.length === 0 ? (
                <EmptyResults onLoadDemo={loadDemo} onSelectModels={() => handleViewChange('providers')} />
              ) : (
                <div className="results-grid">
                  {results.map((result) => (
                    <ResultCard
                      key={result.id}
                      result={result}
                      onExpand={setPreviewResult}
                      onRemove={removeResult}
                      onRetry={handleRetry}
                    />
                  ))}
                </div>
              )}
            </section>
          </div>
        )}

        {activeView === 'providers' && (
          <ProvidersView
            providers={providers}
            onAdd={openAddProvider}
            onEdit={openEditProvider}
            onDelete={handleDeleteProvider}
          />
        )}

        {activeView === 'settings' && (
          <SettingsView
            providers={providers}
            promptLength={prompt.length}
            selectedCount={selectedModels.length}
            onRestore={handleRestore}
            onClear={handleClear}
          />
        )}
      </main>

      <ProviderDialog
        open={providerDialogOpen}
        onOpenChange={setProviderDialogOpen}
        provider={editingProvider}
        onSave={handleSaveProvider}
        onDelete={handleDeleteProvider}
      />
      <PreviewDialog
        result={previewResult}
        open={Boolean(previewResult)}
        onOpenChange={(open) => { if (!open) setPreviewResult(null) }}
      />
    </div>
  )
}

export default App
