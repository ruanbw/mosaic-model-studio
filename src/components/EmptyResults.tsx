import { ArrowRight, Boxes, Sparkles, WandSparkles } from 'lucide-react'

interface EmptyResultsProps {
  onLoadDemo: () => void
  onSelectModels: () => void
}

export function EmptyResults({ onLoadDemo, onSelectModels }: EmptyResultsProps) {
  return (
    <div className="empty-results">
      <div className="empty-results-art" aria-hidden="true">
        <div className="empty-art-ring ring-one" />
        <div className="empty-art-ring ring-two" />
        <div className="empty-art-core"><Sparkles size={23} /></div>
        <span className="art-star star-one">✦</span>
        <span className="art-star star-two">·</span>
        <span className="art-star star-three">✦</span>
      </div>
      <p className="eyebrow">READY WHEN YOU ARE</p>
      <h3>让想法同时发生</h3>
      <p className="empty-results-copy">选择模型，写下一个方向，Mosaic 会把同一份提示词交给它们并行创作。</p>
      <div className="empty-results-actions">
        <button className="button primary" type="button" onClick={onSelectModels}><Boxes size={16} />选择模型<ArrowRight size={15} /></button>
        <button className="text-button" type="button" onClick={onLoadDemo}><WandSparkles size={15} />查看示例结果</button>
      </div>
    </div>
  )
}
