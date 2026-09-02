import { describe, expect, it } from 'vitest'
import { parseAmountManwon } from '@/lib/benefits/amountParser'

describe('parseAmountManwon', () => {
  it('extracts a plain 만원 amount', () => {
    expect(parseAmountManwon('출생아 1인당 200만원 바우처 지급')).toBe(200)
  })

  it('extracts an amount with thousands separators', () => {
    expect(parseAmountManwon('최대 1,000만원 지원')).toBe(1000)
  })

  it('takes the first amount when multiple appear', () => {
    expect(parseAmountManwon('단태아 100만원, 다태아 140만원 바우처')).toBe(100)
  })

  it('returns null when there is no 만원 amount', () => {
    expect(parseAmountManwon('코레일 임산부 등록 시 요금 30% 할인')).toBeNull()
  })

  it('returns null for null/undefined/empty input', () => {
    expect(parseAmountManwon(null)).toBeNull()
    expect(parseAmountManwon(undefined)).toBeNull()
    expect(parseAmountManwon('')).toBeNull()
  })
})
