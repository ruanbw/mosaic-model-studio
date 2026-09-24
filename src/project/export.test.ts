import { describe, expect, it, vi } from 'vitest'

vi.mock('dompurify', () => ({
  default: {
    sanitize: (value: string) => value,
  },
}))

import { createProjectExportFiles } from './export'
import { createProjectRuntimeFiles, STATIC_PREVIEW_CSP } from './normalize'
import type { GeneratedProject, ProjectFile } from './types'

const createWebProject = (files: ProjectFile[] = [
  { path: './src/main.tsx', content: 'export const App = () => <main>Hello</main>' },
]): GeneratedProject => ({
  schemaVersion: 1,
  kind: 'web',
  title: 'Generated app',
  summary: 'A small app',
  files,
})

describe('createProjectExportFiles', () => {
  it('matches runtime files and includes every authoritative host scaffold file', () => {
    const project = createWebProject([
      ...projectFiles(),
      { path: 'package.json', content: '{"name":"model-must-not-win"}' },
      { path: 'package-lock.json', content: '{"name":"model-must-not-win"}' },
      { path: 'vite.config.ts', content: 'throw new Error("model config must not win")' },
      { path: 'tsconfig.json', content: '{"compilerOptions":{"strict":false}}' },
    ])

    const exportFiles = createProjectExportFiles(project)

    expect(exportFiles).toEqual(createProjectRuntimeFiles(project))
    expect(Object.keys(exportFiles).sort()).toEqual([
      'index.html',
      'package-lock.json',
      'package.json',
      'src/main.tsx',
      'tsconfig.json',
      'vite.config.ts',
    ])
    expect(JSON.parse(exportFiles['package.json']!)).toMatchObject({
      name: 'generated-web-project',
    })
    expect(JSON.parse(exportFiles['package-lock.json']!)).toMatchObject({
      name: 'generated-web-project',
    })
    expect(exportFiles['vite.config.ts']).toContain("host: '0.0.0.0'")
    expect(exportFiles['index.html']).toContain('<div id="root"></div>')
    expect(exportFiles['tsconfig.json']).toContain('"moduleResolution": "Bundler"')
  })

  it('exports static files through the same host CSP policy as runtime', () => {
    const project: GeneratedProject = {
      schemaVersion: 1,
      kind: 'static',
      title: 'Host title',
      summary: '',
      files: [{
        path: 'index.html',
        content: '<!doctype html><html><head><meta http-equiv="Content-Security-Policy" content="default-src https:"><title>Model title</title></head><body><main>Safe body</main></body></html>',
      }],
    }

    const exportFiles = createProjectExportFiles(project)

    expect(exportFiles).toEqual(createProjectRuntimeFiles(project))
    expect(exportFiles['index.html']).toContain(`content="${STATIC_PREVIEW_CSP}"`)
    expect(exportFiles['index.html']).toContain('<title>Host title</title>')
    expect(exportFiles['index.html']).not.toContain('default-src https:')
    expect(exportFiles['index.html']).not.toContain('Model title')
  })

  it('rejects more than 32 model-controlled files', () => {
    const project = createWebProject([
      ...projectFiles(),
      ...Array.from({ length: 32 }, (_, index) => ({
        path: `src/support-${index}.tsx`,
        content: 'export const value = true',
      })),
    ])

    expect(() => createProjectExportFiles(project)).toThrow('项目最多允许 32 个文件')
  })

  it('rejects files above the per-file and aggregate UTF-8 byte limits', () => {
    expect(() => createProjectExportFiles(createWebProject([
      { path: 'src/main.tsx', content: 'a'.repeat(64 * 1024 + 1) },
    ]))).toThrow('单个项目文件不能超过 64KB')

    expect(() => createProjectExportFiles(createWebProject([
      ...projectFiles(),
      ...Array.from({ length: 5 }, (_, index) => ({
        path: `src/chunk-${index}.txt`,
        content: '界'.repeat(20 * 1024),
      })),
    ]))).toThrow('项目文件总大小不能超过 256KB')
  })

  it('rejects control characters in model-controlled content', () => {
    const project = createWebProject([
      { path: 'src/main.tsx', content: 'export const App = () => null\u0000' },
    ])

    expect(() => createProjectExportFiles(project)).toThrow('项目文件不是安全文本')
  })

  it('rejects paths that collide after normalization or case folding', () => {
    const project = createWebProject([
      ...projectFiles(),
      { path: './SRC/MAIN.TSX', content: 'export const App = () => null' },
    ])

    expect(() => createProjectExportFiles(project)).toThrow('项目文件路径重复')
  })
})

function projectFiles(): ProjectFile[] {
  return [{ path: 'src/main.tsx', content: 'export const App = () => <main>Hello</main>' }]
}
