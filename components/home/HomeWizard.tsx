'use client'

import { useState } from 'react'
import { filterBenefits } from '@/lib/home/matching'
import type { HomeBenefit, HomeCategory, WizardRegion, WizardStage } from '@/lib/home/types'
import CategoryGrid from './CategoryGrid'
import ResultsList from './ResultsList'
import ResultsJourney from './ResultsJourney'

type WizStep = 'region' | 'status' | 'trimester' | 'child' | 'result'
type StatusVal = '임신 준비' | '임신 중' | '출산 후'

function nextStepAfter(step: WizStep, statusVal: StatusVal | null): WizStep {
  if (step === 'region') return 'status'
  if (step === 'status') {
    if (statusVal === '임신 중') return 'trimester'
    if (statusVal === '출산 후') return 'child'
    return 'result'
  }
  return 'result'
}

function prevStepFor(step: WizStep, statusVal: StatusVal | null): WizStep {
  if (step === 'status') return 'region'
  if (step === 'trimester' || step === 'child') return 'status'
  if (step === 'result') {
    if (statusVal === '임신 중') return 'trimester'
    if (statusVal === '출산 후') return 'child'
    return 'status'
  }
  return 'region'
}

function stepIndexFor(step: WizStep): 0 | 1 | 2 {
  if (step === 'region') return 0
  if (step === 'result') return 2
  return 1
}

