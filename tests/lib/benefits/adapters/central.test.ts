import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  fetchCentralBenefits,
  mapCentralToBenefitRecords,
  type CentralApiItem,
} from '@/lib/benefits/adapters/central'

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

  it('excludes items with a missing servId to avoid duplicate rows with a null external_id', () => {
    const items: CentralApiItem[] = [
      { servId: '', servNm: '누락된 항목' } as CentralApiItem,
      { servId: 'WLF00000003', servNm: '정상 항목' },
    ]

    const result = mapCentralToBenefitRecords(items)

    expect(result).toHaveLength(1)
    expect(result[0].externalId).toBe('WLF00000003')
  })
})

describe('fetchCentralBenefits', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('throws a visible error when the response has no wantedList (e.g. an expired key error envelope)', async () => {
    const errorEnvelope = { resultCode: '30', resultMsg: 'SERVICE KEY IS NOT REGISTERED ERROR.' }
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => errorEnvelope,
      })
    )

    await expect(fetchCentralBenefits('bad-key')).rejects.toThrow(/wantedList/)
    await expect(fetchCentralBenefits('bad-key')).rejects.toThrow(/SERVICE KEY IS NOT REGISTERED/)
  })
})
