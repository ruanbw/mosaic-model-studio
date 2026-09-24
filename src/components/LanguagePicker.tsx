import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { Check, Languages } from 'lucide-react'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'

const languages = [
  { value: 'zh', label: '中文' },
  { value: 'en', label: 'English' },
] as const

export function LanguagePicker() {
  const { i18n, t } = useTranslation()
  const currentLanguage = i18n.resolvedLanguage ?? 'zh'

  useEffect(() => {
    document.documentElement.lang = currentLanguage === 'zh' ? 'zh-CN' : 'en'
  }, [currentLanguage])

  return <DropdownMenu.Root><DropdownMenu.Trigger asChild><button className="inline-flex min-h-7 items-center gap-1.5 rounded-md border border-transparent px-2 text-[10px] text-muted max-[580px]:size-7 max-[580px]:justify-center max-[580px]:px-0 transition-colors hover:border-line hover:bg-surface-soft hover:text-ink" type="button" aria-label={t('language.label')} title={t('language.label')}><Languages size={16} /><span className="max-[580px]:hidden">{t('language.label')}</span></button></DropdownMenu.Trigger><DropdownMenu.Portal><DropdownMenu.Content className="z-[70] w-[150px] rounded-[9px] border border-line bg-surface p-1.5 text-ink shadow-[0_18px_50px_color-mix(in_srgb,#000_22%,transparent)]" sideOffset={9} align="end"><div className="flex items-center gap-1.5 border-b border-line-soft px-2 pb-2 pt-1.5 font-mono text-[9px] uppercase tracking-[0.08em] text-faint"><Languages size={14} /><span>{t('language.label')}</span></div><DropdownMenu.RadioGroup value={currentLanguage} onValueChange={(value) => void i18n.changeLanguage(value)}>{languages.map((language) => <DropdownMenu.RadioItem className="relative flex items-center gap-2 rounded-md px-2 py-2 text-muted outline-none transition-colors hover:bg-surface-hover hover:text-ink data-[state=checked]:text-ink" value={language.value} key={language.value}><span className="flex-1 text-[11px]">{language.label}</span><DropdownMenu.ItemIndicator className="text-mint"><Check size={14} /></DropdownMenu.ItemIndicator></DropdownMenu.RadioItem>)}</DropdownMenu.RadioGroup></DropdownMenu.Content></DropdownMenu.Portal></DropdownMenu.Root>
}
