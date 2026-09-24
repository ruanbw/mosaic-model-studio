import DOMPurify from 'dompurify'
import webPackageJson from './scaffold/package.json'
import webPackageLock from './scaffold/package-lock.json'
import type { GeneratedProject, GenerationOutput, ProjectFile } from './types'

export type { GeneratedProject, GenerationOutput, ProjectFile, ProjectKind } from './types'

const MAX_FILE_BYTES = 64 * 1024
const MAX_TOTAL_BYTES = 256 * 1024
const MAX_FILES = 32
const MAX_PATH_LENGTH = 256
const MAX_TITLE_LENGTH = 120
const MAX_SUMMARY_LENGTH = 500
const MAX_ERROR_LENGTH = 500
const HOST_SCAFFOLD_PATHS = new Set([
  'package.json',
  'package-lock.json',
  'index.html',
  'vite.config.ts',
  'tsconfig.json',
])
const encoder = new TextEncoder()

const FORBIDDEN_BASENAMES = new Set([
  'package.json',
  'package.json5',
  'package.jsonc',
  '.npmrc',
  '.yarnrc',
  '.yarnrc.yml',
  'bunfig.toml',
  'package-lock.json',
  'package-lock.jsonc',
  'package-lock.yaml',
  'pnpm-lock.yaml',
  'pnpm-workspace.yaml',
  'yarn.lock',
  'bun.lock',
  'bun.lockb',
  'npm-shrinkwrap.json',
  'npm-shrinkwrap.yaml',
])

const BUILD_CONFIG_STEMS = [
  'build',
  'vite',
  'webpack',
  'rollup',
  'esbuild',
  'rspack',
  'babel',
  'postcss',
  'tailwind',
  'parcel',
  'gulp',
  'grunt',
  'snowpack',
  'next',
  'nuxt',
  'remix',
  'svelte',
  'astro',
] as const

const BUILD_CONFIG_FILENAMES = new Set([
  'build',
  'vite',
  'webpack',
  'rollup',
  'esbuild',
  'rspack',
  'babel',
  'postcss',
  'tailwind',
  'parcel',
  'gulp',
  'grunt',
  'snowpack',
  'next',
  'nuxt',
  'remix',
  'svelte',
  'astro',
  'parcelrc',
  'babelrc',
  '.babelrc',
  '.browserslistrc',
  '.swcrc',
  'angular.json',
  'lerna.json',
  'nx.json',
  'turbo.json',
  'rush.json',
  'gulpfile.js',
  'gulpfile.ts',
  'gruntfile.js',
  'gruntfile.ts',
  'makefile',
  'dockerfile',
  'procfile',
  'netlify.toml',
  'vercel.json',
  'fly.toml',
  'render.yaml',
  'docker-compose.yml',
  'docker-compose.yaml',
  'compose.yml',
  'compose.yaml',
])

/**
 * Returns true for build/configuration files that must not enter a generated project.
 * The fixed runtime scaffold is part of the host policy, so accepting aliases here
 * would let a model add a second config with higher discovery precedence.
 */
const isBuildConfigName = (name: string): boolean => {
  const lower = name.toLowerCase()
  if (FORBIDDEN_BASENAMES.has(lower) || BUILD_CONFIG_FILENAMES.has(lower)) return true
  if (/(?:^|[.])vite[.]config(?:[.]|$)/.test(lower)) return true
  if (/^(?:tsconfig|jsconfig)(?:[._-]|$)/.test(lower)) return true

  return BUILD_CONFIG_STEMS.some((stem) => {
    if (lower === stem || lower.startsWith(`${stem}.`)) return true
    return lower.startsWith(`${stem}-`) && /\.(?:[cm]?[jt]sx?|jsonc?|ya?ml)$/i.test(lower)
  })
}

export const isForbiddenBuildPath = (path: string): boolean => {
  const segments = path.replaceAll('\\', '/').toLowerCase().split('/')
  if (segments.slice(0, -1).some((segment) => /^(?:tsconfig|jsconfig)(?:[._-]|$)|^(?:^|[.])vite[.]config(?:[.]|$)/.test(segment))) {
    return true
  }
  return isBuildConfigName(segments.at(-1) ?? '')
}

