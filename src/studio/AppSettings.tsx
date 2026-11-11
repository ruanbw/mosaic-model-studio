import { memo } from 'react'
import { SettingsView } from '../components/SettingsView'
import { useAppStore, clampMaxConcurrentRequests } from '../store'
import type { Provider } from '../types'

export interface AppSettingsProps {
  providers: Provider[]
  selectedCount: number
  onRestore: () => void
  onClear: () => void
}

export const AppSettings = memo(function AppSettings({
  providers,
  selectedCount,
  onRestore,
  onClear,
}: AppSettingsProps) {
  const promptLength = useAppStore((state) => state.prompt.length)
  const maxConcurrentRequests = useAppStore((state) => state.maxConcurrentRequests)
  const setMaxConcurrentRequests = useAppStore((state) => state.setMaxConcurrentRequests)
  return (
    <SettingsView
      providers={providers}
      promptLength={promptLength}
      selectedCount={selectedCount}
      maxConcurrentRequests={maxConcurrentRequests}
      onMaxConcurrentRequestsChange={(value) => setMaxConcurrentRequests(clampMaxConcurrentRequests(value))}
      onRestore={onRestore}
      onClear={onClear}
    />
  )
})
