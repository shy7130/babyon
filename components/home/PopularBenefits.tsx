// 실제 "인기" 랭킹(조회수 등) 데이터가 아직 없어, 목업의 예시 4건을 그대로 정적으로 보여준다.
// 나중에 실제 인기 랭킹 데이터가 생기면 이 목록을 DB 조회로 교체할 것.
const POPULAR_BENEFITS = [
  {
    region: '전국',
    regionColor: 'mint',
    name: '첫만남이용권',
    desc: '출생아 1인당 200만원 바우처 지급',
  },
  {
    region: '경기',
    regionColor: 'lavender',
    name: '산후조리비 지원',
    desc: '출산가정 산후조리비 최대 50만원 지원',
  },
  {
    region: '서울',
    regionColor: 'mint',
    name: '임산부 교통비 지원',
    desc: '교통비 자녀 수별 70만~100만원 이용권 지급',
  },
  {
    region: '민간',
    regionColor: 'slate',
    name: '임산부 배려 KTX 할인',
    desc: '코레일 임산부 등록 시 요금 30% 할인',
  },
] as const

export default function PopularBenefits() {
  return (
    <section className="panel wrap snap-section" id="popular">
      <div className="panel-head-row">
        <div className="panel-head">
          <h2>
            인기 혜택 TOP 4 <span className="top-badge">지금 많이 찾는 혜택이에요</span>
          </h2>
        </div>
        <a className="panel-link" href="#finder">
          더보기 →
        </a>
      </div>
      <div className="pop-grid">
        {POPULAR_BENEFITS.map((benefit) => (
          <a key={benefit.name} className="pop-card" href="#">
            <span className={`region-tag ${benefit.regionColor}`}>{benefit.region}</span>
            <h3>{benefit.name}</h3>
            <p className="pop-desc">{benefit.desc}</p>
            <span className="more2">자세히 보기 →</span>
          </a>
        ))}
      </div>
    </section>
  )
}
