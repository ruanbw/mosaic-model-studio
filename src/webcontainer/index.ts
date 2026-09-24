import type { FileSystemTree, WebContainer, WebContainerProcess } from '@webcontainer/api'
import { createProjectRuntimeFiles, type GeneratedProject } from '../project/normalize'
import type { WebContainerState } from './types'

export type { WebContainerPhase, WebContainerState } from './types'

const PROJECT_ROOT = '/project'
const INSTALL_TIMEOUT_MS = 180_000
const START_TIMEOUT_MS = 45_000
const BOOT_TIMEOUT_MS = 45_000
const MAX_LOG_ENTRIES = 200
const MAX_LOG_LENGTH = 2_000

type ProcessPhase = 'install' | 'dev'

interface BootAttempt {
  promise: Promise<WebContainer>
  abandoned: boolean
}

class StaleActivationError extends Error {
  constructor() {
    super('Superseded WebContainer activation')
    this.name = 'StaleActivationError'
  }
}

class BootTimeoutError extends Error {
  constructor() {
    super('WebContainer boot timed out after 45 seconds')
    this.name = 'BootTimeoutError'
  }
}

function isSupportedEnvironment(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.crossOriginIsolated === true &&
    typeof SharedArrayBuffer !== 'undefined'
  )
}

function toFileSystemTree(files: Record<string, string>): FileSystemTree {
  const root: FileSystemTree = {}

  for (const [rawPath, contents] of Object.entries(files)) {
    const segments = rawPath.split('/')
    if (
      rawPath.length === 0 ||
      rawPath.startsWith('/') ||
      rawPath.includes('\\') ||
      rawPath.includes('\0') ||
      segments.some((segment) => segment === '' || segment === '.' || segment === '..')
    ) {
      throw new Error(`Invalid runtime file path: ${rawPath}`)
    }

    let directory = root
    for (const segment of segments.slice(0, -1)) {
      const node = directory[segment]
      if (!node) {
        const created: FileSystemTree = {}
        directory[segment] = { directory: created }
        directory = created
      } else if ('directory' in node) {
        directory = node.directory
      } else {
        throw new Error(`Runtime file path conflicts at: ${rawPath}`)
      }
    }

    const filename = segments[segments.length - 1]
    if (directory[filename]) {
      throw new Error(`Duplicate runtime file path: ${rawPath}`)
    }
    directory[filename] = { file: { contents } }
  }

  return root
}

function errorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error)
  return message.replace(/[\r\n]+/g, ' ').slice(0, MAX_LOG_LENGTH)
}

function validatePreviewUrl(value: string): string {
  const url = new URL(value)
  const loopback = /^(localhost|127(?:\.\d{1,3}){3}|\[::1\])$/i.test(url.hostname)
  const secureProtocol = url.protocol === 'https:' || (url.protocol === 'http:' && loopback)
  if (!secureProtocol) throw new Error('WebContainer preview URL must use a secure protocol')
  if (typeof window !== 'undefined' && url.origin === window.location.origin) {
    throw new Error('WebContainer preview URL must not share the host application origin')
  }
  return url.toString()
}

function sanitizeLogLine(line: string): string {
  const normalized = line.replace(/\u001B\[[0-?]*[ -/]*[@-~]/g, '').trimEnd()
  const withoutSpinner = normalized.replace(/^(?:[|/\\-]\s*){5,}/, '').trimStart()
  if (!withoutSpinner || /^[\s|/\\-]+$/.test(withoutSpinner)) return ''
  const redacted = withoutSpinner.replace(
    /((?:api[_-]?key|access[_-]?token|auth[_-]?token|password|secret)\s*[=:]\s*)\S+/gi,
    '$1[REDACTED]',
  )
  return redacted.length > MAX_LOG_LENGTH ? `${redacted.slice(0, MAX_LOG_LENGTH - 1)}…` : redacted
}

function createTimeout(message: string | Error, timeoutMs: number): { promise: Promise<never>; cancel: () => void } {
  let timer: ReturnType<typeof setTimeout> | undefined
  const promise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(typeof message === 'string' ? new Error(message) : message), timeoutMs)
  })
  return { promise, cancel: () => clearTimeout(timer) }
}

export class WebContainerManager {
  private state: WebContainerState = { phase: 'idle', logs: [] }
  private readonly listeners = new Set<() => void>()
  private container: WebContainer | undefined
  private bootAttempt: BootAttempt | undefined
  private apiKeyConfigured = false
  private containerErrorUnsubscribe: (() => void) | undefined
  private operation: Promise<void> = Promise.resolve()
  private currentProcess: WebContainerProcess | undefined
  private currentOutputReader: ReadableStreamDefaultReader<string> | undefined
  private lastProjectId: string | undefined
  private epoch = 0
  private disposed = false
  private activeProjectId: string | undefined
  private activationPromise: Promise<void> | undefined

