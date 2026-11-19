import { createClient } from '@supabase/supabase-js'

export function createSupabaseClient(
  url: string | undefined,
  publishableKey: string | undefined,
) {
  if (!url || !publishableKey) {
    throw new Error(
      'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.',
    )
  }

  return createClient(url, publishableKey)
}

let client: ReturnType<typeof createSupabaseClient> | undefined

export function getSupabaseClient() {
  if (!client) {
    client = createSupabaseClient(
      import.meta.env.VITE_SUPABASE_URL,
      import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    )
  }

  return client
}
