import { describe, expect, it } from 'vitest'
import { getCategoryColor } from '@/lib/home/categoryColors'

describe('getCategoryColor', () => {
  it('returns the mint palette for 교통', () => {
    expect(getCategoryColor('교통')).toEqual({ surface: 'var(--surface-mint)', strong: 'var(--mint-strong)' })
  })

  it('returns the amber palette for 지원금', () => {
    expect(getCategoryColor('지원금')).toEqual({ surface: 'var(--surface-amber)', strong: 'var(--amber-strong)' })
  })

  it('returns the slate palette for 민간혜택', () => {
    expect(getCategoryColor('민간혜택')).toEqual({ surface: 'var(--surface-slate)', strong: 'var(--slate-strong)' })
  })
})
