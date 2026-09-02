import { XMLParser } from 'fast-xml-parser'
import type { BenefitRecord } from '@/lib/benefits/types'
import { getDefaultImage } from '@/lib/benefits/defaults'

// 필드명·엔드포인트·응답형식은 실제 인증키로 검증됨 — central과 마찬가지로 이 API도 XML만 응답한다(JSON 미지원).
export interface SeoulWelfareApiItem {
  servId: string
  servNm: string
  servDgst?: string
  sggNm?: string
  sprtCycNm?: string
  servDtlLink?: string
  lifeNmArray?: string
}

const CATEGORY = '생활지원'

function buildApplyLink(item: SeoulWelfareApiItem): string {
  if (item.servDtlLink) return item.servDtlLink
  return `https://www.bokjiro.go.kr/ssis-tbu/twataa/wlfareInfo/moveTWAT52011M.do?wlfareInfoId=${item.servId}`
}

// central(lifeArray)과 같은 이유로, 생애주기 태그가 4개 이상인 항목은 "전 생애주기 대상"
// 범용 서비스일 가능성이 높으므로 제외한다.
const MAX_LIFE_STAGE_TAGS = 3

function isTargetedLifeStage(lifeNmArray?: string): boolean {
  if (!lifeNmArray) return false
  return lifeNmArray.split(',').length <= MAX_LIFE_STAGE_TAGS
}

export function mapSeoulWelfareToBenefitRecords(items: SeoulWelfareApiItem[]): BenefitRecord[] {
  return items
    .filter((item) => !!item.servId && isTargetedLifeStage(item.lifeNmArray))
    .map((item) => ({
      source: 'seoul_welfare',
      externalId: item.servId,
      name: item.servNm,
      category: CATEGORY,
      region: item.sggNm ? `서울 ${item.sggNm}` : '서울',
      targetPeriod: item.lifeNmArray ?? null,
      summary: item.servDgst ?? null,
      detail: item.servDgst ?? null,
      applyLink: buildApplyLink(item),
      applyPeriod: item.sprtCycNm ?? null,
      imageUrl: getDefaultImage(CATEGORY),
      rawPayload: item,
    }))
}

// 실제 응답 봉투는 central과 동일: <wantedList><totalCount/><resultCode/><resultMessage/><servList>...</servList>...</wantedList>
// resultCode "0" = 성공. servList는 0건이면 아예 없고, 1건이면 배열이 아닌 단일 객체로 파싱됨.
export function parseSeoulWelfareXmlResponse(xml: string): SeoulWelfareApiItem[] {
  const parser = new XMLParser()
  const parsed = parser.parse(xml)
  const wantedList = parsed?.wantedList

  if (!wantedList || String(wantedList.resultCode) !== '0') {
    const bodyPreview = xml.slice(0, 200)
    throw new Error(
      `seoul welfare API returned an error (resultCode=${wantedList?.resultCode}, resultMessage=${wantedList?.resultMessage}): ${bodyPreview}`
    )
  }

  const rawList = wantedList.servList
  if (rawList === undefined) return []
  return Array.isArray(rawList) ? rawList : [rawList]
}

export async function fetchSeoulWelfareBenefits(apiKey: string): Promise<BenefitRecord[]> {
  const url = new URL(
    'https://apis.data.go.kr/B554287/LocalGovernmentWelfareInformations/LcgvWelfarelist'
  )
  url.searchParams.set('serviceKey', apiKey)
  url.searchParams.set('callTp', 'L')
  url.searchParams.set('pageNo', '1')
  url.searchParams.set('numOfRows', '100')
  url.searchParams.set('ctpvNm', '서울특별시')
  // intrsThemaArray=080 (관심주제 코드표: 임신 · 출산) — central의 lifeArray=007과 같은 취지로
  // 베이비온은 임신·출산 혜택만 다루므로 서버 쪽에서 이 관심주제로 필터링해서 요청한다.
  url.searchParams.set('intrsThemaArray', '080')

  const res = await fetch(url.toString())
  if (!res.ok) {
    throw new Error(`seoul welfare API request failed: ${res.status}`)
  }
  const xml = await res.text()
  const items = parseSeoulWelfareXmlResponse(xml)
  return mapSeoulWelfareToBenefitRecords(items)
}
