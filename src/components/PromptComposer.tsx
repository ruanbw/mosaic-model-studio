import * as Switch from '@radix-ui/react-switch'
import { ArrowUpRight, Command, WandSparkles } from 'lucide-react'
import { useRef } from 'react'
import { PROMPT_TEMPLATES } from '../prompts'

interface PromptComposerProps {
  prompt: string
  selectedCount: number
  demoMode: boolean
  isRunning: boolean
  onPromptChange: (value: string) => void
  onDemoModeChange: (value: boolean) => void
  onGenerate: () => void
  onManageModels: () => void
}

export function PromptComposer({
  prompt,
  selectedCount,
  demoMode,
  isRunning,
  onPromptChange,
  onDemoModeChange,
  onGenerate,
  onManageModels,
}: PromptComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault()
      onGenerate()
    }
  }

  return (
    <section className="composer-section" aria-labelledby="prompt-heading">
      <div className="section-heading compact-heading">
        <div>
          <p className="eyebrow">01 / DIRECTIVE</p>
          <h2 id="prompt-heading">给模型一个方向</h2>
        </div>
        <span className="shortcut-hint">
          <Command size={13} /> Enter 运行
        </span>
      </div>

      <div className="prompt-surface">
        <textarea
          ref={textareaRef}
          value={prompt}
          onChange={(event) => onPromptChange(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="描述你想看到的页面、交互和氛围…"
          rows={5}
          maxLength={4000}
          aria-label="页面提示词"
        />
        <div className="prompt-surface-footer">
          <div className="template-list" aria-label="提示词模板">
            <span className="template-label">快速开始</span>
            {PROMPT_TEMPLATES.map((template) => (
              <button
                className="template-chip"
                key={template.id}
                type="button"
                onClick={() => onPromptChange(template.prompt)}
              >
                {template.label}
              </button>
            ))}
          </div>
          <span className="character-count">{prompt.length.toLocaleString()} / 4,000</span>
        </div>
      </div>

      <div className="composer-controls">
        <button className="model-picker-inline" type="button" onClick={onManageModels}>
          <span className="model-count">{String(selectedCount).padStart(2, '0')}</span>
          <span>
            <strong>{selectedCount > 0 ? '个模型已就绪' : '选择模型'}</strong>
            <small>{selectedCount > 1 ? '将并排比较结果' : '可多选并行运行'}</small>
          </span>
          <ArrowUpRight size={15} />
        </button>

        <div className="composer-actions">
          <div className="demo-toggle-wrap">
            <Switch.Root
              className="switch-root"
              checked={demoMode}
              onCheckedChange={onDemoModeChange}
              id="demo-mode"
              aria-label="切换演示模式"
            >
              <Switch.Thumb className="switch-thumb" />
            </Switch.Root>
            <label htmlFor="demo-mode" className="switch-label">
              <span>演示模式</span>
              <small>{demoMode ? '不调用 API' : '使用已配置密钥'}</small>
            </label>
          </div>
          <button
            className="button primary generate-button"
            type="button"
            onClick={onGenerate}
            disabled={isRunning || !prompt.trim() || selectedCount === 0}
          >
            {isRunning ? <span className="spinner" /> : <WandSparkles size={17} />}
            {isRunning ? '生成中…' : '生成页面'}
            {!isRunning && <span className="button-shortcut">⌘↵</span>}
          </button>
        </div>
      </div>
    </section>
  )
}
