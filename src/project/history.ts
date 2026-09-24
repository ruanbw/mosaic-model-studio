export const HISTORY_SCHEMA_VERSION = 1 as const
export const MAX_HISTORY_ENTRIES = 20
export const MAX_HISTORY_MODELS = 32
export const MAX_HISTORY_PROMPT_LENGTH = 4_000
export const MAX_HISTORY_MODEL_LENGTH = 200
export const MAX_HISTORY_RESULT_SUMMARY_LENGTH = 500
export const MAX_HISTORY_ID_LENGTH = 128
export const MAX_HISTORY_SERIALIZED_BYTES = 64 * 1024

export interface RunHistoryEntry {
  id: string
  prompt: string
  demoMode: boolean
  models: string[]
  createdAt: number
  resultSummary: string
}

export interface RunHistoryInput {
  id?: string
  prompt: string
  demoMode: boolean
  models: readonly string[]
  createdAt?: number
  resultSummary?: string
}

export interface RunHistoryEnvelope {
  schemaVersion: typeof HISTORY_SCHEMA_VERSION
  entries: RunHistoryEntry[]
}

const MAX_DATE_TIME_MS = 8_640_000_000_000_000
const CONTROL_CHARACTERS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g
const ANSI_ESCAPE = /\u001B\[[0-?]*[ -/]*[@-~]/g
const JSON_UNSAFE_CHARACTERS = /[<>&\u2028\u2029]/g
const encoder = new TextEncoder()
let generatedIdCounter = 0

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const truncateText = (value: string, maxLength: number): string => {
  if (maxLength <= 0) return ''
  if (value.length <= maxLength) return value

  let prefix = value.slice(0, maxLength)
  const lastCodeUnit = prefix.charCodeAt(prefix.length - 1)
  if (lastCodeUnit >= 0xD800 && lastCodeUnit <= 0xDBFF) prefix = prefix.slice(0, -1)
  return prefix.trimEnd()
}

const removeUnsafeText = (value: string): string =>
  value
    .replace(ANSI_ESCAPE, '')
    .replace(/\r\n?/g, '\n')
    .replace(CONTROL_CHARACTERS, ' ')

const cleanPrompt = (value: string): string =>
  truncateText(removeUnsafeText(value).trim(), MAX_HISTORY_PROMPT_LENGTH)

const cleanModel = (value: string): string =>
  truncateText(removeUnsafeText(value).replace(/\s+/g, ' ').trim(), MAX_HISTORY_MODEL_LENGTH)

const cleanResultSummary = (value: string): string =>
  truncateText(removeUnsafeText(value).replace(/\s+/g, ' ').trim(), MAX_HISTORY_RESULT_SUMMARY_LENGTH)

const cleanId = (value: string): string =>
  truncateText(removeUnsafeText(value).replace(/\s+/g, '-').trim(), MAX_HISTORY_ID_LENGTH)

const hashText = (value: string, seed: number): string => {
  let hash = seed
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0).toString(36)
}

const deriveEntryId = (entry: Omit<RunHistoryEntry, 'id'>): string => {
  const fingerprint = JSON.stringify(entry)
  return `run-${entry.createdAt.toString(36)}-${hashText(fingerprint, 2166136261)}${hashText(fingerprint, 0x9e3779b9)}`
}

const createEntryId = (): string => {
  try {
    const uuid = globalThis.crypto?.randomUUID?.()
    if (uuid) return cleanId(`run-${uuid}`)
  } catch {
    // Fall through to a local, bounded fallback for older runtimes.
  }

  generatedIdCounter = (generatedIdCounter + 1) >>> 0
  return `run-${Date.now().toString(36)}-${generatedIdCounter.toString(36)}`
}

const normalizeModels = (value: unknown): string[] => {
  if (!Array.isArray(value)) return []

  const models: string[] = []
  const seen = new Set<string>()
  for (const candidate of value) {
    if (typeof candidate !== 'string') continue
    const model = cleanModel(candidate)
    if (!model || seen.has(model)) continue
    seen.add(model)
    models.push(model)
    if (models.length === MAX_HISTORY_MODELS) break
  }
  return models
}

const normalizeTimestamp = (value: unknown): number | null => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return null
  if (value > MAX_DATE_TIME_MS) return null
  return Math.trunc(value)
}

