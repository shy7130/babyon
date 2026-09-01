import { XMLParser } from 'fast-xml-parser'
import type { BenefitRecord } from '@/lib/benefits/types'
import { getDefaultImage } from '@/lib/benefits/defaults'

// 필드명·엔드포인트·응답형식은 실제 인증키 발급 후 공식 활용가이드
// (활용가이드_중앙부처복지서비스 v2.2)로 검증됨 — 이 API는 XML만 응답한다(JSON 미지원).
export interface CentralApiItem {
  servId: string
  servNm: string
  servDgst?: string
  sprtCycNm?: string
  lifeArray?: string
  servDtlLink?: string
}

const CATEGORY = '지원금'

function buildApplyLink(item: CentralApiItem): string {
  if (item.servDtlLink) return item.servDtlLink
  return `https://www.bokjiro.go.kr/ssis-tbu/twataa/wlfareInfo/moveTWAT52011M.do?wlfareInfoId=${item.servId}`
}

export function mapCentralToBenefitRecords(items: CentralApiItem[]): BenefitRecord[] {
  return items
    .filter((item) => !!item.servId)
    .map((item) => ({
      source: 'central',
      externalId: item.servId,
      name: item.servNm,
      category: CATEGORY,
      region: '전국',
      targetPeriod: item.lifeArray ?? null,
      summary: item.servDgst ?? null,
      detail: item.servDgst ?? null,
      applyLink: buildApplyLink(item),
      applyPeriod: item.sprtCycNm ?? null,
      imageUrl: getDefaultImage(CATEGORY),
      rawPayload: item,
    }))
}

// 실제 응답 봉투: <wantedList><totalCount/><resultCode/><resultMessage/><servList>...</servList>...</wantedList>
// resultCode "0" = 성공. servList는 0건이면 아예 없고, 1건이면 배열이 아닌 단일 객체로 파싱됨.
export function parseCentralXmlResponse(xml: string): CentralApiItem[] {
  const parser = new XMLParser()
  const parsed = parser.parse(xml)
  const wantedList = parsed?.wantedList

  if (!wantedList || String(wantedList.resultCode) !== '0') {
    const bodyPreview = xml.slice(0, 200)
    throw new Error(
      `central welfare API returned an error (resultCode=${wantedList?.resultCode}, resultMessage=${wantedList?.resultMessage}): ${bodyPreview}`
    )
  }

  const rawList = wantedList.servList
  if (rawList === undefined) return []
  return Array.isArray(rawList) ? rawList : [rawList]
}

export async function fetchCentralBenefits(apiKey: string): Promise<BenefitRecord[]> {
  const url = new URL(
    'https://apis.data.go.kr/B554287/NationalWelfareInformationsV001/NationalWelfarelistV001'
  )
  url.searchParams.set('serviceKey', apiKey)
  url.searchParams.set('callTp', 'L')
  url.searchParams.set('pageNo', '1')
  url.searchParams.set('numOfRows', '100')
  url.searchParams.set('srchKeyCode', '001')
  // lifeArray=007 (생애주기 코드표: 임신 · 출산) — 베이비온은 임신·출산 혜택만 다루므로
  // 서버 쪽에서 이 생애주기로 필터링해서 요청한다. 다른 생애주기 항목은 애초에 받지 않는다.
  url.searchParams.set('lifeArray', '007')

  const res = await fetch(url.toString())
  if (!res.ok) {
    throw new Error(`central welfare API request failed: ${res.status}`)
  }
  const xml = await res.text()
  const items = parseCentralXmlResponse(xml)
  return mapCentralToBenefitRecords(items)
}
