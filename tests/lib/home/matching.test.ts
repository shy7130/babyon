import { describe, expect, it } from 'vitest'
import {
  countBenefitsForJourneyIndex,
  filterBenefits,
  JOURNEY_STAGE_INDEX,
  matchesRegion,
  matchesStage,
  normalizeRegion,
  wizardStagesForJourneyIndex,
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
    wizardStages: ['임신 중기'],
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
})

describe('JOURNEY_STAGE_INDEX', () => {
  it('maps 임신 준비 and 임신 초기 to the same journey card (1)', () => {
    expect(JOURNEY_STAGE_INDEX['임신 준비']).toBe(1)
    expect(JOURNEY_STAGE_INDEX['임신 초기']).toBe(1)
  })
  it('maps the remaining stages to their own cards', () => {
    expect(JOURNEY_STAGE_INDEX['임신 중기']).toBe(2)
    expect(JOURNEY_STAGE_INDEX['임신 후기']).toBe(3)
    expect(JOURNEY_STAGE_INDEX['출산 후']).toBe(4)
  })
})

describe('wizardStagesForJourneyIndex', () => {
  it('returns both stages sharing journey card 1', () => {
    expect(wizardStagesForJourneyIndex(1).sort()).toEqual(['임신 준비', '임신 초기'].sort())
  })
  it('returns a single stage for cards 2-4', () => {
    expect(wizardStagesForJourneyIndex(4)).toEqual(['출산 후'])
  })
})

describe('countBenefitsForJourneyIndex', () => {
  const benefits: HomeBenefit[] = [
    makeBenefit({ id: 'a', region: '전국', wizardStages: ['임신 준비'] }),
    makeBenefit({ id: 'b', region: '서울', wizardStages: ['임신 초기'] }),
    makeBenefit({ id: 'c', region: '경기', wizardStages: ['임신 초기'] }),
    makeBenefit({ id: 'd', region: '전국', wizardStages: ['출산 후'] }),
  ]

  it('counts benefits across both stages sharing a journey card, filtered by region', () => {
    expect(countBenefitsForJourneyIndex(benefits, '서울', 1)).toBe(2) // a(전국) + b(서울)
    expect(countBenefitsForJourneyIndex(benefits, '경기', 1)).toBe(2) // a(전국) + c(경기)
  })

  it('counts a single-stage journey card', () => {
    expect(countBenefitsForJourneyIndex(benefits, '서울', 4)).toBe(1) // d(전국)
    expect(countBenefitsForJourneyIndex(benefits, '서울', 2)).toBe(0)
  })
})
