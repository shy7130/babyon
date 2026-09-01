import { describe, expect, it } from 'vitest'
import { mapCentralToBenefitRecords, type CentralApiItem } from '@/lib/benefits/adapters/central'

describe('mapCentralToBenefitRecords', () => {
  it('maps a raw central welfare item to a BenefitRecord', () => {
    const items: CentralApiItem[] = [
      {
        servId: 'WLF00000001',
        servNm: '첫만남이용권',
        servDgst: '출생아 1인당 200만원 바우처 지급',
        sprtCycNm: '수시',
        lifeArray: '영유아',
        servDtlLink: 'https://www.bokjiro.go.kr/detail/WLF00000001',
      },
    ]

    const result = mapCentralToBenefitRecords(items)

    expect(result).toEqual([
      {
        source: 'central',
        externalId: 'WLF00000001',
        name: '첫만남이용권',
        category: '지원금',
        region: '전국',
        targetPeriod: '영유아',
        summary: '출생아 1인당 200만원 바우처 지급',
        detail: '출생아 1인당 200만원 바우처 지급',
        applyLink: 'https://www.bokjiro.go.kr/detail/WLF00000001',
        applyPeriod: '수시',
        imageUrl: '/images/defaults/benefit-cash.svg',
        rawPayload: items[0],
      },
    ])
  })

  it('falls back to a bokjiro detail URL when servDtlLink is missing', () => {
    const items: CentralApiItem[] = [
      { servId: 'WLF00000002', servNm: '테스트 혜택' },
    ]

    const result = mapCentralToBenefitRecords(items)

    expect(result[0].applyLink).toBe(
      'https://www.bokjiro.go.kr/ssis-tbu/twataa/wlfareInfo/moveTWAT52011M.do?wlfareInfoId=WLF00000002'
    )
  })
})
