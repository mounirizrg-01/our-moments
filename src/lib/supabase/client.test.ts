import { describe, expect, it } from 'vitest'
import { createSupabaseClient } from './client'

describe('createSupabaseClient', () => {
  it('requires both Supabase settings', () => {
    expect(() => createSupabaseClient(undefined, 'publishable-key')).toThrow(
      'Supabase is not configured.',
    )
    expect(() => createSupabaseClient('https://example.supabase.co', undefined)).toThrow(
      'Supabase is not configured.',
    )
  })

  it('creates a client when both settings are present', () => {
    expect(
      createSupabaseClient(
        'https://example.supabase.co',
        'sb_publishable_test-key',
      ),
    ).toBeDefined()
  })
})
