import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Database } from '../../lib/supabase/database.types'
import { ActivityBoard } from './ActivityBoard'

type Activity = Database['public']['Tables']['activity_suggestions']['Row']

const supabase = vi.hoisted(() => ({
  from: vi.fn(),
}))

vi.mock('../../lib/supabase/client', () => ({
  getSupabaseClient: () => supabase,
}))

function makeMutationBuilder(result: { error: Error | null }) {
  const builder = {
    eq: vi.fn(),
    then: (onFulfilled: (value: typeof result) => unknown) =>
      Promise.resolve(result).then(onFulfilled),
  }
  builder.eq.mockReturnValue(builder)
  return builder
}

function makeActivity(overrides: Partial<Activity> = {}): Activity {
  return {
    id: 'activity-id',
    couple_id: 'couple-id',
    title: 'Picnic in the park',
    category: 'outdoors',
    details: 'Bring snacks',
    status: 'idea',
    created_by: 'user-id',
    created_at: '2026-11-19T00:00:00.000Z',
    updated_at: '2026-11-19T00:00:00.000Z',
    ...overrides,
  }
}

describe('ActivityBoard', () => {
  const query = {
    delete: vi.fn(),
    eq: vi.fn(),
    insert: vi.fn(),
    order: vi.fn(),
    select: vi.fn(),
    update: vi.fn(),
  }

  beforeEach(() => {
    query.select.mockReturnThis()
    query.eq.mockReturnThis()
    query.order.mockResolvedValue({ data: [], error: null })
    query.insert.mockResolvedValue({ error: null })
    query.update.mockReturnValue(makeMutationBuilder({ error: null }))
    query.delete.mockReturnValue(makeMutationBuilder({ error: null }))
    supabase.from.mockReset().mockReturnValue(query)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('creates an activity suggestion scoped to the current couple', async () => {
    render(<ActivityBoard coupleId="couple-id" />)

    fireEvent.change(await screen.findByLabelText('Activity'), {
      target: { value: 'Picnic in the park' },
    })
    fireEvent.change(screen.getByLabelText('Category'), {
      target: { value: 'outdoors' },
    })
    fireEvent.change(screen.getByLabelText('Notes (optional)'), {
      target: { value: 'Bring snacks' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Add idea' }))

    await waitFor(() => {
      expect(query.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          couple_id: 'couple-id',
          title: 'Picnic in the park',
          category: 'outdoors',
          details: 'Bring snacks',
          status: 'idea',
        }),
      )
    })
  })

  it('updates the shared activity status', async () => {
    const activity = makeActivity()
    query.order
      .mockResolvedValueOnce({ data: [activity], error: null })
      .mockResolvedValue({ data: [makeActivity({ status: 'planned' })], error: null })
    render(<ActivityBoard coupleId="couple-id" />)

    fireEvent.change(await screen.findByLabelText('Status for Picnic in the park'), {
      target: { value: 'planned' },
    })

    await waitFor(() => {
      expect(query.update).toHaveBeenCalledWith({ status: 'planned' })
    })
  })

  it('shows database errors instead of hiding them', async () => {
    query.order.mockResolvedValue({
      data: null,
      error: new Error('Could not read ideas'),
    })
    render(<ActivityBoard coupleId="couple-id" />)

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not read ideas')
  })
})
