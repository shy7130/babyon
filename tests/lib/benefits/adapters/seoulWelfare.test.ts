import { describe, expect, it } from 'vitest'
import {
  mapSeoulWelfareToBenefitRecords,
  type SeoulWelfareApiItem,
} from '@/lib/benefits/adapters/seoulWelfare'

describe('mapSeoulWelfareToBenefitRecords', () => {
  it('maps a raw item and includes the district in region', () => {
    const items: SeoulWelfareApiItem[] = [
      {
        servId: 'S00000001',
        servNm: '산후조리경비 지원',
        servDgst: '출산 후 180일 이내 신청',
        sggNm: '강남구',
        sprtCycNm: '1회성',
      },
    ]

    const result = mapSeoulWelfareToBenefitRecords(items)

    expect(result[0]).toMatchObject({
      source: 'seoul_welfare',
      externalId: 'S00000001',
      name: '산후조리경비 지원',
      region: '서울 강남구',
      applyPeriod: '1회성',
      imageUrl: '/images/defaults/benefit-life.svg',
    })
  })

  it('falls back to plain 서울 when district name is missing', () => {
    const items: SeoulWelfareApiItem[] = [{ servId: 'S00000002', servNm: '테스트' }]
    const result = mapSeoulWelfareToBenefitRecords(items)
    expect(result[0].region).toBe('서울')
  })
})
