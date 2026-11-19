import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CoupleWorkspace } from './CoupleWorkspace'

const supabase = vi.hoisted(() => ({
  from: vi.fn(),
  rpc: vi.fn(),
}))

vi.mock('../../lib/supabase/client', () => ({
  getSupabaseClient: () => supabase,
}))

describe('CoupleWorkspace', () => {
  const memberQuery = {
    eq: vi.fn(),
    maybeSingle: vi.fn(),
    select: vi.fn(),
  }

  beforeEach(() => {
    memberQuery.select.mockReturnThis()
    memberQuery.eq.mockReturnThis()
    memberQuery.maybeSingle.mockResolvedValue({ data: null, error: null })
    supabase.from.mockReset().mockReturnValue(memberQuery)
    supabase.rpc.mockReset().mockResolvedValue({
      data: 'couple-id',
      error: null,
    })
  })

  it('creates a shared space through the protected database function', async () => {
    render(<CoupleWorkspace userId="user-id" />)

    fireEvent.change(await screen.findByLabelText('Shared space name'), {
      target: { value: 'Our Moments' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Create shared space' }))

    await waitFor(() => {
      expect(supabase.rpc).toHaveBeenCalledWith('create_couple', {
        p_name: 'Our Moments',
      })
    })
    expect(await screen.findByRole('heading', { name: 'Our Moments' })).toBeInTheDocument()
  })

  it('shows database errors instead of a success state', async () => {
    memberQuery.maybeSingle.mockResolvedValue({
      data: null,
      error: new Error('Permission denied'),
    })
    render(<CoupleWorkspace userId="user-id" />)

    expect(await screen.findByRole('alert')).toHaveTextContent('Permission denied')
    expect(supabase.rpc).not.toHaveBeenCalled()
  })
})
