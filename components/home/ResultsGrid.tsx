import { getCategoryColor } from '@/lib/home/categoryColors'
import type { HomeBenefit } from '@/lib/home/types'

export default function ResultsGrid({ benefits }: { benefits: HomeBenefit[] }) {
  if (benefits.length === 0) {
    return (
      <div className="empty">
        선택하신 조건에 맞는 혜택이 아직 없어요.
        <br />
        다른 지역이나 시기를 선택해보세요.
      </div>
    )
  }

  return (
    <div className="grid">
      {benefits.map((benefit) => {
        const color = getCategoryColor(benefit.category)
        return (
          <a
            key={benefit.id}
            className="card"
            href={benefit.applyLink ?? '#'}
            target={benefit.applyLink ? '_blank' : undefined}
            rel={benefit.applyLink ? 'noopener noreferrer' : undefined}
          >
            <div className="card-top">
              <span className="badge" style={{ background: color.surface, color: color.strong }}>
                {benefit.category}
              </span>
              <span className="tag-region">{benefit.region}</span>
            </div>
            <h3>{benefit.name}</h3>
            {benefit.summary && <p className="summary">{benefit.summary}</p>}
            {benefit.sourceLabel && <span className="card-src">출처: {benefit.sourceLabel}</span>}
            <div className="card-foot">
              <span>{benefit.wizardStages[0] ?? ''}</span>
              <span className="more">자세히 보기 →</span>
            </div>
          </a>
        )
      })}
    </div>
  )
}
