export type WebContainerPhase =
  | 'idle'
  | 'booting'
  | 'mounting'
  | 'installing'
  | 'starting'
  | 'ready'
  | 'stopping'
  | 'error'
  | 'unsupported'

export interface WebContainerState {
  phase: WebContainerPhase
  projectId?: string
  previewUrl?: string
  logs: string[]
  error?: string
}
