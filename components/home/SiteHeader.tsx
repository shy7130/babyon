import type { MouseEvent } from 'react'

export default function SiteHeader({ onHomeClick }: { onHomeClick?: () => void }) {
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
            <a href="#finder" onClick={handleHomeClick}>
              혜택 ON
            </a>
            {/* 아직 실제 페이지가 없는 메뉴 -- 장식용 텍스트, 클릭 불가 */}
            <span className="soon-link">임신·출산 가이드</span>
            <a href="#travel">ON가족 여행지</a>
            <span className="soon-link">커뮤니티</span>
          </nav>
        </div>
      </div>
    </header>
  )
}
