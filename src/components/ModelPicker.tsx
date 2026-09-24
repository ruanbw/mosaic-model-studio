import * as Popover from '@radix-ui/react-popover'
import { Check, ChevronDown, Layers3, Settings2, Sparkles, X } from 'lucide-react'
import type { ModelOption } from '../types'

interface ModelPickerProps {
  models: ModelOption[]
  selectedKeys: string[]
  onToggle: (modelKey: string) => void
  onClear: () => void
  onManage: () => void
}

export function ModelPicker({
  models,
  selectedKeys,
  onToggle,
  onClear,
  onManage,
}: ModelPickerProps) {
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button className="model-picker-trigger" type="button" aria-label="选择模型">
          <span className="model-picker-icon">
            <Layers3 size={16} strokeWidth={1.8} />
          </span>
          <span className="model-picker-copy">
            <span className="model-picker-label">对比模型</span>
            <span className="model-picker-value">
              {selectedKeys.length > 0 ? `已选择 ${selectedKeys.length} 个模型` : '选择模型'}
            </span>
          </span>
          <ChevronDown className="model-picker-chevron" size={16} />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content className="model-popover" sideOffset={10} align="start">
          <div className="popover-heading">
            <div>
              <p className="eyebrow">MODEL SET</p>
              <h3>选择要并行运行的模型</h3>
            </div>
            <Popover.Close asChild>
              <button className="icon-button subtle" type="button" aria-label="关闭模型选择">
                <X size={16} />
              </button>
            </Popover.Close>
          </div>
          <div className="model-list" role="listbox" aria-label="模型列表">
            {models.length === 0 ? (
              <div className="popover-empty">
                <Sparkles size={18} />
                <span>先添加一个提供商和模型</span>
              </div>
            ) : (
              models.map((model) => {
                const selected = selectedKeys.includes(model.key)
                return (
                  <button
                    className={`model-option ${selected ? 'selected' : ''}`}
                    key={model.key}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    onClick={() => onToggle(model.key)}
                  >
                    <span className="model-option-check">{selected && <Check size={13} />}</span>
                    <span className="provider-dot" style={{ background: model.accent }} />
                    <span className="model-option-copy">
                      <strong>{model.model}</strong>
                      <small>{model.providerName}</small>
                    </span>
                    {!model.configured && <span className="model-option-warning">未配置</span>}
                  </button>
                )
              })
            )}
          </div>
          <div className="popover-footer">
            <button className="text-button" type="button" onClick={onClear} disabled={!selectedKeys.length}>
              清除选择
            </button>
            <button className="text-button accent-text" type="button" onClick={onManage}>
              <Settings2 size={14} />
              管理提供商
            </button>
          </div>
          <Popover.Arrow className="popover-arrow" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
