import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  fetchSeoulWelfareBenefits,
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

  it('excludes items with a missing servId to avoid duplicate rows with a null external_id', () => {
    const items: SeoulWelfareApiItem[] = [
      { servId: '', servNm: '누락된 항목' } as SeoulWelfareApiItem,
      { servId: 'S00000003', servNm: '정상 항목' },
    ]

    const result = mapSeoulWelfareToBenefitRecords(items)

    expect(result).toHaveLength(1)
    expect(result[0].externalId).toBe('S00000003')
  })
})

describe('fetchSeoulWelfareBenefits', () => {
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

    await expect(fetchSeoulWelfareBenefits('bad-key')).rejects.toThrow(/wantedList/)
    await expect(fetchSeoulWelfareBenefits('bad-key')).rejects.toThrow(
      /SERVICE KEY IS NOT REGISTERED/
    )
  })
})
