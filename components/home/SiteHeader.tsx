import type { MouseEvent } from 'react'

export default function SiteHeader({
  onHomeClick,
  active = 'home',
  showAccountIcons = false,
}: {
  onHomeClick?: () => void
  active?: 'home' | 'community'
  showAccountIcons?: boolean
}) {
  function handleHomeClick(e: MouseEvent<HTMLAnchorElement>) {
    if (!onHomeClick) return
    e.preventDefault()
    onHomeClick()
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <header className="site">
      <div className="site-bar wrap">
        <div className="site-bar-left">
          <div className="logo">
            BABY <span className="on-badge">ON</span>
          </div>
          <nav className="main-nav">
            <a href={active === 'home' ? '#finder' : '/'} onClick={handleHomeClick}>
              혜택 ON
            </a>
            {/* 아직 실제 페이지가 없는 메뉴 -- 장식용 텍스트, 클릭 불가 */}
            <span className="soon-link">임신·출산 가이드</span>
            <a href="#travel">ON가족 여행지</a>
            <a href="/community" className={active === 'community' ? 'active' : ''}>
              커뮤니티
            </a>
          </nav>
        </div>
        {showAccountIcons && (
          <div className="site-bar-icons">
            <button type="button" className="icon-btn" aria-label="알림">
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 3a6 6 0 0 0-6 6v3.6L4.5 15.4a1 1 0 0 0 .8 1.6h13.4a1 1 0 0 0 .8-1.6L18 12.6V9a6 6 0 0 0-6-6Z"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinejoin="round"
                />
                <path d="M9.5 19.5a2.5 2.5 0 0 0 5 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
              <span className="icon-dot" />
            </button>
            <div className="avatar-btn" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="8.5" r="3.5" stroke="currentColor" strokeWidth="1.6" />
                <path
                  d="M4.5 20c1.4-3.8 4.4-5.8 7.5-5.8s6.1 2 7.5 5.8"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              </svg>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
