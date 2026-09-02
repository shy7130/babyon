export default function SiteHeader() {
  return (
    <header className="site">
      <div className="site-bar wrap">
        <div className="site-bar-left">
          <div className="logo">
            BABY <span className="on-badge">ON</span>
          </div>
          <nav className="main-nav">
            <a href="#finder">혜택 ON</a>
            {/* 아직 실제 페이지가 없는 메뉴 -- 장식용 텍스트, 클릭 불가 */}
            <span className="soon-link">임신·출산 가이드</span>
            <a href="#travel">ON가족 여행지</a>
            <span className="soon-link">커뮤니티</span>
          </nav>
        </div>
        <a className="admin-link" href="/admin/login">
          <svg width="15" height="15" viewBox="0 0 20 20" fill="none">
            <circle cx="10" cy="7" r="3.4" stroke="currentColor" strokeWidth="1.5" />
            <path
              d="M3.5 17c1.2-3.5 4-5 6.5-5s5.3 1.5 6.5 5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
          관리자
        </a>
      </div>
    </header>
  )
}