const normalizeEntry = (value: unknown): RunHistoryEntry | null => {
  if (!isRecord(value) || typeof value.prompt !== 'string' || typeof value.demoMode !== 'boolean') {
    return null
  }

  const createdAt = normalizeTimestamp(value.createdAt)
  if (createdAt === null) return null

  const prompt = cleanPrompt(value.prompt)
  const models = normalizeModels(value.models)
  if (!prompt || models.length === 0) return null

  const resultSummary = typeof value.resultSummary === 'string'
    ? cleanResultSummary(value.resultSummary)
    : ''
  const withoutId: Omit<RunHistoryEntry, 'id'> = {
    prompt,
    demoMode: value.demoMode,
    models,
    createdAt,
    resultSummary,
  }
  const id = typeof value.id === 'string' ? cleanId(value.id) : ''
  return { id: id || deriveEntryId(withoutId), ...withoutId }
}

/**
 * Validate and bound history data loaded from an untrusted storage boundary.
 * The newest-first order is preserved, while malformed and duplicate records
 * are discarded instead of being propagated to the UI.
 */
export const normalizeRunHistory = (value: unknown): RunHistoryEntry[] => {
  const source = Array.isArray(value)
    ? value
    : isRecord(value) && value.schemaVersion === HISTORY_SCHEMA_VERSION && Array.isArray(value.entries)
      ? value.entries
      : []

  const entries: RunHistoryEntry[] = []
  const ids = new Set<string>()
  for (const candidate of source) {
    const entry = normalizeEntry(candidate)
    if (!entry || ids.has(entry.id)) continue
    ids.add(entry.id)
    entries.push(entry)
    if (entries.length === MAX_HISTORY_ENTRIES) break
  }
  return entries
}

/** Create one bounded, serializable run record. */
export const createRunHistoryEntry = (input: RunHistoryInput): RunHistoryEntry => {
  const suppliedId = typeof input.id === 'string' ? cleanId(input.id) : ''
  const entry = normalizeEntry({
    ...input,
    id: suppliedId || createEntryId(),
    createdAt: input.createdAt ?? Date.now(),
    resultSummary: input.resultSummary ?? '',
  })
  if (!entry) throw new TypeError('Invalid run history entry')
  return entry
}

/** Add a run at the front of the newest-first history and enforce its cap. */
export const addRunHistoryEntry = (
  history: unknown,
  input: RunHistoryInput,
): RunHistoryEntry[] => {
  const entry = createRunHistoryEntry(input)
  const existing = normalizeRunHistory(history).filter((item) => item.id !== entry.id)
  return [entry, ...existing].slice(0, MAX_HISTORY_ENTRIES)
}

const escapeJsonCharacters = (value: string): string =>
  value.replace(JSON_UNSAFE_CHARACTERS, (character) => {
    if (character === '<') return '\\u003C'
    if (character === '>') return '\\u003E'
    if (character === '&') return '\\u0026'
    return character === '\u2028' ? '\\u2028' : '\\u2029'
  })

const encodeEnvelope = (entries: RunHistoryEntry[]): string =>
  escapeJsonCharacters(JSON.stringify({
    schemaVersion: HISTORY_SCHEMA_VERSION,
    entries,
  } satisfies RunHistoryEnvelope))

/** Serialize only normalized fields and keep the payload below its byte cap. */
export const serializeRunHistory = (value: unknown): string => {
  const entries = normalizeRunHistory(value)
  const bounded: RunHistoryEntry[] = []

  for (const entry of entries) {
    const candidate = encodeEnvelope([...bounded, entry])
    if (encoder.encode(candidate).byteLength > MAX_HISTORY_SERIALIZED_BYTES) break
    bounded.push(entry)
  }
  return encodeEnvelope(bounded)
}

/** Parse a versioned payload, accepting a legacy bare array for migration. */
export const deserializeRunHistory = (value: unknown): RunHistoryEntry[] => {
  let parsed: unknown = value
  if (typeof value === 'string') {
    if (encoder.encode(value).byteLength > MAX_HISTORY_SERIALIZED_BYTES) return []
    try {
      parsed = JSON.parse(value) as unknown
    } catch {
      return []
    }
  }

  if (Array.isArray(parsed)) return normalizeRunHistory(parsed)
  if (!isRecord(parsed) || parsed.schemaVersion !== HISTORY_SCHEMA_VERSION) return []
  return normalizeRunHistory(parsed)
}

/** Return an empty history without mutating the caller's array or payload. */
export const clearRunHistory = (): RunHistoryEntry[] => []
