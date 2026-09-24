import { describe, expect, it, vi } from 'vitest'

vi.mock('dompurify', () => ({
  default: {
    sanitize: (value: string) => value,
  },
}))

import {
  createProjectRuntimeFiles,
  createStaticPreviewDocument,
  normalizeGeneratedProject,
  STATIC_PREVIEW_CSP,
} from './normalize'
import type { GeneratedProject } from './types'

const webFiles = [
  { path: './src/main.tsx', content: 'export const App = () => <main>Hello</main>' },
]

const encodeProject = (files: unknown[], overrides: Record<string, unknown> = {}) =>
  JSON.stringify({
    schemaVersion: 1,
    title: 'Generated app',
    summary: 'A small app',
    files,
    ...overrides,
  })

describe('normalizeGeneratedProject', () => {
  it('normalizes safe web paths and accepts the required entry point', () => {
    const result = normalizeGeneratedProject(encodeProject(webFiles), 'fallback')

    expect(result.project.kind).toBe('web')
    expect(result.project.files).toEqual([
      { path: 'src/main.tsx', content: webFiles[0].content },
    ])
    expect(result.html).toBe('')
  })

  it.each([
    '../outside.txt',
    '/absolute.txt',
    'src\\main.tsx',
    'node_modules/pkg/index.js',
    '.env',
    'package.json',
    'pnpm-lock.yaml',
    'assets/logo.png',
  ])('rejects unsafe or protected project path %s', (path) => {
    expect(() =>
      normalizeGeneratedProject(
        encodeProject([{ path, content: 'not allowed' }, ...webFiles]),
        'fallback',
      ),
    ).toThrow()
  })

  it('rejects a web project without src/main.tsx', () => {
    expect(() =>
      normalizeGeneratedProject(
        encodeProject([{ path: 'src/App.tsx', content: 'export const App = () => null' }]),
        'fallback',
      ),
    ).toThrow('Web 项目必须包含 src/main.tsx')
  })

  it('rejects more than 32 model-controlled files', () => {
    const files = [
      ...webFiles,
      ...Array.from({ length: 32 }, (_, index) => ({
        path: `src/support-${index}.tsx`,
        content: 'export const value = true',
      })),
    ]

    expect(() => normalizeGeneratedProject(encodeProject(files), 'fallback'))
      .toThrow('项目最多允许 32 个文件')
  })

  it('enforces per-file and aggregate UTF-8 byte limits', () => {
    expect(() => normalizeGeneratedProject(
      encodeProject([{ ...webFiles[0], content: 'a'.repeat(64 * 1024 + 1) }]),
      'fallback',
    )).toThrow('单个项目文件不能超过 64KB')

    expect(() => normalizeGeneratedProject(
      encodeProject([
        ...webFiles,
        ...Array.from({ length: 5 }, (_, index) => ({
          path: `src/chunk-${index}.txt`,
          content: '界'.repeat(20 * 1024),
        })),
      ]),
      'fallback',
    )).toThrow('项目文件总大小不能超过 256KB')
  })

  it('rejects control characters in file content', () => {
    expect(() => normalizeGeneratedProject(
      encodeProject([{ ...webFiles[0], content: 'const App = () => null\u0000' }]),
      'fallback',
    )).toThrow('项目文件不是安全文本')
  })

  it('rejects paths that collide after normalization or case folding', () => {
    expect(() => normalizeGeneratedProject(
      encodeProject([
        ...webFiles,
        { path: './SRC/MAIN.TSX', content: 'export const App = () => null' },
      ]),
      'fallback',
    )).toThrow('项目文件路径重复')
  })

  it('classifies a script-free index document as static and creates a preview', () => {
    const result = normalizeGeneratedProject(
      encodeProject([{ path: 'index.html', content: '<!doctype html><h1>Hello</h1>' }]),
      'fallback',
    )

    expect(result.project.kind).toBe('static')
    expect(result.html).toContain('<h1>Hello</h1>')
  })
})

describe('createStaticPreviewDocument', () => {
  it('keeps the host CSP authoritative and replaces model document metadata', () => {
    const document = createStaticPreviewDocument(
      '<!doctype html><html><head><meta http-equiv="Content-Security-Policy" content="default-src https:"><title>Model title</title></head><body><main>Safe body</main></body></html>',
      'Host title',
    )

    expect(document).toContain(`content="${STATIC_PREVIEW_CSP}"`)
    expect(document).toContain('<title>Host title</title>')
    expect(document).toContain('<main>Safe body</main>')
    expect(document).not.toContain('default-src https:')
    expect(document).not.toContain('Model title')
    expect(document.match(/http-equiv="Content-Security-Policy"/g)).toHaveLength(1)
  })
})

describe('createProjectRuntimeFiles', () => {
  it('returns the complete host scaffold and keeps every scaffold file authoritative', () => {
    const project: GeneratedProject = {
      schemaVersion: 1,
      kind: 'web',
      title: 'Generated app',
      summary: '',
      files: [
        ...webFiles,
        { path: 'vite.config.ts', content: 'throw new Error("model config must not win")' },
        { path: 'package.json', content: '{"name":"model-must-not-win"}' },
        { path: 'tsconfig.json', content: '{"compilerOptions":{"strict":false}}' },
      ],
    }

    const runtimeFiles = createProjectRuntimeFiles(project)

    expect(Object.keys(runtimeFiles).sort()).toEqual([
      'index.html',
      'package-lock.json',
      'package.json',
      'src/main.tsx',
      'tsconfig.json',
      'vite.config.ts',
    ])
    expect(runtimeFiles['vite.config.ts']).toContain("host: '0.0.0.0'")
    expect(runtimeFiles['package.json']).toContain('"name": "generated-web-project"')
    expect(JSON.parse(runtimeFiles['package-lock.json']!)).toMatchObject({
      name: 'generated-web-project',
    })
    expect(runtimeFiles['index.html']).toContain('<div id="root"></div>')
    expect(runtimeFiles['tsconfig.json']).toContain('"moduleResolution": "Bundler"')
    expect(runtimeFiles['src/main.tsx']).toBe(webFiles[0].content)
  })

  it('rejects non-scaffold Vite config aliases', () => {
    const project: GeneratedProject = {
      schemaVersion: 1,
      kind: 'web',
      title: 'Generated app',
      summary: '',
      files: [...webFiles, { path: 'vite.config.js', content: 'export default {}' }],
    }

    expect(() => createProjectRuntimeFiles(project)).toThrow('宿主构建配置')
  })
})
