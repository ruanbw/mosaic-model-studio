import { describe, expect, it } from 'vitest'
import {
  HISTORY_SCHEMA_VERSION,
  MAX_HISTORY_ENTRIES,
  MAX_HISTORY_MODELS,
  MAX_HISTORY_MODEL_LENGTH,
  MAX_HISTORY_PROMPT_LENGTH,
  MAX_HISTORY_RESULT_SUMMARY_LENGTH,
  MAX_HISTORY_SERIALIZED_BYTES,
  addRunHistoryEntry,
  clearRunHistory,
  createRunHistoryEntry,
  deserializeRunHistory,
  normalizeRunHistory,
  serializeRunHistory,
  type RunHistoryInput,
} from './history'

const makeInput = (overrides: Partial<RunHistoryInput> = {}): RunHistoryInput => ({
  prompt: 'Build a small landing page',
  demoMode: false,
  models: ['openai::gpt-4o'],
  createdAt: 1_700_000_000_000,
  resultSummary: 'A responsive landing page',
  ...overrides,
})

describe('run history contract', () => {
  it('normalizes a run and generates a stable-shaped identifier', () => {
    const entry = createRunHistoryEntry(makeInput({
      prompt: '  hello\u0000world  ',
      models: [' gpt-4o ', 'gpt-4o', 'claude-\u001b[31m'],
      resultSummary: '  generated\n  successfully  ',
    }))

    expect(entry.id).toMatch(/^run-/)
    expect(entry.prompt).toBe('hello world')
    expect(entry.models).toEqual(['gpt-4o', 'claude-'])
    expect(entry.resultSummary).toBe('generated successfully')
    expect(entry.demoMode).toBe(false)
  })

  it('bounds the number of models and every persisted text field', () => {
    const entry = createRunHistoryEntry(makeInput({
      prompt: 'p'.repeat(MAX_HISTORY_PROMPT_LENGTH + 100),
      models: [
        ...Array.from({ length: MAX_HISTORY_MODELS + 8 }, (_, index) => `model-${index}`),
        'm'.repeat(MAX_HISTORY_MODEL_LENGTH + 100),
      ],
      resultSummary: 's'.repeat(MAX_HISTORY_RESULT_SUMMARY_LENGTH + 100),
    }))

    expect(entry.prompt).toHaveLength(MAX_HISTORY_PROMPT_LENGTH)
    expect(entry.models).toHaveLength(MAX_HISTORY_MODELS)
    expect(entry.models.every((model) => model.length <= MAX_HISTORY_MODEL_LENGTH)).toBe(true)
    expect(entry.resultSummary).toHaveLength(MAX_HISTORY_RESULT_SUMMARY_LENGTH)
  })

  it('adds newest first, replaces duplicate ids, and caps entries', () => {
    let history = [] as ReturnType<typeof normalizeRunHistory>
    for (let index = 0; index < MAX_HISTORY_ENTRIES + 3; index += 1) {
      history = addRunHistoryEntry(history, makeInput({
        id: `run-${index}`,
        createdAt: 1_700_000_000_000 + index,
      }))
    }

    expect(history).toHaveLength(MAX_HISTORY_ENTRIES)
    expect(history[0]?.id).toBe(`run-${MAX_HISTORY_ENTRIES + 2}`)

    const replaced = addRunHistoryEntry(history, makeInput({
      id: 'run-1',
      resultSummary: 'updated',
    }))
    expect(replaced.filter((entry) => entry.id === 'run-1')).toHaveLength(1)
    expect(replaced[0]?.resultSummary).toBe('updated')
  })

  it('drops malformed records and ignores fields outside the contract', () => {
    const valid = makeInput({ id: 'valid' })
    const normalized = normalizeRunHistory([
      valid,
      { ...valid, id: 'valid' },
      { ...valid, id: 'missing-time', createdAt: Number.NaN },
      { ...valid, id: 'wrong-mode', demoMode: 'true' },
      { ...valid, id: 'empty-prompt', prompt: ' \u0000 ' },
      { ...valid, id: 'empty-models', models: [] },
      { ...valid, id: 'extra', secret: 'do-not-copy', extra: { nested: true } },
    ])

    expect(normalized).toHaveLength(2)
    expect(normalized.map((entry) => entry.id)).toEqual(['valid', 'extra'])
    expect(normalized[1]).toEqual({
      id: 'extra',
      prompt: valid.prompt,
      demoMode: valid.demoMode,
      models: valid.models,
      createdAt: valid.createdAt,
      resultSummary: valid.resultSummary,
    })
  })

  it('serializes a versioned, escaped payload and round-trips it safely', () => {
    const entry = createRunHistoryEntry(makeInput({
      prompt: 'Use <script>alert(1)</script> & keep this text',
      resultSummary: '<strong>done</strong>',
    }))
    const serialized = serializeRunHistory([entry])

    expect(serialized).not.toContain('<')
    expect(serialized).not.toContain('>')
    expect(serialized).not.toContain('&')
    expect(deserializeRunHistory(serialized)).toEqual([entry])
    expect(deserializeRunHistory(JSON.stringify([entry]))).toEqual([entry])
    expect(deserializeRunHistory({ schemaVersion: HISTORY_SCHEMA_VERSION, entries: [entry] })).toEqual([entry])
  })

  it('keeps serialized storage bounded and fails closed on invalid input', () => {
    const entries = Array.from({ length: MAX_HISTORY_ENTRIES }, (_, index) =>
      createRunHistoryEntry(makeInput({
        id: `bounded-${index}`,
        prompt: 'p'.repeat(MAX_HISTORY_PROMPT_LENGTH),
        resultSummary: 's'.repeat(MAX_HISTORY_RESULT_SUMMARY_LENGTH),
      })),
    )
    const serialized = serializeRunHistory(entries)

    expect(new TextEncoder().encode(serialized).byteLength).toBeLessThanOrEqual(MAX_HISTORY_SERIALIZED_BYTES)
    expect(deserializeRunHistory(serialized).length).toBeLessThanOrEqual(MAX_HISTORY_ENTRIES)
    expect(deserializeRunHistory('{not json')).toEqual([])
    expect(deserializeRunHistory(JSON.stringify({ schemaVersion: 2, entries: [] }))).toEqual([])
    expect(deserializeRunHistory('x'.repeat(MAX_HISTORY_SERIALIZED_BYTES + 1))).toEqual([])
  })

  it('clears history without mutating the previous value', () => {
    const previous = [createRunHistoryEntry(makeInput())]
    expect(clearRunHistory()).toEqual([])
    expect(previous).toHaveLength(1)
  })
})
