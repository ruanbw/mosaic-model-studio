import DOMPurify from 'dompurify'
import webPackageJson from './scaffold/package.json'
import webPackageLock from './scaffold/package-lock.json'
import type { GeneratedProject, GenerationOutput, ProjectFile } from './types'

export type { GeneratedProject, GenerationOutput, ProjectFile, ProjectKind } from './types'

const MAX_FILE_BYTES = 64 * 1024
const MAX_TOTAL_BYTES = 256 * 1024
const MAX_FILES = 32
const encoder = new TextEncoder()

const FORBIDDEN_BASENAMES = new Set([
  'package.json',
  '.npmrc',
  '.yarnrc',
  '.yarnrc.yml',
  'bunfig.toml',
  'package-lock.json',
  'pnpm-lock.yaml',
  'yarn.lock',
  'bun.lock',
  'bun.lockb',
  'npm-shrinkwrap.json',
])

const BINARY_EXTENSIONS = new Set([
  '.7z', '.avif', '.bmp', '.bz2', '.class', '.dll', '.doc', '.docx', '.exe', '.gif',
  '.gz', '.heic', '.ico', '.jar', '.jpeg', '.jpg', '.mov', '.mp3', '.mp4', '.ogg',
  '.otf', '.pdf', '.png', '.rar', '.so', '.tar', '.tif', '.tiff', '.ttf', '.wasm',
  '.webm', '.webp', '.woff', '.woff2', '.xls', '.xlsx', '.zip',
])

const escapeHtml = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')

