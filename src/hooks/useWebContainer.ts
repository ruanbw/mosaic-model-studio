import { useEffect, useSyncExternalStore } from 'react'
import type { GeneratedProject } from '../project/types'
import { webContainerManager, type WebContainerState } from '../webcontainer'

const subscribe = (listener: () => void) => webContainerManager.subscribe(listener)
const getSnapshot = () => webContainerManager.getState()

export function useWebContainer(
  active: boolean,
  project: GeneratedProject | undefined,
  projectId: string | undefined,
): WebContainerState {
  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)

  useEffect(() => {
    if (!active || !project || !projectId) return
    void webContainerManager.activate(project, projectId).catch(() => undefined)
  }, [active, project, projectId])

  return state
}
