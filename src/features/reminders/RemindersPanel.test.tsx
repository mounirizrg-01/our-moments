import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RemindersPanel } from './RemindersPanel'

const supabase = vi.hoisted(() => ({
  from: vi.fn(),
}))

vi.mock('../../lib/supabase/client', () => ({
  getSupabaseClient: () => supabase,
}))

describe('RemindersPanel', () => {
  beforeEach(() => {
    const query = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
      insert: vi.fn().mockResolvedValue({ data: null, error: null }),
      update: vi.fn().mockReturnThis(),
    }
    supabase.from.mockReset().mockReturnValue(query)
  })

  it('shows the empty reminder state', async () => {
    render(<RemindersPanel coupleId="couple-id" />)

    expect(await screen.findByText('No reminders scheduled.')).toBeInTheDocument()
  })

  it('creates a reminder', async () => {
    render(<RemindersPanel coupleId="couple-id" />)

    fireEvent.change(await screen.findByLabelText('Reminder'), {
      target: { value: 'Buy flowers' },
    })
    fireEvent.change(screen.getByLabelText('Remind me'), {
      target: { value: '2026-12-01T09:30' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Add reminder' }))

    await waitFor(() => {
      expect(supabase.from).toHaveBeenCalledWith('reminders')
    })
  })
})