export const STATIC_PREVIEW_CSP = [
  "default-src 'none'",
  "base-uri 'none'",
  "connect-src 'none'",
  "font-src data:",
  "form-action 'none'",
  "frame-src 'none'",
  "child-src 'none'",
  "img-src data: blob:",
  "media-src data: blob:",
  "object-src 'none'",
  "script-src 'none'",
  "style-src 'unsafe-inline'",
  "worker-src 'none'",
].join('; ')

const STATIC_PREVIEW_FORBIDDEN_TAGS = [
  'meta',
  'base',
  'link',
  'script',
  'iframe',
  'frame',
  'frameset',
  'object',
  'embed',
  'form',
  'applet',
]

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

const CONTROL_CHARACTERS = /[\u0000-\u001F\u007F-\u009F]/g

const truncateText = (value: string, maxLength: number): string => {
  if (maxLength <= 0) return ''
  if (value.length <= maxLength) return value

  let prefix = value.slice(0, maxLength - 1)
  const lastCodeUnit = prefix.charCodeAt(prefix.length - 1)
  if (lastCodeUnit >= 0xD800 && lastCodeUnit <= 0xDBFF) prefix = prefix.slice(0, -1)
  return `${prefix.trimEnd()}…`
}

/** Normalize model-controlled display text without allowing control characters or unbounded UI/log data. */
export const normalizeProjectText = (value: unknown, maxLength: number, fallback = ''): string => {
  const limit = Number.isFinite(maxLength) ? Math.max(0, Math.floor(maxLength)) : 0
  if (limit === 0) return ''

  const clean = (candidate: unknown): string => {
    if (typeof candidate !== 'string') return ''
    return candidate.replace(CONTROL_CHARACTERS, ' ').replace(/\s+/g, ' ').trim()
  }

  return truncateText(clean(value) || clean(fallback), limit)
}

const errorInput = (value: unknown): string =>
  normalizeProjectText(value, MAX_ERROR_LENGTH) || (typeof value === 'string' ? '<empty>' : '<non-text>')

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

