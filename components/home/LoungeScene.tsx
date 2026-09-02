export default function LoungeScene() {
  return (
    <section className="waypoint-scene snap-section" id="lounge">
      <div className="wp-sky" aria-hidden="true">
        <svg className="wp-cloud a" width="70" height="40" viewBox="0 0 70 40" fill="none">
          <ellipse cx="20" cy="24" rx="18" ry="12" fill="#FFFFFF" />
          <ellipse cx="38" cy="18" rx="20" ry="15" fill="#FFFFFF" />
          <ellipse cx="54" cy="26" rx="14" ry="10" fill="#FFFFFF" />
        </svg>
        <svg className="wp-cloud b" width="52" height="30" viewBox="0 0 70 40" fill="none">
          <ellipse cx="20" cy="24" rx="18" ry="12" fill="#FFFFFF" />
          <ellipse cx="38" cy="18" rx="20" ry="15" fill="#FFFFFF" />
          <ellipse cx="54" cy="26" rx="14" ry="10" fill="#FFFFFF" />
        </svg>
        <div className="wp-ground" />
        <svg className="wp-sign" width="40" height="72" viewBox="0 0 40 72" fill="none">
          <path d="M20,72 L20,10" stroke="var(--wood-dark)" strokeWidth="3" strokeLinecap="round" />
          <path d="M20,16 L40,20 L20,24 Z" fill="var(--mint)" />
          <path d="M20,28 L2,32 L20,36 Z" fill="var(--lavender)" />
        </svg>
        <svg className="wp-heart" width="16" height="14" viewBox="0 0 18 16" fill="none">
          <path
            d="M9 15S1 10 1 5.2C1 2.3 3.2 1 5.2 1 7 1 8.4 2 9 3.4 9.6 2 11 1 12.8 1c2 0 4.2 1.3 4.2 4.2C17 10 9 15 9 15Z"
            fill="var(--blush)"
          />
        </svg>
      </div>

      <div className="wrap wp-inner">
        <div className="wp-illustration">
          <div className="wp-char-wrap">
            <span className="wp-question">?</span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="wp-char" src="/images/home/char-arch.png" alt="" />
          </div>

          <a className="wp-bubble left top" href="#travel" aria-label="ON가족 여행지로 이동">
            <span className="wp-emoji">✈️</span>
          </a>
          <a className="wp-bubble left bottom" href="#travel" aria-label="ON가족 여행지로 이동">
            <span className="wp-emoji">🚌</span>
          </a>
          {/* 커뮤니티는 아직 실제 페이지가 없어 장식용으로만 둔다 */}
          <span className="wp-bubble right" aria-hidden="true">
            <span className="wp-emoji">💬</span>
          </span>
        </div>

        <div className="wp-caption">
          <h2>여행지도 볼까요, 이야기도 나눠볼까요?</h2>
          <p>
            비행기·버스를 누르면 <strong>ON가족 여행지</strong>로 이동해요. 커뮤니티는 곧 열릴 예정이에요.
          </p>
        </div>
      </div>
    </section>
  )
}