const parseRawProject = (raw: string): unknown => {
  const trimmed = raw.trim()
  const fenced = trimmed.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?```$/i)
  const json = fenced?.[1]?.trim() ?? trimmed
  if (!json) throw new Error('模型返回了空内容')

  try {
    return JSON.parse(json) as unknown
  } catch {
    throw new Error('模型返回的内容不是有效的 GeneratedProject JSON')
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const normalizePath = (value: unknown): string => {
  if (typeof value !== 'string') throw new Error('项目文件路径必须是字符串')
  const path = value.trim()
  if (!path) throw new Error('项目文件路径不能为空')
  if (path.includes('\0') || path.includes('\\')) throw new Error(`项目文件路径不安全：${value}`)
  if (path.startsWith('/') || /^[A-Za-z]:\//.test(path)) throw new Error(`项目文件路径不能是绝对路径：${value}`)

  const segments = path.split('/').filter((segment) => segment !== '' && segment !== '.')
  if (segments.length === 0) throw new Error(`项目文件路径无效：${value}`)
  if (segments.includes('..')) throw new Error(`项目文件路径不能包含 ..：${value}`)

  const normalized = segments.join('/')
  const basename = segments.at(-1)?.toLowerCase() ?? ''
  if (segments.some((segment) => segment.toLowerCase() === 'node_modules')) {
    throw new Error(`项目文件不能写入 node_modules：${value}`)
  }
  if (basename === '.env' || basename.startsWith('.env.')) {
    throw new Error(`项目文件不能包含环境变量：${value}`)
  }
  if (FORBIDDEN_BASENAMES.has(basename)) {
    throw new Error(`项目文件不能包含 lockfile：${value}`)
  }
  const dotIndex = basename.lastIndexOf('.')
  if (dotIndex >= 0 && BINARY_EXTENSIONS.has(basename.slice(dotIndex))) {
    throw new Error(`项目不能包含二进制文件：${value}`)
  }
  return normalized
}

const assertTextContent = (content: string, path: string) => {
  // Binary payloads decoded into a JSON string almost always retain NUL or C0 controls.
  // Rejecting those controls also prevents terminal/control-character smuggling.
  if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(content)) {
    throw new Error(`项目文件不是安全文本：${path}`)
  }
}

const normalizeFiles = (value: unknown): ProjectFile[] => {
  if (!Array.isArray(value)) throw new Error('GeneratedProject.files 必须是数组')
  if (value.length === 0) throw new Error('GeneratedProject.files 不能为空')
  if (value.length > MAX_FILES) throw new Error(`项目最多允许 ${MAX_FILES} 个文件`)

  const seen = new Set<string>()
  let totalBytes = 0

  return value.map((file) => {
    if (!isRecord(file)) throw new Error('GeneratedProject.files 含有无效文件')
    const path = normalizePath(file.path)
    if (seen.has(path)) throw new Error(`项目文件路径重复：${path}`)
    seen.add(path)
    if (typeof file.content !== 'string') throw new Error(`项目文件内容必须是字符串：${path}`)

    assertTextContent(file.content, path)
    const fileBytes = encoder.encode(file.content).byteLength
    if (fileBytes > MAX_FILE_BYTES) throw new Error(`单个项目文件不能超过 64KB：${path}`)
    totalBytes += fileBytes
    if (totalBytes > MAX_TOTAL_BYTES) throw new Error('项目文件总大小不能超过 256KB')

    return { path, content: file.content }
  })
}

const hasApplicationScripting = (html: string) =>
  /<script\b|\btype\s*=\s*["']?module\b|\bon[a-z]+\s*=|\bhref\s*=\s*["']?javascript:/i.test(html)

const toStaticPreview = (indexHtml: string, title: string): string => {
  const hasDocument = /<!doctype\b|<html\b|<head\b|<body\b/i.test(indexHtml)
  const document = hasDocument
    ? indexHtml
    : `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title></head><body>${indexHtml}</body></html>`

  return DOMPurify.sanitize(document, {
    WHOLE_DOCUMENT: true,
    USE_PROFILES: { html: true },
  })
}

export const normalizeGeneratedProject = (raw: string, fallbackTitle: string): GenerationOutput => {
  const value = parseRawProject(raw)
  if (!isRecord(value)) throw new Error('GeneratedProject 必须是 JSON 对象')
  if (value.schemaVersion !== 1) throw new Error('不支持的 GeneratedProject schemaVersion')

  const files = normalizeFiles(value.files)
  const paths = new Set(files.map((file) => file.path))
  const indexHtml = files.find((file) => file.path === 'index.html')?.content
  const isStatic = files.length === 1 && paths.has('index.html') && indexHtml !== undefined && !hasApplicationScripting(indexHtml)

  if (!isStatic && !paths.has('src/main.tsx')) {
    throw new Error('Web 项目必须包含 src/main.tsx')
  }

  const title = typeof value.title === 'string' && value.title.trim() ? value.title.trim() : fallbackTitle.trim() || 'Untitled project'
  const summary = typeof value.summary === 'string' ? value.summary.trim() : ''
  const project: GeneratedProject = {
    schemaVersion: 1,
    kind: isStatic ? 'static' : 'web',
    title,
    summary,
    files,
  }

  return {
    raw,
    project,
    html: isStatic ? toStaticPreview(indexHtml, title) : '',
  }
}

const WEB_SCAFFOLD: Readonly<Record<string, string>> = {
  'package.json': JSON.stringify(webPackageJson, null, 2),
  'package-lock.json': JSON.stringify(webPackageLock, null, 2),
  'index.html': `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Generated App</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`,
  'vite.config.ts': `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: { host: '0.0.0.0', strictPort: true },
})
`,
  'tsconfig.json': JSON.stringify({
    compilerOptions: {
      target: 'ES2022',
      useDefineForClassFields: true,
      lib: ['ES2022', 'DOM', 'DOM.Iterable'],
      allowJs: false,
      skipLibCheck: true,
      esModuleInterop: true,
      allowSyntheticDefaultImports: true,
      strict: true,
      forceConsistentCasingInFileNames: true,
      module: 'ESNext',
      moduleResolution: 'Bundler',
      resolveJsonModule: true,
      isolatedModules: true,
      noEmit: true,
      jsx: 'react-jsx',
    },
    include: ['src'],
  }, null, 2),
}

export const createProjectRuntimeFiles = (project: GeneratedProject): Record<string, string> => {
  if (project.kind === 'static') {
    const index = project.files.find((file) => file.path === 'index.html')
    if (!index) throw new Error('Static 项目缺少 index.html')
    return { 'index.html': index.content }
  }

  const files: Record<string, string> = {}
  for (const file of project.files) files[file.path] = file.content
  // Scaffold files are applied last so model output can never override host policy.
  for (const [path, content] of Object.entries(WEB_SCAFFOLD)) files[path] = content
  return files
}
