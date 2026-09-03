import { describe, expect, it } from 'vitest'
import {
  filterBenefits,
  getFeaturedBenefits,
  getPopularBenefits,
  matchesRegion,
  matchesSituation,
  matchesStage,
  normalizeRegion,
} from '@/lib/home/matching'
import type { HomeBenefit } from '@/lib/home/types'

function makeBenefit(overrides: Partial<HomeBenefit>): HomeBenefit {
  return {
    id: 'b1',
    name: '테스트 혜택',
    category: '지원금',
    region: '전국',
    summary: null,
    applyLink: null,
    hasDirectApplyLink: false,
    amountManwon: null,
    wizardStages: ['임신 중기'],
    specialSituations: [],
    sourceLabel: null,
    ...overrides,
  }
}

describe('normalizeRegion', () => {
  it('maps 전국 to all', () => {
    expect(normalizeRegion('전국')).toBe('all')
  })
  it('maps a plain 서울 region to 서울', () => {
    expect(normalizeRegion('서울')).toBe('서울')
  })
  it('maps a district-level 서울 region to 서울', () => {
    expect(normalizeRegion('서울 강남구')).toBe('서울')
  })
  it('maps 경기 to 경기', () => {
    expect(normalizeRegion('경기')).toBe('경기')
  })
  it('maps any unrecognized value to all', () => {
    expect(normalizeRegion('부산')).toBe('all')
  })
})

describe('matchesRegion', () => {
  it('matches a nationwide benefit regardless of selected region', () => {
    const benefit = makeBenefit({ region: '전국' })
    expect(matchesRegion(benefit, '서울')).toBe(true)
    expect(matchesRegion(benefit, '경기')).toBe(true)
  })
  it('matches a 서울 benefit only when 서울 is selected', () => {
    const benefit = makeBenefit({ region: '서울 강남구' })
    expect(matchesRegion(benefit, '서울')).toBe(true)
    expect(matchesRegion(benefit, '경기')).toBe(false)
  })
  it('matches any district when no district is selected', () => {
    const benefit = makeBenefit({ region: '서울 강남구' })
    expect(matchesRegion(benefit, '서울', null)).toBe(true)
  })
  it('excludes a benefit tied to a different district once one is selected', () => {
    const benefit = makeBenefit({ region: '서울 강남구' })
    expect(matchesRegion(benefit, '서울', '구로구')).toBe(false)
    expect(matchesRegion(benefit, '서울', '강남구')).toBe(true)
  })
  it('still matches a citywide (no-district) 서울 benefit regardless of selected district', () => {
    const benefit = makeBenefit({ region: '서울' })
    expect(matchesRegion(benefit, '서울', '구로구')).toBe(true)
  })
})

describe('matchesStage', () => {
  it('matches when the selected stage is in wizardStages', () => {
    const benefit = makeBenefit({ wizardStages: ['임신 초기', '임신 중기'] })
    expect(matchesStage(benefit, '임신 중기')).toBe(true)
    expect(matchesStage(benefit, '출산 후')).toBe(false)
  })
  it('never matches a benefit with no wizardStages', () => {
    const benefit = makeBenefit({ wizardStages: [] })
    expect(matchesStage(benefit, '임신 중기')).toBe(false)
  })
})

describe('filterBenefits', () => {
  const benefits: HomeBenefit[] = [
    makeBenefit({ id: 'a', category: '지원금', region: '전국', wizardStages: ['임신 중기'] }),
    makeBenefit({ id: 'b', category: '의료·검사', region: '서울', wizardStages: ['임신 중기'] }),
    makeBenefit({ id: 'c', category: '지원금', region: '경기', wizardStages: ['출산 후'] }),
  ]

  it('filters by region, stage, and category together', () => {
    const result = filterBenefits(benefits, { region: '서울', stage: '임신 중기', category: 'all' })
    expect(result.map((b) => b.id)).toEqual(['a', 'b'])
  })

  it('applies the category filter on top of region/stage', () => {
    const result = filterBenefits(benefits, { region: '서울', stage: '임신 중기', category: '의료·검사' })
    expect(result.map((b) => b.id)).toEqual(['b'])
  })

  it('excludes benefits whose stage does not match', () => {
    const result = filterBenefits(benefits, { region: '경기', stage: '임신 중기', category: 'all' })
    expect(result.map((b) => b.id)).toEqual(['a'])
  })

  it('narrows further by district when one is given', () => {
    const withDistricts: HomeBenefit[] = [
      makeBenefit({ id: 'x', region: '전국', wizardStages: ['임신 중기'] }),
      makeBenefit({ id: 'y', region: '서울 구로구', wizardStages: ['임신 중기'] }),
      makeBenefit({ id: 'z', region: '서울 금천구', wizardStages: ['임신 중기'] }),
    ]
    const result = filterBenefits(withDistricts, {
      region: '서울',
      district: '구로구',
      stage: '임신 중기',
      category: 'all',
    })
    expect(result.map((b) => b.id)).toEqual(['x', 'y'])
  })
})