export default function HomeWizard({ benefits }: { benefits: HomeBenefit[] }) {
  const [step, setStep] = useState<WizStep>('region')
  const [region, setRegion] = useState<WizardRegion>('서울')
  const [statusVal, setStatusVal] = useState<StatusVal | null>(null)
  const [stage, setStage] = useState<WizardStage>('임신 중기')
  const [showResults, setShowResults] = useState(false)
  const [category, setCategory] = useState<HomeCategory | 'all'>('all')

  const matched = filterBenefits(benefits, { region, stage, category })
  const stageBenefits = filterBenefits(benefits, { region, stage, category: 'all' })

  function handleRegionSelect(val: WizardRegion) {
    setRegion(val)
    setStep(nextStepAfter('region', statusVal))
  }

  function handleStatusSelect(val: StatusVal) {
    setStatusVal(val)
    if (val !== '임신 중') {
      setStage(val === '출산 후' ? '출산 후' : '임신 준비')
    }
    setStep(nextStepAfter('status', val))
  }

  function handleTrimesterSelect(val: '초기' | '중기' | '후기') {
    setStage(`임신 ${val}` as WizardStage)
    setStep('result')
  }

  function handleChildSelect() {
    setStep('result')
  }

  function handleBack() {
    setStep(prevStepFor(step, statusVal))
  }

  function handleCategoryFromGrid(selected: HomeCategory) {
    setCategory(selected)
    setShowResults(true)
  }

  if (showResults) {
    return (
      <section className="results wrap" id="results">
        <div className="rp-header">
          <div className="rp-hero2">
            <button className="rp-hero2-reset" type="button" onClick={() => setShowResults(false)}>
              처음부터 다시 찾기
            </button>
            <span className="rp-hero2-badge">
              <span>
                {region} · {stage} 기준
              </span>
            </span>
            <h1>
              우리 가족의 <span className="hl">혜택 여정</span>
            </h1>
            <p className="rp-hero2-sub">임신부터 육아까지, 지금 받을 수 있는 혜택을 단계별로 확인해보세요</p>
            <ResultsJourney activeStage={stage} benefits={benefits} region={region} />
          </div>
        </div>
        <ResultsList benefits={stageBenefits} stageName={stage} initialCategory={category} />
      </section>
    )
  }

  return (
    <>
      <section className="hero snap-section" id="finder">
        <div className="hero-center">
          <div className="wiz-scene">
            <div className="arch" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="char-arch" src="/images/home/char-arch.png" alt="" />
          </div>

          <div className="wiz-card">
            {step !== 'region' && (
              <button className="wiz-back" type="button" onClick={handleBack}>
                ‹ 이전
              </button>
            )}
            <div className="wiz-step-badge">{step === 'result' ? '🎉' : stepIndexFor(step) + 1}</div>

            {step === 'region' && (
              <div className="wiz-panel" data-step="region">
                <p className="wiz-carousel-line wiz-greet active">
                  안녕하세요! 우리 동네에서 받을 수 있는 혜택을 같이 찾아볼까요? 💗
                </p>
                <h3 className="wiz-carousel-line wiz-question active">어디에 살고 계세요?</h3>
                <div className="wiz-options">
                  <button className="wiz-opt" type="button" onClick={() => handleRegionSelect('서울')}>
                    서울
                  </button>
                  <button className="wiz-opt" type="button" onClick={() => handleRegionSelect('경기')}>
                    경기
                  </button>
                </div>
              </div>
            )}

            {step === 'status' && (
              <div className="wiz-panel" data-step="status">
                <h3 className="wiz-question">지금 어떤 단계인가요?</h3>
                <div className="wiz-options vertical">
                  <button className="wiz-opt" type="button" onClick={() => handleStatusSelect('임신 준비')}>
                    <span className="opt-emoji">🌱</span>임신 준비
                  </button>
                  <button className="wiz-opt" type="button" onClick={() => handleStatusSelect('임신 중')}>
                    <span className="opt-emoji">🤰</span>임신 중
                  </button>
                  <button className="wiz-opt" type="button" onClick={() => handleStatusSelect('출산 후')}>
                    <span className="opt-emoji">👶</span>출산 후
                  </button>
                </div>
              </div>
            )}

            {step === 'trimester' && (
              <div className="wiz-panel" data-step="trimester">
                <h3 className="wiz-question">
                  우리 아기는 지금
                  <br />
                  얼마나 자랐나요?
                </h3>
                <div className="wiz-options vertical">
                  <button className="wiz-opt" type="button" onClick={() => handleTrimesterSelect('초기')}>
                    임신 초기 <span className="opt-sub">(1~12주)</span>
                  </button>
                  <button className="wiz-opt" type="button" onClick={() => handleTrimesterSelect('중기')}>
                    임신 중기 <span className="opt-sub">(13~27주)</span>
                  </button>
                  <button className="wiz-opt" type="button" onClick={() => handleTrimesterSelect('후기')}>
                    임신 후기 <span className="opt-sub">(28주~출산)</span>
                  </button>
                </div>
              </div>
            )}

            {step === 'child' && (
              <div className="wiz-panel" data-step="child">
                <h3 className="wiz-question">아기가 몇 명인가요?</h3>
                <div className="wiz-options">
                  <button className="wiz-opt" type="button" onClick={handleChildSelect}>
                    1명
                  </button>
                  <button className="wiz-opt" type="button" onClick={handleChildSelect}>
                    2명
                  </button>
                  <button className="wiz-opt" type="button" onClick={handleChildSelect}>
                    3명 이상
                  </button>
                </div>
              </div>
            )}

            {step === 'result' && (
              <div className="wiz-panel wiz-result" data-step="result">
                <div className="wiz-celebrate">🎉</div>
                <h3 className="wiz-question" style={{ marginBottom: 8 }}>
                  찾았어요!
                </h3>
                <p className="wiz-meta">
                  {region} · {stage} 기준
                </p>
                <p className="wiz-count">
                  <strong>{matched.length}</strong>개의 혜택이 있어요
                </p>
                <button className="btn primary" type="button" onClick={() => setShowResults(true)}>
                  내 혜택 확인하기 →
                </button>
              </div>
            )}

            <p className="wiz-trust">회원가입 없이 바로 확인 가능</p>
          </div>
        </div>
      </section>

      <CategoryGrid onSelectCategory={handleCategoryFromGrid} />
    </>
  )
}
