import { useShallow } from 'zustand/react/shallow'
import { useAppStore, type AppState } from './store'

/** Stable field selectors for components that only need one store slice. */
export const appStoreSelectors = {
  providers: (state: AppState) => state.providers,
  selectedModelKeys: (state: AppState) => state.selectedModelKeys,
  prompt: (state: AppState) => state.prompt,
  demoMode: (state: AppState) => state.demoMode,
  theme: (state: AppState) => state.theme,
  activeView: (state: AppState) => state.activeView,
  results: (state: AppState) => state.results,
  isRunning: (state: AppState) => state.isRunning,
} as const

/** Select the fields used by the App lane while avoiding a full-store subscription. */
export const selectAppState = (state: AppState) => ({
  providers: state.providers,
  selectedModelKeys: state.selectedModelKeys,
  prompt: state.prompt,
  demoMode: state.demoMode,
  activeView: state.activeView,
  results: state.results,
  isRunning: state.isRunning,
  setPrompt: state.setPrompt,
  setActiveView: state.setActiveView,
  toggleModel: state.toggleModel,
  clearModelSelection: state.clearModelSelection,
  addProvider: state.addProvider,
  updateProvider: state.updateProvider,
  removeProvider: state.removeProvider,
  setDemoMode: state.setDemoMode,
  setTheme: state.setTheme,
  setRunning: state.setRunning,
  replaceResults: state.replaceResults,
  upsertResult: state.upsertResult,
  removeResult: state.removeResult,
  clearResults: state.clearResults,
  clearConfiguration: state.clearConfiguration,
  restoreDefaults: state.restoreDefaults,
})

/** Subscribe to a selector with Zustand's shallow comparison for object results. */
export const useAppStoreSelector = <T>(selector: (state: AppState) => T): T =>
  useAppStore(useShallow(selector))

export { useShallow }
