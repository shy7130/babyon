'use client'

import { useState } from 'react'
import { filterBenefits, getFeaturedBenefits } from '@/lib/home/matching'
import type { HomeBenefit, HomeCategory, WizardRegion, WizardStage } from '@/lib/home/types'
import CategoryGrid from './CategoryGrid'
import FeaturedPicks from './FeaturedPicks'
import LoungeScene from './LoungeScene'
import PopularBenefits from './PopularBenefits'
import ResultsList from './ResultsList'
import SiteHeader from './SiteHeader'
import StatBar from './StatBar'
import TravelPreview from './TravelPreview'
import TrustStrip from './TrustStrip'

type WizStep = 'region' | 'district' | 'status' | 'trimester' | 'child' | 'result'
type StatusVal = '임신 준비' | '임신 중' | '출산 후'

const SEOUL_DISTRICTS = [
  '종로구', '중구', '용산구', '성동구', '광진구',
  '동대문구', '중랑구', '성북구', '강북구', '도봉구',
  '노원구', '은평구', '서대문구', '마포구', '양천구',
  '강서구', '구로구', '금천구', '영등포구', '동작구',
  '관악구', '서초구', '강남구', '송파구', '강동구',
] as const

function nextStepAfter(step: WizStep, statusVal: StatusVal | null): WizStep {
  if (step === 'region') return 'district'
  if (step === 'district') return 'status'
  if (step === 'status') {
    if (statusVal === '임신 중') return 'trimester'
    if (statusVal === '출산 후') return 'child'
    return 'result'
  }
  return 'result'
}

function prevStepFor(step: WizStep, statusVal: StatusVal | null): WizStep {
  if (step === 'district') return 'region'
  if (step === 'status') return 'district'
  if (step === 'trimester' || step === 'child') return 'status'
  if (step === 'result') {
    if (statusVal === '임신 중') return 'trimester'
    if (statusVal === '출산 후') return 'child'
    return 'status'
  }
  return 'region'
}

// 구 선택도 "지역 선택" 단계의 연장으로 취급해 스테퍼(지역선택/상태선택/혜택확인) 3단계는
// 그대로 둔다 — 화면은 하나 늘었지만 사용자 입장에서는 같은 "지역을 정하는" 과정이다.
function stepIndexFor(step: WizStep): 0 | 1 | 2 {
  if (step === 'region' || step === 'district') return 0
  if (step === 'result') return 2
  return 1
}

function wsState(idx: 0 | 1 | 2, step: WizStep): string {
  const active = stepIndexFor(step)
  if (idx === active) return ' active'
  if (idx < active) return ' done'
  return ''
}

