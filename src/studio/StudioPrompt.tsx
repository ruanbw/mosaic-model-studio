import { memo, type RefObject } from 'react'
import { PromptComposer } from '../components/PromptComposer'
import { useAppStore } from '../store'

export interface StudioPromptProps {
  selectedCount: number
  isRunning: boolean
  onGenerate: () => void
  onStop: () => void
  onManageModels: () => void
  inputRef: RefObject<HTMLTextAreaElement | null>
}

export const StudioPrompt = memo(function StudioPrompt({
  selectedCount,
  isRunning,
  onGenerate,
  onStop,
  onManageModels,
  inputRef,
}: StudioPromptProps) {
  const prompt = useAppStore((state) => state.prompt)
  const demoMode = useAppStore((state) => state.demoMode)
  const setPrompt = useAppStore((state) => state.setPrompt)
  const setDemoMode = useAppStore((state) => state.setDemoMode)
  return (
    <PromptComposer
      prompt={prompt}
      selectedCount={selectedCount}
      demoMode={demoMode}
      isRunning={isRunning}
      onPromptChange={setPrompt}
      onDemoModeChange={setDemoMode}
      onGenerate={onGenerate}
      onStop={onStop}
      onManageModels={onManageModels}
      inputRef={inputRef}
    />
  )
})
