import { useEffect, useState, type FormEvent } from 'react'
import { getSupabaseClient } from '../../lib/supabase/client'

interface CoupleWorkspaceRecord {
  id: string
  name: string
}

interface CoupleWorkspaceProps {
  userId: string
}

export function CoupleWorkspace({ userId }: CoupleWorkspaceProps) {
  const [workspace, setWorkspace] = useState<CoupleWorkspaceRecord | null>(null)
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    let active = true

    async function loadWorkspace() {
      setLoading(true)
      setErrorMessage('')

      try {
        const supabase = getSupabaseClient()
        const { data: membership, error: membershipError } = await supabase
          .from('couple_members')
          .select('couple_id')
          .eq('user_id', userId)
          .maybeSingle()

        if (membershipError) throw membershipError
        if (!membership) {
          if (active) setWorkspace(null)
          return
        }

        const { data: couple, error: coupleError } = await supabase
          .from('couples')
          .select('id, name')
          .eq('id', membership.couple_id)
          .single()

        if (coupleError) throw coupleError
        if (!couple) throw new Error('Your couple workspace could not be found.')
        if (active) setWorkspace(couple)
      } catch (error) {
        if (active) {
          setErrorMessage(
            error instanceof Error ? error.message : 'Could not load your workspace.',
          )
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    void loadWorkspace()
    return () => {
      active = false
    }
  }, [userId])

  async function createWorkspace(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setErrorMessage('')

    try {
      const { data, error } = await getSupabaseClient().rpc('create_couple', {
        p_name: name.trim(),
      })

      if (error) throw error
      if (typeof data !== 'string' || !data) {
        throw new Error('Workspace creation returned no ID. Please try again.')
      }

      setWorkspace({ id: data, name: name.trim() })
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Could not create your workspace.',
      )
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <p className="text-slate-600">Loading your workspace…</p>
  }

  if (workspace) {
    return (
      <section className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
        <p className="text-sm font-semibold uppercase tracking-wide text-rose-700">
          Your shared space
        </p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900">{workspace.name}</h1>
        <p className="mt-3 text-slate-600">Your workspace is ready.</p>
      </section>
    )
  }

  return (
    <section className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
      <h1 className="text-3xl font-bold text-slate-900">Create your shared space</h1>
      <p className="mt-2 text-slate-600">
        Choose a name for the space you’ll share with your partner.
      </p>

      <form className="mt-8 space-y-5" onSubmit={createWorkspace}>
        <div>
          <label className="block text-sm font-medium text-slate-700" htmlFor="couple-name">
            Shared space name
          </label>
          <input
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-200"
            id="couple-name"
            maxLength={80}
            onChange={(event) => setName(event.target.value)}
            required
            value={name}
          />
        </div>

        {errorMessage && (
          <p className="text-sm text-red-700" role="alert">
            {errorMessage}
          </p>
        )}

        <button
          className="w-full rounded-lg bg-rose-600 px-4 py-2.5 font-semibold text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={saving}
          type="submit"
        >
          {saving ? 'Creating…' : 'Create shared space'}
        </button>
      </form>
    </section>
  )
}
