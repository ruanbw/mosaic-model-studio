import { describe, expect, it, vi } from 'vitest'

vi.mock('dompurify', () => ({
  default: {
    sanitize: (value: string) => value
      .replace(/<\/?(?:script|form|input|iframe|object|embed)\b[^>]*>/gi, '')
      .replace(/\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, ''),
  },
}))

import {
  createProjectRuntimeFiles,
  createStaticPreviewDocument,
  normalizeGeneratedProject,
  normalizeProjectText,
  STATIC_PREVIEW_CSP,
} from './normalize'
import type { GeneratedProject } from './types'

const encodeProject = (files: unknown[], overrides: Record<string, unknown> = {}) =>
  JSON.stringify({
    schemaVersion: 1,
    title: 'Generated app',
    summary: 'A small app',
    files,
    ...overrides,
  })

describe('static preview document', () => {
  it('injects the host CSP and removes model-owned head policy', () => {
    const document = createStaticPreviewDocument(
      '<!doctype html><html><head><meta http-equiv="Content-Security-Policy" content="default-src *"><title>model title</title></head><body><h1>Hello</h1></body></html>',
      'A safe title',
    )

    expect(document).toContain(`content="${STATIC_PREVIEW_CSP}"`)
    expect(document).toContain('<title>A safe title</title>')
    expect(document).not.toContain('default-src *')
    expect(document).not.toContain('model title')
  })

  it('escapes the normalized title before placing it in the host head', () => {
    const document = createStaticPreviewDocument('<h1>Hello</h1>', '<img src=x onerror=alert(1)>')

    expect(document).toContain('<title>&lt;img src=x onerror=alert(1)&gt;</title>')
    expect(document).not.toContain('<img src=x')
  })

  it('removes dangerous static tags and attributes through the sanitizer contract', () => {
    const document = createStaticPreviewDocument(
      '<h1>Hello</h1><script>alert(1)</script><form action="/collect"><input></form><img src="x" onerror="alert(1)">',
      'Safe',
    )

    expect(document).toContain('<h1>Hello</h1>')
    expect(document).not.toMatch(/<script\b|<form\b|<input\b|onerror/i)
  })
})

describe('project text normalization', () => {
  it('removes control characters, collapses whitespace, and applies fallback', () => {
    expect(normalizeProjectText('  hello\u0000\n\tworld  ', 100)).toBe('hello world')
    expect(normalizeProjectText(42, 20, 'fallback')).toBe('fallback')
    expect(normalizeProjectText('', 20, 'fallback')).toBe('fallback')
  })

  it('bounds text without splitting a surrogate pair', () => {
    expect(normalizeProjectText('a'.repeat(5), 4)).toBe('aaa…')
    expect(normalizeProjectText('😀😀', 2)).toBe('…')
    expect(normalizeProjectText('x😀', 2)).toBe('x…')
  })
})

describe('project size and path limits', () => {
  it('rejects paths longer than the normalized runtime limit', () => {
    expect(() => normalizeGeneratedProject(
      encodeProject([{ path: `src/${'a'.repeat(256)}.tsx`, content: 'x' }]),
      'fallback',
    )).toThrow('项目文件路径过长')
  })

  it('rejects more than 32 files', () => {
    const files = Array.from({ length: 33 }, (_, index) => ({ path: `src/file-${index}.txt`, content: '' }))

    expect(() => normalizeGeneratedProject(encodeProject(files), 'fallback')).toThrow('项目最多允许 32 个文件')
  })

  it('rejects a file over 64 KiB by UTF-8 bytes', () => {
    expect(() => normalizeGeneratedProject(
      encodeProject([{ path: 'index.html', content: 'a'.repeat(64 * 1024 + 1) }]),
      'fallback',
    )).toThrow('单个项目文件不能超过 64KB')
  })

  it('rejects a project over 256 KiB total bytes', () => {
    const files = Array.from({ length: 5 }, (_, index) => ({
      path: `src/file-${index}.txt`,
      content: 'a'.repeat(52 * 1024),
    }))

    expect(() => normalizeGeneratedProject(encodeProject(files), 'fallback')).toThrow('项目文件总大小不能超过 256KB')
  })
})

describe('runtime file policy', () => {
  it('keeps static previews limited to the normalized index file', () => {
    const project: GeneratedProject = {
      schemaVersion: 1,
      kind: 'static',
      title: 'Static',
      summary: '',
      files: [{ path: 'index.html', content: '<h1>Hello</h1>' }],
    }

    expect(createProjectRuntimeFiles(project)).toEqual({ 'index.html': '<h1>Hello</h1>' })
  })
})
