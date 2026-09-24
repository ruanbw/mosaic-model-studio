import { useEffect, useState } from 'react'
import { Toaster } from 'sonner'
import { useAppStore } from '../store'

export function AppToaster() {
  const theme = useAppStore((state) => state.theme)
  const [systemPrefersDark, setSystemPrefersDark] = useState(() =>
    typeof window === 'undefined' ? true : !window.matchMedia('(prefers-color-scheme: light)').matches,
  )

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: light)')
    const update = () => setSystemPrefersDark(!media.matches)
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])

  const resolvedTheme = theme === 'system' ? (systemPrefersDark ? 'dark' : 'light') : theme
  return <Toaster position="bottom-right" theme={resolvedTheme} toastOptions={{ className: 'mosaic-toast' }} />
}
