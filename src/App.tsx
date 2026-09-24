import { useMutation } from '@tanstack/react-query'
import { nanoid } from 'nanoid'
import { Activity, ArrowUpRight, ChevronRight, Layers3, Settings2, ShieldCheck, Sparkles, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
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
import { LanguagePicker } from './components/LanguagePicker'
import { createDemoResult, createInitialDemoResults } from './demo'
import { useAppStore } from './store'
import type { AppView, GenerationResult, ModelOption, Provider, ProviderDraft } from './types'
import { webContainerManager } from './webcontainer'

const MAX_CONCURRENT_REQUESTS = 3

interface GenerationPayload {
  models: ModelOption[]
  providers: Provider[]
  prompt: string
  demoMode: boolean
  signal: AbortSignal
  token: number
  runId: string
  results: GenerationResult[]
}

interface ActiveGeneration {
  token: number
  runId: string
  controller: AbortController
  results: GenerationResult[]
  startedAt: Array<number | undefined>
  cancelled: boolean
}

const modelKey = (providerId: string, model: string) => `${providerId}::${model}`
const parseModelIds = (value: string) => [...new Set(value.split(/[\n,]/).map((item) => item.trim()).filter(Boolean))]

function App() {
  const { t } = useTranslation()
  const { providers, selectedModelKeys, prompt, demoMode, activeView, results, isRunning, setPrompt, setActiveView, toggleModel, clearModelSelection, addProvider, updateProvider, removeProvider, setDemoMode, setRunning, replaceResults, upsertResult, removeResult, clearResults, clearConfiguration, restoreDefaults } = useAppStore()
  const [providerDialogOpen, setProviderDialogOpen] = useState(false)
  const [editingProvider, setEditingProvider] = useState<Provider | null>(null)
  const [previewResult, setPreviewResult] = useState<GenerationResult | null>(null)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const abortControllerRef = useRef<AbortController | null>(null)
  const activeGenerationRef = useRef<ActiveGeneration | null>(null)
  const generationTokenRef = useRef(0)
  const mountedRef = useRef(true)
  const initialDemoSeeded = useRef(false)

  const modelOptions = useMemo<ModelOption[]>(() => providers.filter((provider) => provider.enabled).flatMap((provider) => provider.models.map((model) => ({ key: modelKey(provider.id, model), providerId: provider.id, providerName: provider.name, model, accent: provider.accent, kind: provider.kind, configured: Boolean(provider.apiKey.trim()) }))), [providers])
  const selectedModels = useMemo(() => selectedModelKeys.map((key) => modelOptions.find((model) => model.key === key)).filter((model): model is ModelOption => Boolean(model)), [modelOptions, selectedModelKeys])

  const ownsActiveGeneration = (token: number, runId: string) => {
    const active = activeGenerationRef.current
    return Boolean(active && active.token === token && active.runId === runId && !active.cancelled)
  }

  const cancelActiveGeneration = useCallback((preserveCancelledResults: boolean) => {
    generationTokenRef.current += 1
    const active = activeGenerationRef.current
    if (active) active.cancelled = true
    activeGenerationRef.current = null
    abortControllerRef.current = null
    active?.controller.abort()

    if (!active) {
      if (mountedRef.current) setRunning(false)
      return
    }

    if (preserveCancelledResults && mountedRef.current) {
      const cancelledAt = Date.now()
      active.results.forEach((result, index) => {
        if (result.status !== 'queued' && result.status !== 'running') return
        const startedAt = active.startedAt[index]
        const cancelledResult: GenerationResult = {
          ...result,
          status: 'cancelled',
          elapsedMs: startedAt === undefined ? undefined : cancelledAt - startedAt,
        }
        active.results[index] = cancelledResult
        upsertResult(cancelledResult)
      })
    }
    if (mountedRef.current) setRunning(false)
  }, [setRunning, upsertResult])

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      cancelActiveGeneration(false)
    }
  }, [cancelActiveGeneration])
  useEffect(() => { if (!demoMode || initialDemoSeeded.current || results.length > 0 || modelOptions.length === 0) return; initialDemoSeeded.current = true; replaceResults(createInitialDemoResults(selectedModels.length > 0 ? selectedModels : modelOptions)) }, [demoMode, modelOptions, replaceResults, results.length, selectedModels])
  useEffect(() => { const handleShortcut = (event: KeyboardEvent) => { if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); setEditingProvider(null); setProviderDialogOpen(true) } }; window.addEventListener('keydown', handleShortcut); return () => window.removeEventListener('keydown', handleShortcut) }, [])

  const generationMutation = useMutation<GenerationResult[], Error, GenerationPayload>({
    mutationFn: async ({ models, providers: generationProviders, prompt: currentPrompt, demoMode: useDemo, signal, token, runId, results }) => {
      const isCurrent = () => ownsActiveGeneration(token, runId) && activeGenerationRef.current?.controller.signal === signal
      const commitResult = (index: number, result: GenerationResult) => {
        if (!isCurrent()) return false
        results[index] = result
        upsertResult(result)
        return true
      }

      const runModel = async (index: number) => {
        if (!isCurrent()) return
        const model = models[index]
        const startedAt = Date.now()
        const active = activeGenerationRef.current
        if (active) active.startedAt[index] = startedAt
        if (!commitResult(index, { ...results[index], status: 'running', elapsedMs: undefined })) return

        try {
          if (useDemo) {
            const demo = createDemoResult(model, index)
            const result = {
              ...results[index],
              ...demo,
              status: 'success' as const,
              elapsedMs: Date.now() - startedAt,
              createdAt: Date.now(),
            }
            commitResult(index, result)
            return
          }

          const provider = generationProviders.find((item) => item.id === model.providerId)
          if (!provider) throw new Error(t('models.providerMissing'))
          const output = await generateWithProvider(provider, model.model, currentPrompt, { signal })
          if (!isCurrent()) return
          const result = {
            ...results[index],
            status: 'success' as const,
            project: output.project,
            html: output.html,
            raw: output.raw,
            elapsedMs: Date.now() - startedAt,
            createdAt: Date.now(),
          }
          commitResult(index, result)
        } catch (error) {
          if (!isCurrent()) return
          const result = {
            ...results[index],
            status: 'error' as const,
            error: providerErrorMessage(error),
            elapsedMs: Date.now() - startedAt,
            createdAt: Date.now(),
          }
          commitResult(index, result)
        }
      }

      let nextIndex = 0
      const runWorker = async () => {
        while (isCurrent()) {
          const index = nextIndex
          nextIndex += 1
          if (index >= models.length) return
          await runModel(index)
        }
      }
      const workerCount = Math.min(MAX_CONCURRENT_REQUESTS, models.length)
      await Promise.all(Array.from({ length: workerCount }, () => runWorker()))
      return results
    },
    onError: (error, variables) => {
      if (ownsActiveGeneration(variables.token, variables.runId)) toast.error(providerErrorMessage(error))
    },
    onSettled: (_data, _error, variables) => {
      if (!ownsActiveGeneration(variables.token, variables.runId)) return
      activeGenerationRef.current = null
      abortControllerRef.current = null
      setRunning(false)
    },
  })

  const startGeneration = (models: ModelOption[], currentPrompt = prompt, useDemo = demoMode, preserveResults = false): boolean => {
    if (isRunning || activeGenerationRef.current) return false
    if (!currentPrompt.trim()) { toast.error(t('prompt.empty')); return false }
    if (models.length === 0) { toast.error(t('models.none')); return false }

    const token = ++generationTokenRef.current
    const runId = nanoid()
    const controller = new AbortController()
    const inputPrompt = currentPrompt.trim()
    const createdAt = Date.now()
    const results: GenerationResult[] = models.map((model) => ({
      id: `${model.key}-${nanoid(8)}`,
      providerId: model.providerId,
      providerName: model.providerName,
      model: model.model,
      accent: model.accent,
      status: 'queued',
      createdAt,
      runId,
      inputPrompt,
      inputDemoMode: useDemo,
    }))
    activeGenerationRef.current = {
      token,
      runId,
      controller,
      results,
      startedAt: models.map(() => undefined),
      cancelled: false,
    }
    abortControllerRef.current = controller

    if (preserveResults) results.forEach((result) => upsertResult(result))
    else {
      if (webContainerManager.getState().projectId) void webContainerManager.stop().catch(() => undefined)
      replaceResults(results)
    }
    setRunning(true)
    generationMutation.mutate({
      models: [...models],
      providers: [...providers],
      prompt: inputPrompt,
      demoMode: useDemo,
      signal: controller.signal,
      token,
      runId,
      results,
    })
    return true
  }
  const handleGenerate = () => { startGeneration(selectedModels) }
  const stopGeneration = () => cancelActiveGeneration(true)
  const stopActiveProject = (resultId?: string) => { const activeProjectId = webContainerManager.getState().projectId; if (activeProjectId && (!resultId || activeProjectId === resultId)) void webContainerManager.stop().catch(() => undefined) }
  const handleRemoveResult = (resultId: string) => { stopActiveProject(resultId); removeResult(resultId); if (previewResult?.id === resultId) setPreviewResult(null) }
  const handleRetry = (result: GenerationResult) => {
    const model = modelOptions.find((item) => item.providerId === result.providerId && item.model === result.model)
    if (!model) { toast.error(t('models.removed')); return }
    if (startGeneration([model], result.inputPrompt ?? prompt, result.inputDemoMode ?? demoMode, true)) handleRemoveResult(result.id)
  }
  const openAddProvider = () => { setEditingProvider(null); setProviderDialogOpen(true); setMobileSidebarOpen(false) }
  const openEditProvider = (provider: Provider) => { setEditingProvider(provider); setProviderDialogOpen(true) }
  const handleSaveProvider = (draft: ProviderDraft, providerId?: string) => { const normalized: ProviderDraft = { ...draft, baseUrl: draft.baseUrl.trim(), models: parseModelIds(draft.models).join('\n') }; if (providerId) updateProvider(providerId, { name: normalized.name.trim(), kind: normalized.kind, apiKey: normalized.apiKey.trim(), baseUrl: normalized.baseUrl || undefined, models: parseModelIds(normalized.models) }); else addProvider(normalized) }
  const handleDeleteProvider = (provider: Provider) => { if (!window.confirm(t('providers.deleteConfirm', { name: provider.name }))) return; removeProvider(provider.id); if (editingProvider?.id === provider.id) setProviderDialogOpen(false); toast.success(t('providers.deleted')) }
  const handleRestore = () => { if (!window.confirm(t('settings.restoreConfirm'))) return; cancelActiveGeneration(false); stopActiveProject(); restoreDefaults(); clearResults(); setPreviewResult(null); toast.success(t('settings.restored')) }
  const handleClear = () => { if (!window.confirm(t('settings.clearConfirm'))) return; cancelActiveGeneration(false); stopActiveProject(); clearConfiguration(); setPreviewResult(null); toast.success(t('settings.cleared')) }
  const handleViewChange = (view: AppView) => { setActiveView(view); setMobileSidebarOpen(false) }
  const loadDemo = () => { const demoModels = selectedModels.length > 0 ? selectedModels : modelOptions; if (demoModels.length === 0) { toast.error(t('models.none')); return }; cancelActiveGeneration(false); stopActiveProject(); replaceResults(createInitialDemoResults(demoModels)); setPreviewResult(null); toast.success(t('results.demoLoaded')) }
  const viewTitle: Record<AppView, string> = { studio: t('nav.studio'), providers: t('nav.providers'), settings: t('nav.settings') }

  return <div className="flex min-h-screen bg-canvas">
    <div className="w-[252px] flex-none max-[820px]:w-0"><Sidebar activeView={activeView} providerCount={providers.length} configuredCount={providers.filter((provider) => provider.apiKey.trim()).length} onViewChange={handleViewChange} onAddProvider={openAddProvider} mobileOpen={mobileSidebarOpen} onMobileOpenChange={setMobileSidebarOpen} /></div>
    <main className="min-w-0 flex-1 bg-canvas"><header className="flex h-[72px] items-center justify-between border-b border-line-soft bg-canvas px-9 max-[820px]:h-16 max-[820px]:px-5 max-[580px]:px-[15px]"><div className="flex items-center"><button className="mr-2.5 hidden size-7 place-items-center rounded-md text-[#737b82] transition-colors hover:bg-surface-hover hover:text-ink max-[820px]:mr-2.5 max-[820px]:grid" type="button" onClick={() => setMobileSidebarOpen(true)} aria-label={t('nav.menu')} aria-expanded={mobileSidebarOpen} aria-controls="workspace-sidebar"><Layers3 size={18} /></button><div className="flex items-center gap-2 font-mono text-[11px] text-faint"><span>{t('nav.workspace')}</span><ChevronRight size={13} /><strong className="font-medium text-[#c3c7c8]">{viewTitle[activeView]}</strong></div></div><div className="flex items-center gap-2.5"><div className="mr-1 flex items-center gap-2 font-mono text-[10px] text-[#7d858c] max-[580px]:hidden"><span className="size-1.5 rounded-full bg-mint shadow-[0_0_0_4px_color-mix(in_srgb,var(--mint)_8%,transparent)]" />{t('topbar.local')}</div><ThemePicker /><LanguagePicker /><button className="grid size-7 place-items-center rounded-md text-[#737b82] transition-colors hover:bg-surface-hover hover:text-ink" type="button" onClick={() => toast.info(t('topbar.securityInfo'))} aria-label={t('topbar.security')} title={t('topbar.security')}><ShieldCheck size={17} /></button><button className="grid size-7 place-items-center rounded-md text-[#737b82] transition-colors hover:bg-surface-hover hover:text-ink" type="button" onClick={() => handleViewChange('settings')} aria-label={t('topbar.settings')} title={t('topbar.settings')}><Settings2 size={17} /></button></div></header>
      {activeView === 'studio' && <div className="mx-auto w-full max-w-[1320px] px-11 pb-20 pt-[52px] max-[1080px]:px-[30px] max-[580px]:px-[15px] max-[580px]:pt-8"><div className="mb-[43px] flex items-end justify-between gap-7 max-[820px]:flex-col max-[820px]:items-start"><div><div className="flex items-center gap-2 font-mono text-[10px] tracking-[0.13em] text-mint"><span className="h-px w-6 bg-mint" />{t('studio.kicker')}</div><h1 className="my-4 max-w-[700px] text-[clamp(34px,4.2vw,56px)] font-medium leading-[1.05] tracking-[-0.065em]">{t('studio.title')}<em className="not-italic text-mint">{t('studio.titleAccent')}</em></h1><p className="m-0 text-sm text-muted">{t('studio.subtitle')}</p></div><div className="flex min-w-[220px] items-center gap-2.5 rounded-[9px] border border-line bg-surface-soft p-3 text-muted max-[820px]:w-full max-[820px]:max-w-[300px]"><div className="grid size-8 place-items-center rounded-lg bg-mint/10 text-mint"><Sparkles size={18} /></div><div className="flex flex-1 flex-col gap-0.5"><strong className="text-[11px] font-semibold text-ink">{t('studio.canvas')}</strong><span className="font-mono text-[10px] text-faint">{t('studio.start')}</span></div><ArrowUpRight className="text-[#606870]" size={16} /></div></div>
        <PromptComposer prompt={prompt} selectedCount={selectedModels.length} demoMode={demoMode} isRunning={isRunning} onPromptChange={setPrompt} onDemoModeChange={setDemoMode} onGenerate={handleGenerate} onStop={stopGeneration} onManageModels={() => handleViewChange('providers')} />
        <div className="mt-8 flex flex-wrap items-center gap-4 rounded-[9px] border border-line-soft bg-surface-soft p-3.5 max-[580px]:flex-col max-[580px]:items-stretch"><div className="flex min-w-[145px] flex-col gap-0.5 max-[580px]:w-full max-[580px]:flex-row max-[580px]:items-center max-[580px]:justify-between"><div><span className="eyebrow mb-0.5 block font-mono text-[9px] uppercase tracking-[0.12em] text-faint">MODEL SET</span><strong className="text-xs font-medium">{selectedModels.length > 0 ? t('models.target') : t('models.none')}</strong></div><span className="font-mono text-[9px] text-faint">{selectedModels.length > 0 ? t('models.parallel', { count: selectedModels.length }) : t('models.multi')}</span></div><div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5 max-[580px]:order-3 max-[580px]:w-full max-[580px]:flex-basis-full">{selectedModels.length > 0 ? selectedModels.map((model) => <button className="flex max-w-[220px] items-center gap-1.5 rounded-md border border-[#30363e] bg-[#20242a] px-2 py-1.5 font-mono text-[10px] text-[#aeb5b6] transition-colors hover:border-red/35 hover:text-red" type="button" key={model.key} onClick={() => toggleModel(model.key)} title={t('results.remove')}><span className="size-[7px] shrink-0 rounded-full" style={{ background: model.accent }} /><span className="truncate">{model.model}</span><X className="text-[#737b82]" size={13} /></button>) : <span className="text-[11px] text-faint">{t('models.start')}</span>}</div><div className="ml-auto max-[580px]:ml-0 max-[580px]:w-full"><ModelPicker models={modelOptions} selectedKeys={selectedModels.map((model) => model.key)} onToggle={toggleModel} onClear={clearModelSelection} onManage={() => handleViewChange('providers')} /></div></div>
        <section className="mt-14" aria-labelledby="results-heading"><div className="mb-4 flex items-center justify-between gap-5 max-[580px]:flex-col max-[580px]:items-start"><div><div className="flex items-center gap-2"><h2 id="results-heading" className="m-0 text-[19px] font-medium tracking-[-0.03em]">{t('results.title')}</h2><span className="min-w-[21px] rounded-md bg-mint/10 px-1.5 py-1 text-center font-mono text-[10px] text-mint">{results.length}</span></div><p className="mt-1.5 mb-0 text-[11px] text-[#6d757c]">{demoMode ? t('results.demo') : t('results.sandbox')}</p></div><div className="flex w-full items-center justify-between gap-4 max-[580px]:w-full"><span className="flex items-center gap-1.5 font-mono text-[9px] text-[#697179]"><Activity size={14} />{t('results.grid')}</span>{results.length > 0 && <button className="inline-flex items-center gap-1.5 py-0.5 text-[10px] text-[#8c9499] transition-colors hover:text-ink" type="button" onClick={loadDemo} disabled={isRunning}><Sparkles size={14} />{t('results.reload')}</button>}</div></div>{results.length === 0 ? <EmptyResults onLoadDemo={loadDemo} onSelectModels={() => handleViewChange('providers')} /> : <div className="grid grid-cols-2 gap-[15px] max-[820px]:grid-cols-1">{results.map((result) => <ResultCard key={result.id} result={result} busy={isRunning} onExpand={setPreviewResult} onRemove={handleRemoveResult} onRetry={handleRetry} />)}</div>}</section>
      </div>}
      {activeView === 'providers' && <ProvidersView providers={providers} onAdd={openAddProvider} onEdit={openEditProvider} onDelete={handleDeleteProvider} />}
      {activeView === 'settings' && <SettingsView providers={providers} promptLength={prompt.length} selectedCount={selectedModels.length} onRestore={handleRestore} onClear={handleClear} />}
    </main>
    <ProviderDialog open={providerDialogOpen} onOpenChange={setProviderDialogOpen} provider={editingProvider} onSave={handleSaveProvider} onDelete={handleDeleteProvider} /><PreviewDialog result={previewResult} open={Boolean(previewResult)} onOpenChange={(open) => { if (!open) setPreviewResult(null) }} />
  </div>
}

export default App
