# 방구석 탐험가 — 오픈빌더 연동 가이드

## 서버 엔드포인트 ↔ 오픈빌더 블록 매핑

| 블록 이름     | 발화 패턴                        | 서버 URL            |
|-------------|--------------------------------|---------------------|
| 게임시작      | 시작, 방구석탐험가, 탐험가        | POST /start         |
| 게임방법      | 게임방법, 규칙, 어떻게해          | POST /guide         |
| 탐험하기      | 탐험하기, 탐험, 탐험시작          | POST /explore       |
| 내정보        | 내정보, 내 정보, 상태             | POST /info          |
| 도감보기      | 도감보기, 도감, 유물도감          | POST /collection    |
| 장비강화      | 장비강화, 강화, 장비              | POST /enhance       |
| 탐험복강화    | 탐험복강화, 탐험복               | POST /enhance/suit  |
| 탐험가방강화  | 탐험가방강화, 탐험가방            | POST /enhance/bag   |
| 구매1        | 구매1                           | POST /shop/buy      |
| 구매2        | 구매2                           | POST /shop/buy      |
| 구매3        | 구매3                           | POST /shop/buy      |
| 상인거절      | 상인거절, 거절, 안살게            | POST /shop/decline  |
| 회복약사용    | 회복약사용, 회복약, 포션          | POST /potion        |
| 랭킹         | 랭킹, 순위, 랭킹보기              | POST /ranking       |

## Vercel 배포 후 URL 예시
https://bangguseok-explorer.vercel.app/start
https://bangguseok-explorer.vercel.app/explore
...

## 시나리오 구성
- 게임준비 시나리오: 게임시작, 게임방법
- 탐험진행 시나리오: 탐험하기, 내정보, 도감보기, 회복약사용, 랭킹
- 장비강화 시나리오: 장비강화, 탐험복강화, 탐험가방강화
- 상점 시나리오: 구매1, 구매2, 구매3, 상인거절