  getState(): WebContainerState {
    return this.state
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    listener()
    return () => {
      this.listeners.delete(listener)
    }
  }

  activate(project: GeneratedProject, projectId: string): Promise<void> {
    if (this.disposed) {
      this.publish({ phase: 'error', projectId, logs: [], error: 'WebContainer manager has been disposed' })
      return Promise.resolve()
    }
    if (this.activeProjectId === projectId && this.activationPromise) return this.activationPromise
    if (this.activeProjectId === projectId && this.state.phase === 'ready') return Promise.resolve()

    const activationEpoch = ++this.epoch
    if (!this.container && this.bootAttempt) this.bootAttempt.abandoned = true
    this.activeProjectId = projectId
    this.publish({ phase: 'booting', projectId, logs: [] })

    // Invalidate callbacks immediately; serializing the filesystem transition prevents two spawns overlapping.
    void this.stopCurrentProcess()

    const run = this.operation.catch(() => undefined).then(async () => {
      try {
        if (!this.isCurrent(activationEpoch)) throw new StaleActivationError()
        if (!isSupportedEnvironment()) {
          this.publishIfCurrent(activationEpoch, {
            phase: 'unsupported',
            projectId,
            logs: this.state.logs,
            error: 'WebContainer requires cross-origin isolation and SharedArrayBuffer support',
          })
          return
        }

        const container = await this.ensureBooted(activationEpoch)
        if (!this.isCurrent(activationEpoch)) throw new StaleActivationError()

        this.publishIfCurrent(activationEpoch, { phase: 'mounting', projectId, logs: [] })
        await this.stopCurrentProcess()
        if (!this.isCurrent(activationEpoch)) throw new StaleActivationError()
        await container.fs.rm(PROJECT_ROOT, { recursive: true, force: true })
        await container.fs.mkdir(PROJECT_ROOT, { recursive: true })
        const runtimeFiles = createProjectRuntimeFiles(project)
        await container.mount(toFileSystemTree(runtimeFiles), { mountPoint: PROJECT_ROOT })
        if (!this.isCurrent(activationEpoch)) throw new StaleActivationError()

        if (project.kind !== 'web') {
          this.publishIfCurrent(activationEpoch, { phase: 'ready', projectId, logs: this.state.logs })
          return
        }

        const install = await this.spawn(
          container,
          'npm',
          ['ci', '--ignore-scripts', '--prefer-offline', '--no-audit', '--no-fund'],
          'install',
          activationEpoch,
        )
        this.publishIfCurrent(activationEpoch, { phase: 'installing', projectId, logs: this.state.logs })
        const installExit = await this.waitForExit(
          install,
          activationEpoch,
          INSTALL_TIMEOUT_MS,
          'Dependency installation timed out after 180 seconds',
        )
        if (installExit !== 0) throw new Error(`Dependency installation failed with exit code ${installExit}`)
        if (!this.isCurrent(activationEpoch)) throw new StaleActivationError()

        const readySubscription = this.listenForServerReady(container, activationEpoch)
        try {
          const dev = await this.spawn(
            container,
            'npm',
            ['run', 'dev', '--', '--host', '0.0.0.0', '--port', '5173'],
            'dev',
            activationEpoch,
          )
          this.publishIfCurrent(activationEpoch, { phase: 'starting', projectId, logs: this.state.logs })
          const previewUrl = await this.waitForStart(readySubscription.promise, dev, activationEpoch)
          this.publishIfCurrent(activationEpoch, { phase: 'ready', projectId, previewUrl, logs: this.state.logs })
          void dev.exit.then(
            (code) => this.handleUnexpectedExit(dev, code, activationEpoch),
            () => this.handleUnexpectedExit(dev, -1, activationEpoch),
          )
        } finally {
          readySubscription.dispose()
        }
      } catch (error) {
        if (!this.isCurrent(activationEpoch) || error instanceof StaleActivationError) return
        await this.stopCurrentProcess().catch(() => undefined)
        this.publish({
          phase: 'error',
          projectId,
          logs: this.state.logs,
          error: errorMessage(error),
        })
        if (this.activationPromise === run) this.activationPromise = undefined
      } finally {
        if (this.operation === run) this.operation = Promise.resolve()
      }
    })

    this.operation = run
    this.activationPromise = run
    return run
  }

