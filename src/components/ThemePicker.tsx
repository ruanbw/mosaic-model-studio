import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { Check, Laptop, Moon, Palette, Sun } from 'lucide-react'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useAppStore } from '../store'
import type { ThemeMode } from '../types'

const options: { value: ThemeMode; labelKey: string; descriptionKey: string; icon: typeof Moon }[] = [
  { value: 'dark', labelKey: 'theme.dark', descriptionKey: 'theme.darkCopy', icon: Moon },
  { value: 'light', labelKey: 'theme.light', descriptionKey: 'theme.lightCopy', icon: Sun },
  { value: 'system', labelKey: 'theme.system', descriptionKey: 'theme.systemCopy', icon: Laptop },
]

export function ThemePicker() {
  const { t } = useTranslation()
  const theme = useAppStore((state) => state.theme)
  const setTheme = useAppStore((state) => state.setTheme)

  useEffect(() => {
    const root = document.documentElement
    const media = window.matchMedia('(prefers-color-scheme: light)')
    const applyTheme = () => {
      const resolvedTheme = theme === 'system' ? (media.matches ? 'light' : 'dark') : theme
      root.dataset.theme = resolvedTheme
      root.style.colorScheme = resolvedTheme
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', resolvedTheme === 'light' ? '#f4f6f3' : '#101217')
    }
    applyTheme()
    if (theme !== 'system') return undefined
    media.addEventListener('change', applyTheme)
    return () => media.removeEventListener('change', applyTheme)
  }, [theme])

  const currentOption = options.find((option) => option.value === theme) ?? options[0]
  const CurrentIcon = currentOption.icon

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button className="inline-flex min-h-7 items-center gap-1.5 rounded-md border border-transparent px-2 text-[10px] text-muted max-[580px]:size-7 max-[580px]:justify-center max-[580px]:px-0 transition-colors hover:border-line hover:bg-surface-soft hover:text-ink" type="button" aria-label={t('theme.label')} title={t('theme.label')}>
          <CurrentIcon size={16} />
          <span className="max-[580px]:hidden">{t('theme.label')}</span>
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content className="z-[70] w-[190px] rounded-[9px] border border-line bg-surface p-1.5 text-ink shadow-[0_18px_50px_color-mix(in_srgb,var(--canvas)_22%,transparent)]" sideOffset={9} align="end">
          <div className="flex items-center gap-1.5 border-b border-line-soft px-2 pb-2 pt-1.5 font-mono text-[9px] uppercase tracking-[0.08em] text-faint"><Palette size={14} /><span>{t('theme.appearance')}</span></div>
          <DropdownMenu.RadioGroup value={theme} onValueChange={(value) => setTheme(value as ThemeMode)}>
            {options.map((option) => {
              const Icon = option.icon
              return (
                <DropdownMenu.RadioItem className="relative flex items-center gap-2 rounded-md px-2 py-2 text-muted outline-none transition-colors hover:bg-surface-hover hover:text-ink data-[state=checked]:text-ink" value={option.value} key={option.value}>
                  <span className="grid size-6 place-items-center rounded-md bg-mint/10 text-mint"><Icon size={15} /></span>
                  <span className="flex flex-1 flex-col gap-0.5"><strong className="text-[11px] font-medium">{t(option.labelKey)}</strong><small className="text-[9px] text-faint">{t(option.descriptionKey)}</small></span>
                  <DropdownMenu.ItemIndicator className="text-mint"><Check size={14} /></DropdownMenu.ItemIndicator>
                </DropdownMenu.RadioItem>
              )
            })}
          </DropdownMenu.RadioGroup>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}
