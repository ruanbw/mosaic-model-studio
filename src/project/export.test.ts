import { strFromU8, unzipSync } from 'fflate'
import { describe, expect, it, vi } from 'vitest'

vi.mock('dompurify', () => ({
  default: {
    sanitize: (value: string) => value,
  },
}))

import { createProjectExportFiles, createProjectZip } from './export'
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

  it('packages static projects as a ZIP that can be opened from the file system', () => {
    const project: GeneratedProject = {
      schemaVersion: 1,
      kind: 'static',
      title: 'Static page',
      summary: '',
      files: [{
        path: 'index.html',
        content: '<!doctype html><html><head><title>Model title</title></head><body><main>Hello</main></body></html>',
      }],
    }

    const archive = unzipSync(createProjectZip(project))
    const indexPath = 'Static-page/index.html'
    expect(Object.keys(archive)).toEqual([indexPath])
    expect(strFromU8(archive[indexPath]!)).toContain('<main>Hello</main>')
  })

  it('packages web projects with their source files, scaffold, and run instructions', () => {
    const project = createWebProject()
    const archive = unzipSync(createProjectZip(project))
    const files = createProjectExportFiles(project)

    expect(Object.keys(archive)).toEqual(expect.arrayContaining([
      'Generated-app/package.json',
      'Generated-app/package-lock.json',
      'Generated-app/index.html',
      'Generated-app/vite.config.ts',
      'Generated-app/tsconfig.json',
      'Generated-app/src/main.tsx',
      'Generated-app/README.md',
    ]))
    expect(strFromU8(archive['Generated-app/src/main.tsx']!)).toBe(files['src/main.tsx'])
    expect(strFromU8(archive['Generated-app/README.md']!)).toContain('npm ci')
  })

  it('keeps archive paths safe for hostile project titles', () => {
    for (const title of ['..', '.', 'CON', 'foo.', 'a/../../b', 'x'.repeat(200)]) {
      const project = {
        ...createWebProject([{
          path: 'src/main.tsx',
          content: 'export const App = () => null',
        }]),
        title,
      }
      const archive = unzipSync(createProjectZip(project))
      const paths = Object.keys(archive)

      expect(paths.length).toBeGreaterThan(0)
      expect(paths.every((path) => path.split('/').every((segment) => segment !== '.' && segment !== '..' && !segment.includes('\\')))).toBe(true)
      expect(paths.every((path) => !path.startsWith('/'))).toBe(true)
      // The title is still present in the generated project; only the archive
      // directory is sanitized independently for filesystem compatibility.
      expect(paths.some((path) => path.endsWith('/src/main.tsx'))).toBe(true)
    }
  })

  it('rejects archive path conflicts before creating a ZIP', () => {
    expect(() => createProjectZip(createWebProject([
      { path: 'src', content: 'not a directory' },
      { path: 'src/main.tsx', content: 'export const App = () => null' },
    ]))).toThrow('项目文件与目录路径冲突')
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