  stop(): Promise<void> {
    if (this.disposed) return Promise.resolve()
    const stopEpoch = ++this.epoch
    this.lastProjectId = this.activeProjectId ?? this.state.projectId
    this.activeProjectId = undefined
    this.activationPromise = undefined
    if (this.bootAttempt) this.bootAttempt.abandoned = true
    this.publish({ phase: 'stopping', projectId: this.lastProjectId, logs: this.state.logs })
    void this.stopCurrentProcess()

    const run = this.operation.catch(() => undefined).then(async () => {
      try {
        await this.stopCurrentProcess()
        if (this.container) {
          await this.container.fs.rm(PROJECT_ROOT, { recursive: true, force: true })
        }
      } catch (error) {
        if (!this.isCurrent(stopEpoch)) return
        this.publish({
          phase: 'error',
          projectId: this.state.projectId,
          logs: this.state.logs,
          error: errorMessage(error),
        })
        return
      }

      if (this.isCurrent(stopEpoch)) {
        this.publish({ phase: 'idle', projectId: this.lastProjectId, logs: this.state.logs })
      }
    })

    this.operation = run
    return run
  }

  dispose(): void {
    if (this.disposed) return
    this.disposed = true
    this.epoch += 1
    this.lastProjectId = this.activeProjectId ?? this.state.projectId
    this.activeProjectId = undefined
    this.activationPromise = undefined
    if (this.bootAttempt) this.bootAttempt.abandoned = true
    this.bootAttempt = undefined
    void this.stopCurrentProcess().catch(() => undefined)
    this.currentOutputReader = undefined
    this.containerErrorUnsubscribe?.()
    this.containerErrorUnsubscribe = undefined
    this.container?.teardown()
    this.container = undefined
    this.publish({ phase: 'idle', projectId: this.lastProjectId, logs: this.state.logs })
  }

  private async ensureBooted(epoch: number): Promise<WebContainer> {
    if (this.container) return this.container

    const previousAttempt = this.bootAttempt
    const attempt = this.createBootAttempt(epoch, previousAttempt)
    const timeout = createTimeout(new BootTimeoutError(), BOOT_TIMEOUT_MS)
    try {
      const container = await Promise.race([attempt.promise, timeout.promise])
      if (this.disposed || attempt.abandoned || !this.isCurrent(epoch)) throw new StaleActivationError()
      this.container = container
      this.bindContainerError(container)
      return container
    } catch (error) {
      if (error instanceof BootTimeoutError) attempt.abandoned = true
      throw error
    } finally {
      timeout.cancel()
    }
  }

  private createBootAttempt(epoch: number, previousAttempt?: BootAttempt): BootAttempt {
    let attempt: BootAttempt
    const promise = Promise.resolve().then(async () => {
      if (previousAttempt) {
        try {
          await previousAttempt.promise
        } catch {
          // The previous attempt has already failed; it is safe to continue with a fresh boot.
        }
      }
      if (this.disposed || attempt.abandoned || !this.isCurrent(epoch)) throw new StaleActivationError()
      return this.bootRuntime()
    })
    attempt = { promise, abandoned: false }
    this.bootAttempt = attempt
    void promise.then(
      (container) => {
        if (this.disposed || attempt.abandoned || this.bootAttempt !== attempt) {
          container.teardown()
          if (this.bootAttempt === attempt) this.bootAttempt = undefined
        }
      },
      () => {
        if (this.bootAttempt === attempt) this.bootAttempt = undefined
      },
    )
    return attempt
  }

  private async bootRuntime(): Promise<WebContainer> {
    const api = await import('@webcontainer/api')
    if (!this.apiKeyConfigured) {
      this.apiKeyConfigured = true
      const runtimeEnv = (import.meta as ImportMeta & {
        env?: { VITE_WEBCONTAINER_API_KEY?: string }
      }).env
      const apiKey = runtimeEnv?.VITE_WEBCONTAINER_API_KEY
      if (apiKey) api.configureAPIKey(apiKey)
    }
    return api.WebContainer.boot({ coep: 'credentialless', forwardPreviewErrors: 'exceptions-only' })
  }

  private bindContainerError(container: WebContainer): void {
    this.containerErrorUnsubscribe?.()
    this.containerErrorUnsubscribe = container.on('error', (error) => {
      if (this.disposed || this.container !== container || this.state.phase === 'stopping' || this.state.phase === 'idle') return
      this.epoch += 1
      this.activationPromise = undefined
      this.publish({
        phase: 'error',
        projectId: this.state.projectId,
        logs: this.state.logs,
        error: errorMessage(error),
      })
      void this.stopCurrentProcess()
    })
  }

