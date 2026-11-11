import { addRunHistoryEntry, deserializeRunHistory, serializeRunHistory } from '../project/history'
import { RUN_HISTORY_STORAGE_KEY } from '../components/HistoryPanel'
import type { GenerationResult, ModelOption, Provider } from '../types'

export const MAX_CONCURRENT_REQUESTS = 3

export interface GenerationPayload {
  models: ModelOption[]
  providers: Provider[]
  prompt: string
  demoMode: boolean
  signal: AbortSignal
  token: number
  runId: string
  results: GenerationResult[]
}

export interface ActiveGeneration {
  token: number
  runId: string
  controller: AbortController
  results: GenerationResult[]
  startedAt: Array<number | undefined>
  cancelled: boolean
}

export const modelKey = (providerId: string, model: string) => `${providerId}::${model}`
export const parseModelIds = (value: string) => [
  ...new Set(
    value
      .split(/[\n,]/)
      .map((item) => item.trim())
      .filter(Boolean),
  ),
]
export const isEditableTarget = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) return false
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
}

export const appendRunHistory = (variables: GenerationPayload, results: GenerationResult[] | undefined) => {
  if (!results?.some((result) => result.status === 'success')) return
  const existing = deserializeRunHistory(window.localStorage.getItem(RUN_HISTORY_STORAGE_KEY))
  const successful = results.filter((result) => result.status === 'success')
  const next = addRunHistoryEntry(existing, {
    id: variables.runId,
    prompt: variables.prompt,
    demoMode: variables.demoMode,
    models: variables.models.map((model) => model.model),
    resultSummary: `${successful.length}/${results.length} ${successful.map((result) => result.model).join(', ')}`,
  })
  window.localStorage.setItem(RUN_HISTORY_STORAGE_KEY, serializeRunHistory(next))
  window.dispatchEvent(new Event('mosaic-history-changed'))
}
