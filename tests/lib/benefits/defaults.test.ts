import { describe, expect, it } from 'vitest'
import { getDefaultImage } from '@/lib/benefits/defaults'

describe('getDefaultImage', () => {
  it('returns the mapped image for a known category', () => {
    expect(getDefaultImage('출산·육아')).toBe('/images/defaults/benefit-baby.svg')
  })

  it('returns the fallback image for an unknown category', () => {
    expect(getDefaultImage('알 수 없는 분류')).toBe('/images/defaults/benefit-generic.svg')
  })
})
