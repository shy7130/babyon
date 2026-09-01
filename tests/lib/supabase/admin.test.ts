import { afterEach, describe, expect, it, vi } from 'vitest'

describe('createAdminClient', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('throws when required env vars are missing', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '')
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', '')
    const { createAdminClient } = await import('@/lib/supabase/admin')
    expect(() => createAdminClient()).toThrow(/NEXT_PUBLIC_SUPABASE_URL/)
  })

  it('returns a client when env vars are present', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co')
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service-role-key')
    const { createAdminClient } = await import('@/lib/supabase/admin')
    const client = createAdminClient()
    expect(typeof client.from).toBe('function')
  })
})
