import { Check, Copy, Expand, LoaderCircle, RotateCcw, Trash2, TriangleAlert } from 'lucide-react'
import { toast } from 'sonner'
import type { GenerationResult } from '../types'

interface ResultCardProps {
  result: GenerationResult
  onExpand: (result: GenerationResult) => void
  onRemove: (resultId: string) => void
  onRetry?: (result: GenerationResult) => void
}

const statusCopy: Record<GenerationResult['status'], string> = {
  queued: '排队中',
  running: '生成中',
  success: '已完成',
  error: '失败',
}

export function ResultCard({ result, onExpand, onRemove, onRetry }: ResultCardProps) {
  const copyHtml = async () => {
    if (!result.html) return
    try {
      await navigator.clipboard.writeText(result.html)
      toast.success('HTML 已复制到剪贴板')
    } catch {
      toast.error('复制失败，请检查浏览器权限')
    }
  }

  return (
    <article className={`result-card ${result.status}`}>
      <header className="result-card-header">
        <div className="result-model-meta">
          <span className="provider-dot" style={{ background: result.accent }} />
          <div>
            <strong>{result.model}</strong>
            <span>
              {result.providerName}
              {result.isDemo && <em> · DEMO</em>}
            </span>
          </div>
        </div>
        <div className="result-card-actions">
          <span className={`result-status ${result.status}`}>
            {result.status === 'running' && <LoaderCircle size={12} className="spin" />}
            {result.status === 'error' && <TriangleAlert size={12} />}
            {result.status === 'success' && <Check size={12} />}
            {statusCopy[result.status]}
          </span>
          <button
            className="icon-button card-action"
            type="button"
            onClick={() => onExpand(result)}
            disabled={!result.html}
            aria-label={`放大 ${result.model} 的结果`}
            title="放大预览"
          >
            <Expand size={16} />
          </button>
        </div>
      </header>

      <div className="result-preview">
        {result.status === 'success' && result.html && (
          <iframe
            className="result-frame"
            title={`${result.model} 生成的页面预览`}
            srcDoc={result.html}
            sandbox=""
          />
        )}
        {result.status === 'running' && (
          <div className="result-loading">
            <div className="loading-orbit">
              <span />
            </div>
            <strong>模型正在构建设计</strong>
            <small>通常需要几秒钟，请稍候</small>
          </div>
        )}
        {result.status === 'queued' && (
          <div className="result-loading muted-loading">
            <LoaderCircle size={22} className="spin" />
            <strong>等待运行</strong>
          </div>
        )}
        {result.status === 'error' && (
          <div className="result-error">
            <span className="error-icon"><TriangleAlert size={18} /></span>
            <strong>这次没有跑通</strong>
            <p>{result.error}</p>
            {onRetry && (
              <button className="button secondary small-button" type="button" onClick={() => onRetry(result)}>
                <RotateCcw size={14} />
                重试
              </button>
            )}
          </div>
        )}
      </div>

      <footer className="result-card-footer">
        <span>{result.elapsedMs ? `${(result.elapsedMs / 1000).toFixed(1)}s` : '—'}</span>
        <div className="result-footer-actions">
          <button className="icon-button card-action" type="button" onClick={copyHtml} disabled={!result.html} aria-label="复制 HTML" title="复制 HTML">
            <Copy size={15} />
          </button>
          {onRetry && result.status === 'error' && (
            <button className="icon-button card-action" type="button" onClick={() => onRetry(result)} aria-label="重试">
              <RotateCcw size={15} />
            </button>
          )}
          <button className="icon-button card-action danger-action" type="button" onClick={() => onRemove(result.id)} aria-label="移除结果" title="移除结果">
            <Trash2 size={15} />
          </button>
        </div>
      </footer>
    </article>
  )
}
