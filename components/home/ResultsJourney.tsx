import { JOURNEY_STAGE_INDEX } from '@/lib/home/matching'
import type { WizardStage } from '@/lib/home/types'

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
  matchCount,
}: {
  activeStage: WizardStage
  matchCount: number
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
              <button className="stage-pill" type="button" hidden={!isActive}>
                <span className="pill-count">신청 가능 {matchCount}건</span>
              </button>
            </div>
            <span className={`step-dot${isActive ? ' active' : ''}`} />
            {isActive && (
              <div className="journey-mascot">
                <div className="journey-bubble">
                  지금 받을 수 있는
                  <br />
                  혜택을 확인해요!
                </div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className="journey-mascot-img" src="/images/home/journey-mascot.png" alt="" />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