export default function HomeWizard({ benefits }: { benefits: HomeBenefit[] }) {
  const [step, setStep] = useState<WizStep>('region')
  const [region, setRegion] = useState<WizardRegion>('서울')
  const [district, setDistrict] = useState<string | null>(null)
  const [statusVal, setStatusVal] = useState<StatusVal | null>(null)
  const [stage, setStage] = useState<WizardStage>('임신 중기')
  const [showResults, setShowResults] = useState(false)
  const [category, setCategory] = useState<HomeCategory | 'all'>('all')
  const [toast, setToast] = useState<string | null>(null)

  const matched = filterBenefits(benefits, { region, district, stage, category })
  const stageBenefits = filterBenefits(benefits, { region, district, stage, category: 'all' })

  function handleRegionSelect(val: WizardRegion) {
    setRegion(val)
    setStep(nextStepAfter('region', statusVal))
  }

  function handleDistrictSelect(val: string | null) {
    setDistrict(val)
    setStep(nextStepAfter('district', statusVal))
  }

  function showToast(message: string) {
    setToast(message)
    setTimeout(() => setToast(null), 2500)
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

  function handleReset() {
    setShowResults(false)
    setStep('region')
    setDistrict(null)
    setStatusVal(null)
    setCategory('all')
  }

  const regionLabel = district ? `${region} ${district}` : region

  if (showResults) {
    const featured = getFeaturedBenefits(stageBenefits)
    return (
      <>
        <SiteHeader onHomeClick={handleReset} />
        <section className="results wrap" id="results">
          <div className="rp-header">
            <div className="rp-hero2">
              <button className="rp-hero2-reset" type="button" onClick={handleReset}>
                처음부터 다시 찾기
              </button>
              <span className="rp-hero2-badge">
                <span>
                  {regionLabel} · {stage}
                </span>
              </span>
              <h1>
                우리 가족의 <span className="hl">혜택 여정</span>
              </h1>
              <p className="rp-hero2-sub">지금 받을 수 있는 혜택을 한눈에 확인하세요</p>
              <StatBar benefits={stageBenefits} />
            </div>
          </div>
          <FeaturedPicks benefits={featured} />
          <ResultsList benefits={stageBenefits} initialCategory={category} />
        </section>
      </>
    )
  }

  return (
    <>
      <SiteHeader onHomeClick={handleReset} />
      <section className="hero snap-section" id="finder">
        <div className="hero-bg" aria-hidden="true">
          <svg className="hero-hills" viewBox="0 0 1440 220" preserveAspectRatio="none">
            <path
              className="back"
              d="M0,140 C220,80 440,160 700,110 C960,60 1200,140 1440,110 L1440,220 L0,220 Z"
            />
            <path
              className="front"
              d="M0,180 C260,130 520,190 780,150 C1040,110 1300,180 1440,160 L1440,220 L0,220 Z"
            />
          </svg>

          <svg className="hero-deco" style={{ top: '16%', left: '73%' }} width="22" height="22" viewBox="0 0 18 18" fill="none">
            <path d="M9,0 l2.2,6.8 L18,9 l-6.8,2.2 L9,18 l-2.2,-6.8 L0,9 l6.8,-2.2 Z" fill="var(--lavender)" />
          </svg>
          <svg className="hero-deco" style={{ top: '26%', left: '25%' }} width="20" height="18" viewBox="0 0 18 16" fill="none">
            <path
              d="M9 15S1 10 1 5.2C1 2.3 3.2 1 5.2 1 7 1 8.4 2 9 3.4 9.6 2 11 1 12.8 1c2 0 4.2 1.3 4.2 4.2C17 10 9 15 9 15Z"
              fill="var(--blush)"
            />
          </svg>
          <svg className="hero-deco" style={{ top: '22%', left: '70%' }} width="15" height="14" viewBox="0 0 18 16" fill="none">
            <path
              d="M9 15S1 10 1 5.2C1 2.3 3.2 1 5.2 1 7 1 8.4 2 9 3.4 9.6 2 11 1 12.8 1c2 0 4.2 1.3 4.2 4.2C17 10 9 15 9 15Z"
              fill="var(--blush)"
            />
          </svg>
          <svg className="hero-deco" style={{ top: '44%', left: '86%' }} width="17" height="16" viewBox="0 0 18 16" fill="none">
            <path
              d="M9 15S1 10 1 5.2C1 2.3 3.2 1 5.2 1 7 1 8.4 2 9 3.4 9.6 2 11 1 12.8 1c2 0 4.2 1.3 4.2 4.2C17 10 9 15 9 15Z"
              fill="var(--blush)"
              opacity="0.85"
            />
          </svg>

          <svg className="hero-deco" style={{ bottom: '18%', left: '11%' }} width="30" height="38" viewBox="0 0 30 38" fill="none">
            <path d="M15,38 L15,18" stroke="var(--mint-strong)" strokeWidth="2.2" strokeLinecap="round" />
            <path d="M15,20 C6,20 3,10 3,10 C3,10 12,7 15,18 Z" fill="var(--mint)" />
            <path d="M15,20 C24,20 27,10 27,10 C27,10 18,7 15,18 Z" fill="var(--mint-strong)" />
          </svg>

          <svg className="hero-deco" style={{ bottom: '8%', left: '5%' }} width="76" height="52" viewBox="0 0 76 52" fill="none">
            <path d="M18,49 L18,32M50,44 L50,26" stroke="var(--mint-strong)" strokeWidth="2.2" strokeLinecap="round" />
            <g transform="translate(18,18)">
              <path
                d="M0,-13 C7,-13 12,-8 12,-1 C12,7 0,15 0,15 C0,15 -12,7 -12,-1 C-12,-8 -7,-13 0,-13 Z"
                fill="var(--blush-soft)"
                stroke="var(--blush)"
                strokeWidth="1.2"
              />
              <circle cx="0" cy="-1" r="4" fill="var(--amber)" />
            </g>
            <g transform="translate(50,12) scale(0.82)">
              <path
                d="M0,-13 C7,-13 12,-8 12,-1 C12,7 0,15 0,15 C0,15 -12,7 -12,-1 C-12,-8 -7,-13 0,-13 Z"
                fill="var(--lavender-soft)"
                stroke="var(--lavender)"
                strokeWidth="1.2"
              />
              <circle cx="0" cy="-1" r="4" fill="var(--amber)" />
            </g>
          </svg>

          <svg className="hero-deco" style={{ bottom: '6%', right: '9%' }} width="90" height="80" viewBox="0 0 90 80" fill="none">
            <path
              d="M45,4 L86,34 L78,34 L78,74 L12,74 L12,34 L4,34 Z"
              stroke="var(--mint-strong)"
              strokeWidth="2.5"
              strokeLinejoin="round"
              fill="none"
            />
            <g transform="translate(37,26) scale(0.62)">
              <path
                d="M9 15S1 10 1 5.2C1 2.3 3.2 1 5.2 1 7 1 8.4 2 9 3.4 9.6 2 11 1 12.8 1c2 0 4.2 1.3 4.2 4.2C17 10 9 15 9 15Z"
                fill="var(--blush)"
              />
            </g>
            <path
              d="M4,74 h82 M14,74 v-10 M26,74 v-10 M38,74 v-10 M52,74 v-10 M64,74 v-10 M76,74 v-10"
              stroke="var(--mint)"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
        </div>

        <div className="hero-center">
          <div className="wiz-scene">
            <div className="arch" />
            <div className="arch-cloud left" />
            <div className="arch-cloud right" />
            <svg className="arch-spark a" width="30" height="30" viewBox="0 0 18 18" fill="none">
              <path d="M9,0 l2.2,6.8 L18,9 l-6.8,2.2 L9,18 l-2.2,-6.8 L0,9 l6.8,-2.2 Z" fill="var(--lavender)" />
            </svg>
            <svg className="arch-spark b" width="22" height="22" viewBox="0 0 13 13" fill="none">
              <path d="M6.5,0 l1.6,4.9 L13,6.5 l-4.9,1.6 L6.5,13 l-1.6,-4.9 L0,6.5 l4.9,-1.6 Z" fill="var(--mint-strong)" />
            </svg>
            <svg className="arch-heart" width="30" height="27" viewBox="0 0 18 16" fill="none">
              <path
                d="M9 15S1 10 1 5.2C1 2.3 3.2 1 5.2 1 7 1 8.4 2 9 3.4 9.6 2 11 1 12.8 1c2 0 4.2 1.3 4.2 4.2C17 10 9 15 9 15Z"
                fill="currentColor"
              />
            </svg>
            <svg className="wiz-arrow" width="34" height="30" viewBox="0 0 34 30" fill="none">
              <path
                d="M2 4C14 6 26 14 30 24"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeDasharray="1 5"
              />
              <path d="M24 22l6 3-1-7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="wiz-timer">⏱ 약 30초면 확인할 수 있어요</span>
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
                <div className="wiz-carousel">
                  <p className="wiz-carousel-line wiz-greet active">
                    안녕하세요! 우리 동네에서 받을 수 있는 혜택을 같이 찾아볼까요? 💗
                  </p>
                  <h3 className="wiz-carousel-line wiz-question active">어디에 살고 계세요?</h3>
                </div>
                <div className="wiz-options">
                  <button className="wiz-opt" type="button" onClick={() => handleRegionSelect('서울')}>
                    <span className="opt-icon pin">
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path
                          d="M7 13S12 8.4 12 5.3A5 5 0 002 5.3C2 8.4 7 13 7 13Z"
                          stroke="currentColor"
                          strokeWidth="1.4"
                          strokeLinejoin="round"
                        />
                        <circle cx="7" cy="5.2" r="1.6" fill="currentColor" />
                      </svg>
                    </span>
                    서울
                  </button>
                  <button
                    className="wiz-opt"
                    type="button"
                    onClick={() => showToast('경기 지역은 아직 준비 중이에요! 조금만 기다려주세요 💛')}
                  >
                    <span className="opt-icon pin">
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path
                          d="M7 13S12 8.4 12 5.3A5 5 0 002 5.3C2 8.4 7 13 7 13Z"
                          stroke="currentColor"
                          strokeWidth="1.4"
                          strokeLinejoin="round"
                        />
                        <circle cx="7" cy="5.2" r="1.6" fill="currentColor" />
                      </svg>
                    </span>
                    경기
                  </button>
                </div>
              </div>
            )}

            {step === 'district' && (
              <div className="wiz-panel" data-step="district">
                <h3 className="wiz-question">어느 구에 살고 계세요?</h3>
                <div className="wiz-options district-options">
                  <button className="wiz-opt" type="button" onClick={() => handleDistrictSelect(null)}>
                    서울 전체
                  </button>
                  {SEOUL_DISTRICTS.map((gu) => (
                    <button key={gu} className="wiz-opt" type="button" onClick={() => handleDistrictSelect(gu)}>
                      {gu}
                    </button>
                  ))}
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
                  {regionLabel} · {stage} 기준
                </p>
                <p className="wiz-count">
                  <strong>{matched.length}</strong>개의 혜택이 있어요
                </p>
                <button className="btn primary fc-submit" type="button" onClick={() => setShowResults(true)}>
                  내 혜택 확인하기 →
                </button>
              </div>
            )}

            <div className="wiz-stepper">
              <div className={`ws-item${wsState(0, step)}`}>
                <span className="ws-dot" />
                <span className="ws-label">지역 선택</span>
              </div>
              <div className={`ws-line${stepIndexFor(step) > 0 ? ' done' : ''}`} />
              <div className={`ws-item${wsState(1, step)}`}>
                <span className="ws-dot" />
                <span className="ws-label">상태 선택</span>
              </div>
              <div className={`ws-line${stepIndexFor(step) > 1 ? ' done' : ''}`} />
              <div className={`ws-item${wsState(2, step)}`}>
                <span className="ws-dot" />
                <span className="ws-label">혜택 확인</span>
              </div>
            </div>

            <p className="wiz-trust">
              <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
                <path
                  d="M4 10.5l4 4 8-9"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              회원가입 없이 바로 확인 가능
            </p>
          </div>

          <a className="scroll-more" href="#categories">
            <span>혜택 둘러보기</span>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M3 6l5 5 5-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </a>
        </div>
      </section>

      <LoungeScene />
      <TravelPreview />
      <CategoryGrid onSelectCategory={handleCategoryFromGrid} />
      <PopularBenefits />
      <TrustStrip />

      <div className={`toast${toast ? ' show' : ''}`}>{toast}</div>
    </>
  )
}
