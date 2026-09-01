'use client'

import type { HomeCategory } from '@/lib/home/types'

const CATEGORIES: { category: HomeCategory; icon: JSX.Element; desc: string }[] = [
  {
    category: '지원금',
    desc: '출산지원금, 산후조리비 등 현금성 지원',
    icon: (
      <span className="cat-icon" style={{ background: 'var(--surface-amber)' }}>
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
          <circle cx="11" cy="11" r="8" stroke="var(--amber-strong)" strokeWidth="1.8" />
          <path
            d="M11 7v8M8.5 9c0-1.2 1-2 2.5-2s2.5.7 2.5 1.8-1 1.6-2.5 1.9-2.5.8-2.5 1.9S9.7 15 11 15s2.5-.6 2.5-1.8"
            stroke="var(--amber-strong)"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </span>
    ),
  },
  {
    category: '의료·검사',
    desc: '검진, 진료비, 예방접종 등 의료비 지원',
    icon: (
      <span className="cat-icon" style={{ background: 'var(--surface-sky)' }}>
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
          <path d="M6 3v6a4 4 0 008 0V3" stroke="var(--sky-strong)" strokeWidth="1.6" strokeLinecap="round" />
          <circle cx="16.5" cy="12.5" r="2" stroke="var(--sky-strong)" strokeWidth="1.6" />
          <path d="M10 9v3a4 4 0 004 4" stroke="var(--sky-strong)" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </span>
    ),
  },
  {
    category: '교통',
    desc: '교통비, KTX 할인, 주차 지원 등',
    icon: (
      <span className="cat-icon" style={{ background: 'var(--surface-mint)' }}>
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
          <rect x="3.5" y="5" width="15" height="10" rx="2.5" stroke="var(--mint-strong)" strokeWidth="1.6" />
          <circle cx="7" cy="17" r="1.4" fill="var(--mint-strong)" />
          <circle cx="15" cy="17" r="1.4" fill="var(--mint-strong)" />
          <path d="M3.5 10h15" stroke="var(--mint-strong)" strokeWidth="1.6" />
        </svg>
      </span>
    ),
  },
  {
    category: '출산·육아',
    desc: '출산용품, 육아용품 지원 혜택',
    icon: (
      <span className="cat-icon" style={{ background: 'var(--surface-blush)' }}>
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
          <path d="M8 3h4v3H8z" stroke="var(--blush-strong)" strokeWidth="1.5" strokeLinejoin="round" />
          <path
            d="M7.5 6h5c1 0 1.5.6 1.5 1.6v9c0 1.1-.7 1.9-1.8 1.9H7.8C6.7 18.5 6 17.7 6 16.6v-9C6 6.6 6.5 6 7.5 6z"
            stroke="var(--blush-strong)"
            strokeWidth="1.5"
          />
          <path d="M6 10h8" stroke="var(--blush-strong)" strokeWidth="1.5" />
        </svg>
      </span>
    ),
  },
  {
    category: '생활지원',
    desc: '공공서비스 이용, 생활비·돌봄 지원',
    icon: (
      <span className="cat-icon" style={{ background: 'var(--surface-lavender)' }}>
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
          <path
            d="M3.5 10.5L11 4l7.5 6.5"
            stroke="var(--lavender-strong)"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M5.5 9.5V17a1 1 0 001 1H15.5a1 1 0 001-1V9.5"
            stroke="var(--lavender-strong)"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    ),
  },
  {
    category: '민간혜택',
    desc: '기업·기관의 다양한 민간 제휴 혜택',
    icon: (
      <span className="cat-icon" style={{ background: 'var(--surface-slate)' }}>
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
          <rect x="4" y="8.5" width="14" height="9.5" rx="1.5" stroke="var(--slate-strong)" strokeWidth="1.6" />
          <path d="M4 12h14" stroke="var(--slate-strong)" strokeWidth="1.6" />
          <path
            d="M11 8.5v9.5M8 8.5c-1.2 0-2-.8-2-2s.9-2.5 3-1c1.4 1 1.9 2 2 3zM14 8.5c1.2 0 2-.8 2-2s-.9-2.5-3-1c-1.4 1-1.9 2-2 3z"
            stroke="var(--slate-strong)"
            strokeWidth="1.4"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    ),
  },
]

export default function CategoryGrid({
  onSelectCategory,
}: {
  onSelectCategory: (category: HomeCategory) => void
}) {
  return (
    <section className="panel wrap snap-section" id="categories">
      <div className="panel-head">
        <h2>혜택 카테고리</h2>
      </div>
      <div className="cat-grid">
        {CATEGORIES.map(({ category, icon, desc }) => (
          <button key={category} className="cat-card2" onClick={() => onSelectCategory(category)} type="button">
            {icon}
            <span className="cat-name">{category}</span>
            <span className="cat-desc2">{desc}</span>
          </button>
        ))}
      </div>
    </section>
  )
}
