'use client'

import { useMemo, useState } from 'react'
import { getCategoryColor } from '@/lib/home/categoryColors'
import type { HomeBenefit, HomeCategory } from '@/lib/home/types'

const CATEGORY_ORDER: HomeCategory[] = ['지원금', '의료·검사', '교통', '출산·육아', '생활지원', '민간혜택']

type Tab = 'all' | 'applyable' | HomeCategory

export default function ResultsList({
  benefits,
  stageName,
  initialCategory,
}: {
  benefits: HomeBenefit[]
  stageName: string
  initialCategory: HomeCategory | 'all'
}) {
  const [activeTab, setActiveTab] = useState<Tab>(initialCategory)

  const presentCategories = useMemo(
    () => CATEGORY_ORDER.filter((category) => benefits.some((b) => b.category === category)),
    [benefits]
  )

  const applyableCount = useMemo(() => benefits.filter((b) => b.hasDirectApplyLink).length, [benefits])

  const filtered = useMemo(() => {
    if (activeTab === 'all') return benefits
    if (activeTab === 'applyable') return benefits.filter((b) => b.hasDirectApplyLink)
    return benefits.filter((b) => b.category === activeTab)
  }, [benefits, activeTab])

  return (
    <div className="results-layout">
      <div className="results-panel">
        <div className="results-panel-head">
          <h2>
            {stageName} 혜택 <span className="results-panel-count">총 {benefits.length}건</span>
          </h2>
        </div>
        <div className="results-tabs">
          <button
            type="button"
            className={`results-tab${activeTab === 'all' ? ' active' : ''}`}
            onClick={() => setActiveTab('all')}
          >
            전체
          </button>
          <button
            type="button"
            className={`results-tab${activeTab === 'applyable' ? ' active' : ''}`}
            onClick={() => setActiveTab('applyable')}
          >
            신청 가능
          </button>
          {presentCategories.map((category) => (
            <button
              key={category}
              type="button"
              className={`results-tab${activeTab === category ? ' active' : ''}`}
              onClick={() => setActiveTab(category)}
            >
              {category}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="empty">
            선택하신 조건에 맞는 혜택이 아직 없어요.
            <br />
            다른 지역이나 시기를 선택해보세요.
          </div>
        ) : (
          <ul className="result-rows">
            {filtered.map((benefit) => {
              const color = getCategoryColor(benefit.category)
              return (
                <li key={benefit.id} className="result-row">
                  <span className="result-row-icon" style={{ background: color.surface }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/images/home/benefit-ticket.png" alt="" />
                  </span>
                  <span className="result-row-name">{benefit.name}</span>
                  <span className="result-row-region">{benefit.region}</span>
                  <span className="badge result-row-badge" style={{ background: color.surface, color: color.strong }}>
                    {benefit.category}
                  </span>
                  <a
                    className={`result-row-action${benefit.hasDirectApplyLink ? ' primary' : ''}`}
                    href={benefit.applyLink ?? '#'}
                    target={benefit.applyLink ? '_blank' : undefined}
                    rel={benefit.applyLink ? 'noopener noreferrer' : undefined}
                  >
                    {benefit.hasDirectApplyLink ? '신청하기' : '자세히 보기'} →
                  </a>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <div className="results-mascot">
        <div className="results-mascot-bubble">
          {applyableCount > 0 ? (
            <>
              {benefits.length}개 중 지금 신청 가능한
              <br />
              혜택이 <strong>{applyableCount}개</strong> 있어요!
            </>
          ) : (
            <>
              {benefits.length}개의 혜택을
              <br />
              지금 확인해보세요!
            </>
          )}
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="results-mascot-img" src="/images/home/journey-mascot.png" alt="" />
      </div>
    </div>
  )
}
