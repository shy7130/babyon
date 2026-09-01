import { describe, expect, it } from 'vitest'
import { isAuthorizedCronRequest } from '@/lib/cron/auth'

describe('isAuthorizedCronRequest', () => {
  it('returns false when there is no secret configured', () => {
    expect(isAuthorizedCronRequest('Bearer abc', undefined)).toBe(false)
  })

  it('returns false when the header does not match', () => {
    expect(isAuthorizedCronRequest('Bearer wrong', 'abc')).toBe(false)
  })

  it('returns true when the header matches the secret', () => {
    expect(isAuthorizedCronRequest('Bearer abc', 'abc')).toBe(true)
  })
})
