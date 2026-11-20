import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Database } from '../../lib/supabase/database.types'
import { OccasionsPanel } from './OccasionsPanel'

type Occasion = Database['public']['Tables']['occasions']['Row']

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

function makeOccasion(overrides: Partial<Occasion> = {}): Occasion {
  return {
    id: 'occasion-id',
    couple_id: 'couple-id',
    title: 'Anniversary dinner',
    occasion_date: '2027-06-15',
    category: 'anniversary',
    repeats_yearly: true,
    notes: null,
    created_by: 'user-id',
    created_at: '2026-11-19T00:00:00.000Z',
    updated_at: '2026-11-19T00:00:00.000Z',
    ...overrides,
  }
}

describe('OccasionsPanel', () => {
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

  it('creates an occasion scoped to the current couple', async () => {
    render(<OccasionsPanel coupleId="couple-id" />)

    fireEvent.change(await screen.findByLabelText('Title'), {
      target: { value: 'Our anniversary' },
    })
    fireEvent.change(screen.getByLabelText('Date'), {
      target: { value: '2027-06-15' },
    })
    fireEvent.change(screen.getByLabelText('Category'), {
      target: { value: 'anniversary' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Add date' }))

    await waitFor(() => {
      expect(query.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          couple_id: 'couple-id',
          title: 'Our anniversary',
          occasion_date: '2027-06-15',
          category: 'anniversary',
          repeats_yearly: false,
          notes: null,
        }),
      )
    })
  })

  it('updates an existing occasion', async () => {
    const occasion = makeOccasion()
    query.order
      .mockResolvedValueOnce({ data: [occasion], error: null })
      .mockResolvedValue({ data: [makeOccasion({ title: 'Updated dinner' })], error: null })
    render(<OccasionsPanel coupleId="couple-id" />)

    fireEvent.click(await screen.findByRole('button', { name: 'Edit' }))
    fireEvent.change(screen.getByLabelText('Title'), {
      target: { value: 'Updated dinner' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))

    await waitFor(() => {
      expect(query.update).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Updated dinner' }),
      )
    })
    expect(await screen.findByText('Updated dinner')).toBeInTheDocument()
  })

  it('deletes an occasion only after confirmation', async () => {
    const occasion = makeOccasion()
    query.order
      .mockResolvedValueOnce({ data: [occasion], error: null })
      .mockResolvedValue({ data: [], error: null })
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
    render(<OccasionsPanel coupleId="couple-id" />)

    fireEvent.click(await screen.findByRole('button', { name: 'Delete' }))

    expect(confirm).toHaveBeenCalledWith('Delete "Anniversary dinner"?')
    expect(await screen.findByText('No dates saved yet.')).toBeInTheDocument()
  })

  it('shows load errors instead of hiding them', async () => {
    query.order.mockResolvedValue({
      data: null,
      error: new Error('Could not read dates'),
    })
    render(<OccasionsPanel coupleId="couple-id" />)

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not read dates')
  })
})
