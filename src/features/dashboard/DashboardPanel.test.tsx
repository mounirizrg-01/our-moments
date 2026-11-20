import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DashboardPanel } from './DashboardPanel'

const from = vi.hoisted(() => vi.fn())

vi.mock('../../lib/supabase/client', () => ({
  getSupabaseClient: () => ({ from }),
}))

describe('DashboardPanel', () => {
  beforeEach(() => {
    from.mockImplementation(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
    }))
  })

  it('shows empty dashboard states', async () => {
    render(<DashboardPanel coupleId="couple-id" />)

    await waitFor(() => {
      expect(screen.getByText('No upcoming dates.')).toBeInTheDocument()
    })
    expect(screen.getByText('Nothing planned yet.')).toBeInTheDocument()
    expect(screen.getByText('No memories saved yet.')).toBeInTheDocument()
  })
})
