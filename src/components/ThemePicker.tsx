import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { Check, Laptop, Moon, Palette, Sun } from 'lucide-react'
import { useEffect } from 'react'
import { useAppStore } from '../store'
import type { ThemeMode } from '../types'

const options: { value: ThemeMode; label: string; description: string; icon: typeof Moon }[] = [
  { value: 'dark', label: '暗黑', description: '深色工作区', icon: Moon },
  { value: 'light', label: '明亮', description: '浅色工作区', icon: Sun },
  { value: 'system', label: '跟随系统', description: '自动匹配设备', icon: Laptop },
]

export function ThemePicker() {
  const theme = useAppStore((state) => state.theme)
  const setTheme = useAppStore((state) => state.setTheme)

  useEffect(() => {
    const root = document.documentElement
    const media = window.matchMedia('(prefers-color-scheme: light)')
    const applyTheme = () => {
      const resolvedTheme = theme === 'system' ? (media.matches ? 'light' : 'dark') : theme
      root.dataset.theme = resolvedTheme
      root.style.colorScheme = resolvedTheme
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
        <button className="theme-trigger" type="button" aria-label="选择主题" title="选择主题">
          <CurrentIcon size={16} />
          <span>主题</span>
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content className="theme-menu" sideOffset={9} align="end">
          <div className="theme-menu-heading"><Palette size={14} /><span>外观</span></div>
          <DropdownMenu.RadioGroup value={theme} onValueChange={(value) => setTheme(value as ThemeMode)}>
            {options.map((option) => {
              const Icon = option.icon
              return (
                <DropdownMenu.RadioItem className="theme-option" value={option.value} key={option.value}>
                  <span className="theme-option-icon"><Icon size={15} /></span>
                  <span className="theme-option-copy"><strong>{option.label}</strong><small>{option.description}</small></span>
                  <DropdownMenu.ItemIndicator className="theme-check"><Check size={14} /></DropdownMenu.ItemIndicator>
                </DropdownMenu.RadioItem>
              )
            })}
          </DropdownMenu.RadioGroup>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}
