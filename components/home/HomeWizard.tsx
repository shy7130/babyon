'use client'

import { useState } from 'react'
import { filterBenefits, getFeaturedBenefits } from '@/lib/home/matching'
import type { HomeBenefit, HomeCategory, WizardRegion, WizardSituation, WizardStage } from '@/lib/home/types'
import FeaturedPicks from './FeaturedPicks'
import ResultsList from './ResultsList'
import SiteHeader from './SiteHeader'
import StatBar from './StatBar'

type WizStep = 'region' | 'age' | 'status' | 'trimester' | 'child' | 'situation' | 'result'
type StatusVal = '임신 준비' | '임신 중' | '출산 후'
type ChildCount = '1명' | '2명' | '3명 이상'
type AgeGroup = '34세 이하' | '35세 이상'

const SITUATIONS: WizardSituation[] = ['다자녀', '장애인가정', '저소득·의료급여', '자영업자·프리랜서', '미혼모·부', '고위험임신']

function nextStepAfter(step: WizStep, statusVal: StatusVal | null): WizStep {
  if (step === 'region') return 'age'
  if (step === 'age') return 'status'
  if (step === 'status') {
    if (statusVal === '임신 중') return 'trimester'
    if (statusVal === '출산 후') return 'child'
    return 'situation'
  }
  return 'situation'
}

function prevStepFor(step: WizStep, statusVal: StatusVal | null): WizStep {
  if (step === 'age') return 'region'
  if (step === 'status') return 'age'
  if (step === 'trimester' || step === 'child') return 'status'
  if (step === 'situation' || step === 'result') {
    if (step === 'result') return 'situation'
    if (statusVal === '임신 중') return 'trimester'
    if (statusVal === '출산 후') return 'child'
    return 'status'
  }
  return 'region'
}

// 나이 선택과 상황 선택도 각각 "지역 선택"/"상태 선택" 단계의 연장으로 취급해 스테퍼(지역선택/
// 상태선택/혜택확인) 3단계는 그대로 둔다 — 화면은 늘었지만 사용자 입장에서는 같은 과정이다.
function stepIndexFor(step: WizStep): 0 | 1 | 2 {
  if (step === 'region' || step === 'age') return 0
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
  const [statusVal, setStatusVal] = useState<StatusVal | null>(null)
  const [stage, setStage] = useState<WizardStage>('임신 중기')
  const [showResults, setShowResults] = useState(false)
  const [category, setCategory] = useState<HomeCategory | 'all'>('all')
  const [situations, setSituations] = useState<WizardSituation[]>([])
  const [toast, setToast] = useState<string | null>(null)

  const matched = filterBenefits(benefits, { region, stage, category })
  const stageBenefits = filterBenefits(benefits, { region, stage, category: 'all' })

  function handleRegionSelect(val: WizardRegion) {
    setRegion(val)
    setStep(nextStepAfter('region', statusVal))
  }

  // 35세 이상이면 "고위험임신" 상황을 자동으로 켜둔다(고령임신은 대표적인 고위험 요인) — 자녀
  // 수와 같은 방식으로, 뒤이은 상황 선택 화면에서 이미 체크된 채로 보이고 바로 해제할 수 있다.
  function handleAgeSelect(val: AgeGroup) {
    if (val === '35세 이상') {
      setSituations((prev) => (prev.includes('고위험임신') ? prev : [...prev, '고위험임신']))
    }
    setStep(nextStepAfter('age', statusVal))
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
    setStep('situation')
  }

  // 둘째 이상이면 "다자녀" 상황을 자동으로 켜둔다 — 뒤이은 상황 선택 화면에서 이미 체크된
  // 채로 보이고, 원치 않으면 그 화면에서 바로 해제할 수 있다.
  function handleChildSelect(count: ChildCount) {
    if (count !== '1명') {
      setSituations((prev) => (prev.includes('다자녀') ? prev : [...prev, '다자녀']))
    }
    setStep('situation')
  }

  function toggleSituation(situation: WizardSituation) {
    setSituations((prev) =>
      prev.includes(situation) ? prev.filter((s) => s !== situation) : [...prev, situation]
    )
  }

  function handleBack() {
    setStep(prevStepFor(step, statusVal))
  }

  function handleReset() {
    setShowResults(false)
    setStep('region')
    setStatusVal(null)
    setCategory('all')
    setSituations([])
  }

  const regionLabel = region

  if (showResults) {
    const featured = getFeaturedBenefits(stageBenefits, situations)
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
          {step === 'situation' ? (
            <div className="wiz-scene wiz-scene-compact">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="char-arch char-arch-compact" src="/images/home/char-arch.png" alt="" />
            </div>
          ) : (
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
          )}

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

            {step === 'age' && (
              <div className="wiz-panel" data-step="age">
                <h3 className="wiz-question">당신의 나이를 선택해주세요</h3>
                <div className="wiz-options">
                  <button className="wiz-opt" type="button" onClick={() => handleAgeSelect('34세 이하')}>
                    34세 이하
                  </button>
                  <button className="wiz-opt" type="button" onClick={() => handleAgeSelect('35세 이상')}>
                    35세 이상
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
                  <button className="wiz-opt" type="button" onClick={() => handleChildSelect('1명')}>
                    1명
                  </button>
                  <button className="wiz-opt" type="button" onClick={() => handleChildSelect('2명')}>
                    2명
                  </button>
                  <button className="wiz-opt" type="button" onClick={() => handleChildSelect('3명 이상')}>
                    3명 이상
                  </button>
                </div>
              </div>
            )}

            {step === 'situation' && (
              <div className="wiz-panel" data-step="situation">
                <h3 className="wiz-question" style={{ marginBottom: 4 }}>
                  해당되는 상황이 있으신가요?
                </h3>
                <p className="wiz-meta" style={{ marginBottom: 4 }}>
                  없으면 그냥 건너뛰어도 괜찮아요
                </p>
                <div className="wiz-options vertical">
                  {SITUATIONS.map((situation) => (
                    <button
                      key={situation}
                      className={`wiz-opt situation-opt${situations.includes(situation) ? ' selected' : ''}`}
                      type="button"
                      onClick={() => toggleSituation(situation)}
                    >
                      {situation}
                    </button>
                  ))}
                </div>
                <button
                  className="btn primary fc-submit"
                  type="button"
                  style={{ marginTop: 16 }}
                  onClick={() => setStep('result')}
                >
                  {situations.length > 0 ? '다음 →' : '건너뛰기 →'}
                </button>
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
        </div>
      </section>

      <div className={`toast${toast ? ' show' : ''}`}>{toast}</div>
    </>
  )
}