  private async spawn(
    container: WebContainer,
    command: string,
    args: string[],
    phase: ProcessPhase,
    epoch: number,
  ): Promise<WebContainerProcess> {
    if (!this.isCurrent(epoch)) throw new StaleActivationError()
    const process = await container.spawn(command, args, { cwd: PROJECT_ROOT })
    if (!this.isCurrent(epoch)) {
      process.kill()
      throw new StaleActivationError()
    }
    this.currentProcess = process
    void this.collectOutput(process, phase, epoch)
    return process
  }

  private async collectOutput(process: WebContainerProcess, phase: ProcessPhase, epoch: number): Promise<void> {
    const reader = process.output.getReader()
    if (process === this.currentProcess) this.currentOutputReader = reader
    let pending = ''

    const addLines = (text: string) => {
      pending += text
      const lines = pending.split(/\r\n|\n|\r/)
      pending = lines.pop() ?? ''
      for (const line of lines) this.appendLog(`[${phase}] ${sanitizeLogLine(line)}`, epoch)
    }

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        addLines(value)
      }
      if (pending) this.appendLog(`[${phase}] ${sanitizeLogLine(pending)}`, epoch)
    } catch {
      // Killing a process closes its output stream; the epoch prevents stale output from being published.
    } finally {
      if (this.currentOutputReader === reader) this.currentOutputReader = undefined
    }
  }

  private async waitForExit(
    process: WebContainerProcess,
    epoch: number,
    timeoutMs: number,
    timeoutMessage: string,
  ): Promise<number> {
    const timeout = createTimeout(timeoutMessage, timeoutMs)
    try {
      const result = await Promise.race([process.exit, timeout.promise])
      if (!this.isCurrent(epoch)) throw new StaleActivationError()
      return result
    } catch (error) {
      process.kill()
      throw error
    } finally {
      timeout.cancel()
    }
  }

  private listenForServerReady(
    container: WebContainer,
    epoch: number,
  ): { promise: Promise<string>; dispose: () => void } {
    let unsubscribe: () => void = () => undefined
    const promise = new Promise<string>((resolve) => {
      unsubscribe = container.on('server-ready', (port, url) => {
        if (!this.isCurrent(epoch) || port !== 5173) return
        unsubscribe()
        resolve(url)
      })
    })
    return { promise, dispose: () => unsubscribe() }
  }

  private async waitForStart(readyPromise: Promise<string>, process: WebContainerProcess, epoch: number): Promise<string> {
    const timeout = createTimeout('Development server did not become ready within 45 seconds', START_TIMEOUT_MS)
    const exited = process.exit.then((code) => {
      throw new Error(`Development server exited before becoming ready (exit code ${code})`)
    })

    try {
      const result = await Promise.race([readyPromise, exited, timeout.promise])
      if (!this.isCurrent(epoch)) throw new StaleActivationError()
      return validatePreviewUrl(result)
    } catch (error) {
      process.kill()
      throw error
    } finally {
      timeout.cancel()
    }
  }

  private handleUnexpectedExit(process: WebContainerProcess, code: number, epoch: number): void {
    if (process !== this.currentProcess || !this.isCurrent(epoch) || this.state.phase === 'stopping') return
    this.currentProcess = undefined
    if (this.activationPromise && this.activeProjectId === this.state.projectId) {
      this.activationPromise = undefined
    }
    this.publish({
      phase: 'error',
      projectId: this.state.projectId,
      logs: this.state.logs,
      error: `Development server exited unexpectedly (exit code ${code})`,
    })
  }

  private async stopCurrentProcess(): Promise<void> {
    const process = this.currentProcess
    this.currentProcess = undefined
    if (process) {
      try {
        process.kill()
      } catch {
        // The process may have exited between reading the state and killing it.
      }
      await Promise.race([
        process.exit.catch(() => undefined),
        new Promise<void>((resolve) => setTimeout(resolve, 1_000)),
      ])
    }
    const reader = this.currentOutputReader
    this.currentOutputReader = undefined
    if (reader) await reader.cancel().catch(() => undefined)
  }

  private appendLog(log: string, epoch: number): void {
    if (!this.isCurrent(epoch) || !log.trim()) return
    const logs = [...this.state.logs, log]
    if (logs.length > MAX_LOG_ENTRIES) logs.splice(0, logs.length - MAX_LOG_ENTRIES)
    this.publish({ ...this.state, logs })
  }

  private publishIfCurrent(epoch: number, state: WebContainerState): void {
    if (this.isCurrent(epoch)) this.publish(state)
  }

  private publish(state: WebContainerState): void {
    this.state = state
    for (const listener of this.listeners) listener()
  }

  private isCurrent(epoch: number): boolean {
    return !this.disposed && epoch === this.epoch
  }
}

export const webContainerManager: WebContainerManager = new WebContainerManager()