const normalizePath = (value: unknown, options: { allowHostScaffold?: boolean } = {}): string => {
  if (typeof value !== 'string') throw new Error('项目文件路径必须是字符串')
  const path = value.trim()
  if (!path) throw new Error('项目文件路径不能为空')
  if (path.length > MAX_PATH_LENGTH) throw new Error(`项目文件路径过长：${errorInput(value)}`)
  if (/[\u0000-\u001F\u007F-\u009F]/.test(path) || path.includes('\\')) {
    throw new Error(`项目文件路径不安全：${errorInput(value)}`)
  }
  if (path.startsWith('/') || /^[A-Za-z]:\//.test(path)) {
    throw new Error(`项目文件路径不能是绝对路径：${errorInput(value)}`)
  }

  const segments = path.split('/').filter((segment) => segment !== '' && segment !== '.')
  if (segments.length === 0) throw new Error(`项目文件路径无效：${errorInput(value)}`)
  if (segments.includes('..')) throw new Error(`项目文件路径不能包含 ..：${errorInput(value)}`)

  const normalized = segments.join('/')
  const basename = segments.at(-1)?.toLowerCase() ?? ''
  if (segments.some((segment) => segment.toLowerCase() === 'node_modules')) {
    throw new Error(`项目文件不能写入 node_modules：${errorInput(value)}`)
  }
  if (basename === '.env' || basename.startsWith('.env.')) {
    throw new Error(`项目文件不能包含环境变量：${errorInput(value)}`)
  }
  if (FORBIDDEN_BASENAMES.has(basename) && !(options.allowHostScaffold && HOST_SCAFFOLD_PATHS.has(normalized.toLowerCase()))) {
    throw new Error(`项目文件不能包含 lockfile 或包配置：${errorInput(value)}`)
  }
  if (isForbiddenBuildPath(normalized) && !(options.allowHostScaffold && HOST_SCAFFOLD_PATHS.has(normalized.toLowerCase()))) {
    throw new Error(`项目文件不能覆盖宿主构建配置：${errorInput(value)}`)
  }
  const dotIndex = basename.lastIndexOf('.')
  if (dotIndex >= 0 && BINARY_EXTENSIONS.has(basename.slice(dotIndex))) {
    throw new Error(`项目不能包含二进制文件：${errorInput(value)}`)
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
    const pathKey = path.toLowerCase()
    if (seen.has(pathKey)) throw new Error(`项目文件路径重复：${path}`)
    seen.add(pathKey)
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

/**
 * Build the complete static preview document after sanitizing the model body.
 * The host owns the document envelope and CSP; model-provided head/meta tags
 * are removed rather than being allowed to replace either policy. The caller
 * keeps the iframe sandbox boundary; this policy only constrains the child page.
 */
export const createStaticPreviewDocument = (indexHtml: string, title: string): string => {
  const sanitizedDocument = DOMPurify.sanitize(indexHtml, {
    WHOLE_DOCUMENT: true,
    USE_PROFILES: { html: true },
    FORBID_TAGS: STATIC_PREVIEW_FORBIDDEN_TAGS,
    FORBID_ATTR: ['action', 'formaction', 'http-equiv', 'ping', 'srcdoc'],
  })
  const safeTitle = normalizeProjectText(title, MAX_TITLE_LENGTH, 'Untitled project') || 'Untitled project'
  const hostHead = `<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="${STATIC_PREVIEW_CSP}"><meta name="referrer" content="no-referrer"><title>${escapeHtml(safeTitle)}</title>`
  const documentWithoutModelHead = sanitizedDocument
    .replace(/<meta\b[^>]*>/gi, '')
    .replace(/<title\b[^>]*>[\s\S]*?<\/title\s*>/gi, '')
    .replace(/<title\b[^>]*\/>/gi, '')
  const head = documentWithoutModelHead.match(/<head\b[^>]*>/i)

  if (head?.index !== undefined) {
    const insertionIndex = head.index + head[0].length
    return `${documentWithoutModelHead.slice(0, insertionIndex)}${hostHead}${documentWithoutModelHead.slice(insertionIndex)}`
  }
  return `<!doctype html><html lang="zh-CN"><head>${hostHead}</head><body>${documentWithoutModelHead}</body></html>`
}

export const normalizeGeneratedProject = (raw: string, fallbackTitle: string): GenerationOutput => {
  const value = parseRawProject(raw)
  if (!isRecord(value)) throw new Error('GeneratedProject 必须是 JSON 对象')
  if (value.schemaVersion !== 1) throw new Error('不支持的 GeneratedProject schemaVersion')

  const files = normalizeFiles(value.files)
  const paths = new Set(files.map((file) => file.path))
  const indexHtml = files.find((file) => file.path === 'index.html')?.content
  const isStatic = files.length === 1 && paths.has('index.html') && indexHtml !== undefined && !hasApplicationScripting(indexHtml)

  if (!isStatic && files.some((file) => file.path.toLowerCase() === 'index.html')) {
    throw new Error('Web 项目不能覆盖固定 index.html scaffold')
  }
  if (!isStatic && !paths.has('src/main.tsx')) {
    throw new Error('Web 项目必须包含 src/main.tsx')
  }

  const title = normalizeProjectText(value.title, MAX_TITLE_LENGTH) ||
    normalizeProjectText(fallbackTitle, MAX_TITLE_LENGTH, 'Untitled project')
  const summary = normalizeProjectText(value.summary, MAX_SUMMARY_LENGTH)
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
    html: isStatic ? createStaticPreviewDocument(indexHtml, title) : '',
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
  const normalizedFiles = project.files.map((file) => {
    const path = normalizePath(file.path, { allowHostScaffold: true })
    if (project.kind === 'web' && path.toLowerCase() === 'index.html') {
      throw new Error('Web 项目不能覆盖固定 index.html scaffold')
    }
    return { path, content: file.content }
  })

  if (project.kind === 'static') {
    const index = normalizedFiles.find((file) => file.path === 'index.html')
    if (!index) throw new Error('Static 项目缺少 index.html')
    return { 'index.html': index.content }
  }

  const files: Record<string, string> = {}
  for (const file of normalizedFiles) files[file.path] = file.content
  // Scaffold files are applied last so model output can never override host policy.
  for (const [path, content] of Object.entries(WEB_SCAFFOLD)) files[path] = content
  return files
}
