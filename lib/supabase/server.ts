import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

export function createServerSupabaseClient() {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: Record<string, unknown>) {
          try {
            cookieStore.set({ name, value, ...options })
          } catch {
            // Called from a Server Component, where Next.js does not allow cookie
            // mutation (only Server Actions/Route Handlers can). Safe to ignore:
            // a refreshed session simply won't persist for this request.
          }
        },
        remove(name: string, options: Record<string, unknown>) {
          try {
            cookieStore.set({ name, value: '', ...options })
          } catch {
            // See comment in set() above.
          }
        },
      },
    }
  )
}
