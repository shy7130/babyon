import type { HomeBenefit } from '@/lib/home/types'

export default function StatBar({ benefits }: { benefits: HomeBenefit[] }) {
  const count = benefits.length
  const totalAmount = benefits.reduce((sum, b) => sum + (b.amountManwon ?? 0), 0)
  const applyableCount = benefits.filter((b) => b.hasDirectApplyLink).length

  return (
    <div className="stat-bar">
      <div className="stat-item">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="stat-icon" src="/images/home/benefit-ticket.png" alt="" />
        <div>
          <p className="stat-label">받을 수 있는 혜택</p>
          <p className="stat-value mint">
            {count}
            <span className="stat-unit">개</span>
          </p>
        </div>
      </div>
      <div className="stat-divider" />
      <div className="stat-item">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="stat-icon" src="/images/home/icon-money.png" alt="" />
        <div>
          <p className="stat-label">예상 지원금액</p>
          <p className="stat-value">
            {totalAmount > 0 ? (
              <>
                {totalAmount}
                <span className="stat-unit">만원+</span>
              </>
            ) : (
              <span className="stat-unit">집계 중</span>
            )}
          </p>
        </div>
      </div>
      <div className="stat-divider" />
      <div className="stat-item">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="stat-icon" src="/images/home/icon-health.png" alt="" />
        <div>
          <p className="stat-label">바로 신청 가능</p>
          <p className="stat-value blush">
            {applyableCount}
            <span className="stat-unit">개</span>
          </p>
        </div>
      </div>
    </div>
  )
}
