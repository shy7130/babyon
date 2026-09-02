export default function TrustStrip() {
  return (
    <section className="panel wrap snap-section" id="trust">
      <div className="trust-strip">
        <div className="trust-head">
          <svg width="30" height="30" viewBox="0 0 30 30" fill="none">
            <path
              d="M15 3l10 4v7c0 7-4.5 11.5-10 13-5.5-1.5-10-6-10-13V7l10-4z"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinejoin="round"
            />
            <path
              d="M10.5 15l3 3 6-6.5"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <div>
            <strong>신뢰할 수 있는 정보만 제공해요</strong>
            <span>정부·지자체·공공기관 및 공식 민간기관의 검증된 혜택 정보만 모았습니다.</span>
          </div>
        </div>
        <div className="trust-items">
          <span className="trust-item">
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
              <path d="M2 12l3-8 3 8M9 12l3-8 3 8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
            공식 출처 기반
          </span>
          <span className="trust-item">
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
              <path
                d="M7.5 2a5.5 5.5 0 105.2 3.7M12.5 2v3.5H9"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            최신 정보 업데이트
          </span>
          <span className="trust-item">
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
              <circle cx="6.5" cy="6.5" r="4" stroke="currentColor" strokeWidth="1.4" />
              <path d="M9.5 9.5L13 13" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
            간편하고 쉬운 검색
          </span>
        </div>
      </div>
    </section>
  )
}
