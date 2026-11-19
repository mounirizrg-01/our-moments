import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthForm } from './AuthForm'

const auth = vi.hoisted(() => ({
  signInWithPassword: vi.fn(),
  signUp: vi.fn(),
}))

vi.mock('../../lib/supabase/client', () => ({
  getSupabaseClient: () => ({ auth }),
}))

describe('AuthForm', () => {
  beforeEach(() => {
    auth.signInWithPassword.mockReset()
    auth.signUp.mockReset()
  })

  it('shows confirmation guidance after sign-up when email confirmation is required', async () => {
    auth.signUp.mockResolvedValue({
      data: { session: null },
      error: null,
    })
    render(<AuthForm />)

    fireEvent.click(screen.getByRole('button', { name: 'Create an account' }))
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'partner@example.com' },
    })
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'a-secure-password' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }))

    expect(
      await screen.findByText(
        'Check your email for a confirmation link to finish signing up.',
      ),
    ).toHaveAttribute('role', 'status')
  })

  it('displays the authentication error returned by Supabase', async () => {
    auth.signInWithPassword.mockResolvedValue({
      data: { session: null },
      error: { message: 'Invalid login credentials' },
    })
    render(<AuthForm />)

    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'partner@example.com' },
    })
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'wrong-password' },
    })
    const form = screen.getByLabelText('Email').closest('form')
    if (!form) throw new Error('Expected email field to belong to the sign-in form.')
    fireEvent.submit(form)

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Invalid login credentials')
    })
  })
})
