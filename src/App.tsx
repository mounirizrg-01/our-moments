import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import './App.css'
import { AuthForm } from './features/auth/AuthForm'
import { CoupleWorkspace } from './features/couple/CoupleWorkspace'
import { getSupabaseClient } from './lib/supabase/client'

function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    const supabase = getSupabaseClient()
    let active = true
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      if (active) {
        setSession(currentSession)
        setLoading(false)
      }
    })

    void supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (!active) return
        if (error) {
          setErrorMessage(error.message)
        } else {
          setSession(data.session)
        }
        setLoading(false)
      })
      .catch((error: unknown) => {
        if (!active) return
        setErrorMessage(
          error instanceof Error ? error.message : 'Could not load your sign-in session.',
        )
        setLoading(false)
      })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  async function signOut() {
    const { error } = await getSupabaseClient().auth.signOut()
    if (error) setErrorMessage(error.message)
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-rose-50 px-6 py-10">
      {loading ? (
        <p className="text-slate-600">Loading your space…</p>
      ) : session ? (
        <div className="flex w-full max-w-md flex-col items-center gap-4">
          {errorMessage && (
            <p className="w-full text-sm text-red-700" role="alert">
              {errorMessage}
            </p>
          )}
          <CoupleWorkspace userId={session.user.id} />
          <p className="text-sm text-slate-600">Signed in as {session.user.email}</p>
          <button
            className="rounded-lg border border-slate-300 px-4 py-2 font-semibold text-slate-700 hover:bg-white"
            onClick={signOut}
            type="button"
          >
            Sign out
          </button>
        </div>
      ) : (
        <AuthForm />
      )}
    </main>
  )
}

export default App
