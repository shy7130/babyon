const TRAVEL_CARDS = [
  {
    color: 'mint',
    icon: '🏠',
    title: '실내 놀이 공간',
    desc: '날씨 걱정 없이 아이와 쉬어갈 수 있는 실내 키즈존 위주로 모을 예정이에요.',
  },
  {
    color: 'lavender',
    icon: '🌳',
    title: '근교 나들이 공원',
    desc: '유모차 이동이 편한 산책로와 쉼터가 있는 공원을 소개할 예정이에요.',
  },
  {
    color: 'slate',
    icon: '🍽️',
    title: '아이 동반 카페·식당',
    desc: '수유실·놀이공간을 갖춘 곳 위주로 정리할 예정이에요.',
  },
] as const

export default function TravelPreview() {
  return (
    <section className="panel wrap snap-section" id="travel">
      <div className="panel-head">
        <h2>ON가족 여행지</h2>
        <p>임산부와 아이가 편안하게 다녀올 수 있는 나들이 장소를 소개할 예정이에요.</p>
      </div>
      <div className="travel-grid">
        {TRAVEL_CARDS.map((card) => (
          <div key={card.title} className={`travel-card ${card.color}`}>
            <span className="travel-icon">{card.icon}</span>
            <h3>{card.title}</h3>
            <p>{card.desc}</p>
          </div>
        ))}
      </div>
      <p className="travel-soon">✨ 실제 장소 정보는 곧 채워질 예정이에요. 기대해주세요!</p>
    </section>
  )
}
