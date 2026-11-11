import { memo } from 'react'
import { SettingsView } from '../components/SettingsView'
import { useAppStore } from '../store'
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
  return (
    <SettingsView
      providers={providers}
      promptLength={promptLength}
      selectedCount={selectedCount}
      onRestore={onRestore}
      onClear={onClear}
    />
  )
})
