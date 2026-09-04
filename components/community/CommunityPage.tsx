'use client'

import { useState } from 'react'
import { Jua } from 'next/font/google'
import SiteHeader from '@/components/home/SiteHeader'

const jua = Jua({ weight: '400', subsets: ['latin'], preload: false })

const HUB_BUTTONS = [
  { label: '자유톡', icon: 'free-talk', left: 39.37, top: 20.51, iconScale: 0.85, labelOffsetY: -5 },
  { label: '공지사항', icon: 'notice', left: 69.09, top: 21.03, iconScale: 0.75, labelOffsetY: -10 },
  { label: '육아꿀팁', icon: 'parenting-tips', left: 29.33, top: 50.41, iconScale: 1, labelOffsetY: -3 },
  { label: '건의함', icon: 'suggestion', left: 76.91, top: 53.71, iconScale: 0.85, labelOffsetY: -10 },
  { label: '고민상담', icon: 'counseling', left: 44.36, top: 79.71, iconScale: 1.45, labelOffsetY: -10 },
  { label: '우리동네', icon: 'neighborhood', left: 68.11, top: 78.99, iconScale: 1.45, labelOffsetY: -12 },
] as const

const TRENDING = [
  { badge: '인기', color: 'blush', title: '아기랑 첫 여행 어디로 가셨나요?', comments: 24, likes: 38 },
  { badge: '꿀팁', color: 'amber', title: '돌 전후에 정말 잘 샀던 육아템 공유해요', comments: 18, likes: 31 },
  { badge: '우리동네', color: 'mint', title: '서울 송파구 아기랑 가기 좋은 식당 있을까요?', comments: 12, likes: 17 },
] as const

const LATEST = [
  {
    tag: '자유톡',
    color: 'mint',
    title: '오늘 처음 어린이집 보냈어요',
    excerpt: '생각보다 제가 더 긴장되네요 :)',
    likes: 18,
    comments: 12,
    time: '3분 전',
  },
  {
    tag: '고민상담',
    color: 'blush',
    title: '분유를 갑자기 안 먹는데...',
    excerpt: '비슷한 경험 있으셨나요?',
    likes: 9,
    comments: 21,
    time: '15분 전',
  },
  {
    tag: '공지사항',
    color: 'amber',
    title: '8월 커뮤니티 이벤트 안내 🎁',
    excerpt: null,
    likes: 4,
    comments: 3,
    time: '32분 전',
  },
] as const

export default function CommunityPage() {
  const [toast, setToast] = useState<string | null>(null)

  function showComingSoon() {
    setToast('아직 준비 중이에요!')
    setTimeout(() => setToast(null), 2000)
  }

  return (
    <>
      <SiteHeader active="community" showAccountIcons />

      <section className="community-hero">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/community/hero-banner.png" alt="놀이터 배경" className="hero-banner-img" />

        <div className="community-hero-text">
          <h1 className={`community-title ${jua.className}`}>
            오늘의 고민도, <span className="accent">내일의 꿀팁도</span>
          </h1>
          <p className="community-subtitle">묻고, 나누고, 공감해요 💗</p>
        </div>

        {HUB_BUTTONS.map((btn) => (
          <button
            key={btn.label}
            type="button"
            className="hub-btn"
            style={{ left: `${btn.left}%`, top: `${btn.top}%` }}
            onClick={showComingSoon}
            aria-label={btn.label}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/images/community/icons/${btn.icon}.png`}
              alt=""
              className="hub-btn-icon"
              style={btn.iconScale !== 1 ? { transform: `scale(${btn.iconScale})` } : undefined}
            />
            <span
              className="hub-btn-label"
              style={btn.labelOffsetY ? { transform: `translateY(${btn.labelOffsetY}px)` } : undefined}
            >
              {btn.label}
            </span>
          </button>
        ))}
      </section>

      <section className="community-body wrap">
        <div className="community-card trend-card-wrap">
          <h2 className="community-card-title">🔥 지금 많이 이야기해요</h2>
          <div className="trend-grid">
            {TRENDING.map((item) => (
              <button key={item.title} type="button" className="trend-card" onClick={showComingSoon}>
                <div className={`trend-thumb trend-thumb-${item.color}`}>
                  <span className={`trend-badge trend-badge-${item.color}`}>{item.badge}</span>
                </div>
                <p className="trend-title">{item.title}</p>
                <p className="trend-stats">
                  💬 {item.comments} &nbsp; ♡ {item.likes}
                </p>
              </button>
            ))}
          </div>
        </div>

        <div className="community-card story-card-wrap">
          <div className="community-card-header">
            <h2 className="community-card-title">🕒 최신 이야기</h2>
            <button type="button" className="story-more" onClick={showComingSoon}>
              더 보기 &gt;
            </button>
          </div>
          <ul className="story-list">
            {LATEST.map((item) => (
              <li key={item.title}>
                <button type="button" className="story-row" onClick={showComingSoon}>
                  <span className={`story-tag story-tag-${item.color}`}>{item.tag}</span>
                  <span className="story-text">
                    <span className="story-title">{item.title}</span>
                    {item.excerpt && <span className="story-excerpt">{item.excerpt}</span>}
                  </span>
                  <span className="story-stats">
                    ♡ {item.likes} &nbsp; 💬 {item.comments}
                  </span>
                  <span className="story-time">{item.time}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <button type="button" className="fab" onClick={showComingSoon}>
        ✏️
        <br />
        이야기
        <br />
        남기기
      </button>

      <div className={`toast${toast ? ' show' : ''}`}>{toast}</div>
    </>
  )
}