describe('matchesSituation', () => {
  it('returns false when no situations are selected', () => {
    const benefit = makeBenefit({ specialSituations: ['다자녀'] })
    expect(matchesSituation(benefit, [])).toBe(false)
  })

  it('returns true when the benefit has an overlapping tag', () => {
    const benefit = makeBenefit({ specialSituations: ['다자녀', '장애인가정'] })
    expect(matchesSituation(benefit, ['장애인가정'])).toBe(true)
  })

  it('returns false when the benefit has no overlapping tag', () => {
    const benefit = makeBenefit({ specialSituations: ['다자녀'] })
    expect(matchesSituation(benefit, ['장애인가정'])).toBe(false)
  })
})

describe('getFeaturedBenefits', () => {
  const benefits: HomeBenefit[] = [
    makeBenefit({ id: 'a', amountManwon: 100 }),
    makeBenefit({ id: 'b', amountManwon: null }),
    makeBenefit({ id: 'c', amountManwon: 300 }),
    makeBenefit({ id: 'd', amountManwon: 200 }),
  ]

  it('sorts by amount descending and excludes benefits with no amount', () => {
    expect(getFeaturedBenefits(benefits).map((b) => b.id)).toEqual(['c', 'd', 'a'])
  })

  it('limits to the requested count', () => {
    expect(getFeaturedBenefits(benefits, [], 2).map((b) => b.id)).toEqual(['c', 'd'])
  })

  it('returns an empty array when nothing has an amount', () => {
    expect(getFeaturedBenefits([makeBenefit({ amountManwon: null })])).toEqual([])
  })

  it('prioritizes a situation match over higher amounts, without dropping the rest', () => {
    const withSituations: HomeBenefit[] = [
      makeBenefit({ id: 'high', amountManwon: 300 }),
      makeBenefit({ id: 'mid-matched', amountManwon: 150, specialSituations: ['장애인가정'] }),
      makeBenefit({ id: 'low', amountManwon: 100 }),
    ]
    expect(getFeaturedBenefits(withSituations, ['장애인가정']).map((b) => b.id)).toEqual([
      'mid-matched',
      'high',
      'low',
    ])
  })
})

describe('getPopularBenefits', () => {
  it('excludes district-specific benefits, keeping only 전국/서울 전역', () => {
    const benefits: HomeBenefit[] = [
      makeBenefit({ id: 'nation', region: '전국' }),
      makeBenefit({ id: 'seoul-wide', region: '서울' }),
      makeBenefit({ id: 'gu', region: '서울 구로구' }),
      makeBenefit({ id: 'gyeonggi', region: '경기' }),
    ]
    expect(getPopularBenefits(benefits).map((b) => b.id).sort()).toEqual(['nation', 'seoul-wide'])
  })

  it('ranks benefits with a known amount above those without', () => {
    const benefits: HomeBenefit[] = [
      makeBenefit({ id: 'no-amount', region: '전국', amountManwon: null }),
      makeBenefit({ id: 'has-amount', region: '전국', amountManwon: 200 }),
    ]
    expect(getPopularBenefits(benefits).map((b) => b.id)).toEqual(['has-amount', 'no-amount'])
  })

  it('breaks amount ties by hasDirectApplyLink, then by name', () => {
    const benefits: HomeBenefit[] = [
      makeBenefit({ id: 'a', name: '나 혜택', region: '전국', hasDirectApplyLink: false }),
      makeBenefit({ id: 'b', name: '가 혜택', region: '전국', hasDirectApplyLink: true }),
      makeBenefit({ id: 'c', name: '다 혜택', region: '전국', hasDirectApplyLink: false }),
    ]
    expect(getPopularBenefits(benefits).map((b) => b.id)).toEqual(['b', 'a', 'c'])
  })

  it('limits to the requested count', () => {
    const benefits = Array.from({ length: 6 }, (_, i) => makeBenefit({ id: `b${i}`, region: '전국' }))
    expect(getPopularBenefits(benefits, 4)).toHaveLength(4)
  })
})
