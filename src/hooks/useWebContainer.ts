import { useCallback, useEffect, useSyncExternalStore } from 'react'
import type { GeneratedProject } from '../project/types'
import { webContainerManager, type WebContainerState } from '../webcontainer'

const getSnapshot = () => webContainerManager.getState()

export interface WebContainerController {
  state: WebContainerState
  retry: () => void
}

export function useWebContainer(
  active: boolean,
  project: GeneratedProject | undefined,
  projectId: string | undefined,
): WebContainerController {
  const subscribe = useCallback(
    (listener: () => void) => active ? webContainerManager.subscribe(listener) : () => undefined,
    [active],
  )
  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)

  const retry = useCallback(() => {
    if (!active || !project || !projectId) return
    void webContainerManager.activate(project, projectId).catch(() => undefined)
  }, [active, project, projectId])

  useEffect(() => {
    if (!active || !project || !projectId) return
    void webContainerManager.activate(project, projectId).catch(() => undefined)
  }, [active, project, projectId])

  return { state, retry }
}
