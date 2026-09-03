'use client'

import { useMemo, useState } from 'react'
import { getCategoryColor } from '@/lib/home/categoryColors'
import { getCategoryIcon } from '@/lib/home/categoryIcons'
import type { HomeBenefit, HomeCategory } from '@/lib/home/types'

const CATEGORY_ORDER: HomeCategory[] = ['지원금', '의료·검사', '교통', '출산·육아', '생활지원', '민간혜택']

type Tab = 'all' | 'applyable' | HomeCategory

export default function ResultsList({
  benefits,
  initialCategory,
}: {
  benefits: HomeBenefit[]
  initialCategory: HomeCategory | 'all'
}) {
  const [activeTab, setActiveTab] = useState<Tab>(initialCategory)

  const presentCategories = useMemo(
    () => CATEGORY_ORDER.filter((category) => benefits.some((b) => b.category === category)),
    [benefits]
  )

  const filtered = useMemo(() => {
    if (activeTab === 'all') return benefits
    if (activeTab === 'applyable') return benefits.filter((b) => b.hasDirectApplyLink)
    return benefits.filter((b) => b.category === activeTab)
  }, [benefits, activeTab])

  return (
    <div className="results-panel">
      <div className="results-panel-head">
        <h2>
          모든 혜택 <span className="results-panel-count">{benefits.length}개</span>
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
              <li key={benefit.id}>
                <a className="result-row" href={benefit.applyLink ?? '#'} target="_blank" rel="noopener noreferrer">
                  <span className="result-row-icon" style={{ background: color.surface }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={getCategoryIcon(benefit.category)} alt="" />
                  </span>
                  <span className="result-row-name">{benefit.name}</span>
                  <span className="result-row-amount">
                    {benefit.amountManwon != null ? `${benefit.amountManwon}만원` : benefit.region}
                  </span>
                  <span className={`result-row-status${benefit.hasDirectApplyLink ? ' applyable' : ''}`}>
                    {benefit.hasDirectApplyLink ? '신청가능' : '자세히보기'}
                  </span>
                  <span className="result-row-chevron">›</span>
                </a>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
