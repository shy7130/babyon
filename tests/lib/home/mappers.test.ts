import { describe, expect, it } from 'vitest'
import { toHomeBenefit } from '@/lib/home/mappers'

describe('toHomeBenefit', () => {
  it('maps a published, tagged DB row into a HomeBenefit', () => {
    const row = {
      id: 'b1',
      name: '첫만남이용권',
      category: '지원금',
      region: '전국',
      summary: '출생아 1인당 200만원 지급',
      apply_link: 'https://example.com/apply',
      has_direct_apply_link: true,
      amount_manwon: 200,
      wizard_stages: '임신 후기,출산 후',
      raw_payload: { jurMnofNm: '보건복지부' },
    }

    expect(toHomeBenefit(row)).toEqual({
      id: 'b1',
      name: '첫만남이용권',
      category: '지원금',
      region: '전국',
      summary: '출생아 1인당 200만원 지급',
      applyLink: 'https://example.com/apply',
      hasDirectApplyLink: true,
      amountManwon: 200,
      wizardStages: ['임신 후기', '출산 후'],
      sourceLabel: '보건복지부',
    })
  })

  it('falls back to a generic source label when raw_payload has no jurMnofNm', () => {
    const row = {
      id: 'b2',
      name: '수동 등록 혜택',
      category: '생활지원',
      region: '전국',
      summary: null,
      apply_link: null,
      wizard_stages: '출산 후',
      raw_payload: null,
    }

    expect(toHomeBenefit(row).sourceLabel).toBe(null)
  })

  it('returns an empty wizardStages array when wizard_stages is null', () => {
    const row = {
      id: 'b3',
      name: '태그 없음',
      category: '지원금',
      region: '전국',
      summary: null,
      apply_link: null,
      wizard_stages: null,
      raw_payload: null,
    }

    expect(toHomeBenefit(row).wizardStages).toEqual([])
  })
})
