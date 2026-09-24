import { describe, expect, it, vi } from 'vitest'

vi.mock('dompurify', () => ({
  default: {
    sanitize: (value: string) => value,
  },
}))

import { createProjectRuntimeFiles, normalizeGeneratedProject } from './normalize'
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

  it('classifies a script-free index document as static and creates a preview', () => {
    const result = normalizeGeneratedProject(
      encodeProject([{ path: 'index.html', content: '<!doctype html><h1>Hello</h1>' }]),
      'fallback',
    )

    expect(result.project.kind).toBe('static')
    expect(result.html).toContain('<h1>Hello</h1>')
  })
})

describe('createProjectRuntimeFiles', () => {
  it('keeps host scaffold configuration authoritative over model output', () => {
    const project: GeneratedProject = {
      schemaVersion: 1,
      kind: 'web',
      title: 'Generated app',
      summary: '',
      files: [
        ...webFiles,
        { path: 'vite.config.ts', content: 'throw new Error("model config must not win")' },
        { path: 'package.json', content: '{"name":"model-must-not-win"}' },
      ],
    }

    const runtimeFiles = createProjectRuntimeFiles(project)

    expect(runtimeFiles['vite.config.ts']).toContain("host: '0.0.0.0'")
    expect(runtimeFiles['package.json']).toContain('"name": "generated-web-project"')
    expect(runtimeFiles['package-lock.json']).toBeTruthy()
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
