import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { FileSystemTree, WebContainer, WebContainerProcess } from '@webcontainer/api'
import type { GeneratedProject } from '../project/types'
import { WebContainerManager } from './index'

class FakeProcess implements WebContainerProcess {
  readonly input = new WritableStream<string>()
  readonly output = new ReadableStream<string>({
    start(controller) {
      controller.close()
    },
  })
  readonly kill = vi.fn(() => {
    this.resolveExit(143)
  })
  readonly resize = vi.fn()
  private resolveExit!: (code: number) => void
  readonly exit = new Promise<number>((resolve) => {
    this.resolveExit = resolve
  })

  constructor(exitCode?: number) {
    if (exitCode !== undefined) this.resolveExit(exitCode)
  }

  finish(code = 0): void {
    this.resolveExit(code)
  }
}

type EventListener = (...args: unknown[]) => void

class FakeWebContainer {
  readonly fs = {
    rm: vi.fn(async () => undefined),
    mkdir: vi.fn(async () => '/project'),
  }
  readonly mount = vi.fn(async (_tree: FileSystemTree, _options?: { mountPoint?: string }) => undefined)
  readonly teardown = vi.fn()
  private spawnCount = 0
  readonly spawn = vi.fn(async (_command: string, _args: string[]) => {
    const process = new FakeProcess(this.spawnCount % 2 === 0 ? 0 : undefined)
    this.spawnCount += 1
    return process
  })
  private readonly listeners = new Map<string, Set<EventListener>>()
  readonly processes: FakeProcess[] = []

  on(event: string, listener: EventListener): () => void {
    const eventListeners = this.listeners.get(event) ?? new Set<EventListener>()
    eventListeners.add(listener)
    this.listeners.set(event, eventListeners)
    return () => eventListeners.delete(listener)
  }

  emit(event: string, ...args: unknown[]): void {
    for (const listener of this.listenersFor(event)) listener(...args)
  }

  listenersFor(event: string): EventListener[] {
    return [...(this.listeners.get(event) ?? [])]
  }

  asWebContainer(): WebContainer {
    return this as unknown as WebContainer
  }
}

const webProject: GeneratedProject = {
  schemaVersion: 1,
  kind: 'web',
  title: 'Web project',
  summary: '',
  files: [{ path: 'src/main.tsx', content: 'export const App = () => null' }],
}

const supportedWindow = {
  crossOriginIsolated: true,
  location: { origin: 'https://studio.example' },
}

const mockBoot = (manager: WebContainerManager, container: FakeWebContainer) =>
  vi.spyOn(
    manager as unknown as { ensureBooted: (epoch: number) => Promise<WebContainer> },
    'ensureBooted',
  ).mockResolvedValue(container.asWebContainer())

const waitForProcesses = (container: FakeWebContainer, count: number) =>
  vi.waitFor(() => expect(container.spawn).toHaveBeenCalledTimes(count), { timeout: 1_000 })

describe('WebContainerManager fake runtime', () => {
  let container: FakeWebContainer
  let manager: WebContainerManager | undefined

  beforeEach(() => {
    vi.stubGlobal('window', supportedWindow)
    container = new FakeWebContainer()
  })

  afterEach(() => {
    manager?.dispose()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('coalesces duplicate activations for the same project', async () => {
    manager = new WebContainerManager()
    mockBoot(manager, container)

    const first = manager.activate(webProject, 'same-project')
    const duplicate = manager.activate(webProject, 'same-project')

    expect(duplicate).toBe(first)
    await waitForProcesses(container, 2)
    container.emit('server-ready', 5173, 'https://preview.example')
    await first

    expect(container.spawn).toHaveBeenCalledTimes(2)
    expect(manager.getState().phase).toBe('ready')
  })

  it('serializes repeated stop calls and ends idle', async () => {
    manager = new WebContainerManager()
    mockBoot(manager, container)
    const activation = manager.activate(webProject, 'project-a')
    await waitForProcesses(container, 2)
    container.emit('server-ready', 5173, 'https://preview.example')
    await activation

    const firstStop = manager.stop()
    const secondStop = manager.stop()
    await Promise.all([firstStop, secondStop])

    expect(manager.getState()).toEqual({ phase: 'idle', logs: [] })
  })

  it('ignores a server-ready callback delivered after stop', async () => {
    manager = new WebContainerManager()
    mockBoot(manager, container)
    const activation = manager.activate(webProject, 'late-callback')
    await waitForProcesses(container, 2)
    const lateListener = container.listenersFor('server-ready')[0]
    const stop = manager.stop()
    await stop

    expect(lateListener).toBeDefined()
    lateListener?.(5173, 'https://late.example')
    await activation

    expect(manager.getState()).toEqual({ phase: 'idle', logs: [] })
    expect(manager.getState().previewUrl).toBeUndefined()
  })

  it('accepts HTTPS and loopback HTTP preview URLs', async () => {
    manager = new WebContainerManager()
    mockBoot(manager, container)

    const httpsActivation = manager.activate(webProject, 'https-project')
    await waitForProcesses(container, 2)
    container.emit('server-ready', 5173, 'https://preview.example')
    await httpsActivation
    expect(manager.getState().previewUrl).toBe('https://preview.example/')

    await manager.stop()
    const loopbackActivation = manager.activate(webProject, 'loopback-project')
    await waitForProcesses(container, 4)
    container.emit('server-ready', 5173, 'http://127.0.0.1:5173')
    await loopbackActivation

    expect(manager.getState().previewUrl).toBe('http://127.0.0.1:5173/')
  })

  it.each([
    ['http://preview.example', 'secure protocol'],
    ['https://studio.example/preview', 'share the host application origin'],
    ['not a URL', 'Invalid URL'],
  ])('rejects unsafe preview URL %s', async (url, message) => {
    manager = new WebContainerManager()
    mockBoot(manager, container)
    const activation = manager.activate(webProject, `invalid-${url}`)
    await waitForProcesses(container, 2)
    container.emit('server-ready', 5173, url)
    await activation

    expect(manager.getState().phase).toBe('error')
    expect(manager.getState().error).toContain(message)
    expect(manager.getState().previewUrl).toBeUndefined()
  })
})
