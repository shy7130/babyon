import { beforeEach, describe, expect, it, vi } from 'vitest'

const redirectMock = vi.hoisted(() => vi.fn())
vi.mock('next/navigation', () => ({ redirect: redirectMock }))

const getSessionMock = vi.hoisted(() => vi.fn())
vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: () => ({ auth: { getSession: getSessionMock } }),
}))

import { requireAdminSession } from '@/lib/auth/requireAdminSession'

describe('requireAdminSession', () => {
  beforeEach(() => {
    redirectMock.mockClear()
    getSessionMock.mockClear()
  })

  it('redirects to /admin/login when there is no session', async () => {
    getSessionMock.mockResolvedValue({ data: { session: null } })
    await requireAdminSession()
    expect(redirectMock).toHaveBeenCalledWith('/admin/login')
  })

  it('returns the session when one exists', async () => {
    const fakeSession = { user: { id: 'u1' } }
    getSessionMock.mockResolvedValue({ data: { session: fakeSession } })
    const session = await requireAdminSession()
    expect(session).toBe(fakeSession)
  })
})
