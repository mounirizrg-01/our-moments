import { useState, type FormEvent } from 'react'
import { getSupabaseClient } from '../../lib/supabase/client'

type AuthMode = 'sign-in' | 'sign-up'

export function AuthForm() {
  const [mode, setMode] = useState<AuthMode>('sign-in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [pending, setPending] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      const supabase = getSupabaseClient()
      const result =
        mode === 'sign-in'
          ? await supabase.auth.signInWithPassword({ email, password })
          : await supabase.auth.signUp({ email, password })

      if (result.error) {
        setErrorMessage(result.error.message)
      } else if (mode === 'sign-up' && !result.data.session) {
        setSuccessMessage('Check your email for a confirmation link to finish signing up.')
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Something went wrong. Please try again.',
      )
    } finally {
      setPending(false)
    }
  }

  function changeMode(nextMode: AuthMode) {
    setMode(nextMode)
    setErrorMessage('')
    setSuccessMessage('')
  }

  return (
    <section className="app-panel w-full max-w-md rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
      <h1 className="app-hero-title text-3xl font-bold text-slate-900">Our Moments</h1>
      <p className="mt-2 text-slate-600">
        {mode === 'sign-in' ? 'Sign in to your shared space.' : 'Create your account to get started.'}
      </p>

      <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
        <div>
          <label className="block text-sm font-medium text-slate-700" htmlFor="email">
            Email
          </label>
          <input
            autoComplete="email"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-200"
            id="email"
            onChange={(event) => setEmail(event.target.value)}
            required
            type="email"
            value={email}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700" htmlFor="password">
            Password
          </label>
          <input
            autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-200"
            id="password"
            minLength={8}
            onChange={(event) => setPassword(event.target.value)}
            required
            type="password"
            value={password}
          />
          {mode === 'sign-up' && (
            <p className="mt-1 text-xs text-slate-500">Use at least 8 characters.</p>
          )}
        </div>

        {errorMessage && (
          <p className="text-sm text-red-700" role="alert">
            {errorMessage}
          </p>
        )}
        {successMessage && (
          <p className="text-sm text-green-700" role="status">
            {successMessage}
          </p>
        )}

        <button
          className="w-full rounded-lg bg-rose-600 px-4 py-2.5 font-semibold text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={pending}
          type="submit"
        >
          {pending
            ? 'Please wait…'
            : mode === 'sign-in'
              ? 'Sign in'
              : 'Create account'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-600">
        {mode === 'sign-in' ? 'New here?' : 'Already have an account?'}{' '}
        <button
          className="font-semibold text-rose-700 hover:underline"
          onClick={() => changeMode(mode === 'sign-in' ? 'sign-up' : 'sign-in')}
          type="button"
        >
          {mode === 'sign-in' ? 'Create an account' : 'Sign in'}
        </button>
      </p>
    </section>
  )
}
