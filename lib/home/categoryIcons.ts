import type { HomeCategory } from './types'

// 카테고리마다 전용 아이콘 이미지를 다 갖추진 못해서, 가진 4개(하트 티켓/젖병+동전/방패+하트/
// 엄마와 아기)를 의미가 제일 가까운 카테고리에 배정하고 나머지는 하트 티켓으로 돌려쓴다.
const CATEGORY_ICONS: Record<HomeCategory, string> = {
  '지원금': '/images/home/benefit-ticket.png',
  '의료·검사': '/images/home/icon-health.png',
  '교통': '/images/home/benefit-ticket.png',
  '출산·육아': '/images/home/icon-money.png',
  '생활지원': '/images/home/icon-care.png',
  '민간혜택': '/images/home/benefit-ticket.png',
}

export function getCategoryIcon(category: HomeCategory): string {
  return CATEGORY_ICONS[category]
}
