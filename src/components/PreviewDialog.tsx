import * as Dialog from '@radix-ui/react-dialog'
import { Copy, X } from 'lucide-react'
import { toast } from 'sonner'
import type { GenerationResult } from '../types'

interface PreviewDialogProps {
  result: GenerationResult | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function PreviewDialog({ result, open, onOpenChange }: PreviewDialogProps) {
  const copyHtml = async () => {
    if (!result?.html) return
    await navigator.clipboard.writeText(result.html)
    toast.success('HTML 已复制到剪贴板')
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay preview-overlay" />
        <Dialog.Content className="preview-dialog">
          <div className="preview-dialog-header">
            <div className="result-model-meta">
              <span className="provider-dot" style={{ background: result?.accent ?? '#8ef0c4' }} />
              <div>
                <Dialog.Title>{result?.model ?? '页面预览'}</Dialog.Title>
                <Dialog.Description>
                  {result?.providerName ?? ''} · 独立 sandbox 预览
                </Dialog.Description>
              </div>
            </div>
            <div className="preview-dialog-actions">
              <button className="icon-button subtle" type="button" onClick={copyHtml} disabled={!result?.html} aria-label="复制 HTML">
                <Copy size={16} />
              </button>
              <Dialog.Close asChild>
                <button className="icon-button subtle" type="button" aria-label="关闭预览">
                  <X size={18} />
                </button>
              </Dialog.Close>
            </div>
          </div>
          <div className="expanded-frame-wrap">
            {result?.html ? (
              <iframe className="expanded-frame" title={`${result.model} 放大预览`} srcDoc={result.html} sandbox="" />
            ) : (
              <div className="expanded-empty">暂无可预览的内容</div>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
