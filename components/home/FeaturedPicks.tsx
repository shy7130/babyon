import { getCategoryIcon } from '@/lib/home/categoryIcons'
import type { HomeBenefit } from '@/lib/home/types'

const ACCENTS = ['blush', 'lavender', 'amber'] as const

export default function FeaturedPicks({ benefits }: { benefits: HomeBenefit[] }) {
  if (benefits.length === 0) return null

  return (
    <div className="featured-picks">
      <h2 className="featured-picks-head">
        <span className="featured-picks-sparkle">✨</span> 지금 챙기면 좋은 혜택
      </h2>
      <div className="featured-grid">
        {benefits.map((benefit, i) => {
          const accent = ACCENTS[i % ACCENTS.length]
          return (
            <a key={benefit.id} className={`featured-card ${accent}`} href={benefit.applyLink ?? '#'}>
              <span className="featured-card-icon">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={getCategoryIcon(benefit.category)} alt="" />
              </span>
              <span className="featured-badge">신청가능</span>
              <p className="featured-amount">
                {benefit.amountManwon}
                <span>만원</span>
              </p>
              <h3>{benefit.name}</h3>
              {benefit.summary && <p className="featured-desc">{benefit.summary}</p>}
              <span className="featured-cta">지금 신청하기 →</span>
            </a>
          )
        })}
      </div>
    </div>
  )
}
