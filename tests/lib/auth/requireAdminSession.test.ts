import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const redirectMock = vi.hoisted(() => vi.fn())
vi.mock('next/navigation', () => ({ redirect: redirectMock }))

const getUserMock = vi.hoisted(() => vi.fn())
vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: () => ({ auth: { getUser: getUserMock } }),
}))

import { requireAdminSession } from '@/lib/auth/requireAdminSession'

describe('requireAdminSession', () => {
  beforeEach(() => {
    redirectMock.mockClear()
    getUserMock.mockClear()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('redirects to /admin/login when there is no session', async () => {
    getUserMock.mockResolvedValue({ data: { user: null }, error: null })
    await requireAdminSession()
    expect(redirectMock).toHaveBeenCalledWith('/admin/login')
  })

  it('returns the user when the email matches ADMIN_EMAIL', async () => {
    vi.stubEnv('ADMIN_EMAIL', 'owner@example.com')
    const fakeUser = { id: 'u1', email: 'owner@example.com' }
    getUserMock.mockResolvedValue({ data: { user: fakeUser }, error: null })
    const user = await requireAdminSession()
    expect(user).toBe(fakeUser)
    expect(redirectMock).not.toHaveBeenCalled()
  })

  it('redirects to /admin/login when the email does not match ADMIN_EMAIL', async () => {
    vi.stubEnv('ADMIN_EMAIL', 'owner@example.com')
    const fakeUser = { id: 'u2', email: 'someone-else@example.com' }
    getUserMock.mockResolvedValue({ data: { user: fakeUser }, error: null })
    await requireAdminSession()
    expect(redirectMock).toHaveBeenCalledWith('/admin/login')
  })

  it('redirects to /admin/login when ADMIN_EMAIL is not configured', async () => {
    vi.stubEnv('ADMIN_EMAIL', '')
    const fakeUser = { id: 'u3', email: 'owner@example.com' }
    getUserMock.mockResolvedValue({ data: { user: fakeUser }, error: null })
    await requireAdminSession()
    expect(redirectMock).toHaveBeenCalledWith('/admin/login')
  })
})
