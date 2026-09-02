import { countBenefitsForJourneyIndex, JOURNEY_STAGE_INDEX } from '@/lib/home/matching'
import type { HomeBenefit, WizardRegion, WizardStage } from '@/lib/home/types'

interface JourneyStageDef {
  index: 1 | 2 | 3 | 4 | 5
  title: string
  items: [string, string]
  colorVar: string
  surfaceVar: string
}

const STAGES: JourneyStageDef[] = [
  { index: 1, title: '임신 초기', items: ['산전 검진비', '엽산·영양 지원'], colorVar: '--mint-strong', surfaceVar: '--surface-mint' },
  { index: 2, title: '임신 중기', items: ['임산부 교통비', '산모 교육'], colorVar: '--blush-strong', surfaceVar: '--surface-blush' },
  { index: 3, title: '출산 준비', items: ['출산 준비 바우처', '출산용품 지원'], colorVar: '--lavender-strong', surfaceVar: '--surface-lavender' },
  { index: 4, title: '출산 후', items: ['산모·신생아 건강관리', '산후 회복 지원'], colorVar: '--amber-strong', surfaceVar: '--surface-amber' },
  { index: 5, title: '육아 시작', items: ['육아용품 지원', '부모교육·상담'], colorVar: '--mint-strong', surfaceVar: '--surface-mint' },
]

export default function ResultsJourney({
  activeStage,
  benefits,
  region,
}: {
  activeStage: WizardStage
  benefits: HomeBenefit[]
  region: WizardRegion
}) {
  const activeIndex = JOURNEY_STAGE_INDEX[activeStage] ?? 2

  return (
    <div className="journey-track">
      <svg className="journey-path" viewBox="0 0 1200 60" preserveAspectRatio="none" fill="none">
        <path
          d="M10,30 C130,8 220,52 350,30 C480,8 560,52 650,30 C760,10 830,50 900,30 C980,10 1050,50 1190,30"
          stroke="var(--border)"
          strokeWidth="3"
          strokeDasharray="2 11"
          strokeLinecap="round"
        />
      </svg>
      {STAGES.map((stage) => {
        const isActive = stage.index === activeIndex
        // 5번 카드("육아 시작")는 대응하는 WizardStage가 없어 실제 개수를 셀 수 없다 — 위저드로도
        // 도달 불가능한 장식용 카드라서 원래 목업 문구를 그대로 둔다.
        const count = stage.index === 5 ? null : countBenefitsForJourneyIndex(benefits, region, stage.index)
        const moreCount = count !== null ? count - stage.items.length : 0
        return (
          <div
            key={stage.index}
            className={`journey-stage${isActive ? ' active' : ''}`}
            style={{ ['--stage-c' as string]: `var(${stage.colorVar})`, ['--stage-s' as string]: `var(${stage.surfaceVar})` }}
          >
            <span className="stage-badge" style={{ background: `var(${stage.colorVar})` }}>
              {stage.index}
            </span>
            <div className="stage-card">
              <h4>{stage.title}</h4>
              {count !== null && <p className="stage-count">받을 수 있는 혜택 {count}개</p>}
              <ul>
                <li>
                  <span className="ck">✓</span>
                  {stage.items[0]}
                </li>
                <li>
                  <span className="ck">✓</span>
                  {stage.items[1]}
                </li>
              </ul>
              {moreCount > 0 && <span className="stage-more">+ {moreCount}개 더보기</span>}
            </div>
            <span className={`step-dot${isActive ? ' active' : ''}`} />
          </div>
        )
      })}
    </div>
  )
}
