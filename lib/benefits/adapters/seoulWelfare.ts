import type { BenefitRecord } from '@/lib/benefits/types'
import { getDefaultImage } from '@/lib/benefits/defaults'

// 필드명은 공공데이터포털 공개 문서 기준 최선 추정치 — 실제 인증키로 Swagger 재검증 필요.
export interface SeoulWelfareApiItem {
  servId: string
  servNm: string
  servDgst?: string
  sggNm?: string
  sprtCycNm?: string
  servDtlLink?: string
}

const CATEGORY = '생활지원'

function buildApplyLink(item: SeoulWelfareApiItem): string {
  if (item.servDtlLink) return item.servDtlLink
  return `https://www.bokjiro.go.kr/ssis-tbu/twataa/wlfareInfo/moveTWAT52011M.do?wlfareInfoId=${item.servId}`
}

export function mapSeoulWelfareToBenefitRecords(items: SeoulWelfareApiItem[]): BenefitRecord[] {
  return items
    .filter((item) => !!item.servId)
    .map((item) => ({
      source: 'seoul_welfare',
      externalId: item.servId,
      name: item.servNm,
      category: CATEGORY,
      region: item.sggNm ? `서울 ${item.sggNm}` : '서울',
      targetPeriod: null,
      summary: item.servDgst ?? null,
      detail: item.servDgst ?? null,
      applyLink: buildApplyLink(item),
      applyPeriod: item.sprtCycNm ?? null,
      imageUrl: getDefaultImage(CATEGORY),
      rawPayload: item,
    }))
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
  url.searchParams.set('type', 'json')

  const res = await fetch(url.toString())
  if (!res.ok) {
    throw new Error(`seoul welfare API request failed: ${res.status}`)
  }
  const json = await res.json()
  if (!Array.isArray(json?.wantedList)) {
    const bodyPreview = JSON.stringify(json).slice(0, 200)
    throw new Error(
      `seoul welfare API response missing wantedList (likely an invalid/expired key or rate limit): ${bodyPreview}`
    )
  }
  const items: SeoulWelfareApiItem[] = json.wantedList
  return mapSeoulWelfareToBenefitRecords(items)
}
