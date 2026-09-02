import type { HomeBenefit } from '@/lib/home/types'

export default function PopularBenefits({ benefits }: { benefits: HomeBenefit[] }) {
  if (benefits.length === 0) return null

  return (
    <section className="panel wrap snap-section" id="popular">
      <div className="panel-head-row">
        <div className="panel-head">
          <h2>
            인기 혜택 TOP {benefits.length} <span className="top-badge">지금 많이 찾는 혜택이에요</span>
          </h2>
        </div>
        <a className="panel-link" href="#finder">
          더보기 →
        </a>
      </div>
      <div className="pop-grid">
        {benefits.map((benefit) => (
          <a key={benefit.id} className="pop-card" href={benefit.applyLink ?? '#'}>
            <span className={`region-tag ${benefit.region === '전국' ? 'mint' : 'lavender'}`}>{benefit.region}</span>
            <h3>{benefit.name}</h3>
            {benefit.summary && <p className="pop-desc">{benefit.summary}</p>}
            <span className="more2">{benefit.hasDirectApplyLink ? '신청하기' : '자세히 보기'} →</span>
          </a>
        ))}
      </div>
    </section>
  )
}
